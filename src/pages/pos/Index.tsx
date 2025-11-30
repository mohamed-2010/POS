import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { POSHeader } from "@/components/POS/POSHeader";
import { ProductCard } from "@/components/POS/ProductCard";
import { Cart } from "@/components/POS/Cart";
import { CheckoutDialog } from "@/components/POS/CheckoutDialog";
import { toast } from "sonner";
import { db, Product, ProductCategory, PriceType, Unit } from "@/lib/indexedDB";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const Index = () => {
  const { can } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { getSetting } = useSettingsContext();

  // قراءة الإعدادات
  const taxRate = parseFloat(getSetting("taxRate") || "14");
  const currency = getSetting("currency") || "EGP";
  const soundEnabled = getSetting("soundEnabled") === "true";

  useEffect(() => {
    loadProducts();
    loadCategories();
    loadPriceTypes();
    loadUnits();
  }, []);

  const loadProducts = async () => {
    const data = await db.getAll<Product>("products");
    setProducts(data);
  };

  const loadCategories = async () => {
    const data = await db.getAll<ProductCategory>("productCategories");
    const activeCategories = data.filter((c) => c.active);
    setCategories(activeCategories);
  };

  const loadPriceTypes = async () => {
    const data = await db.getAll<PriceType>("priceTypes");
    const sorted = data.sort((a, b) => a.displayOrder - b.displayOrder);
    setPriceTypes(sorted);
  };

  const loadUnits = async () => {
    const data = await db.getAll<Unit>("units");
    setUnits(data);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.nameAr.includes(searchQuery) ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.id.includes(searchQuery);

    const matchesCategory =
      selectedCategory === "all" || selectedCategory === "no-category"
        ? selectedCategory === "no-category"
          ? !product.category || product.category === ""
          : true
        : product.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const handleAddToCart = (product: any) => {
    const existingItem = cartItems.find((item) => item.id === product.id);

    // Get default price type
    const defaultPriceType = priceTypes.find((pt) => pt.isDefault);
    const selectedPriceTypeId =
      product.defaultPriceTypeId || defaultPriceType?.id || priceTypes[0]?.id;

    // Get unit info
    const unit = units.find((u) => u.id === product.unitId);

    // Get price based on selected price type
    const price = product.prices?.[selectedPriceTypeId] || product.price || 0;

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error("الكمية المطلوبة غير متوفرة في المخزون");
        return;
      }
      setCartItems(
        cartItems.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
      toast.success(`تم زيادة كمية ${product.nameAr}`);
    } else {
      setCartItems([
        ...cartItems,
        {
          ...product,
          quantity: 1,
          price: price,
          priceTypeId: selectedPriceTypeId,
          unitName: unit?.name,
        },
      ]);
      toast.success(`تم إضافة ${product.nameAr} للعربة`);
    }
  };

  const handleIncrement = (id: string) => {
    const item = cartItems.find((item) => item.id === id);
    if (item && item.quantity >= item.stock) {
      toast.error("الكمية المطلوبة غير متوفرة في المخزون");
      return;
    }
    setCartItems(
      cartItems.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const handleDecrement = (id: string) => {
    setCartItems(
      cartItems.map((item) =>
        item.id === id && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  };

  const handleRemove = (id: string) => {
    setCartItems(cartItems.filter((item) => item.id !== id));
    toast.info("تم إزالة المنتج من العربة");
  };

  const handleClear = () => {
    setCartItems([]);
    toast.info("تم مسح العربة");
  };

  const handlePriceTypeChange = (itemId: string, priceTypeId: string) => {
    setCartItems(
      cartItems.map((item) => {
        if (item.id === itemId) {
          const newPrice = item.prices?.[priceTypeId] || item.price || 0;
          return {
            ...item,
            priceTypeId: priceTypeId,
            price: newPrice,
          };
        }
        return item;
      })
    );

    const priceType = priceTypes.find((pt) => pt.id === priceTypeId);
    if (priceType) {
      toast.success(`تم تغيير نوع السعر إلى ${priceType.name}`);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;

    // Check permission to create invoices
    if (!can("invoices", "create")) {
      toast.error("ليس لديك صلاحية لإنشاء فواتير");
      return;
    }

    setIsCheckoutOpen(true);
  };

  const handleCheckoutComplete = () => {
    setCartItems([]);
    loadProducts(); // تحديث المخزون بعد البيع
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background"
      dir="rtl"
    >
      <POSHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Products Section */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  type="text"
                  placeholder="ابحث عن منتج (الاسم، الكود، الباركود...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10 h-12 text-lg"
                />
              </div>

              {/* Category Filter */}
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="w-[200px] h-12">
                  <SelectValue placeholder="كل الأقسام" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأقسام</SelectItem>
                  <SelectItem value="no-category">بدون قسم</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.nameAr}>
                      {cat.nameAr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  {...product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg">
                  لا توجد منتجات تطابق البحث
                </p>
              </div>
            )}
          </div>

          {/* Cart Section */}
          <div className="lg:sticky lg:top-24 h-[calc(100vh-120px)]">
            <Cart
              items={cartItems}
              priceTypes={priceTypes}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onRemove={handleRemove}
              onClear={handleClear}
              onCheckout={handleCheckout}
              onPriceTypeChange={handlePriceTypeChange}
            />
          </div>
        </div>
      </main>

      <CheckoutDialog
        open={isCheckoutOpen}
        onOpenChange={setIsCheckoutOpen}
        items={cartItems}
        onCheckoutComplete={handleCheckoutComplete}
      />
    </div>
  );
};

export default Index;
