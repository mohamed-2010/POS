import { useState, useEffect } from "react";
import { POSHeader } from "@/components/POS/POSHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  AlertTriangle,
  Package,
} from "lucide-react";
import {
  db,
  Product,
  Shift,
  ProductCategory,
  Unit,
  PriceType,
} from "@/lib/indexedDB";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  createWithAudit,
  updateWithAudit,
  deleteWithAudit,
} from "@/lib/transactionService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useSettingsContext } from "@/contexts/SettingsContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Inventory = () => {
  const { can, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    price: 0,
    prices: {} as Record<string, number>, // أسعار متعددة
    unitId: "",
    defaultPriceTypeId: "",
    category: "",
    stock: 0,
    barcode: "",
    minStock: 10,
    expiryDate: "",
  });

  const { getSetting } = useSettingsContext();

  const currency = getSetting("currency") || "EGP";

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    await db.init();
    const productsData = await db.getAll<Product>("products");
    setProducts(productsData);

    // Load categories
    const categoriesData = await db.getAll<ProductCategory>(
      "productCategories"
    );
    const activeCategories = categoriesData.filter((c) => c.active);
    setCategories(activeCategories);

    // Load units
    const unitsData = await db.getAll<Unit>("units");
    setUnits(unitsData);

    // Load price types (sorted by display order)
    const priceTypesData = await db.getAll<PriceType>("priceTypes");
    const sortedPriceTypes = priceTypesData.sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    setPriceTypes(sortedPriceTypes);

    // Load current shift
    const shiftsData = await db.getAll<Shift>("shifts");
    const activeShift = shiftsData.find((s) => s.status === "active");
    setCurrentShift(activeShift || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Validate required fields
    if (!formData.unitId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار وحدة القياس",
        variant: "destructive",
      });
      return;
    }

    // Validate that at least one price is set
    if (Object.keys(formData.prices).length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال سعر واحد على الأقل",
        variant: "destructive",
      });
      return;
    }

    try {
      const product: Product = {
        id: editingProduct?.id || Date.now().toString(),
        ...formData,
      };

      if (editingProduct) {
        await updateWithAudit("products", editingProduct.id, product, {
          userId: user.id,
          userName: user.username,
          shiftId: currentShift?.id,
        });
        toast({ title: "تم تحديث المنتج بنجاح" });
      } else {
        await createWithAudit("products", product, {
          userId: user.id,
          userName: user.username,
          shiftId: currentShift?.id,
        });
        toast({ title: "تم إضافة المنتج بنجاح" });
      }

      loadData();
      resetForm();
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      prices: product.prices || {},
      unitId: product.unitId || "",
      defaultPriceTypeId: product.defaultPriceTypeId || "",
      category: product.category || "",
      stock: product.stock,
      barcode: product.barcode || "",
      minStock: product.minStock || 10,
      expiryDate: product.expiryDate || "",
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    if (confirm("هل أنت متأكد من حذف هذا المنتج؟")) {
      await deleteWithAudit("products", id, {
        userId: user.id,
        userName: user.username,
        shiftId: currentShift?.id,
      });
      toast({ title: "تم حذف المنتج بنجاح" });
      loadData();
    }
  };

  const resetForm = () => {
    // Get default values
    const defaultUnit = units.find((u) => u.isDefault);
    const defaultPriceType = priceTypes.find((pt) => pt.isDefault);

    setFormData({
      name: "",
      nameAr: "",
      price: 0,
      prices: {},
      unitId: defaultUnit?.id || "",
      defaultPriceTypeId: "",
      category: "",
      stock: 0,
      barcode: "",
      minStock: 10,
      expiryDate: "",
    });
    setEditingProduct(null);
    setDialogOpen(false);
  };

  const filteredProducts = products.filter(
    (p) =>
      p.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.includes(searchTerm)
  );

  const getStockStatus = (product: Product) => {
    if (product.stock === 0)
      return { label: "نفذ", variant: "destructive" as const };
    if (product.stock <= (product.minStock || 10))
      return { label: "قليل", variant: "default" as const };
    return { label: "متوفر", variant: "default" as const };
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <POSHeader />
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">إدارة المخزون</h1>
          {can("products", "create") && (
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              إضافة منتج
            </Button>
          )}
        </div>

        <div className="relative mb-6">
          <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="البحث عن منتج..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pr-10"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => {
            const status = getStockStatus(product);
            return (
              <Card key={product.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{product.nameAr}</h3>
                    <p className="text-sm text-muted-foreground">
                      {product.category}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <span className="text-sm">الكمية: {product.stock}</span>
                    </div>
                  </div>
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-lg font-bold text-primary">
                    {(() => {
                      // Get default price type
                      const defaultPriceType = priceTypes.find(
                        (pt) => pt.isDefault
                      );
                      const priceTypeId =
                        product.defaultPriceTypeId || defaultPriceType?.id;

                      // Get price from prices object or fallback to old price
                      const displayPrice =
                        priceTypeId && product.prices?.[priceTypeId]
                          ? product.prices[priceTypeId]
                          : product.price || 0;

                      return `${displayPrice.toFixed(2)} ${currency}`;
                    })()}
                  </span>
                  <div className="flex gap-2">
                    {can("products", "edit") && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(product)}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    {can("products", "delete") && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(product.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent dir="rtl" className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "تعديل منتج" : "إضافة منتج جديد"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <Label>الاسم بالعربي *</Label>
                  <Input
                    required
                    value={formData.nameAr}
                    onChange={(e) =>
                      setFormData({ ...formData, nameAr: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>الاسم بالإنجليزي</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>الفئة</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({ ...formData, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الفئة أو اتركها فارغة" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.nameAr}>
                          {cat.nameAr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>وحدة القياس *</Label>
                  <Select
                    value={formData.unitId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, unitId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر وحدة القياس" />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((unit) => (
                        <SelectItem key={unit.id} value={unit.id}>
                          {unit.name} ({unit.symbol})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Dynamic price fields for each price type */}
                <div className="space-y-3 p-4 border rounded-lg">
                  <Label className="font-semibold">الأسعار *</Label>
                  {priceTypes.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      لا توجد أنواع تسعير. يرجى إضافة نوع سعر واحد على الأقل من
                      إعدادات النظام.
                    </p>
                  ) : (
                    priceTypes.map((priceType) => (
                      <div key={priceType.id}>
                        <Label className="text-sm">
                          {priceType.name}
                          {priceType.isDefault && (
                            <Badge variant="outline" className="mr-2 text-xs">
                              افتراضي
                            </Badge>
                          )}
                        </Label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={formData.prices[priceType.id] || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              prices: {
                                ...formData.prices,
                                [priceType.id]: parseFloat(e.target.value) || 0,
                              },
                            })
                          }
                        />
                      </div>
                    ))
                  )}
                </div>

                <div>
                  <Label>نوع السعر الافتراضي (اختياري)</Label>
                  <Select
                    value={formData.defaultPriceTypeId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, defaultPriceTypeId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="افتراضي النظام" />
                    </SelectTrigger>
                    <SelectContent>
                      {priceTypes.map((pt) => (
                        <SelectItem key={pt.id} value={pt.id}>
                          {pt.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>الكمية *</Label>
                  <Input
                    type="number"
                    required
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        stock: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>الحد الأدنى للمخزون</Label>
                  <Input
                    type="number"
                    value={formData.minStock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minStock: parseInt(e.target.value) || 10,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>الباركود</Label>
                  <Input
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>تاريخ الصلاحية</Label>
                  <Input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) =>
                      setFormData({ ...formData, expiryDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
                <Button type="submit">حفظ</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Inventory;
