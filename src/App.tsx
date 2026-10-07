import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { SubscriptionProvider, useSubscription } from '@/contexts/SubscriptionContext';
import { UpgradeModal } from '@/components/subscription/UpgradeModal';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

// Global Upgrade Modal Listener
const GlobalUpgradeModal: React.FC = () => {
  const { isUpgradeModalOpen, closeUpgradeModal } = useSubscription();
  return <UpgradeModal isOpen={isUpgradeModalOpen} onClose={closeUpgradeModal} />;
};

// Layout
import { DashboardLayout } from '@/layouts/DashboardLayout';

// Public Pages
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';

// Protected Pages
import { OnboardingPage } from '@/pages/onboarding/OnboardingPage';
import { DashboardPage } from '@/pages/dashboard/DashboardPage';
import { InvoicesListPage } from '@/pages/invoices/InvoicesListPage';
import { InvoiceFormPage } from '@/pages/invoices/InvoiceFormPage';
import { InvoiceDetailPage } from '@/pages/invoices/InvoiceDetailPage';
import { QuotationsListPage } from '@/pages/quotations/QuotationsListPage';
import { QuotationFormPage } from '@/pages/quotations/QuotationFormPage';
import { QuotationDetailPage } from '@/pages/quotations/QuotationDetailPage';
import { CustomersListPage } from '@/pages/customers/CustomersListPage';
import { CustomerDetailPage } from '@/pages/customers/CustomerDetailPage';
import { ProductsListPage } from '@/pages/products/ProductsListPage';
import { PaymentsListPage } from '@/pages/payments/PaymentsListPage';
import { ReportsPage } from '@/pages/reports/ReportsPage';
import { BusinessProfilePage } from '@/pages/business/BusinessProfilePage';
import { SettingsPage } from '@/pages/settings/SettingsPage';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SubscriptionProvider>
          <BrowserRouter>
            <GlobalUpgradeModal />
            <Routes>
              {/* Public Marketing & Auth */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Onboarding Flow */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

            {/* Main Application Workspace */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />

              {/* Invoices */}
              <Route path="/invoices" element={<InvoicesListPage />} />
              <Route path="/invoices/new" element={<InvoiceFormPage />} />
              <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="/invoices/:id/edit" element={<InvoiceFormPage />} />

              {/* Quotations */}
              <Route path="/quotations" element={<QuotationsListPage />} />
              <Route path="/quotations/new" element={<QuotationFormPage />} />
              <Route path="/quotations/:id" element={<QuotationDetailPage />} />
              <Route path="/quotations/:id/edit" element={<QuotationFormPage />} />

              {/* Customers */}
              <Route path="/customers" element={<CustomersListPage />} />
              <Route path="/customers/:id" element={<CustomerDetailPage />} />

              {/* Products */}
              <Route path="/products" element={<ProductsListPage />} />

              {/* Payments */}
              <Route path="/payments" element={<PaymentsListPage />} />

              {/* Reports */}
              <Route path="/reports" element={<ReportsPage />} />

              {/* Business Profile */}
              <Route path="/business" element={<BusinessProfilePage />} />

              {/* Settings */}
              <Route path="/settings" element={<SettingsPage />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SubscriptionProvider>
    </AuthProvider>
  </ThemeProvider>
  );
}
