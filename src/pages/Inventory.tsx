import { useState, useEffect, useRef } from "react";
import { POSHeader } from "@/components/POS/POSHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Download,
  Upload,
  Calculator,
  Image as ImageIcon,
  X,
} from "lucide-react";
import {
  db,
  Product,
  Shift,
  ProductCategory,
  Unit,
  PriceType,
  ProductUnit,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Inventory = () => {
  const { can, user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [currentShift, setCurrentShift] = useState<Shift | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [inventoryDialogOpen, setInventoryDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // State للوحدات المتعددة
  const [productUnits, setProductUnits] = useState<any[]>([]);
  const [showUnitsDialog, setShowUnitsDialog] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any | null>(null);
  const [unitFormData, setUnitFormData] = useState({
    unitId: "",
    conversionFactor: 1,
    prices: {} as Record<string, number>,
    costPrice: 0,
    barcode: "",
  });

  const [formData, setFormData] = useState({
    name: "",
    nameAr: "",
    price: 0,
    prices: {} as Record<string, number>,
    costPrice: 0,
    unitId: "",
    defaultPriceTypeId: "",
    category: "",
    stock: 0,
    barcode: "",
    minStock: 10,
    expiryDate: "",
    imageUrl: "",
    hasMultipleUnits: false,
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

    const categoriesData = await db.getAll<ProductCategory>(
      "productCategories"
    );
    const activeCategories = categoriesData.filter((c) => c.active);
    setCategories(activeCategories);

    const unitsData = await db.getAll<Unit>("units");
    setUnits(unitsData);

    const priceTypesData = await db.getAll<PriceType>("priceTypes");
    const sortedPriceTypes = priceTypesData.sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    setPriceTypes(sortedPriceTypes);

    const shiftsData = await db.getAll<Shift>("shifts");
    const activeShift = shiftsData.find((s) => s.status === "active");
    setCurrentShift(activeShift || null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "خطأ",
          description: "حجم الصورة يجب أن يكون أقل من 2 ميجابايت",
          variant: "destructive",
        });
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        setFormData({ ...formData, imageUrl: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview("");
    setFormData({ ...formData, imageUrl: "" });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.unitId) {
      toast({
        title: "خطأ",
        description: "يرجى اختيار وحدة القياس",
        variant: "destructive",
      });
      return;
    }

    if (Object.keys(formData.prices).length === 0) {
      toast({
        title: "خطأ",
        description: "يرجى إدخال سعر واحد على الأقل",
        variant: "destructive",
      });
      return;
    }

    if (formData.costPrice === 0) {
      toast({
        title: "تحذير",
        description: "لم تقم بإدخال سعر التكلفة. هل تريد المتابعة؟",
      });
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
        toast({ title: "✅ تم تحديث المنتج بنجاح" });
      } else {
        await createWithAudit("products", product, {
          userId: user.id,
          userName: user.username,
          shiftId: currentShift?.id,
        });
        toast({ title: "✅ تم إضافة المنتج بنجاح" });
      }

      loadData();
      resetForm();
    } catch (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    }
  };

  const handleEdit = async (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      nameAr: product.nameAr,
      price: product.price,
      prices: product.prices || {},
      costPrice: product.costPrice || 0,
      unitId: product.unitId || "",
      defaultPriceTypeId: product.defaultPriceTypeId || "",
      category: product.category || "",
      stock: product.stock,
      barcode: product.barcode || "",
      minStock: product.minStock || 10,
      expiryDate: product.expiryDate || "",
      imageUrl: product.imageUrl || "",
      hasMultipleUnits: product.hasMultipleUnits || false,
    });
    if (product.imageUrl) {
      setImagePreview(product.imageUrl);
    }

    // تحميل وحدات المنتج
    await loadProductUnits(product.id);

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
      toast({ title: "✅ تم حذف المنتج بنجاح" });
      loadData();
    }
  };

  const resetForm = () => {
    const defaultUnit = units.find((u) => u.isDefault);
    setFormData({
      name: "",
      nameAr: "",
      price: 0,
      prices: {},
      costPrice: 0,
      unitId: defaultUnit?.id || "",
      defaultPriceTypeId: "",
      category: "",
      stock: 0,
      barcode: "",
      minStock: 10,
      expiryDate: "",
      imageUrl: "",
      hasMultipleUnits: false,
    });
    setEditingProduct(null);
    setImagePreview("");
    setDialogOpen(false);
  };

  // ============ دوال إدارة الوحدات المتعددة ============

  const loadProductUnits = async (productId: string) => {
    const allUnits = await db.getAll<ProductUnit>("productUnits");
    const filtered = allUnits.filter((u) => u.productId === productId);
    setProductUnits(filtered);
  };

  const handleAddUnit = () => {
    setEditingUnit(null);
    setUnitFormData({
      unitId: "",
      conversionFactor: 1,
      prices: {},
      costPrice: 0,
      barcode: "",
    });
    setShowUnitsDialog(true);
  };

  const handleEditUnit = (unit: any) => {
    setEditingUnit(unit);
    setUnitFormData({
      unitId: unit.unitId,
      conversionFactor: unit.conversionFactor,
      prices: unit.prices || {},
      costPrice: unit.costPrice || 0,
      barcode: unit.barcode || "",
    });
    setShowUnitsDialog(true);
  };

  const handleSaveUnit = async () => {
    if (!editingProduct) {
      toast({ title: "يجب حفظ المنتج أولاً", variant: "destructive" });
      return;
    }

    if (!unitFormData.unitId || unitFormData.conversionFactor <= 0) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }

    const selectedUnit = units.find((u) => u.id === unitFormData.unitId);
    if (!selectedUnit) return;

    try {
      if (editingUnit) {
        // تعديل وحدة موجودة
        const updated: ProductUnit = {
          ...editingUnit,
          unitId: unitFormData.unitId,
          unitName: selectedUnit.name,
          conversionFactor: unitFormData.conversionFactor,
          prices: unitFormData.prices,
          costPrice: unitFormData.costPrice,
          barcode: unitFormData.barcode,
        };
        await db.update("productUnits", updated);
        toast({ title: "✅ تم تحديث الوحدة بنجاح" });
      } else {
        // إضافة وحدة جديدة
        const newUnit: ProductUnit = {
          id: `${editingProduct.id}_${unitFormData.unitId}_${Date.now()}`,
          productId: editingProduct.id,
          unitId: unitFormData.unitId,
          unitName: selectedUnit.name,
          conversionFactor: unitFormData.conversionFactor,
          prices: unitFormData.prices,
          costPrice: unitFormData.costPrice,
          barcode: unitFormData.barcode,
          isBaseUnit: unitFormData.conversionFactor === 1,
          createdAt: new Date().toISOString(),
        };
        await db.add("productUnits", newUnit);
        toast({ title: "✅ تم إضافة الوحدة بنجاح" });
      }

      await loadProductUnits(editingProduct.id);
      setShowUnitsDialog(false);
    } catch (error) {
      console.error("Error saving unit:", error);
      toast({ title: "خطأ في حفظ الوحدة", variant: "destructive" });
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الوحدة؟")) return;

    try {
      await db.delete("productUnits", unitId);
      toast({ title: "✅ تم حذف الوحدة بنجاح" });
      if (editingProduct) {
        await loadProductUnits(editingProduct.id);
      }
    } catch (error) {
      console.error("Error deleting unit:", error);
      toast({ title: "خطأ في حذف الوحدة", variant: "destructive" });
    }
  };

  // تصدير المنتجات إلى Excel
  const exportToExcel = async () => {
    try {
      const { exportProductsToExcel } = await import('@/lib/excelUtils');

      // دالة للحصول على الوحدات المتعددة لمنتج معين
      const getProductUnits = async (productId: string) => {
        const allUnits = await db.getAll<any>('productUnits');
        return allUnits.filter((u) => u.productId === productId);
      };

      await exportProductsToExcel(products, units, priceTypes, getProductUnits);

      toast({
        title: "✅ تم التصدير بنجاح",
        description: `تم تصدير ${products.length} منتج مع وحداتهم المتعددة`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "خطأ في التصدير",
        description: "حدث خطأ أثناء تصدير الملف",
        variant: "destructive",
      });
    }
  };

  // استيراد المنتجات من Excel
  const importFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const { importProductsFromExcel } = await import('@/lib/excelUtils');
      const { data, errors, updates, inserts, productUnitsData } = await importProductsFromExcel(file);

      if (errors.length > 0) {
        console.warn('Import errors:', errors);
      }

      let updatedCount = 0;
      let insertedCount = 0;
      let unitsProcessed = 0;
      const defaultUnit = units.find((u) => u.isDefault);
      const defaultPriceType = priceTypes.find((pt) => pt.isDefault);

      for (const rowData of data) {
        try {
          if (rowData.isUpdate && rowData.id) {
            // تحديث منتج موجود
            const existingProduct = await db.get<Product>('products', rowData.id);

            if (existingProduct) {
              const updatedProduct: Product = {
                ...existingProduct,
                nameAr: rowData.nameAr,
                name: rowData.name,
                category: rowData.category,
                stock: rowData.stock,
                costPrice: rowData.costPrice,
                price: rowData.price,
                prices: defaultPriceType
                  ? { ...existingProduct.prices, [defaultPriceType.id]: rowData.price }
                  : existingProduct.prices,
                unitId: rowData.unitId || existingProduct.unitId,
                barcode: rowData.barcode,
                minStock: rowData.minStock,
                expiryDate: rowData.expiryDate,
              };

              // معالجة الوحدات المتعددة
              const hasUnitsInExcel = productUnitsData.has(rowData.id);

              //  حذف كل الوحدات القديمة أولاً
              const allProductUnits = await db.getAll<any>('productUnits');
              const existingUnits = allProductUnits.filter(
                (pu) => pu.productId === rowData.id
              );

              for (const unit of existingUnits) {
                await db.delete('productUnits', unit.id);
              }

              // إضافة الوحدات الجديدة من Excel
              if (hasUnitsInExcel) {
                const unitsToInsert = productUnitsData.get(rowData.id)!;
                for (const unitData of unitsToInsert) {
                  const newUnit: any = {
                    id: `${rowData.id}_${unitData.unitId}_${Date.now()}`,
                    productId: rowData.id,
                    unitId: unitData.unitId,
                    unitName: unitData.unitName,
                    conversionFactor: unitData.conversionFactor,
                    prices: defaultPriceType
                      ? { [defaultPriceType.id]: unitData.price }
                      : {},
                    costPrice: unitData.costPrice,
                    barcode: unitData.barcode,
                    isBaseUnit: unitData.conversionFactor === 1,
                    createdAt: new Date().toISOString(),
                  };
                  await db.add('productUnits', newUnit);
                  unitsProcessed++;
                }
              }

              // تحديث الـ flag بناءً على الوحدات الجديدة
              updatedProduct.hasMultipleUnits = hasUnitsInExcel;

              await updateWithAudit('products', rowData.id, updatedProduct, {
                userId: user?.id || '',
                userName: user?.username || '',
                shiftId: currentShift?.id,
              });
              updatedCount++;
            }
          } else {
            // إضافة منتج جديد
            const newProductId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const product: Product = {
              id: newProductId,
              nameAr: rowData.nameAr,
              name: rowData.name,
              category: rowData.category,
              stock: rowData.stock,
              costPrice: rowData.costPrice,
              price: rowData.price,
              prices: defaultPriceType
                ? { [defaultPriceType.id]: rowData.price }
                : {},
              unitId: rowData.unitId || defaultUnit?.id || '',
              barcode: rowData.barcode,
              minStock: rowData.minStock,
              expiryDate: rowData.expiryDate,
              hasMultipleUnits: productUnitsData.has(''),  // للمنتجات الجديدة نفحص لو فيه وحدات
            };

            await createWithAudit('products', product, {
              userId: user?.id || '',
              userName: user?.username || '',
              shiftId: currentShift?.id,
            });
            insertedCount++;
          }
        } catch (error) {
          console.error('Error processing product:', error);
        }
      }

      await loadData();

      toast({
        title: '✅ تم الاستيراد',
        description: `تحديث: ${updatedCount} | إضافة: ${insertedCount} | وحدات: ${unitsProcessed} | أخطاء: ${errors.length}`,
      });
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'خطأ في الاستيراد',
        description: error instanceof Error ? error.message : 'حدث خطأ أثناء الاستيراد',
        variant: 'destructive',
      });
    }

    // إعادة تعيين input
    e.target.value = '';
  };

  // حساب جرد المخزون
  const calculateInventoryValue = () => {
    let totalValue = 0;
    let totalCost = 0;
    let itemsCount = 0;
    let outOfStock = 0;
    let lowStock = 0;

    products.forEach((product) => {
      const cost = (product.costPrice || 0) * product.stock;
      totalCost += cost;

      const defaultPriceType = priceTypes.find((pt) => pt.isDefault);
      const priceTypeId = product.defaultPriceTypeId || defaultPriceType?.id;
      const sellPrice =
        priceTypeId && product.prices?.[priceTypeId]
          ? product.prices[priceTypeId]
          : product.price || 0;
      totalValue += sellPrice * product.stock;

      itemsCount++;
      if (product.stock === 0) outOfStock++;
      else if (product.stock <= (product.minStock || 10)) lowStock++;
    });

    return {
      totalValue,
      totalCost,
      itemsCount,
      outOfStock,
      lowStock,
      expectedProfit: totalValue - totalCost,
    };
  };

  const showInventoryReport = () => {
    setInventoryDialogOpen(true);
  };

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.nameAr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.barcode?.includes(searchTerm);

    const matchesCategory =
      selectedCategory === "all" || p.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const getStockStatus = (product: Product) => {
    if (product.stock === 0)
      return { label: "نفذ", variant: "destructive" as const };
    if (product.stock <= (product.minStock || 10))
      return { label: "قليل", variant: "default" as const };
    return { label: "متوفر", variant: "default" as const };
  };

  const inventoryStats = calculateInventoryValue();

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <POSHeader />
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">إدارة المخزون</h1>
          <div className="flex gap-2">
            <Button
              onClick={showInventoryReport}
              variant="outline"
              className="gap-2"
            >
              <Calculator className="h-4 w-4" />
              جرد المخزون
            </Button>
            <Button onClick={exportToExcel} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              تصدير
            </Button>
            <Button variant="outline" className="gap-2" asChild>
              <label>
                <Upload className="h-4 w-4" />
                استيراد
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.tsv"
                  onChange={importFromExcel}
                  className="hidden"
                />
              </label>
            </Button>
            {can("products", "create") && (
              <Button onClick={() => setDialogOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                إضافة منتج
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">إجمالي المنتجات</div>
            <div className="text-2xl font-bold">{products.length}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">
              قيمة المخزون (بيع)
            </div>
            <div className="text-2xl font-bold text-green-600">
              {inventoryStats.totalValue.toFixed(2)} {currency}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">منتجات نفذت</div>
            <div className="text-2xl font-bold text-red-600">
              {inventoryStats.outOfStock}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">منتجات قليلة</div>
            <div className="text-2xl font-bold text-yellow-600">
              {inventoryStats.lowStock}
            </div>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="البحث عن منتج..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="كل الأقسام" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأقسام</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.nameAr}>
                  {cat.nameAr}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const status = getStockStatus(product);
            return (
              <Card
                key={product.id}
                className="p-4 hover:shadow-lg transition-shadow"
              >
                {product.imageUrl && (
                  <div className="mb-3 rounded-lg overflow-hidden h-32 bg-gray-100">
                    <img
                      src={product.imageUrl}
                      alt={product.nameAr}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{product.nameAr}</h3>
                    {product.category && (
                      <p className="text-sm text-muted-foreground">
                        {product.category}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <span className="text-sm">الكمية: {product.stock}</span>
                    </div>
                  </div>
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="space-y-1 text-sm mb-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">التكلفة:</span>
                    <span className="font-medium">
                      {(product.costPrice || 0).toFixed(2)} {currency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">البيع:</span>
                    <span className="font-bold text-primary">
                      {(() => {
                        const defaultPriceType = priceTypes.find(
                          (pt) => pt.isDefault
                        );
                        const priceTypeId =
                          product.defaultPriceTypeId || defaultPriceType?.id;
                        const displayPrice =
                          priceTypeId && product.prices?.[priceTypeId]
                            ? product.prices[priceTypeId]
                            : product.price || 0;
                        return `${displayPrice.toFixed(2)} ${currency}`;
                      })()}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 pt-3 border-t">
                  {can("products", "edit") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(product)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 ml-1" />
                      تعديل
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
              </Card>
            );
          })}
        </div>

        {/* Add/Edit Product Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent
            dir="rtl"
            className="max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <DialogHeader>
              <DialogTitle>
                {editingProduct ? "تعديل منتج" : "إضافة منتج جديد"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="basic" dir="rtl">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="basic">المعلومات الأساسية</TabsTrigger>
                  <TabsTrigger value="pricing">الأسعار والصورة</TabsTrigger>
                  <TabsTrigger value="units" disabled={!editingProduct}>
                    الوحدات المتعددة {!editingProduct && "(احفظ المنتج أولاً)"}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-4">
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
                    <Label>القسم</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) =>
                        setFormData({ ...formData, category: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر القسم" />
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
                        <SelectValue placeholder="اختر الوحدة" />
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
                  <div className="grid grid-cols-2 gap-4">
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
                      <Label>الحد الأدنى</Label>
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
                  </div>
                  <div className="grid grid-cols-2 gap-4">
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
                          setFormData({
                            ...formData,
                            expiryDate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="pricing" className="space-y-4">
                  <div>
                    <Label>سعر التكلفة *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      required
                      value={formData.costPrice}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          costPrice: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      مهم لحساب جرد المخزون والأرباح
                    </p>
                  </div>

                  <div className="space-y-3 p-4 border rounded-lg">
                    <Label className="font-semibold">أسعار البيع *</Label>
                    {priceTypes.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        لا توجد أنواع تسعير. يرجى إضافتها من الإعدادات.
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
                                  [priceType.id]:
                                    parseFloat(e.target.value) || 0,
                                },
                              })
                            }
                          />
                        </div>
                      ))
                    )}
                  </div>

                  <div>
                    <Label className="mb-2 block">صورة المنتج</Label>
                    {imagePreview ? (
                      <div className="relative w-full h-48 border rounded-lg overflow-hidden">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 left-2"
                          onClick={removeImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed rounded-lg p-8 text-center">
                        <ImageIcon className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="product-image"
                        />
                        <Label
                          htmlFor="product-image"
                          className="cursor-pointer text-primary hover:underline"
                        >
                          اضغط لاختيار صورة
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          الحد الأقصى: 2 ميجابايت
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox
                      id="multipleUnits"
                      checked={formData.hasMultipleUnits}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          hasMultipleUnits: checked as boolean,
                        })
                      }
                    />
                    <Label htmlFor="multipleUnits" className="cursor-pointer">
                      المنتج له وحدات متعددة (كرتونة، علبة، قطعة)
                    </Label>
                  </div>
                </TabsContent>

                {/* Tab: الوحدات المتعددة */}
                <TabsContent value="units" className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">وحدات المنتج</h3>
                    <Button
                      type="button"
                      onClick={handleAddUnit}
                      size="sm"
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      إضافة وحدة
                    </Button>
                  </div>

                  {productUnits.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>لا توجد وحدات مضافة</p>
                      <p className="text-sm">
                        اضغط "إضافة وحدة" لإضافة وحدة جديدة
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {productUnits.map((unit) => (
                        <Card key={unit.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">{unit.unitName}</Badge>
                                {unit.isBaseUnit && (
                                  <Badge variant="secondary">وحدة أساسية</Badge>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>
                                  <span className="text-muted-foreground">
                                    عدد الوحدات:{" "}
                                  </span>
                                  <span className="font-semibold">
                                    {unit.conversionFactor}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">
                                    التكلفة:{" "}
                                  </span>
                                  <span className="font-semibold">
                                    {unit.costPrice} {currency}
                                  </span>
                                </div>
                              </div>

                              <div className="text-sm">
                                <span className="text-muted-foreground">
                                  الأسعار:{" "}
                                </span>
                                <div className="mt-1 space-y-1">
                                  {priceTypes.map((pt) => (
                                    <div
                                      key={pt.id}
                                      className="flex justify-between"
                                    >
                                      <span>{pt.name}:</span>
                                      <span className="font-semibold">
                                        {unit.prices?.[pt.id] || 0} {currency}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {unit.barcode && (
                                <div className="text-sm">
                                  <span className="text-muted-foreground">
                                    الباركود:{" "}
                                  </span>
                                  <span className="font-mono">
                                    {unit.barcode}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditUnit(unit)}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteUnit(unit.id)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={resetForm}>
                  إلغاء
                </Button>
                <Button type="submit">حفظ المنتج</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Inventory Report Dialog */}
        <Dialog
          open={inventoryDialogOpen}
          onOpenChange={setInventoryDialogOpen}
        >
          <DialogContent dir="rtl" className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                جرد المخزون
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">
                    عدد المنتجات
                  </div>
                  <div className="text-2xl font-bold">
                    {inventoryStats.itemsCount}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">
                    قيمة التكلفة
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {inventoryStats.totalCost.toFixed(2)} {currency}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">
                    قيمة البيع المتوقعة
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {inventoryStats.totalValue.toFixed(2)} {currency}
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="text-sm text-muted-foreground">
                    الربح المتوقع
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {inventoryStats.expectedProfit.toFixed(2)} {currency}
                  </div>
                </Card>
              </div>

              <Card className="p-4">
                <h3 className="font-semibold mb-3">حالة المخزون</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span>منتجات نفذت</span>
                    <Badge variant="destructive">
                      {inventoryStats.outOfStock}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>منتجات قليلة</span>
                    <Badge variant="default">{inventoryStats.lowStock}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>منتجات متوفرة</span>
                    <Badge variant="default">
                      {inventoryStats.itemsCount -
                        inventoryStats.outOfStock -
                        inventoryStats.lowStock}
                    </Badge>
                  </div>
                </div>
              </Card>

              <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  💡 <strong>ملاحظة:</strong> هذا الجرد يعتمد على أسعار التكلفة
                  المسجلة. تأكد من تحديث أسعار التكلفة بشكل دوري للحصول على
                  بيانات دقيقة.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setInventoryDialogOpen(false)}
              >
                إغلاق
              </Button>
              <Button onClick={exportToExcel}>
                <Download className="h-4 w-4 ml-2" />
                تصدير التقرير
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog: إضافة/تعديل وحدة */}
        <Dialog open={showUnitsDialog} onOpenChange={setShowUnitsDialog}>
          <DialogContent dir="rtl" className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingUnit ? "تعديل وحدة" : "إضافة وحدة جديدة"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>الوحدة *</Label>
                <Select
                  value={unitFormData.unitId}
                  onValueChange={(value) =>
                    setUnitFormData({ ...unitFormData, unitId: value })
                  }
                  disabled={!!editingUnit}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الوحدة" />
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

              <div>
                <Label>عدد الوحدات (Conversion Factor) *</Label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={unitFormData.conversionFactor}
                  onChange={(e) =>
                    setUnitFormData({
                      ...unitFormData,
                      conversionFactor: parseInt(e.target.value) || 1,
                    })
                  }
                  placeholder="مثال: 10 (لو كرتونة = 10 قطع)"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  عدد القطع في هذه الوحدة
                </p>
              </div>

              <div>
                <Label>سعر التكلفة *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={unitFormData.costPrice}
                  onChange={(e) =>
                    setUnitFormData({
                      ...unitFormData,
                      costPrice: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-3 p-4 border rounded-lg">
                <Label className="font-semibold">أسعار البيع *</Label>
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
                        min="0"
                        value={unitFormData.prices[priceType.id] || ""}
                        onChange={(e) =>
                          setUnitFormData({
                            ...unitFormData,
                            prices: {
                              ...unitFormData.prices,
                              [priceType.id]: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                        placeholder="0.00"
                      />
                    </div>
                  ))
                )}
              </div>

              <div>
                <Label>الباركود (اختياري)</Label>
                <Input
                  value={unitFormData.barcode}
                  onChange={(e) =>
                    setUnitFormData({
                      ...unitFormData,
                      barcode: e.target.value,
                    })
                  }
                  placeholder="باركود خاص بهذه الوحدة"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowUnitsDialog(false)}
              >
                إلغاء
              </Button>
              <Button type="button" onClick={handleSaveUnit}>
                حفظ الوحدة
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Inventory;
