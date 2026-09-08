import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { Login } from './components/auth/Login';
import { AdminUsers } from './components/admin/AdminUsers';
import { SalesLandingPage } from './components/landing/SalesLandingPage';
import { CheckoutPage } from './components/checkout/CheckoutPage';

import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { FooterBar } from './components/FooterBar';
import { HomeProjectsTab } from './components/home/HomeProjectsTab';
import { ProjectsManagementTab } from './components/home/ProjectsManagementTab';
import { DeadlinesAndInstallmentsTab } from './components/deadlines/DeadlinesAndInstallmentsTab';
import { FreelanceClientsTab } from './components/freelance/FreelanceClientsTab';
import { MapProjectsTab } from './components/map/MapProjectsTab';
import { BanksAndCashTab } from './components/banks/BanksAndCashTab';
import { SavingsGoalsTab } from './components/goals/SavingsGoalsTab';
import { BudgetAndReportsTab } from './components/budget/BudgetAndReportsTab';
import { BusinessDashboardTab } from './components/dashboard/BusinessDashboardTab';
import { ActionsTab } from './components/actions/ActionsTab';
import { LeadsTab } from './components/leads/LeadsTab';
import { TodayTab } from './components/today/TodayTab';
import { TeamTab } from './components/team/TeamTab';
import { SuppliersTab } from './components/suppliers/SuppliersTab';
import { SettingsTab } from './components/settings/SettingsTab';
import { NewTransactionModal } from './components/modals/NewTransactionModal';
import { AmortizationModal } from './components/modals/AmortizationModal';
import { TransferModal } from './components/modals/TransferModal';
import { CashActionModal } from './components/modals/CashActionModal';
import { SettingsModal } from './components/modals/SettingsModal';

import { Building2, LogOut, Shield, Loader2 } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';

import { SubscriptionGuard } from './components/auth/SubscriptionGuard';

const AppContent: React.FC = () => {
  // Default to projects management
  const [activeTab, setActiveTab] = useState<string>('projects');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [newTxInitialType, setNewTxInitialType] = useState<'income' | 'expense'>('expense');
  const [newTxInitialCategoryOrSource, setNewTxInitialCategoryOrSource] = useState<string | undefined>();

  const [isAmortizationModalOpen, setIsAmortizationModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenNewTx = (initialType: 'income' | 'expense' = 'expense', catOrSource?: string) => {
    setNewTxInitialType(initialType);
    setNewTxInitialCategoryOrSource(catOrSource);
    setIsNewTxModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#12100e] text-[#fcf8f5] flex flex-col lg:flex-row selection:bg-[#c58a4b]/30 selection:text-[#fcf8f5] font-sans antialiased">
      {/* Lateral Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewTxModal={() => handleOpenNewTx('expense')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isMobileOpen={isMobileSidebarOpen}
        setIsMobileOpen={setIsMobileSidebarOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenNewTxModal={() => handleOpenNewTx('expense')}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'today' && <TodayTab />}
          {activeTab === 'actions' && <ActionsTab />}
          {activeTab === 'leads' && <LeadsTab />}
          {activeTab === 'dashboard' && <BusinessDashboardTab />}
          {activeTab === 'home' && (
            <HomeProjectsTab
              onNavigateTab={setActiveTab}
              onOpenNewTxModal={handleOpenNewTx}
            />
          )}
          {activeTab === 'projects' && (
            <ProjectsManagementTab
              onNavigateTab={setActiveTab}
            />
          )}
          {activeTab === 'suppliers' && <SuppliersTab />}
          {activeTab === 'team' && <TeamTab />}
          {activeTab === 'deadlines' && <DeadlinesAndInstallmentsTab />}
          {activeTab === 'freelance' && <FreelanceClientsTab />}
          {activeTab === 'banks' && (
            <BanksAndCashTab
              onOpenTransferModal={() => setIsTransferModalOpen(true)}
              onOpenCashModal={() => setIsCashModalOpen(true)}
              onOpenNewTxModal={handleOpenNewTx}
            />
          )}
          {activeTab === 'goals' && <SavingsGoalsTab />}
          {activeTab === 'budget' && <BudgetAndReportsTab />}
          {activeTab === 'settings' && <SettingsTab />}
        </main>

        <FooterBar />
      </div>

      <NewTransactionModal
        isOpen={isNewTxModalOpen}
        onClose={() => setIsNewTxModalOpen(false)}
        initialType={newTxInitialType}
        initialCategoryOrSource={newTxInitialCategoryOrSource}
      />
      <AmortizationModal isOpen={isAmortizationModalOpen} onClose={() => setIsAmortizationModalOpen(false)} />
      <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} />
      <CashActionModal isOpen={isCashModalOpen} onClose={() => setIsCashModalOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-[#12100e] text-[#fcf8f5] flex flex-col font-sans antialiased">
      <header className="bg-[#1a1614] border-b border-[#3d342f] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#c58a4b] rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-[#12100e]" />
              </div>
              <span className="font-serif font-bold text-lg text-[#fcf8f5] tracking-wide">
                Admin | <span className="text-[#c58a4b]">Escritório Online</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/app" className="text-sm font-bold text-[#a89c93] hover:text-[#fcf8f5] transition-colors">
                Voltar ao App
              </Link>
              <button
                onClick={() => signOut(auth)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#3d342f] text-[#a89c93] hover:text-red-400 hover:border-red-500/30 transition-colors text-sm cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

const HomeOrLandingRoute: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#c58a4b] animate-spin" />
      </div>
    );
  }

  // If not logged in, show the public sales / landing page
  if (!user) {
    return <SalesLandingPage />;
  }

  // If logged in, show the application
  return (
    <SubscriptionGuard>
      <FinanceProvider>
        <AppContent />
      </FinanceProvider>
    </SubscriptionGuard>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Sales Page & Checkout Routes */}
          <Route path="/" element={<HomeOrLandingRoute />} />
          <Route path="/vendas" element={<SalesLandingPage />} />
          <Route path="/planos" element={<SalesLandingPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/pagamento" element={<CheckoutPage />} />

          {/* Authentication Route */}
          <Route path="/login" element={<Login />} />
          
          {/* Admin Management Route */}
          <Route path="/admin/*" element={
            <AuthGuard requireAdmin>
              <AdminLayout>
                <Routes>
                  <Route path="/" element={<AdminUsers />} />
                </Routes>
              </AdminLayout>
            </AuthGuard>
          } />
          
          {/* Main Application Route for Authenticated Users */}
          <Route path="/app/*" element={
            <AuthGuard>
              <SubscriptionGuard>
                <FinanceProvider>
                  <AppContent />
                </FinanceProvider>
              </SubscriptionGuard>
            </AuthGuard>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
