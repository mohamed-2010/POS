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
import { ZReportDialog } from "@/components/ZReportDialog";
import { useShift } from "@/contexts/ShiftContext";

export const POSHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, can } = useAuth();
  const { getSetting } = useSettingsContext();
  const { toast } = useToast();
  const { currentShift, refreshShift } = useShift(); // استخدام ShiftContext
  const [menuOpen, setMenuOpen] = useState(false);
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("");
  const [zReportOpen, setZReportOpen] = useState(false);
  const [dailySummaryDialogOpen, setDailySummaryDialogOpen] = useState(false);
  const [dailySummary, setDailySummary] = useState<any>(null);

  const storeName = getSetting("storeName") || "نظام نقاط البيع";

  // حذفنا useEffect و loadCurrentShift لأننا بنستخدم ShiftContext

  // معالج إغلاق التطبيق - منع الإغلاق إذا كانت هناك وردية مفتوحة
  useEffect(() => {
    if (!currentShift || currentShift.status !== "active") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";

      // فتح ZReportDialog عند محاولة الإغلاق
      setZReportOpen(true);

      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [currentShift]);

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
      await refreshShift(); // تحديث الوردية من ShiftContext
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
    if (!currentShift || !user) return;

    // Check permission: allow if user opened this shift OR has explicit permission
    const isShiftOwner = currentShift.employeeId === user.id;
    const hasClosePermission = can("shifts", "close");

    if (!isShiftOwner && !hasClosePermission) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية إغلاق وردية موظف آخر",
        variant: "destructive",
      });
      return;
    }

    // فتح ZReportDialog بعد التحقق من الصلاحية
    setZReportOpen(true);
  };

  const handleCloseShiftFromZReport = async (
    actualCash: number,
    denominations: any
  ) => {
    if (!currentShift || !user) return;

    try {
      // استخدام الدوال الموحدة من calculationService
      const { calculateShiftSales, calculateExpectedCash } = await import('@/lib/calculationService');

      const sales = await calculateShiftSales(currentShift.id);
      const cashSummary = await calculateExpectedCash(currentShift.id);

      const difference = actualCash - cashSummary.expectedCash;

      const updatedShift: Shift = {
        ...currentShift,
        endTime: new Date().toISOString(),
        expectedCash: cashSummary.expectedCash,
        actualCash: actualCash,
        difference: difference,
        status: "closed",
        closedBy: user?.name || "غير معروف",
        sales: {
          totalInvoices: sales.totalInvoices,
          totalAmount: sales.totalSales,
          cashSales: sales.cashSales,
          cardSales: sales.cardSales,
          walletSales: sales.walletSales,
          returns: sales.returns,
        },
        expenses: cashSummary.expenses,
      };

      await db.update("shifts", updatedShift);
      await refreshShift();
      setZReportOpen(false);

      // تسجيل الخروج بعد إغلاق الوردية
      toast({
        title: "تم إغلاق الوردية بنجاح",
        description: `إجمالي المبيعات: ${sales.totalSales.toFixed(2)} جنيه`,
      });

      // الانتظار قليلاً ثم تسجيل الخروج
      setTimeout(() => {
        logout();
        navigate("/login");
      }, 1500);
    } catch (error) {
      console.error("Error closing shift:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء إغلاق الوردية",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    // إذا كان هناك وردية مفتوحة، اعرض ZReportDialog
    if (currentShift && currentShift.status === "active") {
      // Check permission: allow if user opened this shift OR has explicit permission
      const isShiftOwner = currentShift.employeeId === user?.id;
      const hasClosePermission = can("shifts", "close");

      if (!isShiftOwner && !hasClosePermission) {
        toast({
          title: "تنبيه",
          description: "لديك وردية مفتوحة لموظف آخر. يرجى الاتصال بالمدير لإغلاقها.",
          variant: "destructive",
        });
        return;
      }
      setZReportOpen(true);
    } else {
      // لا توجد وردية مفتوحة، قم بتسجيل الخروج مباشرة
      logout();
      navigate("/login");
    }
  };

  const loadDailySummary = async () => {
    try {
      // استخدام الدالة الموحدة من calculationService
      const { calculateDailySummary } = await import('@/lib/calculationService');

      const summary = await calculateDailySummary();

      setDailySummary(summary);
      setDailySummaryDialogOpen(true);
    } catch (error) {
      console.error('Error loading daily summary:', error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء تحميل الملخص اليومي",
        variant: "destructive",
      });
    }
  };

  const menuItems = [
    {
      title: "الصفحات الرئيسية",
      items: [
        {
          name: "نقطة البيع",
          icon: ShoppingCart,
          path: "/",
          check: () => can("invoices", "create") || can("invoices", "view")
        },
        {
          name: "العملاء",
          icon: Users,
          path: "/customers",
          check: () => can("customers", "view")
        },
        {
          name: "التقارير",
          icon: FileText,
          path: "/reports",
          check: () => can("reports", "view")
        },
      ],
    },
    {
      title: "الإدارة",
      items: [
        {
          name: "المخزون",
          icon: ShoppingCart,
          path: "/inventory",
          check: () => can("products", "view")
        },
        {
          name: "أقسام المنتجات",
          icon: FolderOpen,
          path: "/product-categories",
          check: () => can("products", "view")
        },
        {
          name: "الموردين",
          icon: Users,
          path: "/suppliers",
          check: () => can("suppliers", "view")
        },
        {
          name: "المشتريات",
          icon: ShoppingCart,
          path: "/purchases",
          check: () => can("purchases", "view")
        },
        {
          name: "الموظفين",
          icon: Users,
          path: "/employees",
          check: () => can("employees", "view")
        },
        {
          name: "سُلف الموظفين",
          icon: FileText,
          path: "/employee-advances",
          check: () => can("employeeAdvances", "view")
        },
        {
          name: "خصومات الموظفين",
          icon: FileText,
          path: "/employee-deductions",
          check: () => can("employeeAdvances", "view") // using same permission
        },
        {
          name: "العروض والخصومات",
          icon: FileText,
          path: "/promotions",
          check: () => can("promotions", "view")
        },
        {
          name: "إدارة التقسيط",
          icon: FileText,
          path: "/installments",
          check: () => can("installments", "view")
        },
        {
          name: "إدارة الآجل",
          icon: FileText,
          path: "/credit",
          check: () => can("credit", "view")
        },
      ],
    },
    {
      title: "المالية",
      items: [
        {
          name: "مصادر الإيداعات",
          icon: FileText,
          path: "/deposit-sources",
          check: () => can("depositSources", "view")
        },
        {
          name: "الإيداعات",
          icon: FileText,
          path: "/deposits",
          check: () => can("deposits", "view")
        },
        {
          name: "فئات المصروفات",
          icon: FileText,
          path: "/expense-categories",
          check: () => can("expenseCategories", "view")
        },
        {
          name: "المصروفات",
          icon: FileText,
          path: "/expenses",
          check: () => can("expenses", "view")
        },
      ],
    },
    {
      title: "الورديات والمرتجعات",
      items: [
        {
          name: "إدارة الورديات",
          icon: ShoppingCart,
          path: "/shifts",
          check: () => can("shifts", "view")
        },
        {
          name: "مرتجع المبيعات",
          icon: FileText,
          path: "/sales-returns",
          check: () => can("returns", "view")
        },
        {
          name: "مرتجع المشتريات",
          icon: FileText,
          path: "/purchase-returns",
          check: () => can("returns", "view")
        },
      ],
    },
    {
      title: "المطاعم",
      items: [
        {
          name: "الصالات والطاولات",
          icon: ShoppingCart,
          path: "/restaurant",
          check: () => can("restaurant", "view")
        },
      ],
    },
    {
      title: "الواتساب",
      items: [
        {
          name: "إدارة الحسابات",
          icon: MessageSquare,
          path: "/whatsapp-management",
          check: () => can("settings", "view") // WhatsApp management requires settings permission
        },
        {
          name: "الحملات التسويقية",
          icon: Send,
          path: "/whatsapp-campaigns",
          check: () => can("settings", "view")
        },
      ],
    },
    {
      title: "الإعدادات الأساسية",
      items: [
        {
          name: "وحدات القياس",
          icon: Ruler,
          path: "/units",
          check: () => can("settings", "view")
        },
        {
          name: "أنواع التسعير",
          icon: DollarSign,
          path: "/price-types",
          check: () => can("settings", "view")
        },
        {
          name: "طرق الدفع",
          icon: CreditCard,
          path: "/payment-methods",
          check: () => can("settings", "view")
        },
        {
          name: "إعدادات الطابعة",
          icon: Printer,
          path: "/printer-settings",
          check: () => can("settings", "view")
        },
      ],
    },
    {
      title: "النظام",
      items: [
        {
          name: "الإعدادات",
          icon: ShoppingCart,
          path: "/settings",
          check: () => can("settings", "view")
        },
        {
          name: "الأدوار والصلاحيات",
          icon: Shield,
          path: "/roles-permissions",
          check: () => can("settings", "edit") // Only admins should manage roles
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
          {/* Cart Button - للانتقال السريع لصفحة POS */}
          {location.pathname !== "/" && (
            <Button
              variant="default"
              onClick={() => navigate("/")}
              className="gap-2 bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm border border-white/30"
              title="الذهاب إلى نقطة البيع"
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden md:inline">السلة</span>
            </Button>
          )}

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
            {menuItems.map((section, idx) => {
              // Filter items based on permissions
              const visibleItems = section.items.filter(item =>
                !item.check || item.check()
              );

              // Don't show section if no items are visible
              if (visibleItems.length === 0) return null;

              return (
                <div key={idx}>
                  <h3 className="text-lg font-semibold mb-3 text-primary">
                    {section.title}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {visibleItems.map((item, itemIdx) => (
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
              );
            })}
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
                  {dailySummary.paymentMethodSales &&
                    Object.entries(dailySummary.paymentMethodSales).map(
                      ([methodId, data]: [string, any]) =>
                        data.amount > 0 && (
                          <div
                            key={methodId}
                            className="flex justify-between items-center bg-white p-2 rounded"
                          >
                            <span className="text-sm">{data.name}</span>
                            <strong>{data.amount.toFixed(2)} جنيه</strong>
                          </div>
                        )
                    )}
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
                className={`border-2 rounded-lg p-4 ${dailySummary.netProfit >= 0
                  ? "bg-emerald-50 border-emerald-400"
                  : "bg-red-50 border-red-400"
                  }`}
              >
                <h3 className="font-semibold mb-2 text-center">
                  {dailySummary.netProfit >= 0 ? "✅ صافي الربح" : "⚠️ الخسارة"}
                </h3>
                <p
                  className={`text-3xl font-bold text-center ${dailySummary.netProfit >= 0
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

      {/* ZReport Dialog لإغلاق الوردية */}
      {currentShift && (
        <ZReportDialog
          open={zReportOpen}
          onOpenChange={setZReportOpen}
          shiftId={currentShift.id}
          onConfirm={handleCloseShiftFromZReport}
        />
      )}
    </header>
  );
};
