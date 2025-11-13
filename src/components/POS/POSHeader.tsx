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

  const storeName = getSetting("storeName") || "نظام نقاط البيع";

  useEffect(() => {
    loadCurrentShift();
  }, []);

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

      const expectedCash =
        currentShift.startingCash + totalSales - totalExpenses - totalDeposits;

      const updatedShift: Shift = {
        ...currentShift,
        endTime: new Date().toISOString(),
        expectedCash,
        actualCash: expectedCash, // يمكن تعديله يدوياً لاحقاً
        difference: 0,
        status: "closed",
        closedBy: user?.name || "غير معروف",
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
    logout();
    navigate("/login");
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
    </header>
  );
};
