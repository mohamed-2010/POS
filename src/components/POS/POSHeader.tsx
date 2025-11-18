import {
  ShoppingCart,
  Users,
  FileText,
  LogOut,
  User,
  Menu,
  Shield,
  FolderOpen,
  Clock,
  PlayCircle,
  StopCircle,
  MessageSquare,
  Send,
  Ruler,
  DollarSign,
  CreditCard,
  Printer,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, Shift } from "@/lib/indexedDB";
import { useToast } from "@/hooks/use-toast";

export const POSHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { getSetting } = useSettingsContext();
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("");
  const [closeShiftDialogOpen, setCloseShiftDialogOpen] = useState(false);
  const [actualCashInDrawer, setActualCashInDrawer] = useState("");
  const [dailySummaryDialogOpen, setDailySummaryDialogOpen] = useState(false);
  const [dailySummary, setDailySummary] = useState<any>(null);

  const storeName = getSetting("storeName") || "نظام نقاط البيع";

  useEffect(() => {
    loadCurrentShift();
  }, []);

  // معالج إغلاق النافذة/البرنامج
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // إذا كانت هناك وردية مفتوحة، اعرض تحذير
      if (currentShift && currentShift.status === "active") {
        e.preventDefault();
        e.returnValue = "لديك وردية مفتوحة. هل تريد المتابعة؟";

        // فتح dialog لإغلاق الوردية
        setCloseShiftDialogOpen(true);

        return "لديك وردية مفتوحة. هل تريد المتابعة؟";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentShift]);

  const loadCurrentShift = async () => {
    await db.init();
    const shifts = await db.getAll<Shift>("shifts");
    const activeShift = shifts.find((s) => s.status === "active");
    setCurrentShift(activeShift || null);
  };

  const handleStartShift = async () => {
    if (!user) return;

    try {
      const newShift: Shift = {
        id: Date.now().toString(),
        employeeId: user.id,
        employeeName: user.name,
        startTime: new Date().toISOString(),
        startingCash: parseFloat(openingBalance) || 0,
        status: "active",
        sales: {
          totalInvoices: 0,
          totalAmount: 0,
          cashSales: 0,
          cardSales: 0,
          walletSales: 0,
          returns: 0,
        },
        expenses: 0,
        purchaseReturns: 0,
      };

      await db.add("shifts", newShift);
      setCurrentShift(newShift);
      setShiftDialogOpen(false);
      setOpeningBalance("");
      toast({
        title: "تم بدء الوردية بنجاح",
        description: `رصيد افتتاحي: ${newShift.startingCash} جنيه`,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء بدء الوردية",
        variant: "destructive",
      });
    }
  };

  const handleEndShift = async () => {
    if (!currentShift) return;

    const confirmed = confirm(
      "هل أنت متأكد من إنهاء الوردية؟\nسيتم حساب جميع المعاملات تلقائياً."
    );

    if (!confirmed) return;

    try {
      // حساب المبيعات والمصروفات
      const invoices = await db.getAll<any>("invoices");
      const expenses = await db.getAll<any>("expenses");
      const deposits = await db.getAll<any>("deposits");
      const paymentMethods = await db.getAll<any>("paymentMethods");

      const shiftInvoices = invoices.filter(
        (inv: any) => inv.shiftId === currentShift.id
      );
      const shiftExpenses = expenses.filter(
        (exp: any) => exp.shiftId === currentShift.id
      );
      const shiftDeposits = deposits.filter(
        (dep: any) => dep.shiftId === currentShift.id
      );

      const totalSales = shiftInvoices.reduce(
        (sum: number, inv: any) => sum + (inv.total || 0),
        0
      );
      const totalExpenses = shiftExpenses.reduce(
        (sum: number, exp: any) => sum + (exp.amount || 0),
        0
      );
      const totalDeposits = shiftDeposits.reduce(
        (sum: number, dep: any) => sum + (dep.amount || 0),
        0
      );

      // حساب طرق الدفع بشكل صحيح
      let cashSales = 0;
      let cardSales = 0;
      let walletSales = 0;

      shiftInvoices.forEach((inv: any) => {
        // النظام الجديد - split payments
        if (inv.paymentMethodAmounts && inv.paymentMethodIds) {
          inv.paymentMethodIds.forEach((methodId: string) => {
            const amount = inv.paymentMethodAmounts[methodId] || 0;
            const method = paymentMethods.find((pm: any) => pm.id === methodId);

            if (method) {
              if (method.type === "cash") {
                cashSales += amount;
              } else if (method.type === "card") {
                cardSales += amount;
              } else if (method.type === "wallet") {
                walletSales += amount;
              }
            } else {
              cashSales += amount;
            }
          });
        }
        // النظام القديم
        else if (inv.paymentType === "cash") {
          cashSales += inv.total || 0;
        }
      });

      const expectedCash =
        currentShift.startingCash + cashSales - totalExpenses - totalDeposits;

      const updatedShift: Shift = {
        ...currentShift,
        endTime: new Date().toISOString(),
        expectedCash,
        actualCash: expectedCash,
        difference: 0,
        status: "closed",
        closedBy: user?.name || "غير معروف",
        sales: {
          totalInvoices: shiftInvoices.length,
          totalAmount: totalSales,
          cashSales,
          cardSales,
          walletSales,
          returns: 0,
        },
      };

      await db.update("shifts", updatedShift);
      setCurrentShift(null);
      toast({
        title: "تم إنهاء الوردية بنجاح",
        description: `إجمالي المبيعات: ${totalSales.toFixed(2)} جنيه`,
      });
    } catch (error) {
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إنهاء الوردية",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    // إذا كان هناك وردية مفتوحة، اعرض نافذة الإغلاق
    if (currentShift && currentShift.status === "active") {
      setCloseShiftDialogOpen(true);
    } else {
      // لا توجد وردية مفتوحة، قم بتسجيل الخروج مباشرة
      logout();
      navigate("/login");
    }
  };

  const handleConfirmLogout = async (closeShift: boolean) => {
    if (closeShift && currentShift) {
      try {
        await handleEndShift();
      } catch (error) {
        console.error("Error closing shift:", error);
      }
    }

    setCloseShiftDialogOpen(false);
    logout();
    navigate("/login");
  };

  const loadDailySummary = async () => {
    await db.init();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const invoices = await db.getAll<any>("invoices");
    const expenses = await db.getAll<any>("expenses");
    const salesReturns = await db.getAll<any>("salesReturns");
    const paymentMethods = await db.getAll<any>("paymentMethods");

    // تصفية البيانات اليومية
    const todayInvoices = invoices.filter((inv: any) => {
      const invDate = new Date(inv.createdAt);
      invDate.setHours(0, 0, 0, 0);
      return invDate.getTime() === today.getTime();
    });

    const todayExpenses = expenses.filter((exp: any) => {
      const expDate = new Date(exp.createdAt);
      expDate.setHours(0, 0, 0, 0);
      return expDate.getTime() === today.getTime();
    });

    const todayReturns = salesReturns.filter((ret: any) => {
      const retDate = new Date(ret.createdAt);
      retDate.setHours(0, 0, 0, 0);
      return retDate.getTime() === today.getTime();
    });

    // حساب الملخص
    const totalSales = todayInvoices.reduce(
      (sum: number, inv: any) => sum + (inv.total || 0),
      0
    );
    const totalExpenses = todayExpenses.reduce(
      (sum: number, exp: any) => sum + (exp.amount || 0),
      0
    );
    const totalReturns = todayReturns.reduce(
      (sum: number, ret: any) => sum + (ret.total || 0),
      0
    );

    // حساب طرق الدفع بشكل صحيح
    let cashSales = 0;
    let cardSales = 0;
    let walletSales = 0;

    todayInvoices.forEach((inv: any) => {
      // النظام الجديد - split payments
      if (inv.paymentMethodAmounts && inv.paymentMethodIds) {
        inv.paymentMethodIds.forEach((methodId: string) => {
          const amount = inv.paymentMethodAmounts[methodId] || 0;
          const method = paymentMethods.find((pm: any) => pm.id === methodId);

          if (method) {
            // تصنيف حسب نوع طريقة الدفع
            if (method.type === "cash") {
              cashSales += amount;
            } else if (method.type === "card") {
              cardSales += amount;
            } else if (method.type === "wallet") {
              walletSales += amount;
            }
          } else {
            // إذا لم نجد الطريقة، نضعها في نقدي افتراضياً
            cashSales += amount;
          }
        });
      }
      // النظام القديم - paymentType فقط
      else if (inv.paymentType) {
        const amount = inv.total || 0;
        if (inv.paymentType === "cash") {
          cashSales += amount;
        }
        // credit و installment لا تُحسب هنا لأنها ليست مدفوعات فورية
      }
    });

    setDailySummary({
      invoiceCount: todayInvoices.length,
      totalSales,
      cashSales,
      cardSales,
      walletSales,
      totalExpenses,
      totalReturns,
      netProfit: totalSales - totalExpenses - totalReturns,
    });

    setDailySummaryDialogOpen(true);
  };

  const menuItems = [
    {
      title: "الصفحات الرئيسية",
      items: [
        { name: "نقطة البيع", icon: ShoppingCart, path: "/" },
        { name: "العملاء", icon: Users, path: "/customers" },
        { name: "التقارير", icon: FileText, path: "/reports" },
      ],
    },
    {
      title: "الإدارة",
      items: [
        { name: "المخزون", icon: ShoppingCart, path: "/inventory" },
        {
          name: "أقسام المنتجات",
          icon: FolderOpen,
          path: "/product-categories",
        },
        { name: "الموردين", icon: Users, path: "/suppliers" },
        { name: "الموظفين", icon: Users, path: "/employees" },
        { name: "سُلف الموظفين", icon: FileText, path: "/employee-advances" },
        {
          name: "خصومات الموظفين",
          icon: FileText,
          path: "/employee-deductions",
        },
        { name: "العروض والخصومات", icon: FileText, path: "/promotions" },
        { name: "إدارة التقسيط", icon: FileText, path: "/installments" },
        { name: "إدارة الآجل", icon: FileText, path: "/credit" },
      ],
    },
    {
      title: "المالية",
      items: [
        { name: "مصادر الإيداعات", icon: FileText, path: "/deposit-sources" },
        { name: "الإيداعات", icon: FileText, path: "/deposits" },
        { name: "فئات المصروفات", icon: FileText, path: "/expense-categories" },
        { name: "المصروفات", icon: FileText, path: "/expenses" },
      ],
    },
    {
      title: "الورديات والمرتجعات",
      items: [
        { name: "إدارة الورديات", icon: ShoppingCart, path: "/shifts" },
        { name: "مرتجع المبيعات", icon: FileText, path: "/sales-returns" },
        { name: "مرتجع المشتريات", icon: FileText, path: "/purchase-returns" },
      ],
    },
    {
      title: "المطاعم",
      items: [
        { name: "الصالات والطاولات", icon: ShoppingCart, path: "/restaurant" },
      ],
    },
    {
      title: "الواتساب",
      items: [
        {
          name: "إدارة الحسابات",
          icon: MessageSquare,
          path: "/whatsapp-management",
        },
        { name: "الحملات التسويقية", icon: Send, path: "/whatsapp-campaigns" },
      ],
    },
    {
      title: "الإعدادات الأساسية",
      items: [
        { name: "وحدات القياس", icon: Ruler, path: "/units" },
        { name: "أنواع التسعير", icon: DollarSign, path: "/price-types" },
        { name: "طرق الدفع", icon: CreditCard, path: "/payment-methods" },
        { name: "إعدادات الطابعة", icon: Printer, path: "/printer-settings" },
      ],
    },
    {
      title: "النظام",
      items: [
        { name: "الإعدادات", icon: ShoppingCart, path: "/settings" },
        {
          name: "الأدوار والصلاحيات",
          icon: Shield,
          path: "/roles-permissions",
        },
      ],
    },
  ];

  return (
    <header className="bg-gradient-primary text-primary-foreground shadow-primary sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{storeName}</h1>
            <p className="text-sm text-primary-foreground/80">
              إدارة متكاملة للمبيعات والمخزون
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Daily Summary Button */}
          <Button
            variant="default"
            onClick={loadDailySummary}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <TrendingUp className="h-4 w-4" />
            ملخص اليوم
          </Button>

          {/* Shift Button */}
          {currentShift ? (
            <Button
              variant="default"
              onClick={handleEndShift}
              className="gap-2 bg-red-600 hover:bg-red-700 text-white"
            >
              <StopCircle className="h-4 w-4" />
              إنهاء الوردية
            </Button>
          ) : (
            <Button
              variant="default"
              onClick={() => setShiftDialogOpen(true)}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <PlayCircle className="h-4 w-4" />
              بدء وردية
            </Button>
          )}

          <Button
            variant="ghost"
            onClick={() => setMenuOpen(true)}
            className="gap-2 text-primary-foreground hover:text-primary-foreground"
          >
            <Menu className="h-5 w-5" />
            القائمة
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gap-2 text-primary-foreground hover:text-primary-foreground"
              >
                <User className="h-4 w-4" />
                {user?.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div dir="rtl">
                <DropdownMenuLabel>الحساب</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="ml-2 h-4 w-4" />
                  <span>
                    الدور:{" "}
                    {user?.role === "admin"
                      ? "مدير النظام"
                      : user?.role === "manager"
                      ? "مدير"
                      : user?.role === "cashier"
                      ? "كاشير"
                      : "محاسب"}
                  </span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-destructive"
                >
                  <LogOut className="ml-2 h-4 w-4" />
                  <span>تسجيل الخروج</span>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent
          className="max-w-2xl max-h-[80vh] overflow-y-auto"
          dir="rtl"
        >
          <DialogHeader>
            <DialogTitle className="text-2xl">القائمة الرئيسية</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {menuItems.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-lg font-semibold mb-3 text-primary">
                  {section.title}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {section.items.map((item, itemIdx) => (
                    <Card
                      key={itemIdx}
                      className="p-4 cursor-pointer hover:shadow-lg transition-all hover:border-primary"
                      onClick={() => {
                        navigate(item.path);
                        setMenuOpen(false);
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 p-3 rounded-lg">
                          <item.icon className="h-6 w-6 text-primary" />
                        </div>
                        <span className="font-semibold">{item.name}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Start Shift Dialog */}
      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-primary" />
              بدء وردية جديدة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900">
                <strong>المستخدم:</strong> {user?.name}
              </p>
              <p className="text-sm text-blue-900">
                <strong>التاريخ:</strong>{" "}
                {new Date().toLocaleDateString("ar-EG", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              <p className="text-sm text-blue-900">
                <strong>الوقت:</strong> {new Date().toLocaleTimeString("ar-EG")}
              </p>
            </div>

            <div>
              <Label>الرصيد الافتتاحي *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="أدخل الرصيد الافتتاحي"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                الرصيد النقدي الموجود في الدرج عند بداية الوردية
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShiftDialogOpen(false);
                setOpeningBalance("");
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleStartShift}
              disabled={!openingBalance || parseFloat(openingBalance) < 0}
              className="gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              بدء الوردية
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog
        open={closeShiftDialogOpen}
        onOpenChange={setCloseShiftDialogOpen}
      >
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <StopCircle className="h-6 w-6 text-amber-600" />
              إغلاق الوردية وتسجيل الخروج
            </DialogTitle>
          </DialogHeader>

          {currentShift && (
            <div className="space-y-4 py-4">
              {/* Shift Info */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">معلومات الوردية</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>
                    <strong>الموظف:</strong> {currentShift.employeeName}
                  </p>
                  <p>
                    <strong>بداية الوردية:</strong>{" "}
                    {new Date(currentShift.startTime).toLocaleTimeString(
                      "ar-EG"
                    )}
                  </p>
                  <p>
                    <strong>الرصيد الافتتاحي:</strong>{" "}
                    {currentShift.startingCash.toFixed(2)} جنيه
                  </p>
                </div>
              </div>

              {/* Sales Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-green-900">
                  💰 ملخص المبيعات
                </h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <p>
                    عدد الفواتير:{" "}
                    <strong>{currentShift.sales.totalInvoices}</strong>
                  </p>
                  <p>
                    إجمالي المبيعات:{" "}
                    <strong>{currentShift.sales.totalAmount.toFixed(2)}</strong>{" "}
                    جنيه
                  </p>
                  <p>
                    مبيعات نقدية:{" "}
                    <strong>{currentShift.sales.cashSales.toFixed(2)}</strong>{" "}
                    جنيه
                  </p>
                  <p>
                    مبيعات بطاقات:{" "}
                    <strong>{currentShift.sales.cardSales.toFixed(2)}</strong>{" "}
                    جنيه
                  </p>
                  <p>
                    مبيعات محافظ:{" "}
                    <strong>{currentShift.sales.walletSales.toFixed(2)}</strong>{" "}
                    جنيه
                  </p>
                  <p>
                    مرتجعات:{" "}
                    <strong className="text-red-600">
                      -{currentShift.sales.returns.toFixed(2)}
                    </strong>{" "}
                    جنيه
                  </p>
                </div>
              </div>

              {/* Cash Calculation */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-blue-900">
                  🧮 حساب النقدية في الدرج
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>الرصيد الافتتاحي:</span>
                    <strong>+{currentShift.startingCash.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>مبيعات نقدية:</span>
                    <strong>+{currentShift.sales.cashSales.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>مصروفات:</span>
                    <strong>-{currentShift.expenses.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>مرتجعات نقدية:</span>
                    <strong>-{currentShift.sales.returns.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between pt-2 border-t-2 border-blue-300 text-lg font-bold text-blue-900">
                    <span>النقدية المتوقعة:</span>
                    <strong>
                      {(
                        currentShift.startingCash +
                        currentShift.sales.cashSales -
                        currentShift.expenses -
                        currentShift.sales.returns
                      ).toFixed(2)}{" "}
                      جنيه
                    </strong>
                  </div>
                </div>
              </div>

              {/* Actual Cash Input */}
              <div>
                <Label className="text-base font-semibold">
                  النقدية الفعلية في الدرج *
                </Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="أدخل المبلغ النقدي الموجود فعلياً في الدرج"
                  value={actualCashInDrawer}
                  onChange={(e) => setActualCashInDrawer(e.target.value)}
                  className="mt-2 text-lg font-bold"
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  قم بعد النقود الموجودة في الدرج وأدخل المبلغ الفعلي
                </p>

                {actualCashInDrawer && (
                  <div
                    className={`mt-3 p-3 rounded-lg ${
                      Math.abs(
                        parseFloat(actualCashInDrawer) -
                          (currentShift.startingCash +
                            currentShift.sales.cashSales -
                            currentShift.expenses -
                            currentShift.sales.returns)
                      ) < 1
                        ? "bg-green-100 text-green-900"
                        : "bg-red-100 text-red-900"
                    }`}
                  >
                    <p className="font-semibold">
                      الفرق:{" "}
                      {(
                        parseFloat(actualCashInDrawer) -
                        (currentShift.startingCash +
                          currentShift.sales.cashSales -
                          currentShift.expenses -
                          currentShift.sales.returns)
                      ).toFixed(2)}{" "}
                      جنيه
                    </p>
                    {Math.abs(
                      parseFloat(actualCashInDrawer) -
                        (currentShift.startingCash +
                          currentShift.sales.cashSales -
                          currentShift.expenses -
                          currentShift.sales.returns)
                    ) >= 1 && (
                      <p className="text-xs mt-1">
                        ⚠️ يوجد فرق بين النقدية المتوقعة والفعلية
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Warning */}
              <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 text-amber-900 text-sm">
                ⚠️ <strong>تحذير:</strong> سيتم إغلاق الوردية الحالية وتسجيل
                خروجك من النظام.
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCloseShiftDialogOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              variant="outline"
              onClick={() => handleConfirmLogout(false)}
            >
              تسجيل خروج بدون إغلاق الوردية
            </Button>
            <Button
              onClick={async () => {
                if (actualCashInDrawer && currentShift) {
                  const expectedCash =
                    currentShift.startingCash +
                    currentShift.sales.cashSales -
                    currentShift.expenses -
                    currentShift.sales.returns;

                  const actualCash = parseFloat(actualCashInDrawer);

                  await db.update("shifts", {
                    ...currentShift,
                    status: "closed",
                    endTime: new Date().toISOString(),
                    expectedCash,
                    actualCash,
                    difference: actualCash - expectedCash,
                    closedBy: user?.name,
                  });
                }
                handleConfirmLogout(true);
              }}
              disabled={!actualCashInDrawer}
              className="gap-2 bg-amber-600 hover:bg-amber-700"
            >
              <StopCircle className="h-4 w-4" />
              إغلاق الوردية وتسجيل الخروج
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Daily Summary Dialog */}
      <Dialog
        open={dailySummaryDialogOpen}
        onOpenChange={setDailySummaryDialogOpen}
      >
        <DialogContent dir="rtl" className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              ملخص المبيعات اليومية
            </DialogTitle>
          </DialogHeader>

          {dailySummary && (
            <div className="space-y-4 py-4">
              {/* Date */}
              <div className="text-center bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-600 font-semibold">
                  📅{" "}
                  {new Date().toLocaleDateString("ar-EG", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>

              {/* Sales Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-green-900 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  💰 ملخص المبيعات
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      عدد الفواتير
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {dailySummary.invoiceCount}
                    </p>
                  </div>
                  <div className="bg-white p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">
                      إجمالي المبيعات
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {dailySummary.totalSales.toFixed(2)} جنيه
                    </p>
                  </div>
                </div>
              </div>

              {/* Payment Methods Breakdown */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold mb-3 text-blue-900">
                  💳 طرق الدفع
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center bg-white p-2 rounded">
                    <span className="text-sm">💵 نقدي</span>
                    <strong>{dailySummary.cashSales.toFixed(2)} جنيه</strong>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 rounded">
                    <span className="text-sm">💳 بطاقات</span>
                    <strong>{dailySummary.cardSales.toFixed(2)} جنيه</strong>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 rounded">
                    <span className="text-sm">📱 محافظ إلكترونية</span>
                    <strong>{dailySummary.walletSales.toFixed(2)} جنيه</strong>
                  </div>
                </div>
              </div>

              {/* Expenses & Returns */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-red-900 text-sm">
                    📤 المصروفات
                  </h3>
                  <p className="text-xl font-bold text-red-600">
                    {dailySummary.totalExpenses.toFixed(2)} جنيه
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-orange-900 text-sm">
                    ↩️ المرتجعات
                  </h3>
                  <p className="text-xl font-bold text-orange-600">
                    {dailySummary.totalReturns.toFixed(2)} جنيه
                  </p>
                </div>
              </div>

              {/* Net Profit */}
              <div
                className={`border-2 rounded-lg p-4 ${
                  dailySummary.netProfit >= 0
                    ? "bg-emerald-50 border-emerald-400"
                    : "bg-red-50 border-red-400"
                }`}
              >
                <h3 className="font-semibold mb-2 text-center">
                  {dailySummary.netProfit >= 0 ? "✅ صافي الربح" : "⚠️ الخسارة"}
                </h3>
                <p
                  className={`text-3xl font-bold text-center ${
                    dailySummary.netProfit >= 0
                      ? "text-emerald-600"
                      : "text-red-600"
                  }`}
                >
                  {dailySummary.netProfit.toFixed(2)} جنيه
                </p>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  (المبيعات - المصروفات - المرتجعات)
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setDailySummaryDialogOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
};
