import { useState, useEffect, useMemo } from "react";
import { POSHeader } from "@/components/POS/POSHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ExportButtons } from "@/components/ExportButtons";
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
import {
  FileText,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  CreditCard,
  ShoppingCart,
  RotateCcw,
  Receipt,
  AlertTriangle,
  Calendar,
  Filter,
  BarChart3,
  PieChart as PieChartIcon,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  db,
  Invoice,
  Customer,
  Product,
  SalesReturn,
  Shift,
  Employee,
  Expense,
  PaymentMethod,
  ProductCategory,
} from "@/lib/indexedDB";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useToast } from "@/hooks/use-toast";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

const Reports = () => {
  const { getSetting } = useSettingsContext();
  const currency = getSetting("currency") || "EGP";
  const { toast } = useToast();

  // States للبيانات
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);

  // Filters
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedEmployee, setSelectedEmployee] = useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [
        inv,
        cust,
        prod,
        salesRet,
        shft,
        emp,
        exp,
        pms,
        cats,
      ] = await Promise.all([
        db.getAll<Invoice>("invoices"),
        db.getAll<Customer>("customers"),
        db.getAll<Product>("products"),
        db.getAll<SalesReturn>("salesReturns"),
        db.getAll<Shift>("shifts"),
        db.getAll<Employee>("employees"),
        db.getAll<Expense>("expenses"),
        db.getAll<PaymentMethod>("paymentMethods"),
        db.getAll<ProductCategory>("productCategories"),
      ]);
      setInvoices(inv);
      setCustomers(cust);
      setProducts(prod);
      setSalesReturns(salesRet);
      setShifts(shft);
      setEmployees(emp);
      setExpenses(exp);
      setPaymentMethods(pms);
      setCategories(cats);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "خطأ",
        description: "فشل تحميل البيانات",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Helpers
  const filterByDate = (date: string) => {
    const itemDate = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    return itemDate >= start && itemDate <= end;
  };

  const formatCurrency = (amount: number) =>
    `${amount.toLocaleString("ar-EG", { minimumFractionDigits: 2 })} ${currency}`;
  
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("ar-EG");

  // Filtered Data with advanced filters
  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv) => {
      if (!filterByDate(inv.createdAt)) return false;
      if (selectedEmployee !== "all" && inv.userId !== selectedEmployee) return false;
      if (selectedCustomer !== "all" && inv.customerId !== selectedCustomer) return false;
      
      // Filter by payment method
      if (selectedPaymentMethod !== "all") {
        if (inv.paymentMethodIds) {
          if (!inv.paymentMethodIds.includes(selectedPaymentMethod)) return false;
        } else if (inv.paymentType !== selectedPaymentMethod) {
          return false;
        }
      }
      
      // Filter by category
      if (selectedCategory !== "all") {
        const hasCategory = inv.items.some(item => {
          const product = products.find(p => p.id === item.productId);
          const category = categories.find(c => c.name === product?.category);
          return category?.id === selectedCategory;
        });
        if (!hasCategory) return false;
      }
      
      return true;
    });
  }, [invoices, startDate, endDate, selectedEmployee, selectedPaymentMethod, selectedCategory, selectedCustomer, products]);

  const filteredSalesReturns = salesReturns.filter((ret) =>
    filterByDate(ret.createdAt)
  );
  const filteredShifts = shifts.filter((shift) => filterByDate(shift.startTime));
  const filteredExpenses = expenses.filter((exp) => filterByDate(exp.createdAt));

  // Calculations
  const totalSales = filteredInvoices.reduce((sum, inv) => sum + inv.total, 0);
  const totalSalesReturns = filteredSalesReturns.reduce(
    (sum, ret) => sum + ret.total,
    0
  );
  const totalExpenses = filteredExpenses.reduce(
    (sum, exp) => sum + exp.amount,
    0
  );
  const netSales = totalSales - totalSalesReturns;
  const netProfit = netSales - totalExpenses;
  const invoiceCount = filteredInvoices.length;
  const avgInvoiceValue = invoiceCount > 0 ? totalSales / invoiceCount : 0;

  // مبيعات حسب طريقة الدفع - ديناميكية
  const salesByPaymentMethod = useMemo(() => {
    const methodSales: { [key: string]: { name: string; amount: number } } = {};
    
    paymentMethods.forEach(method => {
      methodSales[method.id] = { name: method.name, amount: 0 };
    });

    filteredInvoices.forEach((inv) => {
      if (inv.paymentMethodAmounts && Object.keys(inv.paymentMethodAmounts).length > 0) {
        Object.entries(inv.paymentMethodAmounts).forEach(([methodId, amount]) => {
          if (methodSales[methodId]) {
            methodSales[methodId].amount += (typeof amount === 'number' ? amount : parseFloat(String(amount))) || 0;
          }
        });
      } else if (inv.paymentType) {
        const cashMethod = paymentMethods.find(pm => pm.type === 'cash');
        if (inv.paymentType === 'cash' && cashMethod) {
          methodSales[cashMethod.id].amount += inv.total;
        }
      }
    });

    return Object.values(methodSales).filter(m => m.amount > 0);
  }, [filteredInvoices, paymentMethods]);

  // تحليل المنتجات
  const topProducts = useMemo(() => {
    const productSalesMap = new Map<
      string,
      { name: string; quantity: number; total: number; category: string }
    >();
    
    filteredInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const product = products.find(p => p.id === item.productId);
        const category = categories.find(c => c.name === product?.category);
        
        const existing = productSalesMap.get(item.productId) || {
          name: item.productName,
          quantity: 0,
          total: 0,
          category: category?.name || product?.category || 'غير محدد'
        };
        
        productSalesMap.set(item.productId, {
          name: item.productName,
          quantity: existing.quantity + item.quantity,
          total: existing.total + item.total,
          category: existing.category
        });
      });
    });
    
    return Array.from(productSalesMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredInvoices, products, categories]);

  // تحليل العملاء
  const topCustomers = useMemo(() => {
    const customerSalesMap = new Map<
      string,
      { name: string; total: number; count: number; phone: string }
    >();
    
    filteredInvoices.forEach((inv) => {
      if (inv.customerId) {
        const customer = customers.find(c => c.id === inv.customerId);
        const existing = customerSalesMap.get(inv.customerId) || {
          name: inv.customerName || "غير محدد",
          total: 0,
          count: 0,
          phone: customer?.phone || '-'
        };
        
        customerSalesMap.set(inv.customerId, {
          name: existing.name,
          total: existing.total + inv.total,
          count: existing.count + 1,
          phone: existing.phone
        });
      }
    });
    
    return Array.from(customerSalesMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredInvoices, customers]);

  // مبيعات حسب الفئات
  const salesByCategory = useMemo(() => {
    const categorySales = new Map<string, { name: string; total: number }>();
    
    filteredInvoices.forEach((inv) => {
      inv.items.forEach((item) => {
        const product = products.find(p => p.id === item.productId);
        const category = categories.find(c => c.name === product?.category);
        const categoryId = category?.id || 'uncategorized';
        const categoryName = category?.name || product?.category || 'غير مصنف';
        
        const existing = categorySales.get(categoryId) || { name: categoryName, total: 0 };
        categorySales.set(categoryId, {
          name: categoryName,
          total: existing.total + item.total
        });
      });
    });
    
    return Array.from(categorySales.values())
      .sort((a, b) => b.total - a.total);
  }, [filteredInvoices, products, categories]);

  // مبيعات يومية (آخر 7 أيام)
  const dailySales = useMemo(() => {
    const salesByDay = new Map<string, number>();
    const end = new Date(endDate);
    const start = new Date(end);
    start.setDate(start.getDate() - 6);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      salesByDay.set(dateStr, 0);
    }
    
    filteredInvoices.forEach((inv) => {
      const dateStr = inv.createdAt.split('T')[0];
      if (salesByDay.has(dateStr)) {
        salesByDay.set(dateStr, (salesByDay.get(dateStr) || 0) + inv.total);
      }
    });
    
    return Array.from(salesByDay.entries()).map(([date, total]) => ({
      date: new Date(date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
      total
    }));
  }, [filteredInvoices, endDate]);

  // أداء الموظفين
  const employeePerformance = useMemo(() => {
    const empSales = new Map<string, { name: string; sales: number; count: number }>();
    
    filteredInvoices.forEach((inv) => {
      const emp = employees.find(e => e.id === inv.userId);
      const empId = inv.userId || 'unknown';
      const empName = inv.userName || emp?.name || 'غير محدد';
      
      const existing = empSales.get(empId) || { name: empName, sales: 0, count: 0 };
      empSales.set(empId, {
        name: empName,
        sales: existing.sales + inv.total,
        count: existing.count + 1
      });
    });
    
    return Array.from(empSales.values())
      .sort((a, b) => b.sales - a.sales);
  }, [filteredInvoices, employees]);

  // مقارنة بالفترة السابقة
  const previousPeriodComparison = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
    
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - daysDiff);
    const prevEnd = new Date(end);
    prevEnd.setDate(prevEnd.getDate() - daysDiff);
    
    const previousInvoices = invoices.filter(inv => {
      const invDate = new Date(inv.createdAt);
      return invDate >= prevStart && invDate <= prevEnd;
    });
    
    const prevTotalSales = previousInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const salesChange = prevTotalSales > 0 ? ((totalSales - prevTotalSales) / prevTotalSales) * 100 : 0;
    
    const prevInvoiceCount = previousInvoices.length;
    const countChange = prevInvoiceCount > 0 ? ((invoiceCount - prevInvoiceCount) / prevInvoiceCount) * 100 : 0;
    
    return {
      salesChange,
      countChange,
      prevTotalSales,
      prevInvoiceCount
    };
  }, [invoices, startDate, endDate, totalSales, invoiceCount]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <POSHeader />
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>جاري تحميل التقارير...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <POSHeader />
      
      <div className="container mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">التقارير والتحليلات</h1>
            <p className="text-muted-foreground">تحليل شامل لأداء الأعمال</p>
          </div>
        </div>

        {/* Filters Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              الفلاتر والتصفية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
              
              <div>
                <Label>الموظف</Label>
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>طريقة الدفع</Label>
                <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {paymentMethods.map(pm => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>الفئة</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>العميل</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {customers.map(cust => (
                      <SelectItem key={cust.id} value={cust.id}>
                        {cust.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المبيعات</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {previousPeriodComparison.salesChange >= 0 ? (
                  <><ArrowUpRight className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">
                    +{previousPeriodComparison.salesChange.toFixed(1)}%
                  </span></>
                ) : (
                  <><ArrowDownRight className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">
                    {previousPeriodComparison.salesChange.toFixed(1)}%
                  </span></>
                )}
                <span className="mr-1">عن الفترة السابقة</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">صافي الربح</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(netProfit)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                بعد المصروفات والمرتجعات
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">عدد الفواتير</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoiceCount}</div>
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                {previousPeriodComparison.countChange >= 0 ? (
                  <><ArrowUpRight className="h-3 w-3 text-green-500" />
                  <span className="text-green-500">
                    +{previousPeriodComparison.countChange.toFixed(1)}%
                  </span></>
                ) : (
                  <><ArrowDownRight className="h-3 w-3 text-red-500" />
                  <span className="text-red-500">
                    {previousPeriodComparison.countChange.toFixed(1)}%
                  </span></>
                )}
                <span className="mr-1">عن الفترة السابقة</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">متوسط الفاتورة</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(avgInvoiceValue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                القيمة المتوسطة للفاتورة
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* المبيعات اليومية */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                المبيعات اليومية (آخر 7 أيام)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend />
                  <Line type="monotone" dataKey="total" name="المبيعات" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* المبيعات حسب طريقة الدفع */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                المبيعات حسب طريقة الدفع
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={salesByPaymentMethod}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {salesByPaymentMethod.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* المبيعات حسب الفئات */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                المبيعات حسب الفئات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesByCategory.slice(0, 6)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="total" name="المبيعات" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* أداء الموظفين */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                أداء الموظفين
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={employeePerformance.slice(0, 5)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Bar dataKey="sales" name="المبيعات" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Tables */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="products">أفضل المنتجات</TabsTrigger>
            <TabsTrigger value="customers">أفضل العملاء</TabsTrigger>
            <TabsTrigger value="invoices">الفواتير</TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>أفضل 10 منتجات مبيعاً</CardTitle>
                <ExportButtons
                  title="تقرير أفضل المنتجات"
                  subtitle={`من ${formatDate(startDate)} إلى ${formatDate(endDate)}`}
                  fileName={`top-products-${startDate}-${endDate}`}
                  data={topProducts}
                  columns={[
                    { header: "المنتج", dataKey: "name" },
                    { header: "الفئة", dataKey: "category" },
                    { header: "الكمية", dataKey: "quantity" },
                    { header: "الإجمالي", dataKey: "total" },
                  ]}
                  summary={[
                    { label: "إجمالي المبيعات", value: totalSales },
                    { label: "عدد المنتجات", value: topProducts.length },
                  ]}
                  orientation="landscape"
                />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الفئة</TableHead>
                      <TableHead className="text-center">الكمية</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topProducts.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.category}</Badge>
                        </TableCell>
                        <TableCell className="text-center">{product.quantity}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(product.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customers" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>أفضل 10 عملاء</CardTitle>
                <ExportButtons
                  title="تقرير أفضل العملاء"
                  subtitle={`من ${formatDate(startDate)} إلى ${formatDate(endDate)}`}
                  fileName={`top-customers-${startDate}-${endDate}`}
                  data={topCustomers}
                  columns={[
                    { header: "اسم العميل", dataKey: "name" },
                    { header: "رقم الهاتف", dataKey: "phone" },
                    { header: "عدد الفواتير", dataKey: "count" },
                    { header: "الإجمالي", dataKey: "total" },
                  ]}
                  summary={[
                    { label: "إجمالي المبيعات", value: totalSales },
                    { label: "عدد العملاء", value: topCustomers.length },
                  ]}
                />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>اسم العميل</TableHead>
                      <TableHead>رقم الهاتف</TableHead>
                      <TableHead className="text-center">عدد الفواتير</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topCustomers.map((customer, index) => (
                      <TableRow key={index}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell className="font-medium">{customer.name}</TableCell>
                        <TableCell>{customer.phone}</TableCell>
                        <TableCell className="text-center">{customer.count}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">
                          {formatCurrency(customer.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoices" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>الفواتير ({filteredInvoices.length})</CardTitle>
                <ExportButtons
                  title="تقرير الفواتير"
                  subtitle={`من ${formatDate(startDate)} إلى ${formatDate(endDate)}`}
                  fileName={`invoices-${startDate}-${endDate}`}
                  data={filteredInvoices.map(inv => ({
                    id: inv.id,
                    date: formatDate(inv.createdAt),
                    customer: inv.customerName || 'عميل نقدي',
                    employee: inv.userName || '-',
                    total: inv.total,
                    status: inv.paymentStatus === 'paid' ? 'مدفوعة' : 
                            inv.paymentStatus === 'partial' ? 'جزئي' : 'غير مدفوعة'
                  }))}
                  columns={[
                    { header: "رقم الفاتورة", dataKey: "id" },
                    { header: "التاريخ", dataKey: "date" },
                    { header: "العميل", dataKey: "customer" },
                    { header: "الموظف", dataKey: "employee" },
                    { header: "الحالة", dataKey: "status" },
                    { header: "الإجمالي", dataKey: "total" },
                  ]}
                  summary={[
                    { label: "إجمالي المبيعات", value: totalSales },
                    { label: "عدد الفواتير", value: filteredInvoices.length },
                    { label: "متوسط الفاتورة", value: avgInvoiceValue },
                  ]}
                  orientation="landscape"
                />
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الفاتورة</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>العميل</TableHead>
                      <TableHead>الموظف</TableHead>
                      <TableHead>الحالة</TableHead>
                      <TableHead className="text-right">الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.slice(0, 50).map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">#{invoice.id}</TableCell>
                        <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                        <TableCell>{invoice.customerName || 'عميل نقدي'}</TableCell>
                        <TableCell>{invoice.userName || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={
                            invoice.paymentStatus === 'paid' ? 'default' : 
                            invoice.paymentStatus === 'partial' ? 'secondary' : 
                            'destructive'
                          }>
                            {invoice.paymentStatus === 'paid' ? 'مدفوعة' : 
                             invoice.paymentStatus === 'partial' ? 'جزئي' : 
                             'غير مدفوعة'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          {formatCurrency(invoice.total)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredInvoices.length > 50 && (
                  <p className="text-sm text-muted-foreground mt-4 text-center">
                    عرض أول 50 فاتورة من {filteredInvoices.length} فاتورة
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;
