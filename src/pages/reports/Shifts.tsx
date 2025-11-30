import { useState, useEffect } from "react";
import { POSHeader } from "@/components/POS/POSHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Clock,
  DollarSign,
  User,
  TrendingUp,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  FileText,
} from "lucide-react";
import { db, Shift, Employee } from "@/lib/indexedDB";
import { useAuth } from "@/contexts/AuthContext";
import { useShift } from "@/contexts/ShiftContext";
import { toast } from "sonner";
import { CashMovementDialog } from "@/components/dialogs/CashMovementDialog";
import { XReportDialog } from "@/components/dialogs/XReportDialog";
import { ZReportDialog } from "@/components/dialogs/ZReportDialog";

const Shifts = () => {
  const { user, can } = useAuth();
  const { refreshShift } = useShift();
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false);
  const [startingCash, setStartingCash] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");

  // حوارات الحركات النقدية والتقارير
  const [cashDialogType, setCashDialogType] = useState<"in" | "out">("in");
  const [isCashDialogOpen, setIsCashDialogOpen] = useState(false);
  const [isXReportOpen, setIsXReportOpen] = useState(false);
  const [isZReportOpen, setIsZReportOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await db.init();

    // تحميل الوردية الحالية
    const allShifts = await db.getAll<Shift>("shifts");
    const activeShift = allShifts.find((s) => s.status === "active");
    setCurrentShift(activeShift || null);

    // تحميل جميع الورديات
    const sortedShifts = allShifts.sort(
      (a, b) =>
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
    );
    setShifts(sortedShifts);

    // تحميل الموظفين
    const allEmployees = await db.getAll<Employee>("employees");
    const activeEmployees = allEmployees.filter((e) => e.active);
    setEmployees(activeEmployees);
  };

  const handleStartShift = async () => {
    if (!selectedEmployeeId || !startingCash) {
      toast.error("يرجى اختيار الموظف وإدخال المبلغ الافتتاحي");
      return;
    }

    if (currentShift) {
      toast.error("يوجد وردية مفتوحة بالفعل");
      return;
    }

    const employee = employees.find((e) => e.id === selectedEmployeeId);
    if (!employee) {
      toast.error("الموظف غير موجود");
      return;
    }

    const newShift: Shift = {
      id: `shift_${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      startTime: new Date().toISOString(),
      startingCash: parseFloat(startingCash),
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

    try {
      await db.add("shifts", newShift);
      setCurrentShift(newShift);
      setIsStartDialogOpen(false);
      setStartingCash("");
      setSelectedEmployeeId("");
      toast.success("تم بدء الوردية بنجاح");
      loadData();
    } catch (error) {
      toast.error("حدث خطأ أثناء بدء الوردية");
      console.error(error);
    }
  };

  const handleCloseShiftFromZReport = async (
    actualCash: number,
    denominations: any
  ) => {
    if (!currentShift) {
      toast.error("لا توجد وردية نشطة");
      return;
    }

    try {
      // استخدام الدالة الموحدة من calculationService
      const { calculateShiftSales, calculateExpectedCash } = await import(
        "@/lib/calculationService"
      );

      const sales = await calculateShiftSales(currentShift.id);
      const cashSummary = await calculateExpectedCash(currentShift.id);

      const difference = actualCash - cashSummary.expectedCash;

      const updatedShift: Shift = {
        ...currentShift,
        endTime: new Date().toISOString(),
        expectedCash: cashSummary.expectedCash,
        actualCash: actualCash,
        difference,
        status: "closed",
        closedBy: user?.name || user?.username || "غير معروف",
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
      setCurrentShift(null);
      setIsZReportOpen(false);

      // Refresh shift context to update UI
      if (refreshShift) {
        await refreshShift();
      }

      if (difference !== 0) {
        toast.warning(
          `تم إغلاق الوردية. فرق: ${Math.abs(difference).toFixed(2)} ${
            difference > 0 ? "زيادة" : "نقص"
          }`
        );
      } else {
        toast.success("تم إغلاق الوردية بنجاح بدون فروقات");
      }

      loadData();
    } catch (error) {
      toast.error("حدث خطأ أثناء إغلاق الوردية");
      console.error(error);
    }
  };

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2) + " EGP";
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("ar-EG");
  };

  const calculateDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = endTime - startTime;
    const hours = Math.floor(duration / (1000 * 60 * 60));
    const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours} ساعة و ${minutes} دقيقة`;
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <POSHeader />
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">إدارة الورديات</h1>
          </div>
          {!currentShift
            ? can("shifts", "open") && (
                <Button onClick={() => setIsStartDialogOpen(true)} size="lg">
                  بدء وردية جديدة
                </Button>
              )
            : can("shifts", "close") && (
                <Button
                  onClick={() => setIsZReportOpen(true)}
                  variant="destructive"
                  size="lg"
                >
                  إغلاق الوردية
                </Button>
              )}
        </div>

        {/* الوردية الحالية */}
        {currentShift && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="h-5 w-5 text-primary animate-pulse" />
              <h2 className="text-xl font-bold text-primary">
                الوردية الحالية
              </h2>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">المسؤول</p>
                <div className="flex items-center gap-2 mt-1">
                  <User className="h-4 w-4" />
                  <p className="font-bold">{currentShift.employeeName}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">وقت البدء</p>
                <p className="font-bold">
                  {formatDateTime(currentShift.startTime)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">المدة</p>
                <p className="font-bold">
                  {calculateDuration(currentShift.startTime)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  الرصيد الافتتاحي
                </p>
                <p className="font-bold text-primary">
                  {formatCurrency(currentShift.startingCash)}
                </p>
              </div>
            </div>

            {/* أزرار الحركات النقدية وتقرير X */}
            <div className="flex gap-2 mt-6">
              {can("cashMovements", "create") && (
                <>
                  <Button
                    onClick={() => {
                      setCashDialogType("in");
                      setIsCashDialogOpen(true);
                    }}
                    className="flex-1"
                    variant="outline"
                  >
                    <ArrowDown className="ml-2 h-4 w-4 text-green-600" />
                    إيداع نقدية
                  </Button>
                  <Button
                    onClick={() => {
                      setCashDialogType("out");
                      setIsCashDialogOpen(true);
                    }}
                    className="flex-1"
                    variant="outline"
                  >
                    <ArrowUp className="ml-2 h-4 w-4 text-red-600" />
                    سحب نقدية
                  </Button>
                </>
              )}
              {can("shifts", "view") && (
                <Button
                  onClick={() => setIsXReportOpen(true)}
                  className="flex-1"
                  variant="outline"
                >
                  <FileText className="ml-2 h-4 w-4" />
                  تقرير X (منتصف الوردية)
                </Button>
              )}
            </div>
          </Card>
        )}

        {/* الورديات السابقة */}
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">سجل الورديات</h2>
          <div className="space-y-4">
            {shifts.map((shift) => (
              <Card
                key={shift.id}
                className={`p-4 ${
                  shift.status === "active" ? "border-primary bg-primary/5" : ""
                }`}
              >
                <div className="grid md:grid-cols-5 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">المسؤول</p>
                    <p className="font-bold">{shift.employeeName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">البدء</p>
                    <p className="text-sm">{formatDateTime(shift.startTime)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الانتهاء</p>
                    <p className="text-sm">
                      {shift.endTime
                        ? formatDateTime(shift.endTime)
                        : "جارية..."}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">المبيعات</p>
                    <p className="font-bold text-green-600">
                      {formatCurrency(shift.sales.totalAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">الحالة</p>
                    {shift.status === "active" ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        نشطة
                      </span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                          مغلقة
                        </span>
                        {shift.difference !== undefined &&
                          shift.difference !== 0 && (
                            <span
                              className={`text-xs font-bold ${
                                shift.difference > 0
                                  ? "text-green-600"
                                  : "text-red-600"
                              }`}
                            >
                              {shift.difference > 0 ? "+" : ""}
                              {formatCurrency(shift.difference)}
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                {shift.status === "closed" &&
                  shift.expectedCash !== undefined && (
                    <div className="grid md:grid-cols-3 gap-4 mt-3 pt-3 border-t">
                      <div>
                        <p className="text-xs text-muted-foreground">المتوقع</p>
                        <p className="font-bold">
                          {formatCurrency(shift.expectedCash)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">الفعلي</p>
                        <p className="font-bold">
                          {formatCurrency(shift.actualCash || 0)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">الفرق</p>
                        <p
                          className={`font-bold ${
                            (shift.difference || 0) > 0
                              ? "text-green-600"
                              : (shift.difference || 0) < 0
                              ? "text-red-600"
                              : "text-gray-600"
                          }`}
                        >
                          {formatCurrency(shift.difference || 0)}
                        </p>
                      </div>
                    </div>
                  )}
              </Card>
            ))}
          </div>
        </Card>

        {/* Dialog بدء وردية */}
        <Dialog open={isStartDialogOpen} onOpenChange={setIsStartDialogOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>بدء وردية جديدة</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label>الموظف المسؤول</Label>
                <select
                  className="w-full mt-2 p-2 border rounded-md"
                  value={selectedEmployeeId}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                >
                  <option value="">اختر الموظف</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.position}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>المبلغ في الدرج (الرصيد الافتتاحي)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={startingCash}
                  onChange={(e) => setStartingCash(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsStartDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button onClick={handleStartShift}>بدء الوردية</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog إغلاق وردية */}
        {/* حوار الحركات النقدية */}
        <CashMovementDialog
          open={isCashDialogOpen}
          onOpenChange={setIsCashDialogOpen}
          type={cashDialogType}
          shiftId={currentShift?.id ? Number(currentShift.id) : 0}
          onSuccess={() => {
            toast.success(
              cashDialogType === "in"
                ? "تم إيداع النقدية بنجاح"
                : "تم سحب النقدية بنجاح"
            );
            loadData();
          }}
        />

        {/* حوار تقرير X */}
        <XReportDialog
          open={isXReportOpen}
          onOpenChange={setIsXReportOpen}
          shiftId={currentShift?.id ? Number(currentShift.id) : 0}
        />

        {/* حوار تقرير Z - إغلاق الوردية */}
        <ZReportDialog
          open={zReportOpen}
          onOpenChange={setZReportOpen}
          shiftId={selectedShift?.id || ""}
          onConfirm={handleCloseShift}
        />
      </div>
    </div>
  );
};

export default Shifts;
