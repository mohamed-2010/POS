import { useState, useEffect } from "react";
import { POSHeader } from "@/components/POS/POSHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, RotateCcw, FileText } from "lucide-react";
import {
  db,
  Invoice,
  SalesReturn,
  SalesReturnItem,
  Product,
  Shift,
} from "@/lib/indexedDB";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const SalesReturns = () => {
  const { user, can } = useAuth();
  const [salesReturns, setSalesReturns] = useState<SalesReturn[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [returnItems, setReturnItems] = useState<SalesReturnItem[]>([]);
  const [reason, setReason] = useState("");
  const [refundMethod, setRefundMethod] = useState<
    "cash" | "credit" | "balance"
  >("cash");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await db.init();
    const allReturns = await db.getAll<SalesReturn>("salesReturns");
    const sortedReturns = allReturns.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    setSalesReturns(sortedReturns);

    const allInvoices = await db.getAll<Invoice>("invoices");
    setInvoices(allInvoices);
  };

  const handleSelectInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    // تحويل عناصر الفاتورة لعناصر مرتجع
    const items: SalesReturnItem[] = invoice.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: 0, // سيحدد المستخدم الكمية
      price: item.price,
      total: 0,
      reason: "",
    }));
    setReturnItems(items);
    setIsCreateDialogOpen(true);
  };

  const updateReturnQuantity = (index: number, quantity: number) => {
    const updatedItems = [...returnItems];
    const invoiceItem = selectedInvoice?.items[index];
    if (!invoiceItem) return;

    const maxQuantity = invoiceItem.quantity;
    const alreadyReturned = invoiceItem.returnedQuantity || 0;
    const availableToReturn = maxQuantity - alreadyReturned;

    if (quantity > availableToReturn) {
      toast.error(`الحد الأقصى للكمية المتاحة للإرجاع: ${availableToReturn}`);
      return;
    }

    updatedItems[index].quantity = quantity;
    updatedItems[index].total = quantity * updatedItems[index].price;
    setReturnItems(updatedItems);
  };

  const handleCreateReturn = async () => {
    if (!selectedInvoice || !reason) {
      toast.error("يرجى إدخال سبب الإرجاع");
      return;
    }

    // تصفية العناصر التي تم إرجاعها فقط
    const itemsToReturn = returnItems.filter((item) => item.quantity > 0);

    if (itemsToReturn.length === 0) {
      toast.error("يرجى اختيار المنتجات المراد إرجاعها");
      return;
    }

    const subtotal = itemsToReturn.reduce((sum, item) => sum + item.total, 0);
    const taxRate = 0.14; // يمكن أخذها من الإعدادات
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    // الحصول على الوردية الحالية
    const allShifts = await db.getAll<Shift>("shifts");
    const currentShift = allShifts.find((s) => s.status === "active");

    const newReturn: SalesReturn = {
      id: `return_${Date.now()}`,
      originalInvoiceId: selectedInvoice.id,
      customerId: selectedInvoice.customerId,
      customerName: selectedInvoice.customerName,
      items: itemsToReturn,
      subtotal,
      tax,
      total,
      reason,
      userId: user?.id || "",
      userName: user?.fullName || user?.username || "",
      createdAt: new Date().toISOString(),
      refundMethod,
      refundStatus: "pending",
      shiftId: currentShift?.id,
    };

    try {
      await db.add("salesReturns", newReturn);

      // تحديث الفاتورة الأصلية - إضافة الكمية المرتجعة
      const updatedInvoice = { ...selectedInvoice };
      updatedInvoice.items = updatedInvoice.items.map((item, index) => {
        const returnedItem = itemsToReturn.find(
          (r) => r.productId === item.productId
        );
        if (returnedItem) {
          return {
            ...item,
            returnedQuantity:
              (item.returnedQuantity || 0) + returnedItem.quantity,
          };
        }
        return item;
      });
      await db.update("invoices", updatedInvoice);

      // إرجاع المنتجات للمخزون
      for (const item of itemsToReturn) {
        const product = await db.get<Product>("products", item.productId);
        if (product) {
          product.stock += item.quantity;
          await db.update("products", product);
        }
      }

      // تحديث الوردية - خصم قيمة المرتجع
      if (currentShift) {
        const updatedShift: Shift = {
          ...currentShift,
          sales: {
            ...currentShift.sales,
            returns: currentShift.sales.returns + total,
            totalAmount: currentShift.sales.totalAmount - total,
          },
        };
        await db.update("shifts", updatedShift);
      }

      // تحديث حالة المرجع إلى مكتمل
      newReturn.refundStatus = "completed";
      await db.update("salesReturns", newReturn);

      toast.success("تم إنشاء فاتورة المرتجع بنجاح");
      setIsCreateDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      toast.error("حدث خطأ أثناء إنشاء المرتجع");
      console.error(error);
    }
  };

  const resetForm = () => {
    setSelectedInvoice(null);
    setReturnItems([]);
    setReason("");
    setRefundMethod("cash");
  };

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.id.includes(searchQuery) ||
      invoice.customerName?.includes(searchQuery) ||
      invoice.customerId?.includes(searchQuery)
  );

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2) + " EGP";
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("ar-EG");
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <POSHeader />
      {!can("returns", "view") ? (
        <div className="container mx-auto p-6">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">غير مصرح</h2>
            <p className="text-muted-foreground">
              ليس لديك صلاحية عرض مرتجع المبيعات
            </p>
          </Card>
        </div>
      ) : (
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <RotateCcw className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">مرتجع المبيعات</h1>
            </div>
            {can("returns", "create") && (
              <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
                إنشاء مرتجع جديد
              </Button>
            )}
          </div>

          {/* قائمة المرتجعات */}
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4">سجل المرتجعات</h2>
            <div className="space-y-4">
              {salesReturns.map((returnDoc) => (
                <Card key={returnDoc.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-bold">{returnDoc.id}</span>
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            returnDoc.refundStatus === "completed"
                              ? "bg-green-100 text-green-800"
                              : returnDoc.refundStatus === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {returnDoc.refundStatus === "completed"
                            ? "مكتمل"
                            : returnDoc.refundStatus === "pending"
                            ? "قيد الانتظار"
                            : "مرفوض"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        الفاتورة الأصلية: {returnDoc.originalInvoiceId}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        العميل: {returnDoc.customerName || "غير محدد"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        السبب: {returnDoc.reason}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        التاريخ: {formatDate(returnDoc.createdAt)}
                      </p>
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(returnDoc.total)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        عدد المنتجات: {returnDoc.items.length}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          {/* Dialog إنشاء مرتجع */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogContent
              className="max-w-4xl max-h-[90vh] overflow-y-auto"
              dir="rtl"
            >
              <DialogHeader>
                <DialogTitle>إنشاء فاتورة مرتجع</DialogTitle>
              </DialogHeader>

              {!selectedInvoice ? (
                <div className="space-y-4 py-4">
                  <div className="relative">
                    <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن فاتورة..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {filteredInvoices.map((invoice) => (
                      <Card
                        key={invoice.id}
                        className="p-3 cursor-pointer hover:bg-muted"
                        onClick={() => handleSelectInvoice(invoice)}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-bold">{invoice.id}</p>
                            <p className="text-sm text-muted-foreground">
                              {invoice.customerName || "عميل نقدي"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(invoice.createdAt)}
                            </p>
                          </div>
                          <div className="text-left">
                            <p className="font-bold">
                              {formatCurrency(invoice.total)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {invoice.items.length} منتج
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 py-4">
                  <div className="p-3 bg-muted rounded-md">
                    <p className="font-bold">الفاتورة: {selectedInvoice.id}</p>
                    <p className="text-sm text-muted-foreground">
                      العميل: {selectedInvoice.customerName || "عميل نقدي"}
                    </p>
                  </div>

                  <div>
                    <Label>المنتجات</Label>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>المنتج</TableHead>
                          <TableHead>الكمية الأصلية</TableHead>
                          <TableHead>المرتجع سابقاً</TableHead>
                          <TableHead>المتاح للإرجاع</TableHead>
                          <TableHead>الكمية المرتجعة</TableHead>
                          <TableHead>السعر</TableHead>
                          <TableHead>الإجمالي</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {returnItems.map((item, index) => {
                          const invoiceItem = selectedInvoice.items[index];
                          const originalQty = invoiceItem?.quantity || 0;
                          const returnedQty =
                            invoiceItem?.returnedQuantity || 0;
                          const availableQty = originalQty - returnedQty;
                          const isFullyReturned = availableQty === 0;

                          return (
                            <TableRow
                              key={index}
                              className={
                                isFullyReturned
                                  ? "bg-red-50 dark:bg-red-950/20"
                                  : ""
                              }
                            >
                              <TableCell className="font-medium">
                                {item.productName}
                                {isFullyReturned && (
                                  <span className="mr-2 text-xs bg-red-500 text-white px-2 py-1 rounded">
                                    مرتجع بالكامل
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>{originalQty}</TableCell>
                              <TableCell>
                                {returnedQty > 0 ? (
                                  <span className="text-red-600 font-semibold">
                                    {returnedQty}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">
                                    -
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <span
                                  className={
                                    availableQty > 0
                                      ? "text-green-600 font-semibold"
                                      : "text-red-600"
                                  }
                                >
                                  {availableQty}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  min="0"
                                  max={availableQty}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateReturnQuantity(
                                      index,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="w-20"
                                  disabled={isFullyReturned}
                                />
                              </TableCell>
                              <TableCell>
                                {formatCurrency(item.price)}
                              </TableCell>
                              <TableCell>
                                {formatCurrency(item.total)}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <Label>سبب الإرجاع</Label>
                    <Textarea
                      placeholder="اكتب سبب الإرجاع..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label>طريقة الاسترجاع</Label>
                    <select
                      className="w-full mt-2 p-2 border rounded-md"
                      value={refundMethod}
                      onChange={(e) =>
                        setRefundMethod(
                          e.target.value as "cash" | "credit" | "balance"
                        )
                      }
                    >
                      <option value="cash">نقداً</option>
                      <option value="credit">رصيد للعميل</option>
                      <option value="balance">خصم من رصيد العميل</option>
                    </select>
                  </div>

                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground">
                      إجمالي المرتجع
                    </p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(
                        returnItems.reduce((sum, item) => sum + item.total, 0)
                      )}
                    </p>
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    resetForm();
                  }}
                >
                  إلغاء
                </Button>
                {selectedInvoice && (
                  <Button onClick={handleCreateReturn}>تأكيد المرتجع</Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default SalesReturns;
