import { useState, useEffect } from "react";
import { POSHeader } from "@/components/POS/POSHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  TrendingUp,
  DollarSign,
  Download,
  Package,
  Users,
  CreditCard,
  ArrowLeftRight,
  ShoppingCart,
  RotateCcw,
  BarChart3,
  Clock,
  UserCheck,
  Receipt,
  Wallet,
  Eye,
  X,
} from "lucide-react";
import {
  db,
  Invoice,
  Customer,
  Product,
  SalesReturn,
  PurchaseReturn,
  Shift,
  Employee,
  Expense,
  Payment,
  Deposit,
  ExpenseItem,
  PaymentMethod,
  PriceType,
} from "@/lib/indexedDB";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";

const Reports = () => {
  const { can } = useAuth();
  const { getSetting } = useSettingsContext();
  const currency = getSetting("currency") || "EGP";

  // States
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
  const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);

  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  // Dialog States
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedReturn, setSelectedReturn] = useState<SalesReturn | null>(
    null
  );
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showCustomerDialog, setShowCustomerDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [
      inv,
      cust,
      prod,
      salesRet,
      purchRet,
      shft,
      emp,
      exp,
      pay,
      deps,
      expItems,
      pms,
      pts,
    ] = await Promise.all([
      db.getAll<Invoice>("invoices"),
      db.getAll<Customer>("customers"),
      db.getAll<Product>("products"),
      db.getAll<SalesReturn>("salesReturns"),
      db.getAll<PurchaseReturn>("purchaseReturns"),
      db.getAll<Shift>("shifts"),
      db.getAll<Employee>("employees"),
      db.getAll<Expense>("expenses"),
      db.getAll<Payment>("payments"),
      db.getAll<Deposit>("deposits"),
      db.getAll<ExpenseItem>("expenseItems"),
      db.getAll<PaymentMethod>("paymentMethods"),
      db.getAll<PriceType>("priceTypes"),
    ]);
    setInvoices(inv);
    setCustomers(cust);
    setProducts(prod);
    setSalesReturns(salesRet);
    setPurchaseReturns(purchRet);
    setShifts(shft);
    setEmployees(emp);
    setExpenses(exp);
    setPayments(pay);
    setDeposits(deps);
    setExpenseItems(expItems);
    setPaymentMethods(pms);
    setPriceTypes(pts);
  };

  // Helpers
  const filterByDate = (date: string) => {
    const itemDate = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return itemDate >= start && itemDate <= end;
  };

  const formatCurrency = (amount: number) => `${amount.toFixed(2)} ${currency}`;
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("ar-EG");

  // Filtered Data
  const filteredInvoices = invoices.filter((inv) =>
    filterByDate(inv.createdAt)
  );
  const filteredSalesReturns = salesReturns.filter((ret) =>
    filterByDate(ret.createdAt)
  );
  const filteredPurchaseReturns = purchaseReturns.filter((ret) =>
    filterByDate(ret.createdAt)
  );
  const filteredShifts = shifts.filter((shift) =>
    filterByDate(shift.startTime)
  );
  const filteredExpenses = expenses.filter((exp) =>
    filterByDate(exp.createdAt)
  );
  const filteredPayments = payments.filter((pay) =>
    filterByDate(pay.createdAt)
  );
  const filteredDeposits = deposits.filter((dep) =>
    filterByDate(dep.createdAt)
  );
  const filteredExpenseItems = expenseItems.filter((exp) =>
    filterByDate(exp.createdAt)
  );

  // Calculations
  const totalSales = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalSalesReturns = filteredSalesReturns.reduce(
    (sum, ret) => sum + ret.total,
    0
  );
  const totalPurchaseReturns = filteredPurchaseReturns.reduce(
    (sum, ret) => sum + ret.total,
    0
  );
  const totalExpenses = filteredExpenses.reduce(
    (sum, exp) => sum + exp.amount,
    0
  );
  const totalDeposits = filteredDeposits.reduce(
    (sum, dep) => sum + dep.amount,
    0
  );
  const totalExpenseItems = filteredExpenseItems.reduce(
    (sum, exp) => sum + exp.amount,
    0
  );
  const netSales = totalSales - totalSalesReturns;
  const netProfit = netSales - totalExpenses - totalExpenseItems;

  // مبيعات حسب طريقة الدفع
  const cashSales = filteredInvoices
    .filter((inv) => inv.paymentType === "cash")
    .reduce((sum, inv) => sum + inv.total, 0);
  const creditSales = filteredInvoices
    .filter((inv) => inv.paymentType === "credit")
    .reduce((sum, inv) => sum + inv.total, 0);
  const installmentSales = filteredInvoices
    .filter((inv) => inv.paymentType === "installment")
    .reduce((sum, inv) => sum + inv.total, 0);

  // تحليل المنتجات
  const productSalesMap = new Map<
    string,
    { name: string; quantity: number; total: number }
  >();
  filteredInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      const existing = productSalesMap.get(item.productId) || {
        name: item.productName,
        quantity: 0,
        total: 0,
      };
      productSalesMap.set(item.productId, {
        name: item.productName,
        quantity: existing.quantity + item.quantity,
        total: existing.total + item.total,
      });
    });
  });
  const topProducts = Array.from(productSalesMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // تحليل العملاء
  const customerSalesMap = new Map<
    string,
    { name: string; total: number; count: number }
  >();
  filteredInvoices.forEach((inv) => {
    if (inv.customerId) {
      const existing = customerSalesMap.get(inv.customerId) || {
        name: inv.customerName || "غير محدد",
        total: 0,
        count: 0,
      };
      customerSalesMap.set(inv.customerId, {
        name: existing.name,
        total: existing.total + inv.total,
        count: existing.count + 1,
      });
    }
  });
  const topCustomers = Array.from(customerSalesMap.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // إحصائيات حسب الوحدات
  const unitSalesMap = new Map<
    string,
    { name: string; quantity: number; revenue: number }
  >();
  filteredInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      if (item.unitName) {
        const existing = unitSalesMap.get(item.unitId || "unknown") || {
          name: item.unitName,
          quantity: 0,
          revenue: 0,
        };
        unitSalesMap.set(item.unitId || "unknown", {
          name: item.unitName,
          quantity: existing.quantity + item.quantity,
          revenue: existing.revenue + item.total,
        });
      }
    });
  });
  const unitStats = Array.from(unitSalesMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  // إحصائيات حسب أنواع التسعير
  const priceTypeSalesMap = new Map<
    string,
    { name: string; count: number; revenue: number }
  >();
  filteredInvoices.forEach((inv) => {
    inv.items.forEach((item) => {
      if (item.priceTypeName) {
        const existing = priceTypeSalesMap.get(
          item.priceTypeId || "unknown"
        ) || {
          name: item.priceTypeName,
          count: 0,
          revenue: 0,
        };
        priceTypeSalesMap.set(item.priceTypeId || "unknown", {
          name: item.priceTypeName,
          count: existing.count + item.quantity,
          revenue: existing.revenue + item.total,
        });
      }
    });
  });
  const priceTypeStats = Array.from(priceTypeSalesMap.values()).sort(
    (a, b) => b.revenue - a.revenue
  );

  // إحصائيات حسب طرق الدفع (الجديدة)
  const paymentMethodSalesMap = new Map<
    string,
    { name: string; count: number; amount: number }
  >();
  filteredInvoices.forEach((inv) => {
    if (inv.paymentMethodIds && inv.paymentMethodAmounts) {
      inv.paymentMethodIds.forEach((pmId) => {
        const amount = inv.paymentMethodAmounts[pmId] || 0;
        const paymentMethod = paymentMethods.find((pm) => pm.id === pmId);
        const existing = paymentMethodSalesMap.get(pmId) || {
          name: paymentMethod?.name || "غير محدد",
          count: 0,
          amount: 0,
        };
        paymentMethodSalesMap.set(pmId, {
          name: existing.name,
          count: existing.count + 1,
          amount: existing.amount + amount,
        });
      });
    }
  });
  const paymentMethodStats = Array.from(paymentMethodSalesMap.values()).sort(
    (a, b) => b.amount - a.amount
  );

  // حساب قيمة المخزون
  const totalStockValue = products.reduce(
    (sum, prod) => sum + prod.stock * prod.price,
    0
  );

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <POSHeader />

      {!can("reports", "view") ? (
        <main className="container mx-auto px-4 py-6">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">غير مصرح</h2>
            <p className="text-muted-foreground">
              ليس لديك صلاحية عرض التقارير
            </p>
          </Card>
        </main>
      ) : (
        <main className="container mx-auto px-4 py-6 space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart3 className="h-8 w-8" />
              التقارير والإحصائيات
            </h1>
            {can("reports", "export") && (
              <Button>
                <Download className="ml-2 h-4 w-4" />
                تصدير Excel
              </Button>
            )}
          </div>

          {/* Date Filter */}
          <Card className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
              <div>
                <Label>من تاريخ</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label>إلى تاريخ</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <Button onClick={loadData}>
                <BarChart3 className="ml-2 h-4 w-4" />
                تحديث التقارير
              </Button>
            </div>
          </Card>

          {/* Tabs */}
          <Tabs defaultValue="financial" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="financial">
                <DollarSign className="ml-2 h-4 w-4" />
                التقارير المالية
              </TabsTrigger>
              <TabsTrigger value="inventory">
                <Package className="ml-2 h-4 w-4" />
                تقارير المخزون
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="ml-2 h-4 w-4" />
                إحصائيات متقدمة
              </TabsTrigger>
              <TabsTrigger value="other">
                <FileText className="ml-2 h-4 w-4" />
                تقارير أخرى
              </TabsTrigger>
            </TabsList>

            {/* ==================== التقارير المالية ==================== */}
            <TabsContent value="financial" className="space-y-4">
              {/* التقرير المالي الشامل */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    التقرير المالي الشامل
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        إجمالي المبيعات
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(totalSales)}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        مرتجعات المبيعات
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(totalSalesReturns)}
                      </p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        صافي المبيعات
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(netSales)}
                      </p>
                    </div>
                    <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        صافي الربح
                      </p>
                      <p className="text-2xl font-bold text-purple-600">
                        {formatCurrency(netProfit)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* تقرير المبيعات */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ShoppingCart className="h-5 w-5" />
                    تقرير المبيعات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          مبيعات نقدية
                        </p>
                        <p className="text-xl font-bold">
                          {formatCurrency(cashSales)}
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          مبيعات آجلة
                        </p>
                        <p className="text-xl font-bold">
                          {formatCurrency(creditSales)}
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          مبيعات تقسيط
                        </p>
                        <p className="text-xl font-bold">
                          {formatCurrency(installmentSales)}
                        </p>
                      </div>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>رقم الفاتورة</TableHead>
                          <TableHead>العميل</TableHead>
                          <TableHead>التاريخ</TableHead>
                          <TableHead>نوع الدفع</TableHead>
                          <TableHead>الإجمالي</TableHead>
                          <TableHead>إجراءات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInvoices.slice(0, 10).map((inv) => (
                          <TableRow key={inv.id}>
                            <TableCell className="font-medium font-mono text-sm">
                              {inv.id}
                            </TableCell>
                            <TableCell>
                              {inv.customerName || "عميل نقدي"}
                            </TableCell>
                            <TableCell>{formatDate(inv.createdAt)}</TableCell>
                            <TableCell>
                              {inv.paymentType === "cash" && "نقدي"}
                              {inv.paymentType === "credit" && "آجل"}
                              {inv.paymentType === "installment" && "تقسيط"}
                            </TableCell>
                            <TableCell className="font-bold">
                              {formatCurrency(inv.total)}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedInvoice(inv);
                                  setShowInvoiceDialog(true);
                                }}
                              >
                                <Eye className="h-3 w-3 ml-1" />
                                تفاصيل
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* تقرير مرتجعات المبيعات */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5" />
                    تقرير مرتجعات المبيعات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم المرتجع</TableHead>
                        <TableHead>الفاتورة الأصلية</TableHead>
                        <TableHead>العميل</TableHead>
                        <TableHead>السبب</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الإجمالي</TableHead>
                        <TableHead>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSalesReturns.map((ret) => (
                        <TableRow key={ret.id}>
                          <TableCell className="font-medium font-mono text-sm">
                            {ret.id}
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {ret.originalInvoiceId}
                          </TableCell>
                          <TableCell>
                            {ret.customerName || "غير محدد"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {ret.reason}
                          </TableCell>
                          <TableCell>{formatDate(ret.createdAt)}</TableCell>
                          <TableCell className="text-red-600 font-bold">
                            {formatCurrency(ret.total)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedReturn(ret);
                                setShowReturnDialog(true);
                              }}
                            >
                              <Eye className="h-3 w-3 ml-1" />
                              تفاصيل
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* تقرير مبيعات المنتجات */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    تقرير مبيعات المنتجات (أعلى 10 منتجات)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>اسم المنتج</TableHead>
                        <TableHead>الكمية المباعة</TableHead>
                        <TableHead>إجمالي المبيعات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProducts.map((prod, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {prod.name}
                          </TableCell>
                          <TableCell>{prod.quantity}</TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(prod.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* تحليل المبيعات */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    تحليل المبيعات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        عدد الفواتير
                      </p>
                      <p className="text-2xl font-bold">
                        {filteredInvoices.length}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        متوسط الفاتورة
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(
                          filteredInvoices.length > 0
                            ? totalSales / filteredInvoices.length
                            : 0
                        )}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        عدد المرتجعات
                      </p>
                      <p className="text-2xl font-bold">
                        {filteredSalesReturns.length}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        نسبة المرتجعات
                      </p>
                      <p className="text-2xl font-bold">
                        {totalSales > 0
                          ? ((totalSalesReturns / totalSales) * 100).toFixed(1)
                          : 0}
                        %
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* مبيعات فيزا (البطاقات) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    مبيعات فيزا والمدفوعات الإلكترونية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      إجمالي مدفوعات البطاقات والمحافظ الإلكترونية
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(
                        filteredPayments
                          .filter(
                            (pay) =>
                              pay.paymentMethod === "card" ||
                              pay.paymentMethod === "wallet"
                          )
                          .reduce((sum, pay) => sum + pay.amount, 0)
                      )}
                    </p>
                  </div>
                  <Table className="mt-4">
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم العملية</TableHead>
                        <TableHead>العميل</TableHead>
                        <TableHead>الطريقة</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments
                        .filter(
                          (pay) =>
                            pay.paymentMethod === "card" ||
                            pay.paymentMethod === "wallet"
                        )
                        .slice(0, 10)
                        .map((pay) => (
                          <TableRow key={pay.id}>
                            <TableCell className="font-medium">
                              {pay.id}
                            </TableCell>
                            <TableCell>{pay.customerId}</TableCell>
                            <TableCell>
                              {pay.paymentMethod === "card"
                                ? "بطاقة"
                                : "محفظة إلكترونية"}
                            </TableCell>
                            <TableCell>{formatDate(pay.createdAt)}</TableCell>
                            <TableCell className="font-bold">
                              {formatCurrency(pay.amount)}
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* التحويلات المالية */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5" />
                    التحويلات المالية والمدفوعات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الدفعة</TableHead>
                        <TableHead>الفاتورة</TableHead>
                        <TableHead>العميل</TableHead>
                        <TableHead>الطريقة</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.slice(0, 10).map((pay) => (
                        <TableRow key={pay.id}>
                          <TableCell className="font-medium">
                            {pay.id}
                          </TableCell>
                          <TableCell>{pay.invoiceId}</TableCell>
                          <TableCell>{pay.customerId}</TableCell>
                          <TableCell>
                            {pay.paymentMethod === "cash" && "نقدي"}
                            {pay.paymentMethod === "card" && "بطاقة"}
                            {pay.paymentMethod === "wallet" &&
                              "محفظة إلكترونية"}
                          </TableCell>
                          <TableCell>{formatDate(pay.createdAt)}</TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(pay.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* تقرير المشتريات بالتفصيل */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    تقرير المشتريات والمصروفات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground">
                      إجمالي المصروفات
                    </p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(totalExpenses)}
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>الوصف</TableHead>
                        <TableHead>الفئة</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المبلغ</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenses.slice(0, 10).map((exp) => (
                        <TableRow key={exp.id}>
                          <TableCell className="font-medium">
                            {exp.description}
                          </TableCell>
                          <TableCell>{exp.category}</TableCell>
                          <TableCell>{formatDate(exp.createdAt)}</TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(exp.amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* تقرير الإيداعات */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    تقرير الإيداعات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground">
                      إجمالي الإيداعات
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalDeposits)}
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ والوقت</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>المصدر</TableHead>
                        <TableHead>المستخدم</TableHead>
                        <TableHead>الملاحظات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeposits.slice(0, 10).map((dep) => (
                        <TableRow key={dep.id}>
                          <TableCell>
                            {new Date(dep.createdAt).toLocaleString("ar-EG")}
                          </TableCell>
                          <TableCell className="font-bold text-green-600">
                            {formatCurrency(dep.amount)}
                          </TableCell>
                          <TableCell>{dep.sourceName}</TableCell>
                          <TableCell>{dep.userName}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {dep.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* تقرير المصروفات الجديدة */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" />
                    تقرير المصروفات (النظام الجديد)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground">
                      إجمالي المصروفات
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(totalExpenseItems)}
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>التاريخ والوقت</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الفئة</TableHead>
                        <TableHead>الوصف</TableHead>
                        <TableHead>المستخدم</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredExpenseItems.slice(0, 10).map((exp) => (
                        <TableRow key={exp.id}>
                          <TableCell>
                            {new Date(exp.createdAt).toLocaleString("ar-EG")}
                          </TableCell>
                          <TableCell className="font-bold text-red-600">
                            {formatCurrency(exp.amount)}
                          </TableCell>
                          <TableCell>{exp.categoryName}</TableCell>
                          <TableCell className="font-medium">
                            {exp.description}
                          </TableCell>
                          <TableCell>{exp.userName}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ==================== تقارير المخزون ==================== */}
            <TabsContent value="inventory" className="space-y-4">
              {/* إجمالي المخزون */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    إجمالي المخزون
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        عدد المنتجات
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {products.length}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        قيمة المخزون
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(totalStockValue)}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        مخزون منخفض
                      </p>
                      <p className="text-2xl font-bold text-orange-600">
                        {products.filter((p) => p.stock < 10).length}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        مخزون نافد
                      </p>
                      <p className="text-2xl font-bold text-red-600">
                        {products.filter((p) => p.stock === 0).length}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* المخزون التفصيلي */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    المخزون التفصيلي
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>اسم المنتج</TableHead>
                        <TableHead>الفئة</TableHead>
                        <TableHead>الكمية</TableHead>
                        <TableHead>السعر</TableHead>
                        <TableHead>القيمة الإجمالية</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((prod) => (
                        <TableRow key={prod.id}>
                          <TableCell className="font-medium">
                            {prod.nameAr}
                          </TableCell>
                          <TableCell>{prod.category}</TableCell>
                          <TableCell>{prod.stock}</TableCell>
                          <TableCell>{formatCurrency(prod.price)}</TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(prod.stock * prod.price)}
                          </TableCell>
                          <TableCell>
                            {prod.stock === 0 && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                                نافد
                              </span>
                            )}
                            {prod.stock > 0 && prod.stock < 10 && (
                              <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">
                                منخفض
                              </span>
                            )}
                            {prod.stock >= 10 && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                متوفر
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* حركات المخزون */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowLeftRight className="h-5 w-5" />
                    حركات المخزون التفصيلية
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>المنتج</TableHead>
                        <TableHead>رقم الفاتورة</TableHead>
                        <TableHead>الكمية الأصلية</TableHead>
                        <TableHead>المرتجع</TableHead>
                        <TableHead>صافي الحركة</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInvoices.slice(0, 20).flatMap((inv) =>
                        inv.items.map((item, idx) => {
                          const returnedQty = item.returnedQuantity || 0;
                          const netQty = item.quantity - returnedQty;
                          const isPartialReturn =
                            returnedQty > 0 && returnedQty < item.quantity;
                          const isFullReturn = returnedQty === item.quantity;

                          return (
                            <TableRow
                              key={`${inv.id}-${idx}`}
                              className={
                                isFullReturn
                                  ? "bg-orange-50 dark:bg-orange-950/20"
                                  : ""
                              }
                            >
                              <TableCell className="font-medium">
                                {item.productName}
                              </TableCell>
                              <TableCell>
                                <span className="text-blue-600 font-mono text-sm">
                                  {inv.id}
                                </span>
                              </TableCell>
                              <TableCell className="font-bold">
                                {item.quantity}
                              </TableCell>
                              <TableCell>
                                {returnedQty > 0 ? (
                                  <span className="text-orange-600 font-bold">
                                    {returnedQty}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {isFullReturn ? (
                                  <span className="text-muted-foreground line-through">
                                    0
                                  </span>
                                ) : (
                                  <span
                                    className={`font-bold ${
                                      isPartialReturn
                                        ? "text-yellow-600"
                                        : "text-red-600"
                                    }`}
                                  >
                                    -{netQty}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(inv.createdAt)}
                              </TableCell>
                              <TableCell>
                                {isFullReturn ? (
                                  <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium">
                                    مرتجع بالكامل
                                  </span>
                                ) : isPartialReturn ? (
                                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium">
                                    مرتجع جزئي
                                  </span>
                                ) : (
                                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                                    بيع عادي
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                  <div className="mt-4 space-y-2">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-sm font-semibold mb-2">
                        📊 توضيح الأعمدة:
                      </p>
                      <ul className="text-sm space-y-1 text-muted-foreground">
                        <li>
                          • <strong>الكمية الأصلية:</strong> الكمية المباعة في
                          الفاتورة
                        </li>
                        <li>
                          • <strong>المرتجع:</strong> الكمية التي تم إرجاعها من
                          هذا المنتج
                        </li>
                        <li>
                          • <strong>صافي الحركة:</strong> الكمية الفعلية التي
                          خرجت من المخزون (الأصلية - المرتجع)
                        </li>
                      </ul>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-2 bg-red-50 dark:bg-red-950/20 rounded text-center">
                        <p className="text-xs text-muted-foreground">
                          بيع عادي
                        </p>
                        <p className="text-sm font-bold">بدون إرجاع</p>
                      </div>
                      <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 rounded text-center">
                        <p className="text-xs text-muted-foreground">
                          مرتجع جزئي
                        </p>
                        <p className="text-sm font-bold">إرجاع جزء</p>
                      </div>
                      <div className="p-2 bg-orange-50 dark:bg-orange-950/20 rounded text-center">
                        <p className="text-xs text-muted-foreground">
                          مرتجع بالكامل
                        </p>
                        <p className="text-sm font-bold">إرجاع كامل</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* مرتجع المشتريات */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <RotateCcw className="h-5 w-5" />
                    مرتجع المشتريات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg mb-4">
                    <p className="text-sm text-muted-foreground">
                      إجمالي مرتجعات المشتريات
                    </p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(totalPurchaseReturns)}
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم المرتجع</TableHead>
                        <TableHead>المورد</TableHead>
                        <TableHead>السبب</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPurchaseReturns.map((ret) => (
                        <TableRow key={ret.id}>
                          <TableCell className="font-medium">
                            {ret.id}
                          </TableCell>
                          <TableCell>{ret.supplierName}</TableCell>
                          <TableCell className="text-sm">
                            {ret.reason}
                          </TableCell>
                          <TableCell>{formatDate(ret.createdAt)}</TableCell>
                          <TableCell className="text-green-600 font-bold">
                            {formatCurrency(ret.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ==================== إحصائيات متقدمة ==================== */}
            <TabsContent value="analytics" className="space-y-4">
              {/* إحصائيات الوحدات */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    المبيعات حسب وحدات القياس
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {unitStats.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      لا توجد بيانات لعرضها
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>الوحدة</TableHead>
                          <TableHead className="text-center">
                            الكمية المباعة
                          </TableHead>
                          <TableHead className="text-left">الإيرادات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unitStats.map((unit, index) => (
                          <TableRow key={index}>
                            <TableCell className="font-medium">
                              {unit.name}
                            </TableCell>
                            <TableCell className="text-center">
                              {unit.quantity.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-left font-semibold">
                              {formatCurrency(unit.revenue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              {/* إحصائيات أنواع التسعير */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    المبيعات حسب أنواع التسعير
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {priceTypeStats.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      لا توجد بيانات لعرضها
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>نوع التسعير</TableHead>
                            <TableHead className="text-center">
                              عدد الوحدات
                            </TableHead>
                            <TableHead className="text-left">
                              الإيرادات
                            </TableHead>
                            <TableHead className="text-left">النسبة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {priceTypeStats.map((pt, index) => {
                            const percentage =
                              totalSales > 0
                                ? (pt.revenue / totalSales) * 100
                                : 0;
                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {pt.name}
                                </TableCell>
                                <TableCell className="text-center">
                                  {pt.count.toLocaleString()}
                                </TableCell>
                                <TableCell className="text-left font-semibold">
                                  {formatCurrency(pt.revenue)}
                                </TableCell>
                                <TableCell className="text-left">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-muted rounded-full h-2">
                                      <div
                                        className="bg-primary h-2 rounded-full"
                                        style={{
                                          width: `${Math.min(
                                            percentage,
                                            100
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium w-12">
                                      {percentage.toFixed(1)}%
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* إحصائيات طرق الدفع */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    التحليل حسب طرق الدفع
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {paymentMethodStats.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      لا توجد بيانات لعرضها
                    </p>
                  ) : (
                    <div className="space-y-6">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>طريقة الدفع</TableHead>
                            <TableHead className="text-center">
                              عدد المعاملات
                            </TableHead>
                            <TableHead className="text-left">
                              إجمالي المبلغ
                            </TableHead>
                            <TableHead className="text-left">
                              متوسط المعاملة
                            </TableHead>
                            <TableHead className="text-left">النسبة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {paymentMethodStats.map((pm, index) => {
                            const avgTransaction =
                              pm.count > 0 ? pm.amount / pm.count : 0;
                            const percentage =
                              totalSales > 0
                                ? (pm.amount / totalSales) * 100
                                : 0;
                            return (
                              <TableRow key={index}>
                                <TableCell className="font-medium">
                                  {pm.name}
                                </TableCell>
                                <TableCell className="text-center">
                                  {pm.count}
                                </TableCell>
                                <TableCell className="text-left font-semibold">
                                  {formatCurrency(pm.amount)}
                                </TableCell>
                                <TableCell className="text-left">
                                  {formatCurrency(avgTransaction)}
                                </TableCell>
                                <TableCell className="text-left">
                                  <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-muted rounded-full h-2">
                                      <div
                                        className="bg-primary h-2 rounded-full"
                                        style={{
                                          width: `${Math.min(
                                            percentage,
                                            100
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                    <span className="text-sm font-medium w-12">
                                      {percentage.toFixed(1)}%
                                    </span>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      {/* ملخص سريع */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            الطريقة الأكثر استخداماً
                          </p>
                          <p className="text-lg font-bold">
                            {paymentMethodStats[0]?.name || "-"}
                          </p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            أعلى إيرادات
                          </p>
                          <p className="text-lg font-bold">
                            {paymentMethodStats[0]?.name || "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(paymentMethodStats[0]?.amount || 0)}
                          </p>
                        </div>
                        <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            إجمالي طرق الدفع
                          </p>
                          <p className="text-lg font-bold">
                            {paymentMethodStats.length}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ==================== تقارير أخرى ==================== */}
            <TabsContent value="other" className="space-y-4">
              {/* تقارير الورديات */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    تقارير الورديات
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>رقم الوردية</TableHead>
                        <TableHead>الموظف</TableHead>
                        <TableHead>التاريخ</TableHead>
                        <TableHead>المبيعات</TableHead>
                        <TableHead>المصروفات</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>إجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredShifts.map((shift) => (
                        <TableRow key={shift.id}>
                          <TableCell className="font-medium font-mono text-sm">
                            {shift.id}
                          </TableCell>
                          <TableCell>{shift.employeeName}</TableCell>
                          <TableCell>{formatDate(shift.startTime)}</TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(shift.sales.totalAmount)}
                          </TableCell>
                          <TableCell className="text-red-600">
                            {formatCurrency(shift.expenses)}
                          </TableCell>
                          <TableCell>
                            {shift.status === "active" ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                نشطة
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                                مغلقة
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedShift(shift);
                                setShowShiftDialog(true);
                              }}
                            >
                              <Eye className="h-3 w-3 ml-1" />
                              تفاصيل
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* تقرير العملاء */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    تقرير العملاء (أعلى 10 عملاء)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>#</TableHead>
                        <TableHead>اسم العميل</TableHead>
                        <TableHead>عدد المشتريات</TableHead>
                        <TableHead>إجمالي المشتريات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topCustomers.map((cust, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {cust.name}
                          </TableCell>
                          <TableCell>{cust.count}</TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(cust.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* تقارير الموظفين */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    تقارير الموظفين
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        إجمالي الموظفين
                      </p>
                      <p className="text-2xl font-bold">{employees.length}</p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        الموظفين النشطين
                      </p>
                      <p className="text-2xl font-bold">
                        {employees.filter((e) => e.active).length}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        إجمالي الرواتب
                      </p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(
                          employees.reduce((sum, e) => sum + e.salary, 0)
                        )}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        عدد الورديات
                      </p>
                      <p className="text-2xl font-bold">
                        {filteredShifts.length}
                      </p>
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>اسم الموظف</TableHead>
                        <TableHead>الوظيفة</TableHead>
                        <TableHead>الراتب</TableHead>
                        <TableHead>الحالة</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">
                            {emp.name}
                          </TableCell>
                          <TableCell>{emp.position}</TableCell>
                          <TableCell className="font-bold">
                            {formatCurrency(emp.salary)}
                          </TableCell>
                          <TableCell>
                            {emp.active ? (
                              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                نشط
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                                غير نشط
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Dialog: تفاصيل الفاتورة */}
          <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
            <DialogContent className="max-w-3xl" dir="rtl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  تفاصيل الفاتورة
                </DialogTitle>
              </DialogHeader>
              {selectedInvoice && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        رقم الفاتورة
                      </p>
                      <p className="font-bold font-mono">
                        {selectedInvoice.id}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">التاريخ</p>
                      <p className="font-bold">
                        {formatDate(selectedInvoice.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">العميل</p>
                      <p className="font-bold">
                        {selectedInvoice.customerName || "عميل نقدي"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">نوع الدفع</p>
                      <p className="font-bold">
                        {selectedInvoice.paymentType === "cash" && "نقدي"}
                        {selectedInvoice.paymentType === "credit" && "آجل"}
                        {selectedInvoice.paymentType === "installment" &&
                          "تقسيط"}
                      </p>
                    </div>
                  </div>

                  {/* Payment Methods Section */}
                  {selectedInvoice.paymentMethodIds &&
                    selectedInvoice.paymentMethodIds.length > 0 && (
                      <div>
                        <h3 className="font-semibold mb-2">طرق الدفع</h3>
                        <div className="grid gap-2">
                          {selectedInvoice.paymentMethodIds.map((pmId, idx) => {
                            const paymentMethod = paymentMethods.find(
                              (pm) => pm.id === pmId
                            );
                            const amount =
                              selectedInvoice.paymentMethodAmounts?.[pmId] || 0;
                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                              >
                                <div className="flex items-center gap-2">
                                  {paymentMethod?.type === "cash" && (
                                    <span>💵</span>
                                  )}
                                  {paymentMethod?.type === "wallet" && (
                                    <span>👛</span>
                                  )}
                                  {paymentMethod?.type === "visa" && (
                                    <span>💳</span>
                                  )}
                                  {paymentMethod?.type === "bank_transfer" && (
                                    <span>🏦</span>
                                  )}
                                  <span className="font-medium">
                                    {paymentMethod?.name || "غير محدد"}
                                  </span>
                                </div>
                                <span className="font-bold text-primary">
                                  {formatCurrency(amount)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  <div>
                    <h3 className="font-semibold mb-2">المنتجات</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>المنتج</TableHead>
                          <TableHead>الوحدة</TableHead>
                          <TableHead>نوع السعر</TableHead>
                          <TableHead>الكمية</TableHead>
                          <TableHead>السعر</TableHead>
                          <TableHead>الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {item.productName}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.unitName || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {item.priceTypeName || "-"}
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.price)}</TableCell>
                            <TableCell className="font-bold">
                              {formatCurrency(item.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        المجموع الفرعي
                      </p>
                      <p className="text-lg font-bold">
                        {formatCurrency(selectedInvoice.subtotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الضريبة</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(selectedInvoice.tax)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الإجمالي</p>
                      <p className="text-xl font-bold text-primary">
                        {formatCurrency(selectedInvoice.total)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Dialog: تفاصيل المرتجع */}
          <Dialog open={showReturnDialog} onOpenChange={setShowReturnDialog}>
            <DialogContent className="max-w-3xl" dir="rtl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  تفاصيل المرتجع
                </DialogTitle>
              </DialogHeader>
              {selectedReturn && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        رقم المرتجع
                      </p>
                      <p className="font-bold font-mono">{selectedReturn.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        الفاتورة الأصلية
                      </p>
                      <p className="font-bold font-mono">
                        {selectedReturn.originalInvoiceId}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">التاريخ</p>
                      <p className="font-bold">
                        {formatDate(selectedReturn.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">العميل</p>
                      <p className="font-bold">
                        {selectedReturn.customerName || "غير محدد"}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-muted-foreground">
                        سبب الإرجاع
                      </p>
                      <p className="font-bold">{selectedReturn.reason}</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">المنتجات المرتجعة</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>المنتج</TableHead>
                          <TableHead>الكمية</TableHead>
                          <TableHead>السعر</TableHead>
                          <TableHead>الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReturn.items.map((item, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">
                              {item.productName}
                            </TableCell>
                            <TableCell className="text-orange-600 font-bold">
                              {item.quantity}
                            </TableCell>
                            <TableCell>{formatCurrency(item.price)}</TableCell>
                            <TableCell className="font-bold">
                              {formatCurrency(item.total)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="grid grid-cols-3 gap-4 p-4 border rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        المجموع الفرعي
                      </p>
                      <p className="text-lg font-bold">
                        {formatCurrency(selectedReturn.subtotal)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الضريبة</p>
                      <p className="text-lg font-bold">
                        {formatCurrency(selectedReturn.tax)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        إجمالي المرتجع
                      </p>
                      <p className="text-xl font-bold text-red-600">
                        {formatCurrency(selectedReturn.total)}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Dialog: تفاصيل الوردية */}
          <Dialog open={showShiftDialog} onOpenChange={setShowShiftDialog}>
            <DialogContent className="max-w-4xl" dir="rtl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  تفاصيل الوردية
                </DialogTitle>
              </DialogHeader>
              {selectedShift && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        رقم الوردية
                      </p>
                      <p className="font-bold font-mono">{selectedShift.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الموظف</p>
                      <p className="font-bold">{selectedShift.employeeName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">الحالة</p>
                      <p>
                        {selectedShift.status === "active" ? (
                          <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                            نشطة
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                            مغلقة
                          </span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">وقت البدء</p>
                      <p className="font-bold">
                        {formatDate(selectedShift.startTime)}
                      </p>
                    </div>
                    {selectedShift.endTime && (
                      <div>
                        <p className="text-sm text-muted-foreground">
                          وقت الانتهاء
                        </p>
                        <p className="font-bold">
                          {formatDate(selectedShift.endTime)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-muted-foreground">
                        المبلغ الافتتاحي
                      </p>
                      <p className="font-bold">
                        {formatCurrency(selectedShift.startingCash)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        عدد الفواتير
                      </p>
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedShift.sales.totalInvoices}
                      </p>
                    </div>
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        إجمالي المبيعات
                      </p>
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(selectedShift.sales.totalAmount)}
                      </p>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">المصروفات</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(selectedShift.expenses)}
                      </p>
                    </div>
                    <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
                      <p className="text-sm text-muted-foreground">المرتجعات</p>
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(selectedShift.sales.returns)}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">
                      تفصيل المبيعات حسب طريقة الدفع
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground">نقدي</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(selectedShift.sales.cashSales)}
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground">بطاقة</p>
                        <p className="text-lg font-bold">
                          {formatCurrency(selectedShift.sales.cardSales)}
                        </p>
                      </div>
                      <div className="p-3 border rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          محفظة إلكترونية
                        </p>
                        <p className="text-lg font-bold">
                          {formatCurrency(selectedShift.sales.walletSales)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {selectedShift.status === "closed" && (
                    <div className="p-4 bg-muted rounded-lg">
                      <h3 className="font-semibold mb-2">تفاصيل الإغلاق</h3>
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            المتوقع
                          </p>
                          <p className="text-lg font-bold">
                            {formatCurrency(selectedShift.expectedCash || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">
                            الفعلي
                          </p>
                          <p className="text-lg font-bold">
                            {formatCurrency(selectedShift.actualCash || 0)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">الفرق</p>
                          <p
                            className={`text-lg font-bold ${
                              (selectedShift.difference || 0) >= 0
                                ? "text-green-600"
                                : "text-red-600"
                            }`}
                          >
                            {formatCurrency(selectedShift.difference || 0)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </main>
      )}
    </div>
  );
};

export default Reports;
