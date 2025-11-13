import { useState, useEffect } from "react";
import { POSHeader } from "@/components/POS/POSHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db, WhatsAppAccount, WhatsAppCampaign } from "@/lib/indexedDB";
import { whatsappService } from "@/services/whatsapp/whatsappService";
import { Megaphone, Plus, Play, Pause, Trash2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const WhatsAppCampaigns = () => {
  const { toast } = useToast();
  const { can } = useAuth();
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [addDialog, setAddDialog] = useState(false);

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    accountId: "",
    template: "",
    targetType: "all" as "credit" | "installment" | "all" | "custom",
    minAmount: "",
    maxAmount: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await db.init();
    const [campaignsData, accountsData] = await Promise.all([
      db.getAll<WhatsAppCampaign>("whatsappCampaigns"),
      db.getAll<WhatsAppAccount>("whatsappAccounts"),
    ]);

    setCampaigns(campaignsData);
    setAccounts(
      accountsData.filter((a) => a.isActive && a.status === "connected")
    );
  };

  const extractVariables = (template: string): string[] => {
    const regex = /{{(.*?)}}/g;
    const matches = template.match(regex);
    return matches ? matches.map((m) => m.replace(/{{|}}/g, "")) : [];
  };

  const handleCreate = async () => {
    if (!newCampaign.name || !newCampaign.accountId || !newCampaign.template) {
      toast({ title: "جميع الحقول مطلوبة", variant: "destructive" });
      return;
    }

    const variables = extractVariables(newCampaign.template);

    // Count recipients
    let recipients = await db.getAll("customers");
    if (newCampaign.targetType === "credit") {
      recipients = recipients.filter((c: any) => c.currentBalance > 0);
    }

    if (newCampaign.minAmount) {
      recipients = recipients.filter(
        (c: any) => c.currentBalance >= parseFloat(newCampaign.minAmount)
      );
    }

    if (newCampaign.maxAmount) {
      recipients = recipients.filter(
        (c: any) => c.currentBalance <= parseFloat(newCampaign.maxAmount)
      );
    }

    const campaign = await whatsappService.createCampaign({
      name: newCampaign.name,
      accountId: newCampaign.accountId,
      template: newCampaign.template,
      variables,
      targetType: newCampaign.targetType,
      filters: {
        minAmount: newCampaign.minAmount
          ? parseFloat(newCampaign.minAmount)
          : undefined,
        maxAmount: newCampaign.maxAmount
          ? parseFloat(newCampaign.maxAmount)
          : undefined,
      },
      status: "draft",
      totalRecipients: recipients.length,
      sentCount: 0,
      failedCount: 0,
    });

    await loadData();
    setAddDialog(false);
    setNewCampaign({
      name: "",
      accountId: "",
      template: "",
      targetType: "all",
      minAmount: "",
      maxAmount: "",
    });

    toast({ title: "تم إنشاء الحملة" });
  };

  const handleRun = async (campaignId: string) => {
    try {
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (!campaign) return;

      campaign.status = "running";
      await db.update("whatsappCampaigns", campaign);
      await loadData();

      await whatsappService.runCampaign(campaignId);
      toast({ title: "تم بدء الحملة" });
    } catch (error) {
      toast({ title: "فشل بدء الحملة", variant: "destructive" });
    }
  };

  const handlePause = async (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;

    campaign.status = "paused";
    await db.update("whatsappCampaigns", campaign);
    await loadData();

    toast({ title: "تم إيقاف الحملة مؤقتاً" });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الحملة؟")) return;

    await db.delete("whatsappCampaigns", id);
    await loadData();
    toast({ title: "تم حذف الحملة" });
  };

  const getStatusBadge = (status: WhatsAppCampaign["status"]) => {
    const variants = {
      draft: "secondary",
      scheduled: "outline",
      running: "default",
      paused: "secondary",
      completed: "default",
      failed: "destructive",
    };

    const labels = {
      draft: "مسودة",
      scheduled: "مجدولة",
      running: "قيد التشغيل",
      paused: "موقوفة",
      completed: "مكتملة",
      failed: "فشلت",
    };

    return <Badge variant={variants[status] as any}>{labels[status]}</Badge>;
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <POSHeader />
      <main className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Megaphone className="h-8 w-8" />
              الحملات التسويقية
            </h1>
            <p className="text-muted-foreground mt-1">
              أنشئ وأدر حملات WhatsApp التسويقية
            </p>
          </div>

          {can("whatsapp", "create") && (
            <Button
              onClick={() => setAddDialog(true)}
              disabled={accounts.length === 0}
            >
              <Plus className="h-4 w-4 ml-2" />
              إنشاء حملة
            </Button>
          )}
        </div>

        {accounts.length === 0 && (
          <Card className="mb-6">
            <CardContent className="py-6">
              <p className="text-center text-muted-foreground">
                يجب ربط حساب WhatsApp نشط أولاً لإنشاء حملات
              </p>
            </CardContent>
          </Card>
        )}

        {/* Campaigns Table */}
        <Card>
          <CardHeader>
            <CardTitle>الحملات</CardTitle>
          </CardHeader>
          <CardContent>
            {campaigns.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Megaphone className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p>لا توجد حملات</p>
                {accounts.length > 0 && (
                  <Button onClick={() => setAddDialog(true)} className="mt-4">
                    أنشئ أول حملة
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>المستهدفون</TableHead>
                    <TableHead>التقدم</TableHead>
                    <TableHead>المُرسل</TableHead>
                    <TableHead>الفاشل</TableHead>
                    <TableHead>تاريخ الإنشاء</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((campaign) => {
                    const progress =
                      (campaign.sentCount / campaign.totalRecipients) * 100;

                    return (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">
                          {campaign.name}
                        </TableCell>
                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{campaign.targetType}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {campaign.sentCount}/{campaign.totalRecipients}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default">{campaign.sentCount}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {campaign.failedCount}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(campaign.createdAt).toLocaleDateString(
                            "ar"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {campaign.status === "draft" && (
                              <Button
                                size="sm"
                                onClick={() => handleRun(campaign.id)}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}

                            {campaign.status === "running" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handlePause(campaign.id)}
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                            )}

                            {campaign.status === "paused" && (
                              <Button
                                size="sm"
                                onClick={() => handleRun(campaign.id)}
                              >
                                <Play className="h-4 w-4" />
                              </Button>
                            )}

                            {can("whatsapp", "delete") && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDelete(campaign.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Campaign Dialog */}
        <Dialog open={addDialog} onOpenChange={setAddDialog}>
          <DialogContent className="max-w-2xl" dir="rtl">
            <DialogHeader>
              <DialogTitle>إنشاء حملة جديدة</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>اسم الحملة *</Label>
                <Input
                  value={newCampaign.name}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, name: e.target.value })
                  }
                  placeholder="حملة تذكير بالمدفوعات"
                />
              </div>

              <div>
                <Label>حساب WhatsApp *</Label>
                <Select
                  value={newCampaign.accountId}
                  onValueChange={(value) =>
                    setNewCampaign({ ...newCampaign, accountId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر حساب" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name} ({account.phone})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>نوع المستهدفين *</Label>
                <Select
                  value={newCampaign.targetType}
                  onValueChange={(value: any) =>
                    setNewCampaign({ ...newCampaign, targetType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع العملاء</SelectItem>
                    <SelectItem value="credit">عملاء الآجل</SelectItem>
                    <SelectItem value="installment">عملاء التقسيط</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الحد الأدنى للمبلغ</Label>
                  <Input
                    type="number"
                    value={newCampaign.minAmount}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        minAmount: e.target.value,
                      })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <Label>الحد الأقصى للمبلغ</Label>
                  <Input
                    type="number"
                    value={newCampaign.maxAmount}
                    onChange={(e) =>
                      setNewCampaign({
                        ...newCampaign,
                        maxAmount: e.target.value,
                      })
                    }
                    placeholder="غير محدود"
                  />
                </div>
              </div>

              <div>
                <Label>قالب الرسالة *</Label>
                <Textarea
                  value={newCampaign.template}
                  onChange={(e) =>
                    setNewCampaign({ ...newCampaign, template: e.target.value })
                  }
                  placeholder="مرحباً {{name}}، نذكرك بالمبلغ المستحق: {{amount}} جنيه"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  استخدم &#123;&#123;name&#125;&#125; للاسم،
                  &#123;&#123;amount&#125;&#125; للمبلغ،
                  &#123;&#123;phone&#125;&#125; للهاتف
                </p>
              </div>

              {newCampaign.template && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      المتغيرات المكتشفة
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-2 flex-wrap">
                      {extractVariables(newCampaign.template).map((v, i) => (
                        <Badge key={i} variant="secondary">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialog(false)}>
                إلغاء
              </Button>
              <Button onClick={handleCreate}>إنشاء</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default WhatsAppCampaigns;
