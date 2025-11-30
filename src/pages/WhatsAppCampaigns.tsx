import { useState, useEffect } from "react";
import { POSHeader } from "@/components/POS/POSHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { db, WhatsAppAccount, WhatsAppCampaign } from "@/lib/indexedDB";
import { whatsappService } from "@/services/whatsapp/whatsappService";
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Trash2,
  Users,
  MessageSquare,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  Send,
  Gift,
  Bell,
  CreditCard,
  Sparkles,
  HelpCircle,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Smartphone,
  Calendar,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const MESSAGE_TEMPLATES = [
  {
    id: "payment_reminder",
    name: "🔔 تذكير بالمستحقات",
    icon: Bell,
    color: "text-orange-500",
    bgColor: "bg-orange-50 dark:bg-orange-950",
    borderColor: "border-orange-200 dark:border-orange-800",
    description: "ذكّر العملاء بالمبالغ المستحقة عليهم",
    template: "السلام عليكم {{name}} 👋\n\nنحيطكم علماً بأن لديكم مبلغ مستحق قدره *{{amount}} جنيه*\n\nنرجو التكرم بسداد المبلغ في أقرب وقت ممكن.\n\nشكراً لتعاملكم معنا 🙏\n{{storeName}}",
    targetType: "credit",
  },
  {
    id: "installment_reminder",
    name: "📅 تذكير بالقسط",
    icon: Calendar,
    color: "text-blue-500",
    bgColor: "bg-blue-50 dark:bg-blue-950",
    borderColor: "border-blue-200 dark:border-blue-800",
    description: "ذكّر العملاء بموعد القسط القادم",
    template: "مرحباً {{name}} 👋\n\nنذكركم بموعد القسط القادم بقيمة *{{installmentAmount}} جنيه*\n\nالمتبقي من إجمالي المبلغ: *{{remainingAmount}} جنيه*\n\nشكراً لثقتكم 💙\n{{storeName}}",
    targetType: "installment",
  },
  {
    id: "new_offers",
    name: "🎁 عروض جديدة",
    icon: Gift,
    color: "text-green-500",
    bgColor: "bg-green-50 dark:bg-green-950",
    borderColor: "border-green-200 dark:border-green-800",
    description: "أخبر العملاء بالعروض والخصومات الجديدة",
    template: "مرحباً {{name}} 🎉\n\nعندنا عروض جديدة ومميزة!\nتعال زورنا واستفيد من الخصومات الحصرية ��\n\nفي انتظارك 🏪\n{{storeName}}",
    targetType: "all",
  },
  {
    id: "thank_you",
    name: "💚 شكر وتقدير",
    icon: Sparkles,
    color: "text-purple-500",
    bgColor: "bg-purple-50 dark:bg-purple-950",
    borderColor: "border-purple-200 dark:border-purple-800",
    description: "اشكر العملاء على تعاملهم معك",
    template: "السلام عليكم {{name}} 💚\n\nنشكرك على ثقتك الغالية فينا!\nنتمنى نكون عند حسن ظنك دايماً 🌟\n\nأي وقت محتاج حاجة، إحنا موجودين 🤝\n{{storeName}}",
    targetType: "all",
  },
  {
    id: "custom",
    name: "✏️ رسالة مخصصة",
    icon: MessageSquare,
    color: "text-gray-500",
    bgColor: "bg-gray-50 dark:bg-gray-950",
    borderColor: "border-gray-200 dark:border-gray-800",
    description: "اكتب رسالتك الخاصة",
    template: "",
    targetType: "all",
  },
];

const HELP_CONTENT = {
  noAccounts: {
    title: "📱 محتاج تربط حساب واتساب الأول",
    description: "عشان تبعت رسائل للعملاء، لازم يكون عندك حساب واتساب مربوط ونشط",
    action: "اذهب لصفحة 'إدارة واتساب' واربط حسابك",
  },
  howToCreate: {
    title: "إزاي أعمل حملة؟",
    steps: [
      "1️⃣ اختار قالب الرسالة المناسب",
      "2️⃣ حدد مين العملاء المستهدفين",
      "3️⃣ راجع الرسالة وعدّلها لو محتاج",
      "4️⃣ اضغط 'إنشاء' وبعدين 'تشغيل'",
    ],
  },
  variables: {
    title: "المتغيرات التلقائية",
    items: [
      { var: "{{name}}", desc: "اسم العميل" },
      { var: "{{phone}}", desc: "رقم الموبايل" },
      { var: "{{amount}}", desc: "المبلغ المستحق" },
      { var: "{{storeName}}", desc: "اسم المتجر" },
    ],
  },
};

const WhatsAppCampaigns = () => {
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [addDialog, setAddDialog] = useState(false);
  const [helpDialog, setHelpDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<string | null>(null);
  
  const [wizardStep, setWizardStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [runningCampaign, setRunningCampaign] = useState<string | null>(null);

  const [newCampaign, setNewCampaign] = useState({
    name: "",
    accountId: "",
    template: "",
    targetType: "all" as "credit" | "installment" | "all" | "custom",
    minAmount: "",
    maxAmount: "",
  });

  const [previewMessage, setPreviewMessage] = useState("");
  const [recipientCount, setRecipientCount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    calculateRecipients();
  }, [newCampaign.targetType, newCampaign.minAmount, newCampaign.maxAmount, customers]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      await db.init();
      const [campaignsData, accountsData, customersData] = await Promise.all([
        db.getAll<WhatsAppCampaign>("whatsappCampaigns"),
        db.getAll<WhatsAppAccount>("whatsappAccounts"),
        db.getAll("customers"),
      ]);

      setCampaigns(campaignsData);
      setAccounts(accountsData.filter((a) => a.isActive && a.status === "connected"));
      setCustomers(customersData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "⚠️ خطأ في تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateRecipients = () => {
    let filtered = [...customers];

    if (newCampaign.targetType === "credit") {
      filtered = filtered.filter((c: any) => c.currentBalance > 0);
    } else if (newCampaign.targetType === "installment") {
      filtered = filtered.filter((c: any) => c.hasInstallments);
    }

    if (newCampaign.minAmount) {
      filtered = filtered.filter(
        (c: any) => (c.currentBalance || 0) >= parseFloat(newCampaign.minAmount)
      );
    }
    if (newCampaign.maxAmount) {
      filtered = filtered.filter(
        (c: any) => (c.currentBalance || 0) <= parseFloat(newCampaign.maxAmount)
      );
    }

    filtered = filtered.filter((c: any) => c.phone);
    setRecipientCount(filtered.length);
  };

  const extractVariables = (template: string): string[] => {
    const regex = /{{(.*?)}}/g;
    const matches = template.match(regex);
    return matches ? matches.map((m) => m.replace(/{{|}}/g, "")) : [];
  };

  const generatePreview = () => {
    let preview = newCampaign.template;
    preview = preview.replace(/{{name}}/g, "أحمد محمد");
    preview = preview.replace(/{{phone}}/g, "01012345678");
    preview = preview.replace(/{{amount}}/g, "1,500");
    preview = preview.replace(/{{storeName}}/g, "متجرك");
    preview = preview.replace(/{{installmentAmount}}/g, "500");
    preview = preview.replace(/{{remainingAmount}}/g, "2,000");
    setPreviewMessage(preview);
    setPreviewDialog(true);
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = MESSAGE_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setNewCampaign({
        ...newCampaign,
        template: template.template,
        targetType: template.targetType as any,
        name: template.name.replace(/[🔔📅🎁💚✏️]/g, "").trim(),
      });
    }
  };

  const handleCreate = async () => {
    if (!newCampaign.name || !newCampaign.accountId || !newCampaign.template) {
      toast({ 
        title: "⚠️ في حاجات ناقصة",
        description: "تأكد إنك ملّيت كل الخانات المطلوبة",
        variant: "destructive" 
      });
      return;
    }

    if (recipientCount === 0) {
      toast({
        title: "⚠️ مفيش عملاء",
        description: "مفيش عملاء مطابقين للشروط دي. غيّر الفلاتر",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const variables = extractVariables(newCampaign.template);

      await whatsappService.createCampaign({
        name: newCampaign.name,
        accountId: newCampaign.accountId,
        template: newCampaign.template,
        variables,
        targetType: newCampaign.targetType,
        filters: {
          minAmount: newCampaign.minAmount ? parseFloat(newCampaign.minAmount) : undefined,
          maxAmount: newCampaign.maxAmount ? parseFloat(newCampaign.maxAmount) : undefined,
        },
        status: "draft",
        totalRecipients: recipientCount,
        sentCount: 0,
        failedCount: 0,
      });

      await loadData();
      resetDialog();

      toast({ 
        title: "✅ تم إنشاء الحملة بنجاح!",
        description: "الحملة جاهزة. اضغط ▶️ عشان تشغّلها",
      });
    } catch (error) {
      console.error("Error creating campaign:", error);
      toast({ 
        title: "❌ فشل إنشاء الحملة",
        description: "حصل مشكلة. جرب تاني",
        variant: "destructive" 
      });
    } finally {
      setIsCreating(false);
    }
  };

  const resetDialog = () => {
    setAddDialog(false);
    setWizardStep(1);
    setSelectedTemplate(null);
    setNewCampaign({
      name: "",
      accountId: "",
      template: "",
      targetType: "all",
      minAmount: "",
      maxAmount: "",
    });
  };

  const handleRun = async (campaignId: string) => {
    setRunningCampaign(campaignId);
    try {
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (!campaign) return;

      campaign.status = "running";
      await db.update("whatsappCampaigns", campaign);
      await loadData();

      await whatsappService.runCampaign(campaignId);
      
      toast({ 
        title: "🚀 الحملة شغّالة!",
        description: "الرسائل بتتبعت للعملاء دلوقتي",
      });
    } catch (error) {
      toast({ 
        title: "❌ فشل تشغيل الحملة",
        description: "تأكد إن حساب الواتساب متصل",
        variant: "destructive" 
      });
    } finally {
      setRunningCampaign(null);
    }
  };

  const handlePause = async (campaignId: string) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (!campaign) return;

    campaign.status = "paused";
    await db.update("whatsappCampaigns", campaign);
    await loadData();

    toast({ 
      title: "⏸️ الحملة اتوقفت",
      description: "تقدر تكمّلها في أي وقت",
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await db.delete("whatsappCampaigns", id);
      await loadData();
      setDeleteConfirmDialog(null);
      toast({ title: "🗑️ تم حذف الحملة" });
    } catch (error) {
      toast({ title: "❌ فشل الحذف", variant: "destructive" });
    }
  };

  const getStatusInfo = (status: WhatsAppCampaign["status"]) => {
    const info = {
      draft: { label: "جاهزة للتشغيل", variant: "secondary" as const, icon: Clock, color: "text-gray-500" },
      scheduled: { label: "مجدولة", variant: "outline" as const, icon: Calendar, color: "text-blue-500" },
      running: { label: "شغّالة دلوقتي 🔄", variant: "default" as const, icon: Play, color: "text-green-500" },
      paused: { label: "متوقفة", variant: "secondary" as const, icon: Pause, color: "text-orange-500" },
      completed: { label: "✅ خلصت", variant: "default" as const, icon: CheckCircle2, color: "text-green-600" },
      failed: { label: "❌ فشلت", variant: "destructive" as const, icon: XCircle, color: "text-red-500" },
    };
    return info[status];
  };

  const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0);
  const activeCampaigns = campaigns.filter((c) => c.status === "running").length;

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <POSHeader />
      <main className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Megaphone className="h-8 w-8 text-primary" />
              </div>
              الحملات التسويقية
            </h1>
            <p className="text-muted-foreground mt-2">
              ابعت رسائل واتساب لعملائك بضغطة زر 📱
            </p>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" size="icon" onClick={() => setHelpDialog(true)}>
              <HelpCircle className="h-5 w-5" />
            </Button>
            <Button variant="outline" onClick={loadData} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ml-2 ${isLoading ? "animate-spin" : ""}`} />
              تحديث
            </Button>
            <Button
              onClick={() => setAddDialog(true)}
              disabled={accounts.length === 0}
              size="lg"
              className="text-lg px-6"
            >
              <Plus className="h-5 w-5 ml-2" />
              حملة جديدة
            </Button>
          </div>
        </div>

        {accounts.length === 0 && (
          <Alert className="mb-6 border-orange-500 bg-orange-50 dark:bg-orange-950">
            <Smartphone className="h-5 w-5 text-orange-600" />
            <AlertTitle className="text-orange-700 dark:text-orange-300 text-lg">
              {HELP_CONTENT.noAccounts.title}
            </AlertTitle>
            <AlertDescription className="text-orange-600 dark:text-orange-400">
              {HELP_CONTENT.noAccounts.description}
              <br />
              <strong>{HELP_CONTENT.noAccounts.action}</strong>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <Megaphone className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{campaigns.length}</p>
                  <p className="text-sm text-muted-foreground">حملة</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <Send className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-600">{totalSent}</p>
                  <p className="text-sm text-muted-foreground">رسالة اتبعتت</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                  <Play className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-orange-600">{activeCampaigns}</p>
                  <p className="text-sm text-muted-foreground">حملة شغّالة</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-purple-600">{customers.length}</p>
                  <p className="text-sm text-muted-foreground">عميل</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-xl">حملاتك</CardTitle>
              <CardDescription>
                {campaigns.length === 0 ? "مفيش حملات لسه. اعمل أول حملة!" : `عندك ${campaigns.length} حملة`}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">جاري التحميل...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
                  <Megaphone className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">مفيش حملات لسه 📭</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  الحملات بتساعدك تبعت رسائل لكل عملائك مرة واحدة.
                  <br />
                  زي تذكير بالمستحقات أو إخبارهم بالعروض الجديدة 🎉
                </p>
                {accounts.length > 0 && (
                  <Button onClick={() => setAddDialog(true)} size="lg" className="text-lg px-8">
                    <Plus className="h-5 w-5 ml-2" />
                    اعمل أول حملة
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {campaigns.map((campaign) => {
                  const statusInfo = getStatusInfo(campaign.status);
                  const progress = campaign.totalRecipients > 0 ? (campaign.sentCount / campaign.totalRecipients) * 100 : 0;
                  const StatusIcon = statusInfo.icon;

                  return (
                    <Card key={campaign.id} className="border-2 hover:border-primary/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <StatusIcon className={`h-5 w-5 ${statusInfo.color}`} />
                              <h3 className="font-bold text-lg">{campaign.name}</h3>
                              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-4 text-sm">
                                <span className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  {campaign.totalRecipients} عميل
                                </span>
                                <span className="flex items-center gap-1 text-green-600">
                                  <CheckCircle2 className="h-4 w-4" />
                                  {campaign.sentCount} اتبعت
                                </span>
                                {campaign.failedCount > 0 && (
                                  <span className="flex items-center gap-1 text-red-500">
                                    <XCircle className="h-4 w-4" />
                                    {campaign.failedCount} فشلت
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3">
                                <Progress value={progress} className="h-3 flex-1" />
                                <span className="text-sm font-medium w-12">{Math.round(progress)}%</span>
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground mt-2">
                              �� {new Date(campaign.createdAt).toLocaleDateString("ar-EG", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>

                          <div className="flex gap-2 mr-4">
                            {(campaign.status === "draft" || campaign.status === "paused") && (
                              <Button onClick={() => handleRun(campaign.id)} disabled={runningCampaign === campaign.id} className="gap-2">
                                {runningCampaign === campaign.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                                {campaign.status === "paused" ? "كمّل" : "شغّل"}
                              </Button>
                            )}

                            {campaign.status === "running" && (
                              <Button variant="secondary" onClick={() => handlePause(campaign.id)} className="gap-2">
                                <Pause className="h-4 w-4" />
                                وقّف
                              </Button>
                            )}

                            <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteConfirmDialog(campaign.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={addDialog} onOpenChange={(open) => !open && resetDialog()}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-3">
                <Megaphone className="h-7 w-7 text-primary" />
                إنشاء حملة جديدة
              </DialogTitle>
              <DialogDescription>
                {wizardStep === 1 && "الخطوة 1: اختار نوع الرسالة"}
                {wizardStep === 2 && "الخطوة 2: حدد العملاء المستهدفين"}
                {wizardStep === 3 && "الخطوة 3: راجع وعدّل الرسالة"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex items-center justify-center gap-2 py-4">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex items-center gap-2">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-colors ${wizardStep >= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {step}
                  </div>
                  {step < 3 && <div className={`w-16 h-1 rounded ${wizardStep > step ? "bg-primary" : "bg-muted"}`} />}
                </div>
              ))}
            </div>

            {wizardStep === 1 && (
              <div className="space-y-4">
                <h3 className="font-bold text-lg mb-4">اختار نوع الرسالة:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MESSAGE_TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    return (
                      <Card
                        key={template.id}
                        className={`cursor-pointer transition-all hover:scale-[1.02] ${template.bgColor} ${template.borderColor} border-2 ${selectedTemplate === template.id ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        onClick={() => handleSelectTemplate(template.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-white dark:bg-gray-800">
                              <Icon className={`h-6 w-6 ${template.color}`} />
                            </div>
                            <div>
                              <h4 className="font-bold">{template.name}</h4>
                              <p className="text-sm text-muted-foreground">{template.description}</p>
                            </div>
                          </div>
                          {selectedTemplate === template.id && (
                            <div className="mt-2 flex justify-end">
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {wizardStep === 2 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-bold mb-2 block">اسم الحملة *</Label>
                  <Input value={newCampaign.name} onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })} placeholder="مثال: تذكير بمستحقات شهر ديسمبر" className="text-lg" />
                </div>

                <div>
                  <Label className="text-base font-bold mb-2 block">حساب الواتساب *</Label>
                  <Select value={newCampaign.accountId} onValueChange={(value) => setNewCampaign({ ...newCampaign, accountId: value })}>
                    <SelectTrigger className="text-lg">
                      <SelectValue placeholder="اختار الحساب اللي هيبعت منه" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          <span className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            {account.name} {account.phone && `(${account.phone})`}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-base font-bold mb-2 block">العملاء المستهدفين</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "all", label: "كل العملاء", icon: Users },
                      { value: "credit", label: "عليهم فلوس", icon: CreditCard },
                      { value: "installment", label: "تقسيط", icon: Calendar },
                    ].map((option) => {
                      const Icon = option.icon;
                      return (
                        <Card
                          key={option.value}
                          className={`cursor-pointer transition-all p-4 ${newCampaign.targetType === option.value ? "ring-2 ring-primary bg-primary/5" : "hover:bg-muted"}`}
                          onClick={() => setNewCampaign({ ...newCampaign, targetType: option.value as any })}
                        >
                          <div className="flex flex-col items-center gap-2 text-center">
                            <Icon className="h-8 w-8 text-primary" />
                            <span className="font-medium">{option.label}</span>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {newCampaign.targetType === "credit" && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>الحد الأدنى للمبلغ</Label>
                      <Input type="number" value={newCampaign.minAmount} onChange={(e) => setNewCampaign({ ...newCampaign, minAmount: e.target.value })} placeholder="0" />
                    </div>
                    <div>
                      <Label>الحد الأقصى للمبلغ</Label>
                      <Input type="number" value={newCampaign.maxAmount} onChange={(e) => setNewCampaign({ ...newCampaign, maxAmount: e.target.value })} placeholder="بلا حد" />
                    </div>
                  </div>
                )}

                <Card className={recipientCount === 0 ? "border-red-500" : "border-green-500"}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className={`h-8 w-8 ${recipientCount === 0 ? "text-red-500" : "text-green-500"}`} />
                        <div>
                          <p className="text-2xl font-bold">{recipientCount}</p>
                          <p className="text-sm text-muted-foreground">عميل هيوصلهم الرسالة</p>
                        </div>
                      </div>
                      {recipientCount === 0 && <Badge variant="destructive">مفيش عملاء!</Badge>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {wizardStep === 3 && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="text-base font-bold">نص الرسالة</Label>
                    <Button variant="outline" size="sm" onClick={generatePreview}>
                      <Eye className="h-4 w-4 ml-2" />
                      معاينة
                    </Button>
                  </div>
                  <Textarea value={newCampaign.template} onChange={(e) => setNewCampaign({ ...newCampaign, template: e.target.value })} placeholder="اكتب رسالتك هنا..." rows={8} className="text-lg leading-relaxed" />
                </div>

                <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                  <CardContent className="p-4">
                    <h4 className="font-bold mb-3 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-blue-500" />
                      المتغيرات التلقائية
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">دي كلمات بتتغير تلقائي لكل عميل:</p>
                    <div className="flex flex-wrap gap-2">
                      {HELP_CONTENT.variables.items.map((item) => (
                        <Badge key={item.var} variant="secondary" className="cursor-pointer hover:bg-primary hover:text-primary-foreground" onClick={() => setNewCampaign({ ...newCampaign, template: newCampaign.template + " " + item.var })}>
                          {item.var} = {item.desc}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4">
                    <h4 className="font-bold mb-3">📋 ملخص الحملة</h4>
                    <div className="space-y-2 text-sm">
                      <p>📝 <strong>الاسم:</strong> {newCampaign.name || "-"}</p>
                      <p>📱 <strong>الحساب:</strong> {accounts.find(a => a.id === newCampaign.accountId)?.name || "-"}</p>
                      <p>👥 <strong>المستهدفين:</strong> {recipientCount} عميل</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              {wizardStep > 1 && (
                <Button variant="outline" onClick={() => setWizardStep((s) => s - 1)}>
                  <ArrowRight className="h-4 w-4 ml-2" />
                  رجوع
                </Button>
              )}
              <Button variant="ghost" onClick={resetDialog}>إلغاء</Button>
              {wizardStep < 3 ? (
                <Button onClick={() => setWizardStep((s) => s + 1)} disabled={(wizardStep === 1 && !selectedTemplate) || (wizardStep === 2 && (!newCampaign.name || !newCampaign.accountId))}>
                  التالي
                  <ArrowLeft className="h-4 w-4 mr-2" />
                </Button>
              ) : (
                <Button onClick={handleCreate} disabled={isCreating || !newCampaign.template || recipientCount === 0} className="gap-2">
                  {isCreating ? <><Loader2 className="h-4 w-4 animate-spin" />جاري الإنشاء...</> : <><CheckCircle2 className="h-4 w-4" />إنشاء الحملة</>}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={previewDialog} onOpenChange={setPreviewDialog}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />معاينة الرسالة</DialogTitle>
              <DialogDescription>كده هتظهر الرسالة للعميل</DialogDescription>
            </DialogHeader>
            <Card className="bg-green-50 dark:bg-green-950 border-green-300">
              <CardContent className="p-4">
                <div className="whitespace-pre-wrap text-base leading-relaxed">{previewMessage}</div>
              </CardContent>
            </Card>
            <DialogFooter><Button onClick={() => setPreviewDialog(false)}>تمام</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteConfirmDialog} onOpenChange={() => setDeleteConfirmDialog(null)}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600"><Trash2 className="h-5 w-5" />حذف الحملة؟</DialogTitle>
            </DialogHeader>
            <p className="text-center py-4">هل أنت متأكد من حذف هذه الحملة؟<br /><span className="text-muted-foreground text-sm">لا يمكن التراجع عن هذا الإجراء</span></p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmDialog(null)}>لا، إلغاء</Button>
              <Button variant="destructive" onClick={() => deleteConfirmDialog && handleDelete(deleteConfirmDialog)}><Trash2 className="h-4 w-4 ml-2" />نعم، احذف</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={helpDialog} onOpenChange={setHelpDialog}>
          <DialogContent dir="rtl" className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl"><HelpCircle className="h-6 w-6 text-primary" />مساعدة - الحملات التسويقية</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <CardContent className="p-4">
                  <h4 className="font-bold mb-3">{HELP_CONTENT.howToCreate.title}</h4>
                  <div className="space-y-2">{HELP_CONTENT.howToCreate.steps.map((step, i) => <p key={i} className="text-sm">{step}</p>)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <h4 className="font-bold mb-3">{HELP_CONTENT.variables.title}</h4>
                  <div className="space-y-2">{HELP_CONTENT.variables.items.map((item) => <div key={item.var} className="flex items-center gap-2"><Badge variant="outline">{item.var}</Badge><span className="text-sm">= {item.desc}</span></div>)}</div>
                </CardContent>
              </Card>
              <Card className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <CardContent className="p-4">
                  <h4 className="font-bold mb-3">💡 نصائح مهمة</h4>
                  <ul className="text-sm space-y-2">
                    <li>• متبعتش رسائل كتير في يوم واحد عشان الحساب ميتحظرش</li>
                    <li>• اختار وقت مناسب لإرسال الرسائل (مش بالليل)</li>
                    <li>• الرسايل القصيرة بتوصل أسرع</li>
                    <li>• تأكد إن أرقام العملاء صحيحة</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
            <DialogFooter><Button onClick={() => setHelpDialog(false)}>فهمت، شكراً!</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default WhatsAppCampaigns;
