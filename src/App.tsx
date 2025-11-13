import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { ShiftProvider } from "@/contexts/ShiftContext";
import Index from "./pages/Index";
import POSv2 from "./pages/POSv2";
import Customers from "./pages/Customers";
import Reports from "./pages/Reports";
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

const queryClient = new QueryClient();

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
                <Route path="*" element={<NotFound />} />
              </Routes>
            </SettingsProvider>
          </ShiftProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
