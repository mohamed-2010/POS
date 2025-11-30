import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  HashRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ShiftProvider } from "@/contexts/ShiftContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { AppProvider } from "@/contexts/AppContext";
import LicenseGuard from "@/components/LicenseGuard";
import Index from "./pages/Index";
import POSv2 from "./pages/POSv2";
import Customers from "./pages/Customers";
import Reports from "./pages/ReportsNew";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Suppliers from "./pages/Suppliers";
import Inventory from "./pages/Inventory";
import Employees from "./pages/Employees";
import EmployeeAdvances from "./pages/EmployeeAdvances";
import EmployeeDeductions from "./pages/EmployeeDeductions";
import ProductCategories from "./pages/ProductCategories";
import Restaurant from "./pages/Restaurant";
import Promotions from "./pages/Promotions";
import Settings from "./pages/Settings";
import Installments from "./pages/Installments";
import Credit from "./pages/Credit";
import Shifts from "./pages/Shifts";
import SalesReturns from "./pages/SalesReturns";
import PurchaseReturns from "./pages/PurchaseReturns";
import Purchases from "./pages/Purchases";
import RolesPermissions from "./pages/RolesPermissions";
import DepositSources from "./pages/DepositSources";
import Deposits from "./pages/Deposits";
import ExpenseCategories from "./pages/ExpenseCategories";
import Expenses from "./pages/Expenses";
import WhatsAppManagement from "./pages/WhatsAppManagement";
import WhatsAppCampaigns from "./pages/WhatsAppCampaigns";
import Units from "./pages/Units";
import PriceTypes from "./pages/PriceTypes";
import PaymentMethods from "./pages/PaymentMethods";
import PrinterSettings from "./pages/PrinterSettings";
import LicenseActivation from "./pages/LicenseActivation";

const queryClient = new QueryClient();

// مكون لتنظيف المسار الأولي في Electron
const RouteCleanup = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // إذا كان المسار يحتوي على file path، أعد التوجيه إلى الصفحة الرئيسية
    if (
      location.pathname.includes(".html") ||
      location.pathname.includes("/Contents/Resources/") ||
      location.pathname.includes("/Volumes/")
    ) {
      navigate("/", { replace: true });
    }
  }, [location.pathname, navigate]);

  // تنظيف Dialog Overlays العالقة عند تغيير المسار
  useEffect(() => {
    const cleanupStuckOverlays = () => {
      const overlays = document.querySelectorAll("[data-radix-dialog-overlay]");
      overlays.forEach((overlay) => {
        const dialogContent = overlay.nextElementSibling;
        if (
          !dialogContent ||
          !dialogContent.hasAttribute("data-state") ||
          dialogContent.getAttribute("data-state") === "closed"
        ) {
          overlay.remove();
        }
      });

      document.body.style.removeProperty("pointer-events");
    };

    cleanupStuckOverlays();
    const timeoutId = setTimeout(cleanupStuckOverlays, 100);

    return () => clearTimeout(timeoutId);
  }, [location.pathname]);

  return <>{children}</>;
};

// مكون حماية المسارات
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">جاري التحميل...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App = () => {
  const isElectron = !!(window as any).electronAPI;
  const Router = isElectron ? HashRouter : BrowserRouter;

  // تنظيف عام عند تحميل التطبيق
  useEffect(() => {
    const globalCleanup = () => {
      const allOverlays = document.querySelectorAll(
        "[data-radix-dialog-overlay], [data-radix-popover-content], [data-radix-select-content]"
      );
      allOverlays.forEach((el) => {
        const state = el.getAttribute("data-state");
        if (state === "closed" || !state) {
          el.remove();
        }
      });

      if (document.body.style.pointerEvents === "none") {
        document.body.style.removeProperty("pointer-events");
      }
    };

    globalCleanup();
    const intervalId = setInterval(globalCleanup, 5000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <LicenseGuard>
          <Router>
            <RouteCleanup>
              <AppProvider>
                <ThemeProvider>
                  <AuthProvider>
                    <ShiftProvider>
                      <SettingsProvider>
                        <Routes>
                          <Route path="/login" element={<Login />} />
                          <Route
                            path="/"
                            element={
                              <ProtectedRoute>
                                <POSv2 />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/pos-old"
                            element={
                              <ProtectedRoute>
                                <Index />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/customers"
                            element={
                              <ProtectedRoute>
                                <Customers />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/reports"
                            element={
                              <ProtectedRoute>
                                <Reports />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/suppliers"
                            element={
                              <ProtectedRoute>
                                <Suppliers />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/inventory"
                            element={
                              <ProtectedRoute>
                                <Inventory />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/product-categories"
                            element={
                              <ProtectedRoute>
                                <ProductCategories />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/employees"
                            element={
                              <ProtectedRoute>
                                <Employees />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/employee-advances"
                            element={
                              <ProtectedRoute>
                                <EmployeeAdvances />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/employee-deductions"
                            element={
                              <ProtectedRoute>
                                <EmployeeDeductions />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/restaurant"
                            element={
                              <ProtectedRoute>
                                <Restaurant />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/promotions"
                            element={
                              <ProtectedRoute>
                                <Promotions />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/settings"
                            element={
                              <ProtectedRoute>
                                <Settings />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/roles-permissions"
                            element={
                              <ProtectedRoute>
                                <RolesPermissions />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/installments"
                            element={
                              <ProtectedRoute>
                                <Installments />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/credit"
                            element={
                              <ProtectedRoute>
                                <Credit />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/shifts"
                            element={
                              <ProtectedRoute>
                                <Shifts />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/sales-returns"
                            element={
                              <ProtectedRoute>
                                <SalesReturns />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/purchases"
                            element={
                              <ProtectedRoute>
                                <Purchases />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/purchase-returns"
                            element={
                              <ProtectedRoute>
                                <PurchaseReturns />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/deposit-sources"
                            element={
                              <ProtectedRoute>
                                <DepositSources />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/deposits"
                            element={
                              <ProtectedRoute>
                                <Deposits />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/expense-categories"
                            element={
                              <ProtectedRoute>
                                <ExpenseCategories />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/expenses"
                            element={
                              <ProtectedRoute>
                                <Expenses />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/whatsapp-management"
                            element={
                              <ProtectedRoute>
                                <WhatsAppManagement />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/whatsapp-campaigns"
                            element={
                              <ProtectedRoute>
                                <WhatsAppCampaigns />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/units"
                            element={
                              <ProtectedRoute>
                                <Units />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/price-types"
                            element={
                              <ProtectedRoute>
                                <PriceTypes />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/payment-methods"
                            element={
                              <ProtectedRoute>
                                <PaymentMethods />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/printer-settings"
                            element={
                              <ProtectedRoute>
                                <PrinterSettings />
                              </ProtectedRoute>
                            }
                          />
                          <Route
                            path="/license"
                            element={
                              <ProtectedRoute>
                                <LicenseActivation />
                              </ProtectedRoute>
                            }
                          />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </SettingsProvider>
                    </ShiftProvider>
                  </AuthProvider>
                </ThemeProvider>
              </AppProvider>
            </RouteCleanup>
          </Router>
        </LicenseGuard>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
