import { useState, useEffect } from "react";
import { POSHeader } from "@/components/POS/POSHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { db, WhatsAppAccount } from "@/lib/indexedDB";
import { whatsappService } from "@/services/whatsapp/whatsappService";
import {
  MessageSquare,
  Plus,
  Power,
  QrCode,
  Trash2,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import QRCodeLib from "qrcode";

const WhatsAppManagement = () => {
  const { toast } = useToast();
  const { can } = useAuth();
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [addDialog, setAddDialog] = useState(false);
  const [qrDialog, setQrDialog] = useState(false);
  const [selectedQR, setSelectedQR] = useState<string>("");
  const [qrImage, setQrImage] = useState<string>("");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Loading states
  const [isLoading, setIsLoading] = useState(true);
  const [connectingAccount, setConnectingAccount] = useState<string | null>(
    null
  );
  const [deletingAccount, setDeletingAccount] = useState<string | null>(null);
  const [disconnectingAccount, setDisconnectingAccount] = useState<
    string | null
  >(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [qrCountdown, setQrCountdown] = useState<number>(120);

  const [newAccount, setNewAccount] = useState({
    name: "",
    phone: "",
    dailyLimit: 100,
    antiSpamDelay: 3000,
  });

  useEffect(() => {
    loadAccounts();

    // Network listener
    const handleOnline = () => {
      setIsOnline(true);
      toast({ title: "🌐 الإنترنت متصل" });
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({ title: "🌐 الإنترنت غير متصل", variant: "destructive" });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Monitor WhatsApp connection states continuously
  useEffect(() => {
    if (!(window as any).electronAPI?.whatsapp) return;

    const statusChecker = setInterval(async () => {
      // Check status for all accounts
      for (const account of accounts) {
        try {
          const state = await (window as any).electronAPI.whatsapp.getState(
            account.id
          );

          // Update database if status changed
          if (state.status && state.status !== account.status) {
            account.status = state.status as any;
            await db.update("whatsappAccounts", account);

            // Reload to update UI
            await loadAccounts();

            // Show notification
            if (state.status === "connected") {
              toast({ title: `✅ ${account.name} متصل الآن` });
            } else if (state.status === "disconnected") {
              toast({
                title: `⚠️ ${account.name} غير متصل`,
                variant: "destructive",
              });
            }
          }
        } catch (error) {
          console.error(`Error checking status for ${account.id}:`, error);
        }
      }
    }, 5000); // Check every 5 seconds

    return () => clearInterval(statusChecker);
  }, [accounts]);

  const loadAccounts = async () => {
    setIsLoading(true);
    try {
      await db.init();
      const data = await db.getAll<WhatsAppAccount>("whatsappAccounts");

      // Sync with electron state
      if ((window as any).electronAPI?.whatsapp) {
        for (const account of data) {
          const state = await (window as any).electronAPI.whatsapp.getState(
            account.id
          );
          if (state.status && state.status !== account.status) {
            account.status = state.status as any;
            await db.update("whatsappAccounts", account);
          }
        }
      }

      setAccounts(data);
    } catch (error: any) {
      console.error("Error loading accounts:", error);
      if (error.message?.includes("not found")) {
        toast({
          title: "خطأ في قاعدة البيانات",
          description:
            "جداول الواتساب غير موجودة. اضغط 'إعادة إنشاء قاعدة البيانات'",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetDatabase = async () => {
    const confirmed = confirm(
      "هل أنت متأكد من إعادة إنشاء قاعدة البيانات؟\n\nسيتم حذف جميع البيانات القديمة!"
    );

    if (!confirmed) return;

    try {
      await db.resetDatabase();
      toast({
        title: "✅ تم إعادة إنشاء قاعدة البيانات",
        description: "يمكنك الآن إضافة حسابات الواتساب",
      });
      await loadAccounts();
    } catch (error) {
      toast({
        title: "خطأ",
        description: "فشل إعادة إنشاء قاعدة البيانات",
        variant: "destructive",
      });
    }
  };

  const handleAddAccount = async () => {
    if (!newAccount.name || !newAccount.phone) {
      toast({ title: "الاسم والرقم مطلوبان", variant: "destructive" });
      return;
    }

    setIsAddingAccount(true);
    try {
      const account: WhatsAppAccount = {
        id: Date.now().toString(),
        name: newAccount.name,
        phone: newAccount.phone,
        status: "disconnected",
        dailyLimit: newAccount.dailyLimit,
        dailySent: 0,
        lastResetDate: new Date().toISOString(),
        antiSpamDelay: newAccount.antiSpamDelay,
        isActive: false,
        createdAt: new Date().toISOString(),
      };

      await db.add("whatsappAccounts", account);
      await loadAccounts();
      setAddDialog(false);
      setNewAccount({
        name: "",
        phone: "",
        dailyLimit: 100,
        antiSpamDelay: 3000,
      });
      toast({ title: "✅ تم إضافة الحساب بنجاح" });
    } catch (error) {
      console.error("Error adding account:", error);
      toast({ title: "فشل إضافة الحساب", variant: "destructive" });
    } finally {
      setIsAddingAccount(false);
    }
  };

  const handleConnect = async (accountId: string) => {
    setConnectingAccount(accountId);
    setQrCountdown(120);

    try {
      await whatsappService.initAccount(accountId);

      let countdownInterval: number | null = null;
      let pollQR: number | null = null;

      // Start countdown timer (only once)
      countdownInterval = window.setInterval(() => {
        setQrCountdown((prev) => {
          if (prev <= 1) {
            if (countdownInterval) window.clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Poll for QR code from Electron main process (every 2 seconds to avoid conflicts)
      pollQR = window.setInterval(async () => {
        if ((window as any).electronAPI?.whatsapp) {
          const state = await (window as any).electronAPI.whatsapp.getState(
            accountId
          );

          if (state.status === "qr" && state.qrCode) {
            setSelectedQR(state.qrCode);

            // Convert QR code text to image
            try {
              const qrImageUrl = await QRCodeLib.toDataURL(state.qrCode, {
                width: 400,
                margin: 2,
                color: {
                  dark: "#000000",
                  light: "#FFFFFF",
                },
              });
              setQrImage(qrImageUrl);
              setQrDialog(true);
              setConnectingAccount(null);
            } catch (err) {
              console.error("Failed to generate QR image:", err);
              toast({ title: "فشل إنشاء صورة QR", variant: "destructive" });
            }

            // Don't stop polling yet - wait for connection
          } else if (state.status === "connected") {
            if (pollQR) window.clearInterval(pollQR);
            if (countdownInterval) window.clearInterval(countdownInterval);

            // Close QR dialog if open
            setQrDialog(false);
            setQrImage("");
            setSelectedQR("");
            setConnectingAccount(null);

            // Update database status
            const account = await db.get<WhatsAppAccount>(
              "whatsappAccounts",
              accountId
            );
            if (account) {
              account.status = "connected";
              account.lastConnectedAt = new Date().toISOString();
              await db.update("whatsappAccounts", account);
            }
            await loadAccounts();
            toast({
              title: "✅ تم الاتصال بنجاح",
              description: `الحساب ${account?.name} متصل الآن`,
            });
          } else if (state.status === "failed") {
            if (pollQR) window.clearInterval(pollQR);
            if (countdownInterval) window.clearInterval(countdownInterval);
            setQrDialog(false);
            setConnectingAccount(null);
            toast({
              title: "فشل الاتصال",
              description: state.error,
              variant: "destructive",
            });
          }
        }
      }, 2000);

      // Stop polling after 2 minutes
      setTimeout(() => {
        if (pollQR) window.clearInterval(pollQR);
        if (countdownInterval) window.clearInterval(countdownInterval);

        if (qrDialog) {
          setQrDialog(false);
          setConnectingAccount(null);
          toast({
            title: "⏱️ انتهت مهلة الاتصال",
            description: "يرجى المحاولة مرة أخرى",
            variant: "destructive",
          });
        }
      }, 120000);
    } catch (error) {
      setConnectingAccount(null);
      toast({ title: "فشل الاتصال", variant: "destructive" });
    }
  };

  const handleToggleActive = async (account: WhatsAppAccount) => {
    if (account.status !== "connected") {
      toast({ title: "يجب الاتصال أولاً", variant: "destructive" });
      return;
    }

    account.isActive = !account.isActive;
    await db.update("whatsappAccounts", account);
    await loadAccounts();
    toast({ title: account.isActive ? "تم التفعيل" : "تم التعطيل" });
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "هل أنت متأكد من حذف هذا الحساب؟\nسيتم فصل الاتصال وحذف جميع البيانات المرتبطة."
      )
    )
      return;

    setDeletingAccount(id);
    try {
      // Disconnect from WhatsApp if connected
      if ((window as any).electronAPI?.whatsapp) {
        await (window as any).electronAPI.whatsapp.disconnect(id);
      }

      // Delete from database
      await db.delete("whatsappAccounts", id);

      // Delete related messages and campaigns (simple approach without filtering)
      try {
        const messages: any[] = await db.getAll("whatsappMessages");
        for (const msg of messages) {
          if (msg?.accountId === id) {
            await db.delete("whatsappMessages", msg.id);
          }
        }
      } catch (e) {
        console.log("No messages to delete");
      }

      try {
        const campaigns: any[] = await db.getAll("whatsappCampaigns");
        for (const camp of campaigns) {
          if (camp?.accountId === id) {
            await db.delete("whatsappCampaigns", camp.id);
          }
        }
      } catch (e) {
        console.log("No campaigns to delete");
      }

      await loadAccounts();
      toast({ title: "✅ تم حذف الحساب وجميع بياناته" });
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({ title: "فشل حذف الحساب", variant: "destructive" });
    } finally {
      setDeletingAccount(null);
    }
  };

  const getStatusBadge = (status: WhatsAppAccount["status"]) => {
    const variants = {
      connected: "default",
      connecting: "secondary",
      qr: "outline",
      disconnected: "destructive",
      failed: "destructive",
    };

    const labels = {
      connected: "متصل",
      connecting: "يتصل...",
      qr: "انتظار QR",
      disconnected: "غير متصل",
      failed: "فشل",
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
              <MessageSquare className="h-8 w-8" />
              إدارة حسابات WhatsApp
            </h1>
            <p className="text-muted-foreground mt-1">
              ربط وإدارة حسابات WhatsApp للنظام
            </p>
          </div>
          <div className="flex gap-3 items-center">
            {/* Network Status */}
            <Badge
              variant={isOnline ? "default" : "destructive"}
              className="px-4 py-2"
            >
              {isOnline ? (
                <>
                  <Wifi className="h-4 w-4 ml-2" />
                  متصل
                </>
              ) : (
                <>
                  <WifiOff className="h-4 w-4 ml-2" />
                  غير متصل
                </>
              )}
            </Badge>

            {/* Reset Database Button */}
            <Button variant="outline" onClick={handleResetDatabase} size="sm">
              <Power className="h-4 w-4 ml-2" />
              إعادة إنشاء DB
            </Button>

            {can("whatsapp", "create") && (
              <Button onClick={() => setAddDialog(true)}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة حساب
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                إجمالي الحسابات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{accounts.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                حسابات متصلة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {accounts.filter((a) => a.status === "connected").length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                حسابات نشطة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {accounts.filter((a) => a.isActive).length}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                رسائل اليوم
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {accounts.reduce((sum, a) => sum + a.dailySent, 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accounts Table */}
        <Card>
          <CardHeader>
            <CardTitle>الحسابات المتصلة ({accounts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">جاري تحميل الحسابات...</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium mb-2">
                  لا توجد حسابات WhatsApp
                </p>
                <p className="text-sm mb-4">
                  ابدأ بإضافة أول حساب للبدء في إرسال الرسائل
                </p>
                <Button onClick={() => setAddDialog(true)} size="lg">
                  <Plus className="h-4 w-4 ml-2" />
                  أضف أول حساب
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الرقم</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الحد اليومي</TableHead>
                    <TableHead>المرسل اليوم</TableHead>
                    <TableHead>التأخير</TableHead>
                    <TableHead>نشط</TableHead>
                    <TableHead>آخر اتصال</TableHead>
                    <TableHead>إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        {account.name}
                      </TableCell>
                      <TableCell>{account.phone}</TableCell>
                      <TableCell>{getStatusBadge(account.status)}</TableCell>
                      <TableCell>{account.dailyLimit}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {account.dailySent}/{account.dailyLimit}
                        </Badge>
                      </TableCell>
                      <TableCell>{account.antiSpamDelay / 1000}ث</TableCell>
                      <TableCell>
                        <Switch
                          checked={account.isActive}
                          onCheckedChange={() => handleToggleActive(account)}
                          disabled={account.status !== "connected"}
                        />
                      </TableCell>
                      <TableCell>
                        {account.lastConnectedAt
                          ? new Date(account.lastConnectedAt).toLocaleString(
                              "ar"
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {account.status === "disconnected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConnect(account.id)}
                              disabled={
                                !isOnline || connectingAccount === account.id
                              }
                              title="ربط الحساب"
                            >
                              {connectingAccount === account.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                                  جاري الربط...
                                </>
                              ) : (
                                <>
                                  <Power className="h-4 w-4 ml-1" />
                                  ربط
                                </>
                              )}
                            </Button>
                          )}

                          {account.status === "qr" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedQR(account.qrCode || "");
                                setQrDialog(true);
                              }}
                              title="عرض QR Code"
                            >
                              <QrCode className="h-4 w-4 ml-1" />
                              QR
                            </Button>
                          )}

                          {account.status === "connected" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={async () => {
                                setDisconnectingAccount(account.id);
                                try {
                                  if ((window as any).electronAPI?.whatsapp) {
                                    await (
                                      window as any
                                    ).electronAPI.whatsapp.disconnect(
                                      account.id
                                    );
                                    toast({ title: "✅ تم قطع الاتصال" });
                                    await loadAccounts();
                                  }
                                } finally {
                                  setDisconnectingAccount(null);
                                }
                              }}
                              disabled={disconnectingAccount === account.id}
                              title="قطع الاتصال"
                            >
                              {disconnectingAccount === account.id ? (
                                <>
                                  <Loader2 className="h-4 w-4 ml-1 animate-spin" />
                                  قطع...
                                </>
                              ) : (
                                <>
                                  <Power className="h-4 w-4 ml-1" />
                                  قطع
                                </>
                              )}
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(account.id)}
                            disabled={deletingAccount === account.id}
                            title="حذف الحساب"
                          >
                            {deletingAccount === account.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Add Account Dialog */}
        <Dialog open={addDialog} onOpenChange={setAddDialog}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>إضافة حساب WhatsApp</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>اسم الحساب *</Label>
                <Input
                  value={newAccount.name}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, name: e.target.value })
                  }
                  placeholder="مثال: حساب المبيعات"
                />
              </div>

              <div>
                <Label>رقم الهاتف *</Label>
                <Input
                  value={newAccount.phone}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, phone: e.target.value })
                  }
                  placeholder="201234567890"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  أدخل الرقم بصيغة دولية (مثال: 201234567890)
                </p>
              </div>

              <div>
                <Label>الحد الأقصى للرسائل اليومية</Label>
                <Input
                  type="number"
                  value={newAccount.dailyLimit}
                  onChange={(e) =>
                    setNewAccount({
                      ...newAccount,
                      dailyLimit: parseInt(e.target.value) || 100,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  يُنصح بـ 100-300 رسالة يومياً لتجنب الحظر
                </p>
              </div>

              <div>
                <Label>التأخير بين الرسائل (بالميلي ثانية)</Label>
                <Input
                  type="number"
                  value={newAccount.antiSpamDelay}
                  onChange={(e) =>
                    setNewAccount({
                      ...newAccount,
                      antiSpamDelay: parseInt(e.target.value) || 3000,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  يُنصح بـ 3000-5000 ميلي ثانية (3-5 ثواني)
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setAddDialog(false)}
                disabled={isAddingAccount}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleAddAccount}
                disabled={
                  isAddingAccount || !newAccount.name || !newAccount.phone
                }
              >
                {isAddingAccount ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 ml-2" />
                    إضافة
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* QR Code Dialog */}
        <Dialog open={qrDialog} onOpenChange={setQrDialog}>
          <DialogContent dir="rtl" className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-center flex items-center justify-center gap-2">
                امسح رمز QR للربط
                {qrCountdown > 0 && (
                  <Badge variant="outline" className="mr-2">
                    {Math.floor(qrCountdown / 60)}:
                    {String(qrCountdown % 60).padStart(2, "0")}
                  </Badge>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col items-center py-6">
              {qrImage ? (
                <>
                  <div className="relative mb-6">
                    <img
                      src={qrImage}
                      alt="QR Code"
                      className="w-80 h-80 border-4 border-primary rounded-lg shadow-lg"
                    />
                  </div>

                  <div className="space-y-2 text-center w-full">
                    <p className="text-sm font-medium">خطوات الربط:</p>
                    <ol className="text-xs text-muted-foreground space-y-1 text-right bg-muted p-4 rounded-lg">
                      <li>1. افتح WhatsApp على هاتفك</li>
                      <li>
                        2. اذهب إلى{" "}
                        <strong>الإعدادات → الأجهزة المرتبطة</strong>
                      </li>
                      <li>
                        3. اضغط على <strong>ربط جهاز</strong>
                      </li>
                      <li>4. امسح الرمز أعلاه</li>
                    </ol>
                  </div>

                  {qrCountdown <= 30 && qrCountdown > 0 && (
                    <Badge variant="destructive" className="mt-4 animate-pulse">
                      ⏱️ {qrCountdown} ثانية متبقية
                    </Badge>
                  )}
                </>
              ) : (
                <div className="w-80 h-80 flex items-center justify-center bg-muted rounded-lg">
                  <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="font-medium">جاري إنشاء رمز QR...</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      يرجى الانتظار لحظات
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setQrDialog(false)}>
                إغلاق
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default WhatsAppManagement;
