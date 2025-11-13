import { useState, useEffect } from "react";
import { POSHeader } from "@/components/POS/POSHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Search,
  UserPlus,
  Phone,
  MapPin,
  CreditCard,
  Award,
  Edit,
  Trash2,
} from "lucide-react";
import { db, Customer } from "@/lib/indexedDB";
import { toast } from "sonner";
import { useSettingsContext } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";

const Customers = () => {
  const { can } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    nationalId: "",
    creditLimit: 0,
    notes: "",
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    const data = await db.getAll<Customer>("customers");
    setCustomers(data);
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.includes(searchQuery) ||
      customer.phone.includes(searchQuery) ||
      customer.nationalId?.includes(searchQuery)
  );

  const { getSetting } = useSettingsContext();

  const currency = getSetting("currency") || "EGP";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.phone) {
      toast.error("يرجى إدخال الاسم ورقم الهاتف");
      return;
    }

    try {
      if (editingCustomer) {
        const updatedCustomer: Customer = {
          ...editingCustomer,
          ...formData,
        };
        await db.update("customers", updatedCustomer);
        toast.success("تم تحديث بيانات العميل");
      } else {
        const newCustomer: Customer = {
          id: Date.now().toString(),
          ...formData,
          currentBalance: 0,
          loyaltyPoints: 0,
          createdAt: new Date().toISOString(),
        };
        await db.add("customers", newCustomer);
        toast.success("تم إضافة العميل بنجاح");
      }

      setIsDialogOpen(false);
      resetForm();
      loadCustomers();
    } catch (error) {
      toast.error("حدث خطأ أثناء حفظ البيانات");
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      nationalId: customer.nationalId || "",
      creditLimit: customer.creditLimit,
      notes: customer.notes || "",
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm("هل أنت متأكد من حذف هذا العميل؟")) {
      try {
        await db.delete("customers", id);
        toast.success("تم حذف العميل");
        loadCustomers();
      } catch (error) {
        toast.error("حدث خطأ أثناء الحذف");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      phone: "",
      address: "",
      nationalId: "",
      creditLimit: 0,
      notes: "",
    });
    setEditingCustomer(null);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background"
      dir="rtl"
    >
      <POSHeader />

      <main className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">إدارة العملاء</h1>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            {can("customers", "create") && (
              <DialogTrigger asChild>
                <Button size="lg">
                  <UserPlus className="ml-2 h-5 w-5" />
                  إضافة عميل جديد
                </Button>
              </DialogTrigger>
            )}
            <DialogContent className="max-w-2xl" dir="rtl">
              <DialogHeader>
                <DialogTitle>
                  {editingCustomer ? "تعديل بيانات العميل" : "إضافة عميل جديد"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">اسم العميل *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الهاتف *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nationalId">الرقم القومي</Label>
                    <Input
                      id="nationalId"
                      value={formData.nationalId}
                      onChange={(e) =>
                        setFormData({ ...formData, nationalId: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="creditLimit">
                      حد الائتمان ({currency})
                    </Label>
                    <Input
                      id="creditLimit"
                      type="number"
                      value={formData.creditLimit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          creditLimit: parseFloat(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">العنوان</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">ملاحظات</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    إلغاء
                  </Button>
                  <Button type="submit">
                    {editingCustomer ? "حفظ التعديلات" : "إضافة العميل"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <Input
            type="text"
            placeholder="ابحث عن عميل (الاسم، الهاتف، الرقم القومي...)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 h-12"
          />
        </div>

        {/* Customers Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map((customer) => (
            <Card
              key={customer.id}
              className="hover:shadow-lg transition-shadow"
            >
              <CardHeader>
                <CardTitle className="flex justify-between items-start">
                  <span className="text-xl">{customer.name}</span>
                  <div className="flex gap-2">
                    {can("customers", "edit") && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(customer)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {can("customers", "delete") && (
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(customer.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{customer.phone}</span>
                </div>
                {customer.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">{customer.address}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                  <div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <CreditCard className="h-3 w-3" />
                      <span>الرصيد الحالي</span>
                    </div>
                    <p
                      className={`text-lg font-bold ${
                        customer.currentBalance > 0
                          ? "text-destructive"
                          : "text-success"
                      }`}
                    >
                      {customer.currentBalance.toFixed(2)} {currency}
                    </p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mb-1">
                      <Award className="h-3 w-3" />
                      <span>نقاط الولاء</span>
                    </div>
                    <p className="text-lg font-bold text-primary">
                      {customer.loyaltyPoints}
                    </p>
                  </div>
                </div>
                {customer.creditLimit > 0 && (
                  <div className="pt-2 text-sm text-muted-foreground">
                    حد الائتمان: {customer.creditLimit.toFixed(2)} {currency}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground text-lg">
              لا توجد بيانات عملاء
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Customers;
