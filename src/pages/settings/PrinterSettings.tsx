import { useState, useEffect } from "react";
import { POSHeader } from "@/components/POS/POSHeader";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Printer, Check, X, AlertCircle, Settings } from "lucide-react";
import { toast } from "sonner";
import { thermalPrinter, PrinterInfo } from "@/lib/thermalPrinter";

export default function PrinterSettings() {
  const [printers, setPrinters] = useState<PrinterInfo[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);

  // Print settings
  const [autoPrint, setAutoPrint] = useState(false);
  const [copies, setCopies] = useState("1");
  const [paperWidth, setPaperWidth] = useState("80");
  const [storeName, setStoreName] = useState("MASR POS Pro");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeTaxNumber, setStoreTaxNumber] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("شكراً لزيارتكم");

  useEffect(() => {
    loadPrinters();
    loadSettings();
  }, []);

  const loadPrinters = async () => {
    try {
      setLoading(true);
      const availablePrinters = await thermalPrinter.getPrinters();
      setPrinters(availablePrinters);

      const savedPrinter = thermalPrinter.getDefaultPrinter();
      if (savedPrinter) {
        setSelectedPrinter(savedPrinter);
      } else if (availablePrinters.length > 0) {
        const defaultPrinter = availablePrinters.find((p) => p.isDefault);
        if (defaultPrinter) {
          setSelectedPrinter(defaultPrinter.name);
        }
      }
    } catch (error) {
      console.error("Error loading printers:", error);
      toast.error("خطأ في تحميل الطابعات");
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = () => {
    const settings = {
      autoPrint: localStorage.getItem("autoPrint") === "true",
      copies: localStorage.getItem("printCopies") || "1",
      paperWidth: localStorage.getItem("paperWidth") || "80",
      storeName: localStorage.getItem("storeName") || "MASR POS Pro",
      storeAddress: localStorage.getItem("storeAddress") || "",
      storePhone: localStorage.getItem("storePhone") || "",
      storeTaxNumber: localStorage.getItem("storeTaxNumber") || "",
      headerText: localStorage.getItem("receiptHeaderText") || "",
      footerText: localStorage.getItem("receiptFooterText") || "شكراً لزيارتكم",
    };

    setAutoPrint(settings.autoPrint);
    setCopies(settings.copies);
    setPaperWidth(settings.paperWidth);
    setStoreName(settings.storeName);
    setStoreAddress(settings.storeAddress);
    setStorePhone(settings.storePhone);
    setStoreTaxNumber(settings.storeTaxNumber);
    setHeaderText(settings.headerText);
    setFooterText(settings.footerText);
  };

  const saveSettings = () => {
    if (selectedPrinter) {
      thermalPrinter.setDefaultPrinter(selectedPrinter);
    }

    localStorage.setItem("autoPrint", autoPrint.toString());
    localStorage.setItem("printCopies", copies);
    localStorage.setItem("paperWidth", paperWidth);
    localStorage.setItem("storeName", storeName);
    localStorage.setItem("storeAddress", storeAddress);
    localStorage.setItem("storePhone", storePhone);
    localStorage.setItem("storeTaxNumber", storeTaxNumber);
    localStorage.setItem("receiptHeaderText", headerText);
    localStorage.setItem("receiptFooterText", footerText);

    toast.success("تم حفظ الإعدادات بنجاح");
  };

  const testPrint = async () => {
    if (!selectedPrinter) {
      toast.error("الرجاء اختيار طابعة أولاً");
      return;
    }

    try {
      setTesting(true);
      const success = await thermalPrinter.testPrint(selectedPrinter);

      if (success) {
        toast.success("✓ تم الطباعة بنجاح!");
      } else {
        toast.error("فشل اختبار الطباعة");
      }
    } catch (error) {
      console.error("Test print error:", error);
      toast.error("حدث خطأ أثناء اختبار الطباعة");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" dir="rtl">
      <POSHeader />

      <main className="flex-1 container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Printer className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">إعدادات الطابعة</h1>
            <p className="text-muted-foreground">
              إدارة الطابعات الحرارية وإعدادات الطباعة
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Printer Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Printer className="h-5 w-5" />
                اختيار الطابعة
              </CardTitle>
              <CardDescription>
                اختر الطابعة الحرارية التي تريد استخدامها
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="text-center py-4 text-muted-foreground">
                  جاري تحميل الطابعات...
                </div>
              ) : printers.length === 0 ? (
                <div className="text-center py-4">
                  <AlertCircle className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    لم يتم العثور على طابعات
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    تأكد من توصيل الطابعة وتثبيت التعريفات
                  </p>
                  <Button
                    onClick={loadPrinters}
                    variant="outline"
                    className="mt-4"
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>الطابعة</Label>
                    <Select
                      value={selectedPrinter}
                      onValueChange={setSelectedPrinter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر طابعة" />
                      </SelectTrigger>
                      <SelectContent>
                        {printers.map((printer) => (
                          <SelectItem key={printer.name} value={printer.name}>
                            <div className="flex items-center gap-2">
                              <span>{printer.displayName || printer.name}</span>
                              {printer.isDefault && (
                                <span className="text-xs text-primary">
                                  (افتراضي)
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={testPrint}
                      disabled={!selectedPrinter || testing}
                      variant="outline"
                      className="flex-1"
                    >
                      {testing ? "جاري الاختبار..." : "اختبار الطباعة"}
                    </Button>
                    <Button onClick={loadPrinters} variant="outline">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>

                  {selectedPrinter && (
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      <div className="flex items-start gap-2">
                        <Check className="h-4 w-4 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium">الطابعة المحددة:</p>
                          <p className="text-muted-foreground">
                            {selectedPrinter}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Print Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                إعدادات الطباعة
              </CardTitle>
              <CardDescription>خيارات الطباعة الافتراضية</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="auto-print">الطباعة التلقائية</Label>
                <Switch
                  id="auto-print"
                  checked={autoPrint}
                  onCheckedChange={setAutoPrint}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="copies">عدد النسخ</Label>
                <Input
                  id="copies"
                  type="number"
                  min="1"
                  max="5"
                  value={copies}
                  onChange={(e) => setCopies(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paper-width">عرض الورق (mm)</Label>
                <Select value={paperWidth} onValueChange={setPaperWidth}>
                  <SelectTrigger id="paper-width">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58">58mm (2.3 inch)</SelectItem>
                    <SelectItem value="80">80mm (3.15 inch)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Store Information */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>معلومات المتجر</CardTitle>
              <CardDescription>
                ستظهر هذه المعلومات في رأس الفاتورة المطبوعة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="store-name">اسم المتجر</Label>
                  <Input
                    id="store-name"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="MASR POS Pro"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store-phone">رقم الهاتف</Label>
                  <Input
                    id="store-phone"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="01XXXXXXXXX"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="store-address">العنوان</Label>
                  <Input
                    id="store-address"
                    value={storeAddress}
                    onChange={(e) => setStoreAddress(e.target.value)}
                    placeholder="عنوان المتجر"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tax-number">الرقم الضريبي</Label>
                  <Input
                    id="tax-number"
                    value={storeTaxNumber}
                    onChange={(e) => setStoreTaxNumber(e.target.value)}
                    placeholder="XXX-XXX-XXX"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="header-text">نص رأس الفاتورة</Label>
                <Textarea
                  id="header-text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="نص إضافي في رأس الفاتورة"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer-text">نص ذيل الفاتورة</Label>
                <Textarea
                  id="footer-text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="شكراً لزيارتكم"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-3">
          <Button onClick={loadSettings} variant="outline">
            إلغاء
          </Button>
          <Button onClick={saveSettings}>
            <Check className="h-4 w-4 ml-2" />
            حفظ الإعدادات
          </Button>
        </div>
      </main>
    </div>
  );
}
