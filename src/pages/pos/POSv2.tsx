import { useState, useEffect, useRef } from "react";
import { POSHeader } from "@/components/POS/POSHeader";
import { InvoicePrint } from "@/components/common/InvoicePrint";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Pause,
  Save,
  Printer,
  UserPlus,
  X,
  Banknote,
  CreditCard,
  Wallet,
  Tag,
  Percent,
  FileText,
} from "lucide-react";
import {
  db,
  Product,
  ProductCategory,
  Customer,
  Shift,
  Invoice,
  PriceType,
  Unit,
  PaymentMethod,
  Promotion,
  ProductUnit,
  CartItem,
  PendingOrder,
} from "@/shared/lib/indexedDB";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useShift } from "@/contexts/ShiftContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { createWithAudit } from "@/lib/transactionService";
import { thermalPrinter } from "@/lib/thermalPrinter";
import { InvoiceReceiptGenerator } from "@/lib/invoiceReceiptGenerator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

const POSv2 = () => {
  const { user, can } = useAuth();
  const { toast } = useToast();
  const { getSetting } = useSettingsContext();
  const { currentShift: contextShift, refreshShift } = useShift();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // States
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);

  // Payment states
  const [paymentType, setPaymentType] = useState<
    "cash" | "credit" | "installment"
  >("cash");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("cash");
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] =
    useState<string>("");
  const [selectedPriceTypeId, setSelectedPriceTypeId] = useState<string>("");
  const [discountPercent, setDiscountPercent] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<string>("");
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [includeTax, setIncludeTax] = useState<boolean>(true);

  // Multiple Payment Methods (Split Payment)
  const [splitPaymentMode, setSplitPaymentMode] = useState<boolean>(false);
  const [paymentSplits, setPaymentSplits] = useState<
    Array<{ methodId: string; methodName: string; amount: string }>
  >([]);

  // Promotions Dialog
  const [promotionDialogOpen, setPromotionDialogOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<string>("");

  // Multi-unit Dialog
  const [unitSelectionDialog, setUnitSelectionDialog] = useState(false);
  const [productForUnitSelection, setProductForUnitSelection] =
    useState<Product | null>(null);
  const [availableProductUnits, setAvailableProductUnits] = useState<
    ProductUnit[]
  >([]);
  const [selectedProductUnitId, setSelectedProductUnitId] =
    useState<string>("");

  // Installment
  const [installmentMonths, setInstallmentMonths] = useState<string>("3");
  const [downPayment, setDownPayment] = useState<string>("");

  // Dialogs
  const [addCustomerDialog, setAddCustomerDialog] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: "",
    phone: "",
    address: "",
    initialCreditBalance: 0,
  });

  // Print Invoice
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [invoiceToPrint, setInvoiceToPrint] = useState<Invoice | null>(null);

  const taxRate = parseFloat(getSetting("taxRate") || "14");
  const currency = getSetting("currency") || "EGP";
  const storeName = getSetting("storeName") || "نظام نقاط البيع";
  const storeAddress = getSetting("storeAddress") || "";
  const storePhone = getSetting("storePhone") || "";

  useEffect(() => {
    loadData();
  }, []);

  // Auto-focus search
  useEffect(() => {
    const handleFocus = () => {
      const active = document.activeElement;
      if (active?.tagName !== "INPUT" && active?.tagName !== "TEXTAREA") {
        searchInputRef.current?.focus();
      }
    };
    const interval = setInterval(handleFocus, 200);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    await db.init();

    const [
      productsData,
      categoriesData,
      customersData,
      shiftsData,
      savedOrders,
      priceTypesData,
      unitsData,
      paymentMethodsData,
      promotionsData,
    ] = await Promise.all([
      db.getAll<Product>("products"),
      db.getAll<ProductCategory>("productCategories"),
      db.getAll<Customer>("customers"),
      db.getAll<Shift>("shifts"),
      Promise.resolve(localStorage.getItem("pendingOrders")),
      db.getAll<PriceType>("priceTypes"),
      db.getAll<Unit>("units"),
      db.getAll<PaymentMethod>("paymentMethods"),
      db.getAll<Promotion>("promotions"),
    ]);

    setProducts(productsData);
    setCategories(categoriesData.filter((c) => c.active));
    setCustomers(customersData);
    // currentShift now comes from ShiftContext

    const sortedPriceTypes = priceTypesData.sort(
      (a, b) => a.displayOrder - b.displayOrder
    );
    setPriceTypes(sortedPriceTypes);
    setUnits(unitsData);

    // Set default price type
    const defaultPriceType =
      sortedPriceTypes.find((pt) => pt.isDefault) || sortedPriceTypes[0];
    if (defaultPriceType) {
      setSelectedPriceTypeId(defaultPriceType.id);
    }

    const activePaymentMethods = paymentMethodsData.filter((pm) => pm.isActive);
    setPaymentMethods(activePaymentMethods);

    // Set default payment method (cash)
    const defaultPaymentMethod =
      activePaymentMethods.find((pm) => pm.type === "cash") ||
      activePaymentMethods[0];
    if (defaultPaymentMethod) {
      setSelectedPaymentMethodId(defaultPaymentMethod.id);
    }

    // Load active promotions
    const today = new Date();
    const activePromotions = promotionsData.filter((promo) => {
      if (!promo.active) return false;
      const startDate = new Date(promo.startDate);
      const endDate = new Date(promo.endDate);
      return today >= startDate && today <= endDate;
    });
    setPromotions(activePromotions);

    if (savedOrders) {
      setPendingOrders(JSON.parse(savedOrders));
    }

    searchInputRef.current?.focus();
  };

  const filteredProducts = products.filter((p) => {
    const matchSearch =
      p.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode?.includes(searchQuery);

    const matchCategory =
      selectedCategory === "all" ||
      (selectedCategory === "no-category"
        ? !p.category
        : p.category === selectedCategory);

    return matchSearch && matchCategory;
  });

  // Cart operations
  const addToCart = async (product: Product) => {
    // Check if product has multiple units
    const productUnits = await db.getByIndex<ProductUnit>(
      "productUnits",
      "productId",
      product.id
    );

    console.log("Product units for", product.nameAr, ":", productUnits);

    if (productUnits && productUnits.length > 0) {
      // Show unit selection dialog
      setProductForUnitSelection(product);
      setAvailableProductUnits(productUnits);
      setSelectedProductUnitId(productUnits[0]?.id || "");
      setUnitSelectionDialog(true);
      return;
    }

    // No multiple units, add normally
    addToCartWithUnit(product, null);
  };

  const addToCartWithUnit = (
    product: Product,
    productUnit: ProductUnit | null
  ) => {
    const conversionFactor = productUnit?.conversionFactor || 1;

    const existing = cartItems.find(
      (i) => i.id === product.id && i.productUnitId === productUnit?.id
    );

    if (existing) {
      // Check stock availability (in base units)
      const totalNeededStock =
        (existing.quantity + 1) * (existing.conversionFactor || 1);
      if (totalNeededStock > product.stock) {
        toast({ title: "الكمية غير متوفرة", variant: "destructive" });
        return;
      }
      updateQuantity(
        existing.id,
        existing.quantity + 1,
        existing.productUnitId
      );
    } else {
      if (product.stock < conversionFactor) {
        toast({ title: "المنتج غير متوفر", variant: "destructive" });
        return;
      }

      // Get price type
      const priceTypeId =
        selectedPriceTypeId ||
        (priceTypes.find((pt) => pt.isDefault) || priceTypes[0])?.id ||
        "";
      const priceType = priceTypes.find((pt) => pt.id === priceTypeId);

      // Calculate price
      let calculatedPrice = product.price || 0;

      if (productUnit) {
        // Use unit's price based on selected price type
        calculatedPrice =
          productUnit.prices?.[priceTypeId] || product.price || 0;
      } else {
        // Use product's price based on selected price type
        calculatedPrice =
          priceTypeId && product.prices?.[priceTypeId]
            ? product.prices[priceTypeId]
            : product.price || 0;
      }

      // Get unit info (base unit from product)
      const baseUnit = units.find((u) => u.id === product.unitId);

      // Get selected unit name (from productUnit if available)
      const selectedUnitName = productUnit?.unitName || baseUnit?.name;

      setCartItems([
        ...cartItems,
        {
          id: product.id,
          name: product.name,
          nameAr: product.nameAr,
          price: calculatedPrice,
          stock: product.stock,
          quantity: 1,
          priceTypeId: priceTypeId,
          priceTypeName: priceType?.name,
          unitId: product.unitId,
          unitName: baseUnit?.name,
          prices: productUnit?.prices || product.prices,
          productUnitId: productUnit?.id,
          conversionFactor: conversionFactor,
          selectedUnitName: selectedUnitName,
        },
      ]);
    }
    setSearchQuery("");
    setUnitSelectionDialog(false);
  };

  const handleUnitSelectionConfirm = () => {
    if (!productForUnitSelection || !selectedProductUnitId) return;

    const selectedUnit = availableProductUnits.find(
      (u) => u.id === selectedProductUnitId
    );
    if (!selectedUnit) return;

    addToCartWithUnit(productForUnitSelection, selectedUnit);
  };

  const updateQuantity = (id: string, qty: number, productUnitId?: string) => {
    if (qty <= 0) {
      setCartItems(
        cartItems.filter(
          (i) => !(i.id === id && i.productUnitId === productUnitId)
        )
      );
      return;
    }

    const product = products.find((p) => p.id === id);
    const cartItem = cartItems.find(
      (i) => i.id === id && i.productUnitId === productUnitId
    );

    if (product && cartItem) {
      // Check stock in base units
      const neededStock = qty * (cartItem.conversionFactor || 1);
      if (neededStock > product.stock) {
        toast({ title: "الكمية غير متوفرة", variant: "destructive" });
        return;
      }
    }

    setCartItems(
      cartItems.map((i) =>
        i.id === id && i.productUnitId === productUnitId
          ? { ...i, quantity: qty }
          : i
      )
    );
  };

  const updatePrice = (id: string, price: number) => {
    setCartItems(
      cartItems.map((i) => (i.id === id ? { ...i, customPrice: price } : i))
    );
  };

  // Update all cart items when global price type changes
  const updateGlobalPriceType = async (priceTypeId: string) => {
    setSelectedPriceTypeId(priceTypeId);
    const priceType = priceTypes.find((pt) => pt.id === priceTypeId);

    const updatedItems = await Promise.all(
      cartItems.map(async (item) => {
        const product = products.find((p) => p.id === item.id);
        if (!product) return item;

        let newPrice = product.price || 0;

        // Check if item has a product unit (multiple units)
        if (item.productUnitId) {
          // Get the ProductUnit to get its prices
          const productUnit = await db.get<ProductUnit>(
            "productUnits",
            item.productUnitId
          );
          if (
            productUnit &&
            productUnit.prices &&
            productUnit.prices[priceTypeId]
          ) {
            newPrice = productUnit.prices[priceTypeId];
          }
        } else {
          // No product unit, use product's prices
          if (product.prices && product.prices[priceTypeId]) {
            newPrice = product.prices[priceTypeId];
          }
        }

        return {
          ...item,
          priceTypeId: priceTypeId,
          priceTypeName: priceType?.name,
          price: newPrice,
          customPrice: undefined, // Reset custom price when changing price type
        };
      })
    );

    setCartItems(updatedItems);
  };

  const removeItem = (id: string, productUnitId?: string) => {
    setCartItems(
      cartItems.filter(
        (i) => !(i.id === id && i.productUnitId === productUnitId)
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
    setDiscountPercent("");
    setDiscountAmount("");
    setPaidAmount("");
    setSelectedCustomer("cash");
    setPaymentType("cash");
    setSplitPaymentMode(false);
    setPaymentSplits([]);

    // Reset to default price type
    const defaultPriceType =
      priceTypes.find((pt) => pt.isDefault) || priceTypes[0];
    if (defaultPriceType) {
      setSelectedPriceTypeId(defaultPriceType.id);
    }

    // Reset to default payment method
    const defaultPaymentMethod =
      paymentMethods.find((pm) => pm.type === "cash") || paymentMethods[0];
    if (defaultPaymentMethod) {
      setSelectedPaymentMethodId(defaultPaymentMethod.id);
    }
    setInstallmentMonths("3");
    setDownPayment("");
  };

  // Calculations
  const subtotal = cartItems.reduce(
    (sum, i) => sum + (i.customPrice || i.price) * i.quantity,
    0
  );

  const discount = discountPercent
    ? (subtotal * parseFloat(discountPercent)) / 100
    : parseFloat(discountAmount) || 0;

  const afterDiscount = subtotal - discount;
  const tax = includeTax ? (afterDiscount * taxRate) / 100 : 0;
  const total = afterDiscount + tax;

  // حساب المدفوع من الدفع المقسم أو المدفوع العادي
  const paid = splitPaymentMode
    ? paymentSplits.reduce(
      (sum, split) => sum + (parseFloat(split.amount) || 0),
      0
    )
    : parseFloat(paidAmount) || 0;
  const change = paid - total;

  // Auto-fill paid amount for cash payments
  useEffect(() => {
    if (paymentType === "cash" && !splitPaymentMode && paidAmount === "") {
      setPaidAmount(total.toFixed(2));
    }
  }, [paymentType, total, splitPaymentMode, paidAmount]);

  // إضافة طريقة دفع جديدة للدفع المقسم
  const addPaymentSplit = () => {
    const remainingAmount = total - paid;
    const defaultMethod =
      paymentMethods.find((pm) => pm.type === "cash") || paymentMethods[0];

    if (defaultMethod) {
      setPaymentSplits([
        ...paymentSplits,
        {
          methodId: defaultMethod.id,
          methodName: defaultMethod.name,
          amount: remainingAmount > 0 ? remainingAmount.toFixed(2) : "0",
        },
      ]);
    }
  };

  const updatePaymentSplit = (
    index: number,
    field: "methodId" | "amount",
    value: string
  ) => {
    const updated = [...paymentSplits];
    if (field === "methodId") {
      const method = paymentMethods.find((pm) => pm.id === value);
      if (method) {
        updated[index].methodId = value;
        updated[index].methodName = method.name;
      }
    } else {
      updated[index].amount = value;
    }
    setPaymentSplits(updated);
  };

  const removePaymentSplit = (index: number) => {
    setPaymentSplits(paymentSplits.filter((_, i) => i !== index));
  };

  // Generate Quote PDF
  const generateQuotePDF = () => {
    if (cartItems.length === 0) {
      toast({ title: "لا يوجد منتجات في السلة", variant: "destructive" });
      return;
    }

    const quoteNumber = `QT-${Date.now()}`;
    const currentDate = new Date().toLocaleDateString("ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const customerName =
      selectedCustomer === "cash"
        ? "عميل نقدي"
        : customers.find((c) => c.id === selectedCustomer)?.name || "عميل";

    const quoteContent = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>عرض سعر - ${quoteNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            padding: 40px;
            background: #fff;
            color: #333;
            direction: rtl;
          }
          .quote-container {
            max-width: 800px;
            margin: 0 auto;
            border: 2px solid #333;
            padding: 30px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 20px;
          }
          .header h1 {
            font-size: 28px;
            margin-bottom: 10px;
            color: #1a1a1a;
          }
          .store-info {
            font-size: 14px;
            color: #666;
            line-height: 1.8;
          }
          .quote-title {
            text-align: center;
            background: #f5f5f5;
            padding: 15px;
            margin: 20px 0;
            border-radius: 8px;
          }
          .quote-title h2 {
            font-size: 24px;
            color: #333;
          }
          .quote-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 20px;
            padding: 15px;
            background: #fafafa;
            border-radius: 8px;
          }
          .quote-info div {
            text-align: center;
          }
          .quote-info label {
            font-size: 12px;
            color: #888;
            display: block;
          }
          .quote-info span {
            font-size: 14px;
            font-weight: bold;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 12px 10px;
            text-align: center;
          }
          th {
            background: #333;
            color: #fff;
            font-weight: bold;
          }
          tr:nth-child(even) {
            background: #f9f9f9;
          }
          .totals {
            margin-top: 20px;
            padding: 20px;
            background: #f5f5f5;
            border-radius: 8px;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #ddd;
          }
          .totals-row:last-child {
            border-bottom: none;
            font-weight: bold;
            font-size: 18px;
            padding-top: 15px;
            color: #1a1a1a;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            padding-top: 20px;
            border-top: 1px dashed #ccc;
          }
          .footer p {
            font-size: 12px;
            color: #888;
            margin-bottom: 5px;
          }
          .validity {
            background: #fff3cd;
            padding: 15px;
            border-radius: 8px;
            margin-top: 20px;
            text-align: center;
            border: 1px solid #ffc107;
          }
          .validity strong {
            color: #856404;
          }
          @media print {
            body {
              padding: 0;
            }
            .quote-container {
              border: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="quote-container">
          <div class="header">
            <h1>${storeName || "المتجر"}</h1>
            <div class="store-info">
              ${storeAddress ? `<p>${storeAddress}</p>` : ""}
              ${storePhone ? `<p>هاتف: ${storePhone}</p>` : ""}
            </div>
          </div>
          
          <div class="quote-title">
            <h2>📋 عرض سعر</h2>
          </div>
          
          <div class="quote-info">
            <div>
              <label>رقم العرض</label>
              <span>${quoteNumber}</span>
            </div>
            <div>
              <label>التاريخ</label>
              <span>${currentDate}</span>
            </div>
            <div>
              <label>العميل</label>
              <span>${customerName}</span>
            </div>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>المنتج</th>
                <th>الكمية</th>
                <th>السعر</th>
                <th>الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              ${cartItems
        .map(
          (item, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${item.name}</td>
                  <td>${item.quantity}</td>
                  <td>${item.price.toFixed(2)} ${currency}</td>
                  <td>${(item.price * item.quantity).toFixed(
            2
          )} ${currency}</td>
                </tr>
              `
        )
        .join("")}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="totals-row">
              <span>المجموع الفرعي:</span>
              <span>${subtotal.toFixed(2)} ${currency}</span>
            </div>
            ${discount > 0
        ? `
            <div class="totals-row">
              <span>الخصم:</span>
              <span>- ${discount.toFixed(2)} ${currency}</span>
            </div>
            `
        : ""
      }
            ${tax > 0
        ? `
            <div class="totals-row">
              <span>الضريبة (${taxRate}%):</span>
              <span>${tax.toFixed(2)} ${currency}</span>
            </div>
            `
        : ""
      }
            <div class="totals-row">
              <span>الإجمالي النهائي:</span>
              <span>${total.toFixed(2)} ${currency}</span>
            </div>
          </div>
          <div class="footer">
            <p>شكراً لاختياركم ${storeName || "متجرنا"}</p>
            <p>الأسعار قابلة للتغيير - هذا العرض غير ملزم</p>
          </div>
        </div>
        
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(quoteContent);
      printWindow.document.close();
    }
  };

  // Apply promotion
  const applyPromotion = (promotionId: string) => {
    const promotion = promotions.find((p) => p.id === promotionId);
    if (!promotion) return;

    if (promotion.discountType === "percentage") {
      setDiscountPercent(promotion.discountValue.toString());
      setDiscountAmount("");
    } else {
      setDiscountAmount(promotion.discountValue.toString());
      setDiscountPercent("");
    }

    setSelectedPromotion(promotionId);
    setPromotionDialogOpen(false);

    toast({
      title: "تم تطبيق العرض",
      description: `${promotion.name} - ${promotion.discountType === "percentage"
        ? `${promotion.discountValue}%`
        : `${promotion.discountValue} جنيه`
        }`,
    });
  };

  // Suspend order
  const suspendOrder = () => {
    if (cartItems.length === 0) {
      toast({ title: "لا يوجد منتجات", variant: "destructive" });
      return;
    }

    const order: PendingOrder = {
      id: Date.now().toString(),
      items: cartItems,
      customerId: selectedCustomer === "cash" ? undefined : selectedCustomer,
      paymentType,
      timestamp: new Date().toISOString(),
    };

    const updated = [...pendingOrders, order];
    setPendingOrders(updated);
    localStorage.setItem("pendingOrders", JSON.stringify(updated));
    clearCart();
    toast({ title: "تم تعليق الطلب" });
  };

  const resumeOrder = (order: PendingOrder) => {
    setCartItems(order.items);
    setSelectedCustomer(order.customerId || "cash");
    setPaymentType(order.paymentType as any);

    const updated = pendingOrders.filter((o) => o.id !== order.id);
    setPendingOrders(updated);
    localStorage.setItem("pendingOrders", JSON.stringify(updated));
  };

  // Add customer
  const handleAddCustomer = async () => {
    if (!newCustomerData.name || !newCustomerData.phone) {
      toast({ title: "الاسم والهاتف مطلوبان", variant: "destructive" });
      return;
    }

    const customer: Customer = {
      id: Date.now().toString(),
      name: newCustomerData.name,
      phone: newCustomerData.phone,
      address: newCustomerData.address,
      creditLimit: 0,
      currentBalance: 0,
      loyaltyPoints: 0,
      createdAt: new Date().toISOString(),
    };

    await db.add("customers", customer);

    // إنشاء فاتورة آجلة للرصيد الافتتاحي إذا كان المبلغ أكبر من صفر
    if (newCustomerData.initialCreditBalance > 0) {
      const initialCreditAmount =
        parseFloat(newCustomerData.initialCreditBalance.toString()) || 0;

      const creditInvoice = {
        id: `INIT-${Date.now()}`,
        customerId: customer.id,
        customerName: customer.name,
        items: [],
        subtotal: initialCreditAmount,
        discount: 0,
        tax: 0,
        total: initialCreditAmount,
        paymentType: "credit" as const,
        paymentStatus: "unpaid" as const,
        paidAmount: 0,
        remainingAmount: initialCreditAmount,
        paymentMethodIds: [],
        paymentMethodAmounts: {},
        userId: user?.id || "system",
        userName: user?.name || "النظام",
        createdAt: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        shiftId: contextShift?.id,
      };

      await db.add("invoices", creditInvoice);

      // تحديث رصيد العميل
      customer.currentBalance = initialCreditAmount;
      await db.update("customers", customer);

      toast({ title: "تم إضافة العميل وإنشاء فاتورة الرصيد الافتتاحي" });
    } else {
      toast({ title: "تم إضافة العميل" });
    }

    await loadData();
    setSelectedCustomer(customer.id);
    setAddCustomerDialog(false);
    setNewCustomerData({
      name: "",
      phone: "",
      address: "",
      initialCreditBalance: 0,
    });
  };

  // Save invoice
  const saveInvoice = async (print = false) => {
    if (!user || !contextShift) {
      toast({ title: "يجب بدء وردية", variant: "destructive" });
      return;
    }

    if (cartItems.length === 0) {
      toast({ title: "لا يوجد منتجات", variant: "destructive" });
      return;
    }

    if (paymentType !== "cash" && selectedCustomer === "cash") {
      toast({ title: "اختر عميل للآجل/التقسيط", variant: "destructive" });
      return;
    }

    try {
      const customerData = customers.find((c) => c.id === selectedCustomer);

      // الحصول على آخر رقم فاتورة وإنشاء رقم تسلسلي
      const allInvoices = await db.getAll<Invoice>("invoices");
      const lastInvoiceNumber =
        allInvoices.length > 0
          ? Math.max(
            ...allInvoices.map((inv) => {
              const num = parseInt(inv.id);
              return isNaN(num) ? 0 : num;
            })
          )
          : 0;
      const newInvoiceNumber = (lastInvoiceNumber + 1).toString();

      // تجهيز طرق الدفع والمبالغ
      let paymentMethodIds: string[] = [];
      let paymentMethodAmounts: Record<string, number> = {};

      // لحساب المبلغ المدفوع الفعلي
      let actualPaid = paid;

      if (splitPaymentMode && paymentSplits.length > 0) {
        // الدفع المقسم - استخدام طرق دفع متعددة
        paymentSplits.forEach((split) => {
          const amount = parseFloat(split.amount) || 0;
          if (amount > 0) {
            paymentMethodIds.push(split.methodId);
            paymentMethodAmounts[split.methodId] = amount;
          }
        });
      } else {
        // طريقة دفع واحدة
        const paymentMethodId =
          selectedPaymentMethodId ||
          (paymentMethods.find((pm) => pm.type === "cash") || paymentMethods[0])
            ?.id ||
          "";

        if (paymentMethodId) {
          paymentMethodIds = [paymentMethodId];

          // للفاتورة النقدية: لو طريقة الدفع متحددة، المدفوع = الإجمالي
          // للفاتورة الآجلة أو التقسيط: المدفوع = ما دخله المستخدم
          if (paymentType === "cash") {
            actualPaid = total; // الفاتورة النقدية دايماً مدفوعة بالكامل
            paymentMethodAmounts = { [paymentMethodId]: total };
          } else {
            // آجل أو تقسيط - استخدم المبلغ المدخل
            paymentMethodAmounts = { [paymentMethodId]: paid };
          }
        }
      }

      const invoice: Invoice = {
        id: newInvoiceNumber,
        customerId: selectedCustomer === "cash" ? undefined : selectedCustomer,
        customerName: customerData?.name,
        items: cartItems.map((i) => ({
          productId: i.id,
          productName: i.nameAr,
          quantity: i.quantity,
          price: i.customPrice || i.price,
          total: (i.customPrice || i.price) * i.quantity,
          unitId: i.unitId || "",
          unitName: i.unitName || "",
          conversionFactor: i.conversionFactor || 1,
          priceTypeId: i.priceTypeId || "",
          priceTypeName: i.priceTypeName || "",
          productUnitId: i.productUnitId,
          selectedUnitName: i.selectedUnitName,
        })),
        subtotal,
        discount,
        tax,
        total,
        paymentType,
        paymentStatus: actualPaid >= total ? "paid" : actualPaid > 0 ? "partial" : "unpaid",
        paidAmount: actualPaid,
        remainingAmount: Math.max(0, total - actualPaid),
        paymentMethodIds,
        paymentMethodAmounts,
        userId: user.id,
        userName: user.name,
        createdAt: new Date().toISOString(),
        shiftId: contextShift.id,
        dueDate:
          paymentType === "credit"
            ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
            : undefined,
        installmentPlan:
          paymentType === "installment"
            ? {
              numberOfInstallments: parseInt(installmentMonths),
              installmentAmount:
                (total - parseFloat(downPayment || "0")) /
                parseInt(installmentMonths),
              interestRate: 0,
              startDate: new Date().toISOString(),
              payments: [],
            }
            : undefined,
      };

      await createWithAudit("invoices", invoice, {
        userId: user.id,
        userName: user.name,
        shiftId: contextShift.id,
      });

      // Save invoice items to separate store for sync
      // Each item gets its own record with invoiceId reference
      const invoiceItemsToSave = cartItems.map((i, index) => ({
        id: `${newInvoiceNumber}_${index}_${Date.now()}`,
        invoiceId: newInvoiceNumber,
        productId: i.id,
        productName: i.nameAr,
        quantity: i.quantity,
        price: i.customPrice || i.price,
        total: (i.customPrice || i.price) * i.quantity,
        unitId: i.unitId || "",
        unitName: i.unitName || "",
        conversionFactor: i.conversionFactor || 1,
        priceTypeId: i.priceTypeId || "",
        priceTypeName: i.priceTypeName || "",
        productUnitId: i.productUnitId,
        selectedUnitName: i.selectedUnitName,
        createdAt: new Date().toISOString(),
      }));

      for (const item of invoiceItemsToSave) {
        await db.add("invoiceItems", item);
      }

      console.log("📝 Invoice saved:", invoice);
      console.log("📦 Invoice items saved separately:", invoiceItemsToSave.length);
      console.log("🔑 Invoice shiftId:", invoice.shiftId);
      console.log("💳 Payment Method IDs:", paymentMethodIds);
      console.log("💰 Payment Method Amounts:", paymentMethodAmounts);
      console.log("💵 Payment Type:", paymentType);
      console.log("💸 Paid Amount:", paid);
      console.log("📦 Current Shift Before Update:", contextShift);

      // Update shift sales data
      const updatedShift = { ...contextShift };
      updatedShift.sales.totalInvoices += 1;
      updatedShift.sales.totalAmount += total;

      // تحديث حسب طريقة الدفع - نحدث دائماً بغض النظر عن paymentType
      // لأن paymentMethodAmounts يحتوي على التفاصيل الفعلية
      let cashAmount = 0;
      let cardAmount = 0;
      let walletAmount = 0;

      for (const methodId of paymentMethodIds) {
        const method = paymentMethods.find((pm) => pm.id === methodId);
        const amount = paymentMethodAmounts[methodId] || 0;

        console.log(
          `💳 Payment Method: ${method?.name}, Type: ${method?.type}, Amount: ${amount}`
        );

        if (method?.type === "cash") {
          cashAmount += amount;
        } else if (
          method?.type === "visa" ||
          method?.type === "bank_transfer"
        ) {
          cardAmount += amount;
        } else if (method?.type === "wallet") {
          walletAmount += amount;
        }
      }

      updatedShift.sales.cashSales += cashAmount;
      updatedShift.sales.cardSales += cardAmount;
      updatedShift.sales.walletSales += walletAmount;

      console.log(
        `💰 Cash: ${cashAmount}, Card: ${cardAmount}, Wallet: ${walletAmount}`
      );

      console.log("✅ Updated Shift Data:", updatedShift);
      console.log("💰 Sales Summary:", updatedShift.sales);
      console.log("🔑 Shift ID for update:", updatedShift.id);

      await db.update("shifts", updatedShift);
      console.log("✔️ Shift updated in database");

      // تحديث الـ context
      await refreshShift();
      console.log("🔄 Shift context refreshed");

      // التحقق من أن التحديث حصل فعلاً
      const verifyShift = await db.get<Shift>("shifts", updatedShift.id);
      console.log("🔍 Verified shift from DB:", verifyShift);
      console.log("🔍 Verified shift sales:", verifyShift?.sales);

      // Update stock (considering conversion factors for multi-unit)
      for (const item of cartItems) {
        const product = products.find((p) => p.id === item.id);
        if (product) {
          // Calculate stock to deduct based on conversion factor
          const stockToDeduct = item.quantity * (item.conversionFactor || 1);
          await db.update("products", {
            ...product,
            stock: product.stock - stockToDeduct,
          });
        }
      }

      // Update customer
      if (paymentType !== "cash" && customerData) {
        await db.update("customers", {
          ...customerData,
          currentBalance:
            (customerData.currentBalance || 0) + Math.max(0, total - paid),
        });
      }

      toast({ title: "تم حفظ الفاتورة" });

      // فتح نافذة الطباعة إذا طُلب ذلك
      if (print) {
        setInvoiceToPrint(invoice);
        setPrintDialogOpen(true);
      }

      clearCart();
      await loadData();
    } catch (error) {
      toast({ title: "خطأ في الحفظ", variant: "destructive" });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background" dir="rtl">
      <POSHeader />

      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Right Side - Products */}
          <ResizablePanel defaultSize={60} minSize={40}>
            <div className="h-full flex flex-col p-3 gap-3">
              {/* Search & Filter */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && filteredProducts.length === 1) {
                        addToCart(filteredProducts[0]);
                      }
                    }}
                    placeholder="ابحث بالاسم أو الكود أو الباركود..."
                    className="pr-10 h-10"
                  />
                </div>
                <Select
                  value={selectedCategory}
                  onValueChange={setSelectedCategory}
                >
                  <SelectTrigger className="w-40 h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="no-category">بدون قسم</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.nameAr}>
                        {c.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Products Grid */}
              <div className="flex-1 overflow-auto">
                <div className="grid grid-cols-5 gap-2">
                  {filteredProducts.map((p) => (
                    <Card
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="p-2 cursor-pointer hover:shadow-lg hover:border-primary transition"
                    >
                      <div className="space-y-1">
                        {/* صورة المنتج */}
                        {p.imageUrl && (
                          <div className="w-full aspect-square rounded overflow-hidden bg-muted mb-1">
                            <img
                              src={p.imageUrl}
                              alt={p.nameAr}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                // إخفاء الصورة إذا فشل التحميل
                                (e.target as HTMLElement).style.display =
                                  "none";
                              }}
                            />
                          </div>
                        )}

                        <h4 className="font-bold text-xs line-clamp-2">
                          {p.nameAr}
                        </h4>
                        <div className="flex gap-1">
                          {p.category && (
                            <Badge variant="secondary" className="text-[10px]">
                              {p.category}
                            </Badge>
                          )}
                          {p.unitId &&
                            (() => {
                              const unit = units.find((u) => u.id === p.unitId);
                              return unit ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px]"
                                >
                                  {unit.symbol || unit.name}
                                </Badge>
                              ) : null;
                            })()}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-primary">
                            {(() => {
                              // Use globally selected price type or default
                              const priceTypeId =
                                selectedPriceTypeId ||
                                (
                                  priceTypes.find((pt) => pt.isDefault) ||
                                  priceTypes[0]
                                )?.id ||
                                "";
                              const displayPrice =
                                priceTypeId && p.prices?.[priceTypeId]
                                  ? p.prices[priceTypeId]
                                  : p.price || 0;
                              return `${displayPrice.toFixed(2)} ${currency}`;
                            })()}
                          </span>
                          <Badge
                            variant={p.stock > 10 ? "default" : "destructive"}
                          >
                            {p.stock}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Pending Orders */}
              {pendingOrders.length > 0 && (
                <Card className="p-2">
                  <div className="flex gap-2 items-center mb-2">
                    <Pause className="h-4 w-4" />
                    <span className="text-sm font-bold">
                      معلق ({pendingOrders.length})
                    </span>
                  </div>
                  <div className="flex gap-2 overflow-x-auto">
                    {pendingOrders.map((o) => (
                      <Card
                        key={o.id}
                        onClick={() => resumeOrder(o)}
                        className="p-2 min-w-[100px] cursor-pointer hover:shadow"
                      >
                        <div className="text-xs">
                          <div className="font-bold">#{o.id.slice(-6)}</div>
                          <div>{o.items.length} منتج</div>
                          <div className="text-muted-foreground text-[10px]">
                            {new Date(o.timestamp).toLocaleTimeString("ar")}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </ResizablePanel>

          {/* Resizable Divider */}
          <ResizableHandle withHandle />

          {/* Left Side - Invoice */}
          <ResizablePanel defaultSize={40} minSize={30}>
            <div className="h-full border-r flex flex-col bg-card">
              {/* Header */}
              <div className="bg-primary text-primary-foreground p-3 text-center font-bold">
                قائمة المنتجات
              </div>

              <ResizablePanelGroup direction="vertical">
                {/* Cart Table */}
                <ResizablePanel defaultSize={50} minSize={20}>
                  <div className="h-full overflow-auto p-3">
                    {cartItems.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-muted-foreground">
                        <div className="text-center">
                          <Search className="h-16 w-16 mx-auto mb-2 opacity-20" />
                          <p>لا توجد منتجات</p>
                        </div>
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-right p-2">المنتج</th>
                            <th className="text-center p-2 w-28">الكمية</th>
                            <th className="text-center p-2 w-24">السعر</th>
                            <th className="text-right p-2 w-24">المجموع</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {cartItems.map((item, index) => (
                            <tr
                              key={`${item.id}-${item.productUnitId || "base"
                                }-${index}`}
                              className="border-b"
                            >
                              <td className="p-2">
                                <div className="font-bold text-xs">
                                  {item.nameAr}
                                </div>
                                {item.selectedUnitName && (
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Badge
                                      variant="secondary"
                                      className="text-[9px] h-4 px-1"
                                    >
                                      {item.selectedUnitName}
                                    </Badge>
                                    {item.conversionFactor &&
                                      item.conversionFactor > 1 && (
                                        <span>
                                          ({item.conversionFactor} قطعة)
                                        </span>
                                      )}
                                  </div>
                                )}
                                {!item.selectedUnitName && item.unitName && (
                                  <div className="text-[10px] text-muted-foreground">
                                    {item.unitName}
                                  </div>
                                )}
                              </td>
                              <td className="p-2">
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      updateQuantity(
                                        item.id,
                                        item.quantity - 1,
                                        item.productUnitId
                                      )
                                    }
                                    className="h-7 w-7 p-0"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <Input
                                    type="number"
                                    value={item.quantity}
                                    onChange={(e) =>
                                      updateQuantity(
                                        item.id,
                                        parseInt(e.target.value) || 1,
                                        item.productUnitId
                                      )
                                    }
                                    className="h-7 w-14 text-center p-1 text-xs"
                                  />
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      updateQuantity(
                                        item.id,
                                        item.quantity + 1,
                                        item.productUnitId
                                      )
                                    }
                                    className="h-7 w-7 p-0"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>
                              </td>
                              <td className="p-2">
                                <Input
                                  key={`${item.id}-${item.priceTypeId || "default"
                                    }-${item.productUnitId || "base"}`}
                                  type="number"
                                  step="0.01"
                                  value={
                                    item.customPrice !== undefined
                                      ? item.customPrice
                                      : item.price
                                  }
                                  onChange={(e) =>
                                    updatePrice(
                                      item.id,
                                      parseFloat(e.target.value) || item.price
                                    )
                                  }
                                  className="h-7 w-20 text-xs text-center"
                                />
                              </td>
                              <td className="p-2 text-right font-bold">
                                {(
                                  (item.customPrice !== undefined
                                    ? item.customPrice
                                    : item.price) * item.quantity
                                ).toFixed(2)}
                              </td>
                              <td className="p-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    removeItem(item.id, item.productUnitId)
                                  }
                                  className="h-7 w-7 p-0"
                                >
                                  <Trash2 className="h-3 w-3 text-destructive" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </ResizablePanel>

                {/* Resizable Divider */}
                {cartItems.length > 0 && (
                  <>
                    <ResizableHandle withHandle />

                    {/* Payment Section */}
                    <ResizablePanel defaultSize={50} minSize={30}>
                      <div className="h-full overflow-auto p-3 space-y-2">
                        {/* Payment Type Tabs */}
                        <Tabs
                          value={paymentType}
                          onValueChange={(v: any) => setPaymentType(v)}
                        >
                          <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="cash">نقدي</TabsTrigger>
                            <TabsTrigger value="credit">آجل</TabsTrigger>
                            <TabsTrigger value="installment">تقسيط</TabsTrigger>
                          </TabsList>

                          <TabsContent value="cash" className="space-y-2">
                            <div className="flex gap-2">
                              <Select
                                value={selectedCustomer}
                                onValueChange={setSelectedCustomer}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">
                                    عميل نقدي
                                  </SelectItem>
                                  {customers.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name} - {c.phone}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAddCustomerDialog(true)}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TabsContent>

                          <TabsContent value="credit" className="space-y-2">
                            <Label className="text-xs">العميل *</Label>
                            <div className="flex gap-2">
                              <Select
                                value={selectedCustomer}
                                onValueChange={setSelectedCustomer}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="اختر عميل" />
                                </SelectTrigger>
                                <SelectContent>
                                  {customers.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name} - {c.phone}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAddCustomerDialog(true)}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="bg-blue-50 p-2 rounded text-xs text-blue-900">
                              📅 سيتم إضافة المبلغ للآجل (30 يوم)
                            </div>
                          </TabsContent>

                          <TabsContent
                            value="installment"
                            className="space-y-2"
                          >
                            <Label className="text-xs">العميل *</Label>
                            <div className="flex gap-2">
                              <Select
                                value={selectedCustomer}
                                onValueChange={setSelectedCustomer}
                              >
                                <SelectTrigger className="h-9">
                                  <SelectValue placeholder="اختر عميل" />
                                </SelectTrigger>
                                <SelectContent>
                                  {customers.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                      {c.name} - {c.phone}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setAddCustomerDialog(true)}
                              >
                                <UserPlus className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="text-xs">عدد الأقساط</Label>
                                <Select
                                  value={installmentMonths}
                                  onValueChange={setInstallmentMonths}
                                >
                                  <SelectTrigger className="h-9">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="3">3 أشهر</SelectItem>
                                    <SelectItem value="6">6 أشهر</SelectItem>
                                    <SelectItem value="12">12 شهر</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label className="text-xs">المقدم</Label>
                                <Input
                                  type="number"
                                  value={downPayment}
                                  onChange={(e) =>
                                    setDownPayment(e.target.value)
                                  }
                                  className="h-9"
                                  placeholder="0"
                                />
                              </div>
                            </div>
                            <div className="bg-amber-50 p-2 rounded text-xs text-amber-900">
                              💳 القسط الشهري:{" "}
                              {(
                                (total - parseFloat(downPayment || "0")) /
                                parseInt(installmentMonths)
                              ).toFixed(2)}{" "}
                              {currency}
                            </div>
                          </TabsContent>
                        </Tabs>

                        {/* Price Type Selection */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <Label className="text-xs font-semibold">
                              نوع السعر (لكل المنتجات)
                            </Label>
                            {cartItems.length > 0 && (
                              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                                {cartItems.length} منتج
                              </span>
                            )}
                          </div>
                          <Select
                            value={selectedPriceTypeId}
                            onValueChange={updateGlobalPriceType}
                          >
                            <SelectTrigger className="h-9 border-2 border-primary/20">
                              <SelectValue>
                                {priceTypes.find(
                                  (pt) => pt.id === selectedPriceTypeId
                                )?.name || "اختر نوع السعر"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {priceTypes.map((pt) => (
                                <SelectItem key={pt.id} value={pt.id}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">
                                      {pt.name}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Payment Method Selection */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">طريقة الدفع</Label>
                            <div className="flex items-center gap-2" dir="ltr">
                              <Switch
                                checked={splitPaymentMode}
                                onCheckedChange={(checked) => {
                                  setSplitPaymentMode(checked);
                                  if (checked) {
                                    // تفعيل الدفع المقسم - إضافة طريقة دفع واحدة افتراضياً
                                    const defaultMethod =
                                      paymentMethods.find(
                                        (pm) => pm.type === "cash"
                                      ) || paymentMethods[0];
                                    if (
                                      defaultMethod &&
                                      paymentSplits.length === 0
                                    ) {
                                      setPaymentSplits([
                                        {
                                          methodId: defaultMethod.id,
                                          methodName: defaultMethod.name,
                                          amount:
                                            total > 0 ? total.toFixed(2) : "0",
                                        },
                                      ]);
                                    }
                                  } else {
                                    // إلغاء الدفع المقسم
                                    setPaymentSplits([]);
                                  }
                                }}
                              />
                              <span className="text-[10px] text-muted-foreground">
                                دفع بطرق متعددة
                              </span>
                            </div>
                          </div>

                          {!splitPaymentMode ? (
                            // طريقة دفع واحدة فقط
                            <Select
                              value={selectedPaymentMethodId}
                              onValueChange={setSelectedPaymentMethodId}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue>
                                  {(() => {
                                    const selected = paymentMethods.find(
                                      (pm) => pm.id === selectedPaymentMethodId
                                    );
                                    if (!selected) return "اختر طريقة الدفع";
                                    return (
                                      <div className="flex items-center gap-2">
                                        {selected.type === "cash" && (
                                          <Banknote className="h-4 w-4" />
                                        )}
                                        {selected.type === "wallet" && (
                                          <Wallet className="h-4 w-4" />
                                        )}
                                        {selected.type === "visa" && (
                                          <CreditCard className="h-4 w-4" />
                                        )}
                                        {selected.type === "bank_transfer" && (
                                          <CreditCard className="h-4 w-4" />
                                        )}
                                        <span>{selected.name}</span>
                                      </div>
                                    );
                                  })()}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {paymentMethods.map((pm) => (
                                  <SelectItem key={pm.id} value={pm.id}>
                                    <div className="flex items-center gap-2">
                                      {pm.type === "cash" && (
                                        <Banknote className="h-4 w-4" />
                                      )}
                                      {pm.type === "wallet" && (
                                        <Wallet className="h-4 w-4" />
                                      )}
                                      {pm.type === "visa" && (
                                        <CreditCard className="h-4 w-4" />
                                      )}
                                      {pm.type === "bank_transfer" && (
                                        <CreditCard className="h-4 w-4" />
                                      )}
                                      <span>{pm.name}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            // طرق دفع متعددة (Split Payment)
                            <div className="space-y-2 border rounded-md p-2 bg-muted/30">
                              {paymentSplits.map((split, index) => (
                                <div
                                  key={index}
                                  className="flex gap-2 items-start"
                                >
                                  <Select
                                    value={split.methodId}
                                    onValueChange={(value) =>
                                      updatePaymentSplit(
                                        index,
                                        "methodId",
                                        value
                                      )
                                    }
                                  >
                                    <SelectTrigger className="h-9 flex-1">
                                      <SelectValue>
                                        {
                                          paymentMethods.find(
                                            (pm) => pm.id === split.methodId
                                          )?.name
                                        }
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      {paymentMethods.map((pm) => (
                                        <SelectItem key={pm.id} value={pm.id}>
                                          <div className="flex items-center gap-2">
                                            {pm.type === "cash" && (
                                              <Banknote className="h-4 w-4" />
                                            )}
                                            {pm.type === "wallet" && (
                                              <Wallet className="h-4 w-4" />
                                            )}
                                            {pm.type === "visa" && (
                                              <CreditCard className="h-4 w-4" />
                                            )}
                                            {pm.type === "bank_transfer" && (
                                              <CreditCard className="h-4 w-4" />
                                            )}
                                            <span>{pm.name}</span>
                                          </div>
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Input
                                    type="number"
                                    value={split.amount}
                                    onChange={(e) =>
                                      updatePaymentSplit(
                                        index,
                                        "amount",
                                        e.target.value
                                      )
                                    }
                                    className="h-9 w-24"
                                    placeholder="المبلغ"
                                  />
                                  {paymentSplits.length > 1 && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => removePaymentSplit(index)}
                                      className="h-9 w-9 p-0"
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={addPaymentSplit}
                                className="w-full h-8"
                              >
                                <Plus className="h-3 w-3 ml-1" />
                                إضافة طريقة دفع
                              </Button>
                              {paymentSplits.length > 0 && (
                                <div className="text-[10px] text-center pt-1 border-t">
                                  <span
                                    className={
                                      paid >= total
                                        ? "text-green-600 font-bold"
                                        : "text-amber-600"
                                    }
                                  >
                                    المجموع: {paid.toFixed(2)} من{" "}
                                    {total.toFixed(2)} {currency}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Discount & Tax */}
                        <div className="space-y-2">
                          {/* Promotions Button */}
                          {promotions.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setPromotionDialogOpen(true)}
                              className="w-full h-8 gap-2"
                            >
                              <Tag className="h-3 w-3" />
                              تطبيق عرض ({promotions.length})
                            </Button>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs">خصم %</Label>
                              <Input
                                type="number"
                                value={discountPercent}
                                onChange={(e) => {
                                  setDiscountPercent(e.target.value);
                                  setDiscountAmount("");
                                  setSelectedPromotion("");
                                }}
                                className="h-9"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">خصم مبلغ</Label>
                              <Input
                                type="number"
                                value={discountAmount}
                                onChange={(e) => {
                                  setDiscountAmount(e.target.value);
                                  setDiscountPercent("");
                                  setSelectedPromotion("");
                                }}
                                className="h-9"
                              />
                            </div>
                          </div>

                          {selectedPromotion && (
                            <div className="bg-green-50 border border-green-200 rounded px-2 py-1 text-xs text-green-900 flex items-center gap-1">
                              <Tag className="h-3 w-3" />
                              <span>
                                تم تطبيق:{" "}
                                {
                                  promotions.find(
                                    (p) => p.id === selectedPromotion
                                  )?.name
                                }
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between">
                          <Label className="text-xs">
                            شامل ضريبة {taxRate}%
                          </Label>
                          <Switch
                            checked={includeTax}
                            onCheckedChange={setIncludeTax}
                            dir="ltr"
                          />
                        </div>

                        {/* Totals */}
                        <div className="bg-muted p-2 rounded space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>المجموع:</span>
                            <span className="font-bold">
                              {subtotal.toFixed(2)}
                            </span>
                          </div>
                          {discount > 0 && (
                            <div className="flex justify-between text-red-600">
                              <span>الخصم:</span>
                              <span>-{discount.toFixed(2)}</span>
                            </div>
                          )}
                          {includeTax && (
                            <div className="flex justify-between text-blue-600">
                              <span>الضريبة:</span>
                              <span>+{tax.toFixed(2)}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold text-primary pt-1 border-t">
                            <span>الإجمالي:</span>
                            <span>
                              {total.toFixed(2)} {currency}
                            </span>
                          </div>
                        </div>

                        {/* Paid Amount - Only show if not in split payment mode */}
                        {!splitPaymentMode && (
                          <div>
                            <Label className="text-xs">المدفوع</Label>
                            <Input
                              type="number"
                              value={paidAmount}
                              onChange={(e) => setPaidAmount(e.target.value)}
                              placeholder={total.toFixed(2)}
                              className="h-10 text-lg font-bold"
                            />
                          </div>
                        )}

                        {paid > 0 && (
                          <div
                            className={`text-center p-3 rounded ${change >= 0
                              ? "bg-green-100 text-green-900"
                              : "bg-red-100 text-red-900"
                              }`}
                          >
                            <div className="text-xs">
                              {change >= 0 ? "الباقي" : "المتبقي"}
                            </div>
                            <div className="text-2xl font-bold">
                              {Math.abs(change).toFixed(2)} {currency}
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="grid grid-cols-2 gap-2">
                          <Button variant="outline" onClick={suspendOrder}>
                            <Pause className="h-4 w-4 ml-2" />
                            تعليق
                          </Button>
                          <Button variant="outline" onClick={clearCart}>
                            <X className="h-4 w-4 ml-2" />
                            إلغاء
                          </Button>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <Button
                            variant="secondary"
                            onClick={() => saveInvoice(false)}
                          >
                            <Save className="h-4 w-4 ml-2" />
                            حفظ
                          </Button>
                          <Button onClick={() => saveInvoice(true)}>
                            <Printer className="h-4 w-4 ml-2" />
                            حفظ وطباعة
                          </Button>
                          <Button variant="outline" onClick={generateQuotePDF}>
                            <FileText className="h-4 w-4 ml-2" />
                            عرض سعر
                          </Button>
                        </div>
                      </div>
                    </ResizablePanel>
                  </>
                )}
              </ResizablePanelGroup>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={addCustomerDialog} onOpenChange={setAddCustomerDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>إضافة عميل جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>الاسم *</Label>
              <Input
                value={newCustomerData.name}
                onChange={(e) =>
                  setNewCustomerData({
                    ...newCustomerData,
                    name: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>الهاتف *</Label>
              <Input
                value={newCustomerData.phone}
                onChange={(e) =>
                  setNewCustomerData({
                    ...newCustomerData,
                    phone: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>العنوان</Label>
              <Input
                value={newCustomerData.address}
                onChange={(e) =>
                  setNewCustomerData({
                    ...newCustomerData,
                    address: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <Label>الرصيد الافتتاحي للأجل ({currency})</Label>
              <Input
                type="number"
                value={newCustomerData.initialCreditBalance}
                onChange={(e) =>
                  setNewCustomerData({
                    ...newCustomerData,
                    initialCreditBalance: parseFloat(e.target.value) || 0,
                  })
                }
                placeholder="0.00"
                step="0.01"
                min="0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                سيتم إنشاء فاتورة آجلة تلقائياً بهذا المبلغ
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddCustomerDialog(false);
                setNewCustomerData({
                  name: "",
                  phone: "",
                  address: "",
                  initialCreditBalance: 0,
                });
              }}
            >
              إلغاء
            </Button>
            <Button onClick={handleAddCustomer}>إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unit Selection Dialog */}
      <Dialog open={unitSelectionDialog} onOpenChange={setUnitSelectionDialog}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle>اختر الوحدة</DialogTitle>
          </DialogHeader>
          {productForUnitSelection && (
            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-semibold">
                  {productForUnitSelection.nameAr}
                </p>
                <p className="text-sm text-muted-foreground">
                  المخزون المتاح: {productForUnitSelection.stock} قطعة
                </p>
              </div>

              <div>
                <Label>الوحدة</Label>
                <Select
                  value={selectedProductUnitId}
                  onValueChange={setSelectedProductUnitId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الوحدة" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableProductUnits.map((unit) => {
                      const priceTypeId =
                        selectedPriceTypeId ||
                        (priceTypes.find((pt) => pt.isDefault) || priceTypes[0])
                          ?.id ||
                        "";
                      const unitPrice =
                        unit.prices?.[priceTypeId] ||
                        productForUnitSelection.price ||
                        0;
                      const availableUnits = Math.floor(
                        productForUnitSelection.stock / unit.conversionFactor
                      );

                      return (
                        <SelectItem key={unit.id} value={unit.id}>
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span className="font-semibold">
                              {unit.unitName}
                            </span>
                            <div className="flex items-center gap-3 text-sm">
                              <Badge variant="secondary">
                                {unit.conversionFactor} قطعة
                              </Badge>
                              <span className="text-green-600 font-medium">
                                {unitPrice.toFixed(2)} {currency}
                              </span>
                              <span className="text-muted-foreground">
                                ({availableUnits} متاح)
                              </span>
                            </div>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUnitSelectionDialog(false);
                setProductForUnitSelection(null);
                setAvailableProductUnits([]);
              }}
            >
              إلغاء
            </Button>
            <Button onClick={handleUnitSelectionConfirm}>إضافة للسلة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promotions Dialog */}
      <Dialog open={promotionDialogOpen} onOpenChange={setPromotionDialogOpen}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-green-600" />
              العروض والخصومات المتاحة
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 max-h-[400px] overflow-y-auto py-2">
            {promotions.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                لا توجد عروض متاحة حالياً
              </div>
            ) : (
              promotions.map((promo) => (
                <Card
                  key={promo.id}
                  className={`p-4 cursor-pointer hover:border-green-500 transition-all ${selectedPromotion === promo.id
                    ? "border-green-500 bg-green-50"
                    : ""
                    }`}
                  onClick={() => applyPromotion(promo.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{promo.name}</h3>
                        <Badge variant="secondary" className="gap-1">
                          {promo.discountType === "percentage" ? (
                            <>
                              <Percent className="h-3 w-3" />
                              {promo.discountValue}%
                            </>
                          ) : (
                            <>{promo.discountValue} جنيه</>
                          )}
                        </Badge>
                      </div>
                      {promo.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {promo.description}
                        </p>
                      )}
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span>
                          من:{" "}
                          {new Date(promo.startDate).toLocaleDateString(
                            "ar-EG"
                          )}
                        </span>
                        <span>
                          إلى:{" "}
                          {new Date(promo.endDate).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    </div>
                    <div className="bg-green-100 p-3 rounded-full">
                      <Tag className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPromotionDialogOpen(false)}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      {printDialogOpen && invoiceToPrint && (
        <InvoicePrint
          invoice={invoiceToPrint}
          onClose={() => {
            setPrintDialogOpen(false);
            setInvoiceToPrint(null);
          }}
        />
      )}
    </div>
  );
};

export default POSv2;
