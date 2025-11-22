import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { db, Shift } from "@/lib/indexedDB";
import { getShiftCashSummary } from "@/lib/cashMovementService";
import { Printer, AlertCircle, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shiftId: number;
  onConfirm: (actualCash: number, denominations: Denominations) => void;
}

interface Denominations {
  notes200: number;
  notes100: number;
  notes50: number;
  notes20: number;
  notes10: number;
  notes5: number;
  coins1: number;
}

const DENOMINATION_VALUES = {
  notes200: 200,
  notes100: 100,
  notes50: 50,
  notes20: 20,
  notes10: 10,
  notes5: 5,
  coins1: 1,
};

export function ZReportDialog({
  open,
  onOpenChange,
  shiftId,
  onConfirm,
}: Props) {
  const [shift, setShift] = useState<Shift | null>(null);
  const [cashSummary, setCashSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [denominations, setDenominations] = useState<Denominations>({
    notes200: 0,
    notes100: 0,
    notes50: 0,
    notes20: 0,
    notes10: 0,
    notes5: 0,
    coins1: 0,
  });

  useEffect(() => {
    if (open) {
      loadReport();
    }
  }, [open, shiftId]);

  const loadReport = async () => {
    setLoading(true);
    try {
      // جلب بيانات الوردية الأساسية (فقط لعرض اسم الموظف ووقت البدء والرصد الافتتاحي)
      const shiftData = await db.get<Shift>("shifts", shiftId.toString());
      if (!shiftData) {
        toast.error("الوردية غير موجودة");
        setLoading(false);
        return;
      }

      // جلب كل طرق الدفع من النظام
      const allPaymentMethods = await db.getAll<any>("paymentMethods");

      // جلب كل الفواتير الخاصة بالوردية
      const allInvoices = await db.getAll<any>("invoices");
      const shiftInvoices = allInvoices.filter(
        (inv) => inv.shiftId === shiftId.toString() || inv.shiftId === shiftId
      );

      // حساب إجمالي المبيعات وعدد الفواتير
      const totalSales = shiftInvoices.reduce(
        (sum, inv) => sum + (inv.total || 0),
        0
      );
      const totalInvoices = shiftInvoices.length;

      // حساب المبيعات لكل طريقة دفع بشكل ديناميكي
      const paymentMethodSales: {
        [key: string]: { name: string; amount: number; type: string };
      } = {};

      // تهيئة جميع طرق الدفع بقيمة 0
      allPaymentMethods.forEach((method: any) => {
        paymentMethodSales[method.id] = {
          name: method.name,
          amount: 0,
          type: method.type || "other",
        };
      });

      let cashSales = 0;
      let returns = 0;

      shiftInvoices.forEach((inv) => {
        // التعامل مع الفواتير الجديدة التي تحتوي على paymentMethodAmounts
        if (
          inv.paymentMethodAmounts &&
          Object.keys(inv.paymentMethodAmounts).length > 0
        ) {
          Object.entries(inv.paymentMethodAmounts).forEach(
            ([methodId, amount]: [string, any]) => {
              const amountValue = parseFloat(amount) || 0;

              // البحث عن طريقة الدفع
              if (paymentMethodSales[methodId]) {
                paymentMethodSales[methodId].amount += amountValue;
              } else {
                // إذا لم نجد الطريقة في النظام، نضيفها كطريقة مؤقتة
                const method = inv.paymentMethods?.find?.(
                  (pm: any) =>
                    pm.id === methodId || pm.id === methodId.toString()
                );
                paymentMethodSales[methodId] = {
                  name: method?.name || methodId,
                  amount: amountValue,
                  type: method?.type || "other",
                };
              }

              // حساب النقدي للنقدية المتوقعة
              const paymentMethod = allPaymentMethods.find(
                (pm: any) => pm.id === methodId
              );
              if (paymentMethod?.type === "cash") {
                cashSales += amountValue;
              }
            }
          );
        }
        // التعامل مع الفواتير القديمة التي تحتوي على paymentType فقط
        else if (inv.paymentType) {
          const total = inv.total || 0;
          const cashMethod = allPaymentMethods.find(
            (pm: any) => pm.type === "cash"
          );

          if (inv.paymentType === "cash" || inv.paymentType === "نقدي") {
            if (cashMethod) {
              paymentMethodSales[cashMethod.id].amount += total;
            }
            cashSales += total;
          }
        }
        // إذا لم يكن هناك أي معلومات دفع، نعتبرها نقدية افتراضياً
        else {
          const cashMethod = allPaymentMethods.find(
            (pm: any) => pm.type === "cash"
          );
          if (cashMethod) {
            paymentMethodSales[cashMethod.id].amount += inv.total || 0;
          }
          cashSales += inv.total || 0;
        }

        // المرتجعات (لو موجودة في الفاتورة)
        if (inv.returns) returns += inv.returns;
      });

      // جلب المصروفات
      const allExpenses = await db.getAll<any>("expenses");
      const shiftExpenses = allExpenses.filter(
        (e) => e.shiftId === shiftId.toString() || e.shiftId === shiftId
      );
      const totalExpenses = shiftExpenses.reduce((sum, e) => sum + e.amount, 0);

      // جلب الحركات النقدية
      const allMovements = await db.getAll<any>("cashMovements");
      const shiftMovements = allMovements.filter(
        (m) => m.shiftId === shiftId.toString() || m.shiftId === shiftId
      );
      const cashIn = shiftMovements
        .filter((m) => m.type === "in")
        .reduce((sum, m) => sum + m.amount, 0);
      const cashOut = shiftMovements
        .filter((m) => m.type === "out")
        .reduce((sum, m) => sum + m.amount, 0);

      // النقدية المتوقعة
      const expectedCash =
        (shiftData.startingCash || 0) +
        cashSales +
        cashIn -
        cashOut -
        totalExpenses -
        returns;

      setShift({
        ...shiftData,
        sales: {
          totalInvoices,
          totalAmount: totalSales,
          cashSales,
          cardSales: 0, // سيتم استبدالها بـ paymentMethodSales
          walletSales: 0, // سيتم استبدالها بـ paymentMethodSales
          returns,
        },
      });
      setCashSummary({
        cashIn,
        cashOut,
        expenses: totalExpenses,
        expectedCash,
        expensesList: shiftExpenses,
        paymentMethodSales, // إضافة المبيعات حسب طرق الدفع
      });
    } catch (error) {
      console.error("Error loading Z report:", error);
      toast.error("فشل تحميل تقرير Z");
    } finally {
      setLoading(false);
    }
  };

  const calculateTotalFromDenominations = (): number => {
    return Object.entries(denominations).reduce((total, [key, count]) => {
      const value = DENOMINATION_VALUES[key as keyof Denominations];
      return total + value * count;
    }, 0);
  };

  const actualCash = calculateTotalFromDenominations();
  const difference = actualCash - (cashSummary?.expectedCash || 0);

  const handleDenominationChange = (
    key: keyof Denominations,
    value: string
  ) => {
    const numValue = parseInt(value) || 0;
    setDenominations((prev) => ({ ...prev, [key]: numValue }));
  };

  const handleConfirm = () => {
    if (actualCash === 0) {
      toast.error("يرجى إدخال الفئات النقدية");
      return;
    }
    onConfirm(actualCash, denominations);
    onOpenChange(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("ar-EG", {
      style: "currency",
      currency: "EGP",
    }).format(amount);
  };

  const formatDateTime = (date: string) => {
    return new Intl.DateTimeFormat("ar-EG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(date));
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          dir="rtl"
          className="max-w-3xl max-h-[90vh] overflow-y-auto"
        >
          <DialogHeader>
            <DialogTitle>تقرير Z - إغلاق الوردية</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">جاري التحميل...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-w-xl max-h-[85vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <DollarSign className="h-6 w-6" />
            تقرير Z - إغلاق الوردية
          </DialogTitle>
        </DialogHeader>

        {shift && cashSummary && (
          <div className="space-y-4">
            {/* معلومات الوردية */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">معلومات الوردية</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">المسؤول</p>
                  <p className="font-bold">{shift.employeeName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">وقت البدء</p>
                  <p className="font-bold">{formatDateTime(shift.startTime)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    الرصيد الافتتاحي
                  </p>
                  <p className="font-bold text-primary">
                    {formatCurrency(shift.startingCash)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">الحالة</p>
                  <Badge
                    variant={
                      shift.status === "active" ? "default" : "secondary"
                    }
                  >
                    {shift.status === "active" ? "نشطة" : "مغلقة"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* ملخص المبيعات */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">ملخص المبيعات</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>إجمالي المبيعات:</span>
                  <span className="font-bold text-green-600">
                    {formatCurrency(shift.sales.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>عدد الفواتير:</span>
                  <span className="font-bold">{shift.sales.totalInvoices}</span>
                </div>
                <Separator />
                {/* عرض طرق الدفع بشكل ديناميكي */}
                {cashSummary.paymentMethodSales &&
                  Object.entries(cashSummary.paymentMethodSales).map(
                    ([methodId, data]: [string, any]) =>
                      data.amount > 0 && (
                        <div key={methodId} className="flex justify-between">
                          <span>{data.name}:</span>
                          <span className="font-bold">
                            {formatCurrency(data.amount)}
                          </span>
                        </div>
                      )
                  )}
              </CardContent>
            </Card>

            {/* الحركات النقدية */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">الحركات النقدية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>إيداعات نقدية:</span>
                  <span className="font-bold text-green-600">
                    +{formatCurrency(cashSummary.cashIn)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>سحوبات نقدية:</span>
                  <span className="font-bold text-red-600">
                    -{formatCurrency(cashSummary.cashOut)}
                  </span>
                </div>
                {cashSummary.expenses > 0 && (
                  <>
                    <Separator />
                    <div className="flex justify-between">
                      <span>المصروفات:</span>
                      <span className="font-bold text-red-600">
                        -{formatCurrency(cashSummary.expenses)}
                      </span>
                    </div>
                    {cashSummary.expensesList &&
                      cashSummary.expensesList.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground space-y-1">
                          {cashSummary.expensesList.map(
                            (exp: any, index: number) => (
                              <div key={index} className="flex justify-between">
                                <span>• {exp.description || exp.notes}</span>
                                <span>{formatCurrency(exp.amount)}</span>
                              </div>
                            )
                          )}
                        </div>
                      )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* إدخال الفئات النقدية */}
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  عد النقدية الفعلية
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>فئة 200 جنيه</Label>
                    <Input
                      type="number"
                      min="0"
                      value={denominations.notes200 || ""}
                      onChange={(e) =>
                        handleDenominationChange("notes200", e.target.value)
                      }
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      = {formatCurrency(denominations.notes200 * 200)}
                    </p>
                  </div>

                  <div>
                    <Label>فئة 100 جنيه</Label>
                    <Input
                      type="number"
                      min="0"
                      value={denominations.notes100 || ""}
                      onChange={(e) =>
                        handleDenominationChange("notes100", e.target.value)
                      }
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      = {formatCurrency(denominations.notes100 * 100)}
                    </p>
                  </div>

                  <div>
                    <Label>فئة 50 جنيه</Label>
                    <Input
                      type="number"
                      min="0"
                      value={denominations.notes50 || ""}
                      onChange={(e) =>
                        handleDenominationChange("notes50", e.target.value)
                      }
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      = {formatCurrency(denominations.notes50 * 50)}
                    </p>
                  </div>

                  <div>
                    <Label>فئة 20 جنيه</Label>
                    <Input
                      type="number"
                      min="0"
                      value={denominations.notes20 || ""}
                      onChange={(e) =>
                        handleDenominationChange("notes20", e.target.value)
                      }
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      = {formatCurrency(denominations.notes20 * 20)}
                    </p>
                  </div>

                  <div>
                    <Label>فئة 10 جنيه</Label>
                    <Input
                      type="number"
                      min="0"
                      value={denominations.notes10 || ""}
                      onChange={(e) =>
                        handleDenominationChange("notes10", e.target.value)
                      }
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      = {formatCurrency(denominations.notes10 * 10)}
                    </p>
                  </div>

                  <div>
                    <Label>فئة 5 جنيه</Label>
                    <Input
                      type="number"
                      min="0"
                      value={denominations.notes5 || ""}
                      onChange={(e) =>
                        handleDenominationChange("notes5", e.target.value)
                      }
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      = {formatCurrency(denominations.notes5 * 5)}
                    </p>
                  </div>

                  <div>
                    <Label>فئة 1 جنيه</Label>
                    <Input
                      type="number"
                      min="0"
                      value={denominations.coins1 || ""}
                      onChange={(e) =>
                        handleDenominationChange("coins1", e.target.value)
                      }
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      = {formatCurrency(denominations.coins1 * 1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* مقارنة النقدية */}
            <Card
              className={difference !== 0 ? "border-2 border-orange-500" : ""}
            >
              <CardHeader>
                <CardTitle className="text-lg">مقارنة النقدية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-lg">
                  <span>النقدية المتوقعة:</span>
                  <span className="font-bold">
                    {formatCurrency(cashSummary.expectedCash)}
                  </span>
                </div>
                <div className="flex justify-between text-lg">
                  <span>النقدية الفعلية:</span>
                  <span className="font-bold text-primary">
                    {formatCurrency(actualCash)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-xl">
                  <span className="font-bold">الفرق:</span>
                  <span
                    className={`font-bold ${
                      difference > 0
                        ? "text-green-600"
                        : difference < 0
                        ? "text-red-600"
                        : ""
                    }`}
                  >
                    {difference > 0 ? "+" : ""}
                    {formatCurrency(difference)}
                  </span>
                </div>
                {difference !== 0 && (
                  <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                    <p className="text-sm text-orange-800 dark:text-orange-300 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {difference > 0
                        ? "هناك زيادة في النقدية. يرجى التحقق من العد."
                        : "هناك نقص في النقدية. يرجى التحقق من العد."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="ml-2 h-4 w-4" />
            طباعة
          </Button>
          <Button
            onClick={handleConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            تأكيد إغلاق الوردية
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
