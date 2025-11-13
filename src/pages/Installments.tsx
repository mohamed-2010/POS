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
import { POSHeader } from "@/components/POS/POSHeader";
import { db, Invoice, InstallmentPayment, Customer } from "@/lib/indexedDB";
import { toast } from "sonner";
import { Calendar, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Installments() {
  const { can } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  useEffect(() => {
    loadInstallments();
  }, []);

  const loadInstallments = async () => {
    const allInvoices = await db.getAll<Invoice>("invoices");
    const installmentInvoices = allInvoices.filter(
      (inv) => inv.paymentType === "installment" && inv.installmentPlan
    );
    setInvoices(installmentInvoices);
  };

  const handlePayInstallment = async (
    invoice: Invoice,
    installmentId: string
  ) => {
    if (!invoice.installmentPlan) return;

    const updatedPlan = { ...invoice.installmentPlan };
    const paymentIndex = updatedPlan.payments.findIndex(
      (p) => p.id === installmentId
    );

    if (paymentIndex === -1) return;

    updatedPlan.payments[paymentIndex] = {
      ...updatedPlan.payments[paymentIndex],
      paid: true,
      paidDate: new Date().toISOString(),
    };

    const paidAmount = updatedPlan.payments
      .filter((p) => p.paid)
      .reduce((sum, p) => sum + p.amount, 0);

    const updatedInvoice: Invoice = {
      ...invoice,
      installmentPlan: updatedPlan,
      paidAmount,
      remainingAmount: invoice.total - paidAmount,
      paymentStatus: paidAmount >= invoice.total ? "paid" : "partial",
    };

    await db.update("invoices", updatedInvoice);

    // Update customer balance
    if (invoice.customerId) {
      const customer = await db.get<Customer>("customers", invoice.customerId);
      if (customer) {
        customer.currentBalance -= updatedPlan.payments[paymentIndex].amount;
        await db.update("customers", customer);
      }
    }

    toast.success("تم تسجيل دفعة التقسيط بنجاح");
    loadInstallments();
    setSelectedInvoice(null);
    setIsPaymentDialogOpen(false);
  };

  const openPaymentDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setIsPaymentDialogOpen(true);
  };

  const getTotalPending = () => {
    return invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
  };

  const getTotalOverdue = () => {
    const today = new Date();
    return invoices.reduce((sum, inv) => {
      if (!inv.installmentPlan) return sum;
      const overduePayments = inv.installmentPlan.payments.filter(
        (p) => !p.paid && new Date(p.dueDate) < today
      );
      return sum + overduePayments.reduce((s, p) => s + p.amount, 0);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <POSHeader />
      {!can("installments", "view") ? (
        <div className="container mx-auto p-6">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">غير مصرح</h2>
            <p className="text-muted-foreground">ليس لديك صلاحية عرض التقسيط</p>
          </Card>
        </div>
      ) : (
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold">إدارة التقسيط</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    إجمالي المتبقي
                  </p>
                  <p className="text-2xl font-bold">
                    {getTotalPending().toFixed(2)} ر.س
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-primary" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">المتأخرات</p>
                  <p className="text-2xl font-bold text-destructive">
                    {getTotalOverdue().toFixed(2)} ر.س
                  </p>
                </div>
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
            </Card>
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">عدد الفواتير</p>
                  <p className="text-2xl font-bold">{invoices.length}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
            </Card>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>العميل</TableHead>
                  <TableHead>المبلغ الإجمالي</TableHead>
                  <TableHead>المدفوع</TableHead>
                  <TableHead>المتبقي</TableHead>
                  <TableHead>عدد الأقساط</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.id.slice(0, 8)}
                    </TableCell>
                    <TableCell>{invoice.customerName || "غير محدد"}</TableCell>
                    <TableCell>{invoice.total.toFixed(2)} ر.س</TableCell>
                    <TableCell>{invoice.paidAmount.toFixed(2)} ر.س</TableCell>
                    <TableCell className="text-destructive font-semibold">
                      {invoice.remainingAmount.toFixed(2)} ر.س
                    </TableCell>
                    <TableCell>
                      {
                        invoice.installmentPlan?.payments.filter((p) => p.paid)
                          .length
                      }{" "}
                      / {invoice.installmentPlan?.numberOfInstallments}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.paymentStatus === "paid"
                            ? "default"
                            : invoice.paymentStatus === "partial"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {invoice.paymentStatus === "paid"
                          ? "مكتمل"
                          : invoice.paymentStatus === "partial"
                          ? "جزئي"
                          : "غير مدفوع"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        onClick={() => openPaymentDialog(invoice)}
                        disabled={invoice.paymentStatus === "paid"}
                      >
                        عرض الأقساط
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {invoices.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center text-muted-foreground py-8"
                    >
                      لا توجد فواتير تقسيط
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
            <DialogContent className="max-w-2xl" dir="rtl">
              <DialogHeader>
                <DialogTitle>تفاصيل أقساط الفاتورة</DialogTitle>
              </DialogHeader>
              {selectedInvoice && selectedInvoice.installmentPlan && (
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
                        {selectedInvoice.customerName}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        المبلغ الإجمالي
                      </p>
                      <p className="font-semibold">
                        {selectedInvoice.total.toFixed(2)} ر.س
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        نسبة الفائدة
                      </p>
                      <p className="font-semibold">
                        {selectedInvoice.installmentPlan.interestRate}%
                      </p>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>القسط</TableHead>
                        <TableHead>تاريخ الاستحقاق</TableHead>
                        <TableHead>المبلغ</TableHead>
                        <TableHead>الحالة</TableHead>
                        <TableHead>إجراء</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedInvoice.installmentPlan.payments.map(
                        (payment, index) => {
                          const isOverdue =
                            !payment.paid &&
                            new Date(payment.dueDate) < new Date();
                          return (
                            <TableRow key={payment.id}>
                              <TableCell>القسط {index + 1}</TableCell>
                              <TableCell>
                                {new Date(payment.dueDate).toLocaleDateString(
                                  "ar-SA"
                                )}
                              </TableCell>
                              <TableCell>
                                {payment.amount.toFixed(2)} ر.س
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    payment.paid
                                      ? "default"
                                      : isOverdue
                                      ? "destructive"
                                      : "secondary"
                                  }
                                >
                                  {payment.paid
                                    ? "مدفوع"
                                    : isOverdue
                                    ? "متأخر"
                                    : "معلق"}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {!payment.paid ? (
                                  can("installments", "edit") && (
                                    <Button
                                      size="sm"
                                      onClick={() =>
                                        handlePayInstallment(
                                          selectedInvoice,
                                          payment.id
                                        )
                                      }
                                    >
                                      تسديد
                                    </Button>
                                  )
                                ) : (
                                  <span className="text-sm text-muted-foreground">
                                    {payment.paidDate &&
                                      new Date(
                                        payment.paidDate
                                      ).toLocaleDateString("ar-SA")}
                                  </span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        }
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
