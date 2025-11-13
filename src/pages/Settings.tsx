import { POSHeader } from "@/components/POS/POSHeader";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Settings as SettingsIcon,
  Printer,
  CreditCard,
  Store,
  Database,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { db } from "@/lib/indexedDB";

const Settings = () => {
  const { can } = useAuth();
  const { toast } = useToast();
  const {
    settings,
    getSetting,
    updateSetting,
    updateMultipleSettings,
    loading,
  } = useSettings();
  const [formData, setFormData] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    // تحميل جميع الإعدادات في formData
    const data: { [key: string]: string } = {};
    settings.forEach((setting) => {
      data[setting.key] = setting.value;
    });
    setFormData(data);
  }, [settings]);

  const handleSave = async () => {
    if (!can("settings", "edit")) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية لتعديل الإعدادات",
        variant: "destructive",
      });
      return;
    }

    try {
      // حفظ كل الإعدادات المعدلة
      const updates = Object.entries(formData).map(([key, value]) => ({
        key,
        value,
      }));
      await updateMultipleSettings(updates);
      toast({
        title: "تم حفظ الإعدادات بنجاح",
        description: "تم تحديث جميع الإعدادات في قاعدة البيانات",
      });
    } catch (error) {
      toast({
        title: "خطأ في حفظ الإعدادات",
        description: "حدث خطأ أثناء حفظ الإعدادات",
        variant: "destructive",
      });
    }
  };

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const getValue = (key: string, defaultValue: string = "") => {
    return formData[key] !== undefined
      ? formData[key]
      : getSetting(key) || defaultValue;
  };

  const getBoolValue = (key: string) => {
    const value = getValue(key);
    return value === "true" || value === "1";
  };

  const handleResetDatabase = async () => {
    if (!can("settings", "edit")) {
      toast({
        title: "غير مصرح",
        description: "ليس لديك صلاحية لإعادة تهيئة قاعدة البيانات",
        variant: "destructive",
      });
      return;
    }

    const confirmed = window.confirm(
      "⚠️ تحذير: سيتم حذف قاعدة البيانات القديمة وإنشاء واحدة جديدة!\n\n" +
        "هذا سيحل مشكلة الـ object stores المفقودة.\n\n" +
        "هل أنت متأكد؟"
    );

    if (!confirmed) return;

    try {
      await db.resetDatabase();
      toast({
        title: "تمت إعادة التهيئة بنجاح",
        description: "تم إنشاء قاعدة البيانات الجديدة بنجاح",
      });

      // إعادة تحميل الصفحة
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error resetting database:", error);
      toast({
        title: "خطأ في إعادة التهيئة",
        description: "حدث خطأ أثناء إعادة تهيئة قاعدة البيانات",
        variant: "destructive",
      });
    }
  };

  if (!can("settings", "view")) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <POSHeader />
        <div className="container mx-auto p-6">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">غير مصرح</h2>
            <p>ليس لديك صلاحية لعرض الإعدادات</p>
          </Card>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background" dir="rtl">
        <POSHeader />
        <div className="container mx-auto p-6 text-center">
          <p>جاري تحميل الإعدادات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <POSHeader />
      <div className="container mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">الإعدادات</h1>
        </div>

        <Tabs defaultValue="general" className="space-y-4">
          <TabsList>
            <TabsTrigger value="general">عام</TabsTrigger>
            <TabsTrigger value="printers">الطابعات</TabsTrigger>
            <TabsTrigger value="payment">تطبيقات الدفع</TabsTrigger>
            <TabsTrigger value="store">بيانات المتجر</TabsTrigger>
            <TabsTrigger value="maintenance">الصيانة</TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4">الإعدادات العامة</h2>
              <div className="space-y-4">
                <div>
                  <Label>اسم النظام</Label>
                  <Input
                    value={getValue("storeName", "نظام نقاط البيع")}
                    onChange={(e) => handleChange("storeName", e.target.value)}
                  />
                </div>
                <div>
                  <Label>نسبة الضريبة (%)</Label>
                  <Input
                    type="number"
                    value={getValue("taxRate", "14")}
                    step="0.01"
                    onChange={(e) => handleChange("taxRate", e.target.value)}
                  />
                </div>
                <div>
                  <Label>العملة</Label>
                  <Input
                    value={getValue("currency", "EGP")}
                    onChange={(e) => handleChange("currency", e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="auto-print"
                    checked={getBoolValue("printReceipt")}
                    onCheckedChange={(checked) =>
                      handleChange("printReceipt", checked ? "true" : "false")
                    }
                  />
                  <Label htmlFor="auto-print">طباعة تلقائية للفواتير</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="sound"
                    checked={getBoolValue("soundEnabled")}
                    onCheckedChange={(checked) =>
                      handleChange("soundEnabled", checked ? "true" : "false")
                    }
                  />
                  <Label htmlFor="sound">تفعيل الأصوات</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="kitchen-print"
                    checked={getBoolValue("printKitchen")}
                    onCheckedChange={(checked) =>
                      handleChange("printKitchen", checked ? "true" : "false")
                    }
                  />
                  <Label htmlFor="kitchen-print">طباعة أوردرات المطبخ</Label>
                </div>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "جاري الحفظ..." : "حفظ الإعدادات"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="printers">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <Printer className="h-5 w-5" />
                  إعدادات الطابعات
                </h2>
                <Button
                  onClick={() => (window.location.href = "/printer-settings")}
                >
                  إعدادات الطباعة الحرارية
                </Button>
              </div>
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">الطباعة الحرارية</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    للحصول على إعدادات الطباعة الحرارية الكاملة (80mm/58mm)،
                    اختيار الطابعة، والطباعة التلقائية، اضغط على الزر أعلاه.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => (window.location.href = "/printer-settings")}
                  >
                    <Printer className="h-4 w-4 ml-2" />
                    فتح إعدادات الطابعة
                  </Button>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="payment">
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  تطبيقات الدفع الإلكتروني
                </h2>
                <Button>إضافة تطبيق</Button>
              </div>
              <div className="space-y-4">
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">فوري</h3>
                      <p className="text-sm text-muted-foreground">
                        نسبة العمولة: 2%
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        تعديل
                      </Button>
                      <Button size="sm" variant="destructive">
                        حذف
                      </Button>
                    </div>
                  </div>
                </Card>
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-bold">فودافون كاش</h3>
                      <p className="text-sm text-muted-foreground">
                        نسبة العمولة: 1.5%
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        تعديل
                      </Button>
                      <Button size="sm" variant="destructive">
                        حذف
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="store">
            <Card className="p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Store className="h-5 w-5" />
                بيانات المتجر
              </h2>
              <div className="space-y-4">
                <div>
                  <Label>اسم المتجر</Label>
                  <Input
                    value={getValue("storeName", "متجري")}
                    onChange={(e) => handleChange("storeName", e.target.value)}
                    placeholder="مثال: سوبر ماركت الأمل"
                  />
                </div>
                <div>
                  <Label>العنوان</Label>
                  <Input
                    value={getValue("storeAddress", "")}
                    onChange={(e) =>
                      handleChange("storeAddress", e.target.value)
                    }
                    placeholder="مثال: 123 شارع الجمهورية، القاهرة"
                  />
                </div>
                <div>
                  <Label>رقم الهاتف</Label>
                  <Input
                    value={getValue("storePhone", "")}
                    onChange={(e) => handleChange("storePhone", e.target.value)}
                    placeholder="مثال: 0123456789"
                  />
                </div>
                <div>
                  <Label>الرقم الضريبي</Label>
                  <Input
                    value={getValue("taxNumber", "")}
                    onChange={(e) => handleChange("taxNumber", e.target.value)}
                    placeholder="مثال: 123-456-789"
                  />
                </div>
                <div>
                  <Label>السجل التجاري</Label>
                  <Input
                    value={getValue("commercialRegister", "")}
                    onChange={(e) =>
                      handleChange("commercialRegister", e.target.value)
                    }
                    placeholder="مثال: 987654"
                  />
                </div>
                <div>
                  <Label>رقم بداية الفواتير</Label>
                  <Input
                    value={getValue("invoicePrefix", "INV")}
                    onChange={(e) =>
                      handleChange("invoicePrefix", e.target.value)
                    }
                    placeholder="مثال: INV"
                  />
                </div>
                <Button onClick={handleSave} disabled={loading}>
                  {loading ? "جاري الحفظ..." : "حفظ البيانات"}
                </Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="maintenance">
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Database className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold">صيانة قاعدة البيانات</h2>
              </div>
              <div className="space-y-4">
                <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="font-bold text-amber-900 dark:text-amber-100 mb-2">
                        إعادة تهيئة قاعدة البيانات
                      </h3>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                        إذا واجهت أخطاء مثل "One of the specified object stores
                        was not found"، فهذا يعني أن قاعدة البيانات بحاجة إلى
                        إعادة تهيئة.
                      </p>
                      <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                        <strong>ملاحظة:</strong> سيتم حذف قاعدة البيانات القديمة
                        وإنشاء واحدة جديدة تحتوي على جميع الـ object stores
                        المطلوبة بما في ذلك:
                      </p>
                      <ul className="text-sm text-amber-800 dark:text-amber-200 list-disc list-inside mb-4 space-y-1">
                        <li>مصادر الإيداعات (depositSources)</li>
                        <li>الإيداعات (deposits)</li>
                        <li>فئات المصروفات (expenseCategories)</li>
                        <li>المصروفات (expenseItems)</li>
                      </ul>
                      <Button
                        onClick={handleResetDatabase}
                        variant="destructive"
                        className="gap-2"
                      >
                        <Database className="h-4 w-4" />
                        إعادة تهيئة قاعدة البيانات
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Settings;
