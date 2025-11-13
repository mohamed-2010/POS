import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { POSHeader } from "@/components/POS/POSHeader";
import { db, Invoice, Customer } from "@/lib/indexedDB";
import { toast } from "sonner";
import { CreditCard, AlertCircle, DollarSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Credit() {
  const { can } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allInvoices = await db.getAll<Invoice>("invoices");
    const creditInvoices = allInvoices.filter(
      (inv) => inv.paymentType === "credit"
    );
    setInvoices(creditInvoices);

    const allCustomers = await db.getAll<Customer>("customers");
    setCustomers(allCustomers);
  };

  const openPaymentDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setPaymentAmount("");
    setIsPaymentDialogOpen(true);
  };

  const handlePayment = async () => {
    if (!selectedInvoice) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error("الرجاء إدخال مبلغ صحيح");
      return;
    }

    if (amount > selectedInvoice.remainingAmount) {
      toast.error("المبلغ المدخل أكبر من المبلغ المتبقي");
      return;
    }

    const updatedInvoice: Invoice = {
      ...selectedInvoice,
      paidAmount: selectedInvoice.paidAmount + amount,
      remainingAmount: selectedInvoice.remainingAmount - amount,
      paymentStatus:
        selectedInvoice.remainingAmount - amount <= 0 ? "paid" : "partial",
    };

    await db.update("invoices", updatedInvoice);

    // Update customer balance
    if (selectedInvoice.customerId) {
      const customer = await db.get<Customer>(
        "customers",
        selectedInvoice.customerId
      );
      if (customer) {
        customer.currentBalance -= amount;
        await db.update("customers", customer);
      }
    }

    toast.success("تم تسجيل الدفعة بنجاح");
    loadData();
    setIsPaymentDialogOpen(false);
    setSelectedInvoice(null);
  };

  const getTotalCredit = () => {
    return invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
  };

  const getOverdueInvoices = () => {
    const today = new Date();
    return invoices.filter(
      (inv) =>
        inv.dueDate && new Date(inv.dueDate) < today && inv.remainingAmount > 0
    );
  };

  const getCustomerName = (customerId?: string) => {
    if (!customerId) return "غير محدد";
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || "غير محدد";
  };

  const getDaysOverdue = (dueDate?: string) => {
    if (!dueDate) return 0;
    const today = new Date();
    const due = new Date(dueDate);
    const diff = Math.floor(
      (today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff : 0;
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <POSHeader />
      {!can("credit", "view") ? (
        <div className="container mx-auto p-6">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">غير مصرح</h2>
            <p className="text-muted-foreground">
              ليس لديك صلاحية عرض المبيعات الآجلة
            </p>
          </Card>
        </div>
      ) : (
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">إدارة المبيعات الآجلة</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي الديون</p>
                  <p className="text-2xl font-bold">
                    {getTotalCredit().toFixed(2)} ر.س
                  </p>
                </div>
                <CreditCard className="h-8 w-8 text-primary" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    الفواتير المتأخرة
                  </p>
                  <p className="text-2xl font-bold text-destructive">
                    {getOverdueInvoices().length}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">عدد الفواتير</p>
                  <p className="text-2xl font-bold">{invoices.length}</p>
                </div>
                <DollarSign className="h-8 w-8 text-primary" />
              </div>
            </Card>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>تاريخ الاستحقاق</TableHead>
                  <TableHead>المبلغ الإجمالي</TableHead>
                  <TableHead>المدفوع</TableHead>
                  <TableHead>المتبقي</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const daysOverdue = getDaysOverdue(invoice.dueDate);
                  const isOverdue =
                    daysOverdue > 0 && invoice.remainingAmount > 0;

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">
                        {invoice.id.slice(0, 8)}
                      </TableCell>
                      <TableCell>
                        {getCustomerName(invoice.customerId)}
                      </TableCell>
                      <TableCell>
                        {new Date(invoice.createdAt).toLocaleDateString(
                          "ar-SA"
                        )}
                      </TableCell>
                      <TableCell>
                        {invoice.dueDate ? (
                          <span
                            className={
                              isOverdue ? "text-destructive font-semibold" : ""
                            }
                          >
                            {new Date(invoice.dueDate).toLocaleDateString(
                              "ar-SA"
                            )}
                            {isOverdue && ` (متأخر ${daysOverdue} يوم)`}
                          </span>
                        ) : (
                          "غير محدد"
                        )}
                      </TableCell>
                      <TableCell>{invoice.total.toFixed(2)} ر.س</TableCell>
                      <TableCell>{invoice.paidAmount.toFixed(2)} ر.س</TableCell>
                      <TableCell className="text-destructive font-semibold">
                        {invoice.remainingAmount.toFixed(2)} ر.س
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            invoice.paymentStatus === "paid"
                              ? "default"
                              : invoice.paymentStatus === "partial"
                              ? "secondary"
                              : isOverdue
                              ? "destructive"
                              : "outline"
                          }
                        >
                          {invoice.paymentStatus === "paid"
                            ? "مكتمل"
                            : invoice.paymentStatus === "partial"
                            ? "جزئي"
                            : isOverdue
                            ? "متأخر"
                            : "غير مدفوع"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {can("credit", "edit") && (
                          <Button
                            size="sm"
                            onClick={() => openPaymentDialog(invoice)}
                            disabled={invoice.paymentStatus === "paid"}
                          >
                            تسديد
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="text-center text-muted-foreground py-8"
                    >
                      لا توجد فواتير آجلة
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <Dialog
            open={isPaymentDialogOpen}
            onOpenChange={setIsPaymentDialogOpen}
          >
            <DialogContent dir="rtl">
              <DialogHeader>
                <DialogTitle>تسديد دفعة</DialogTitle>
              </DialogHeader>
              {selectedInvoice && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        رقم الفاتورة
                      </p>
                      <p className="font-semibold">
                        {selectedInvoice.id.slice(0, 8)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">العميل</p>
                      <p className="font-semibold">
                        {getCustomerName(selectedInvoice.customerId)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        المبلغ المتبقي
                      </p>
                      <p className="font-semibold text-destructive">
                        {selectedInvoice.remainingAmount.toFixed(2)} ر.س
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        المبلغ المدفوع
                      </p>
                      <p className="font-semibold">
                        {selectedInvoice.paidAmount.toFixed(2)} ر.س
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="payment-amount">مبلغ الدفعة</Label>
                    <Input
                      id="payment-amount"
                      type="number"
                      placeholder="أدخل المبلغ"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      min="0"
                      max={selectedInvoice.remainingAmount}
                      step="0.01"
                    />
                  </div>

                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      onClick={() => setIsPaymentDialogOpen(false)}
                    >
                      إلغاء
                    </Button>
                    <Button onClick={handlePayment}>تسديد</Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
