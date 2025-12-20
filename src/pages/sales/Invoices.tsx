import { useState, useEffect, useMemo } from "react";
import { POSHeader } from "@/components/POS/POSHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
    Search,
    Calendar,
    FileText,
    Package,
    CreditCard,
    DollarSign,
    User,
    Printer,
} from "lucide-react";
import { db, Invoice, Customer, PaymentMethod } from "@/shared/lib/indexedDB";
import { useSettingsContext } from "@/contexts/SettingsContext";

export default function Invoices() {
    const { getSetting } = useSettingsContext();
    const currency = getSetting("currency") || "EGP";

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>("all");
    const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>("all");

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const allInvoices = await db.getAll<Invoice>("invoices");
        // Sort by date descending
        const sortedInvoices = allInvoices.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setInvoices(sortedInvoices);

        const allCustomers = await db.getAll<Customer>("customers");
        setCustomers(allCustomers);

        const allMethods = await db.getAll<PaymentMethod>("paymentMethods");
        setPaymentMethods(allMethods);
    };

    const getCustomerName = (customerId?: string) => {
        if (!customerId) return "عميل نقدي";
        const customer = customers.find((c) => c.id === customerId);
        return customer?.name || "غير محدد";
    };

    const getPaymentMethodName = (methodId: string): string => {
        const method = paymentMethods.find((m) => m.id === methodId);
        return method?.name || methodId;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("ar-EG", {
            year: "numeric",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // Filter invoices
    const filteredInvoices = useMemo(() => {
        return invoices.filter((invoice) => {
            // Search filter
            const matchesSearch =
                searchQuery === "" ||
                invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                getCustomerName(invoice.customerId)
                    .toLowerCase()
                    .includes(searchQuery.toLowerCase());

            // Date filters
            const invoiceDate = new Date(invoice.createdAt);
            const matchesDateFrom = dateFrom === "" || invoiceDate >= new Date(dateFrom);
            const matchesDateTo =
                dateTo === "" || invoiceDate <= new Date(dateTo + "T23:59:59");

            // Payment type filter
            const matchesPaymentType =
                paymentTypeFilter === "all" || invoice.paymentType === paymentTypeFilter;

            // Payment status filter - مع معالجة الداتا القديمة
            let actualStatus = invoice.paymentStatus;
            // الفاتورة النقدية الي ليها طريقة دفع بس paidAmount = 0 تعتبر مدفوعة
            const hasPaymentMethod = invoice.paymentMethodIds && invoice.paymentMethodIds.length > 0;
            const isCashInvoice = invoice.paymentType === "cash";
            if (isCashInvoice && hasPaymentMethod && (invoice.paidAmount || 0) === 0) {
                actualStatus = "paid";
            }
            const matchesPaymentStatus =
                paymentStatusFilter === "all" ||
                actualStatus === paymentStatusFilter;

            return (
                matchesSearch &&
                matchesDateFrom &&
                matchesDateTo &&
                matchesPaymentType &&
                matchesPaymentStatus
            );
        });
    }, [
        invoices,
        searchQuery,
        dateFrom,
        dateTo,
        paymentTypeFilter,
        paymentStatusFilter,
    ]);

    const openInvoiceDetails = (invoice: Invoice) => {
        setSelectedInvoice(invoice);
        setIsDetailsOpen(true);
    };

    const getStatusBadge = (invoice: Invoice) => {
        // معالجة الداتا القديمة: الفواتير النقدية الي ليها طريقة دفع بس paidAmount = 0
        // تعتبر مدفوعة بالكامل
        const hasPaymentMethod = invoice.paymentMethodIds && invoice.paymentMethodIds.length > 0;
        const isCashInvoice = invoice.paymentType === "cash";
        const isLegacyPaidCash = isCashInvoice && hasPaymentMethod && (invoice.paidAmount || 0) === 0;

        const actualStatus = isLegacyPaidCash ? "paid" : invoice.paymentStatus;

        if (actualStatus === "paid") {
            return <Badge className="bg-green-500">مدفوعة</Badge>;
        } else if (actualStatus === "partial") {
            return <Badge className="bg-yellow-500">دفع جزئي</Badge>;
        } else {
            return <Badge className="bg-red-500">غير مدفوعة</Badge>;
        }
    };

    const getPaymentTypeBadge = (invoice: Invoice) => {
        if (invoice.paymentType === "cash") {
            return <Badge variant="outline">نقدي</Badge>;
        } else if (invoice.paymentType === "credit") {
            return (
                <Badge variant="outline" className="border-orange-500 text-orange-600">
                    آجل
                </Badge>
            );
        } else if (invoice.paymentType === "installment") {
            return (
                <Badge variant="outline" className="border-purple-500 text-purple-600">
                    تقسيط
                </Badge>
            );
        }
        return null;
    };

    // دالة مساعدة لحساب المبلغ المدفوع الفعلي (للداتا القديمة)
    const getActualPaidAmount = (invoice: Invoice): number => {
        const hasPaymentMethod = invoice.paymentMethodIds && invoice.paymentMethodIds.length > 0;
        const isCashInvoice = invoice.paymentType === "cash";
        // لو فاتورة نقدية وليها طريقة دفع بس paidAmount = 0، يبقى مدفوعة بالكامل
        if (isCashInvoice && hasPaymentMethod && (invoice.paidAmount || 0) === 0) {
            return invoice.total || 0;
        }
        return invoice.paidAmount || 0;
    };

    // حساب المتبقي الفعلي
    const getActualRemainingAmount = (invoice: Invoice): number => {
        const actualPaid = getActualPaidAmount(invoice);
        return Math.max(0, (invoice.total || 0) - actualPaid);
    };

    // Calculate totals
    const totalInvoices = filteredInvoices.length;
    const totalAmount = filteredInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
    const totalPaid = filteredInvoices.reduce((sum, inv) => sum + getActualPaidAmount(inv), 0);

    return (
        <div className="min-h-screen bg-background" dir="rtl">
            <POSHeader />

            <div className="container mx-auto p-6">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <FileText className="h-8 w-8 text-primary" />
                        سجل الفواتير
                    </h1>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">عدد الفواتير</p>
                                <p className="text-2xl font-bold text-primary">{totalInvoices}</p>
                            </div>
                            <FileText className="h-8 w-8 text-primary" />
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">إجمالي المبيعات</p>
                                <p className="text-2xl font-bold text-blue-600">
                                    {totalAmount.toFixed(2)} {currency}
                                </p>
                            </div>
                            <DollarSign className="h-8 w-8 text-blue-600" />
                        </div>
                    </Card>
                    <Card className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">إجمالي المحصل</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {totalPaid.toFixed(2)} {currency}
                                </p>
                            </div>
                            <CreditCard className="h-8 w-8 text-green-600" />
                        </div>
                    </Card>
                </div>

                {/* Filters */}
                <Card className="mb-6 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="ابحث برقم الفاتورة أو اسم العميل..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pr-10"
                            />
                        </div>

                        {/* Date From */}
                        <div className="space-y-1">
                            <Label className="text-xs">من تاريخ</Label>
                            <Input
                                type="date"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                            />
                        </div>

                        {/* Date To */}
                        <div className="space-y-1">
                            <Label className="text-xs">إلى تاريخ</Label>
                            <Input
                                type="date"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                            />
                        </div>

                        {/* Payment Type Filter */}
                        <Select value={paymentTypeFilter} onValueChange={setPaymentTypeFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="نوع الدفع" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">جميع الأنواع</SelectItem>
                                <SelectItem value="cash">نقدي</SelectItem>
                                <SelectItem value="credit">آجل</SelectItem>
                                <SelectItem value="installment">تقسيط</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Payment Status Filter */}
                        <Select
                            value={paymentStatusFilter}
                            onValueChange={setPaymentStatusFilter}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="حالة الدفع" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">جميع الحالات</SelectItem>
                                <SelectItem value="paid">مدفوعة</SelectItem>
                                <SelectItem value="partial">دفع جزئي</SelectItem>
                                <SelectItem value="unpaid">غير مدفوعة</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Clear filters button */}
                    {(searchQuery || dateFrom || dateTo || paymentTypeFilter !== "all" || paymentStatusFilter !== "all") && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={() => {
                                setSearchQuery("");
                                setDateFrom("");
                                setDateTo("");
                                setPaymentTypeFilter("all");
                                setPaymentStatusFilter("all");
                            }}
                        >
                            إزالة الفلاتر
                        </Button>
                    )}
                </Card>

                {/* Invoices Table */}
                <Card>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>رقم الفاتورة</TableHead>
                                <TableHead>العميل</TableHead>
                                <TableHead>التاريخ</TableHead>
                                <TableHead>الإجمالي</TableHead>
                                <TableHead>المدفوع</TableHead>
                                <TableHead>المتبقي</TableHead>
                                <TableHead>نوع الدفع</TableHead>
                                <TableHead>الحالة</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredInvoices.map((invoice) => (
                                <TableRow
                                    key={invoice.id}
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => openInvoiceDetails(invoice)}
                                >
                                    <TableCell className="font-medium">{invoice.id}</TableCell>
                                    <TableCell>{getCustomerName(invoice.customerId)}</TableCell>
                                    <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                                    <TableCell>
                                        {invoice.total?.toFixed(2)} {currency}
                                    </TableCell>
                                    <TableCell className="text-green-600">
                                        {getActualPaidAmount(invoice).toFixed(2)} {currency}
                                    </TableCell>
                                    <TableCell className={getActualRemainingAmount(invoice) > 0 ? "text-red-600 font-semibold" : ""}>
                                        {getActualRemainingAmount(invoice).toFixed(2)} {currency}
                                    </TableCell>
                                    <TableCell>{getPaymentTypeBadge(invoice)}</TableCell>
                                    <TableCell>{getStatusBadge(invoice)}</TableCell>
                                </TableRow>
                            ))}
                            {filteredInvoices.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={8}
                                        className="text-center text-muted-foreground py-8"
                                    >
                                        لا توجد فواتير مطابقة للبحث
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>

            {/* Invoice Details Dialog */}
            <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl">
                            <FileText className="h-6 w-6 text-primary" />
                            تفاصيل الفاتورة #{selectedInvoice?.id}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedInvoice && (
                        <div className="space-y-6">
                            {/* Invoice Info */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                                <div>
                                    <p className="text-sm text-muted-foreground">التاريخ</p>
                                    <p className="font-semibold">{formatDate(selectedInvoice.createdAt)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">العميل</p>
                                    <p className="font-semibold flex items-center gap-1">
                                        <User className="h-4 w-4" />
                                        {getCustomerName(selectedInvoice.customerId)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">نوع الدفع</p>
                                    <div className="mt-1">{getPaymentTypeBadge(selectedInvoice)}</div>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">الحالة</p>
                                    <div className="mt-1">{getStatusBadge(selectedInvoice)}</div>
                                </div>
                            </div>

                            {/* Products */}
                            <div>
                                <h3 className="font-semibold mb-3 flex items-center gap-2">
                                    <Package className="h-5 w-5" />
                                    المنتجات ({selectedInvoice.items?.length || 0})
                                </h3>
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
                                        {selectedInvoice.items?.map((item, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{item.productName}</TableCell>
                                                <TableCell>{item.quantity}</TableCell>
                                                <TableCell>
                                                    {item.price?.toFixed(2)} {currency}
                                                </TableCell>
                                                <TableCell className="font-semibold">
                                                    {item.total?.toFixed(2)} {currency}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Payment Methods */}
                            {selectedInvoice.paymentMethodAmounts &&
                                Object.keys(selectedInvoice.paymentMethodAmounts).length > 0 && (
                                    <div>
                                        <h3 className="font-semibold mb-3 flex items-center gap-2">
                                            <CreditCard className="h-5 w-5" />
                                            طرق الدفع
                                        </h3>
                                        <div className="space-y-2">
                                            {Object.entries(selectedInvoice.paymentMethodAmounts).map(
                                                ([methodId, amount]: [string, any]) => {
                                                    // معالجة الداتا القديمة: لو الفاتورة نقدية والمبلغ = 0، نعرض الإجمالي
                                                    let displayAmount = parseFloat(amount) || 0;
                                                    if (displayAmount === 0 && selectedInvoice.paymentType === "cash") {
                                                        displayAmount = selectedInvoice.total || 0;
                                                    }

                                                    return displayAmount > 0 ? (
                                                        <div
                                                            key={methodId}
                                                            className="flex justify-between p-3 bg-green-50 rounded-lg"
                                                        >
                                                            <span className="font-medium">
                                                                {getPaymentMethodName(methodId)}
                                                            </span>
                                                            <span className="font-bold text-green-600">
                                                                {displayAmount.toFixed(2)} {currency}
                                                            </span>
                                                        </div>
                                                    ) : null;
                                                }
                                            )}
                                        </div>
                                    </div>
                                )}

                            {/* Totals */}
                            <div className="border-t pt-4 space-y-2">
                                <div className="flex justify-between text-lg">
                                    <span>المجموع الفرعي</span>
                                    <span>{selectedInvoice.subtotal?.toFixed(2)} {currency}</span>
                                </div>
                                {selectedInvoice.discount > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>الخصم</span>
                                        <span>-{selectedInvoice.discount?.toFixed(2)} {currency}</span>
                                    </div>
                                )}
                                {selectedInvoice.tax > 0 && (
                                    <div className="flex justify-between">
                                        <span>الضريبة</span>
                                        <span>{selectedInvoice.tax?.toFixed(2)} {currency}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xl font-bold border-t pt-2">
                                    <span>الإجمالي</span>
                                    <span>{selectedInvoice.total?.toFixed(2)} {currency}</span>
                                </div>
                                <div className="flex justify-between text-green-600">
                                    <span>المدفوع</span>
                                    <span>{getActualPaidAmount(selectedInvoice).toFixed(2)} {currency}</span>
                                </div>
                                {getActualRemainingAmount(selectedInvoice) > 0 && (
                                    <div className="flex justify-between text-red-600 font-bold">
                                        <span>المتبقي</span>
                                        <span>{getActualRemainingAmount(selectedInvoice).toFixed(2)} {currency}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2 justify-end border-t pt-4">
                                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                                    إغلاق
                                </Button>
                                <Button onClick={() => window.print()}>
                                    <Printer className="h-4 w-4 ml-2" />
                                    طباعة
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
