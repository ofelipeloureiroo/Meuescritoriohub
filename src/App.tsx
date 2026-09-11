import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { AuthGuard } from './components/auth/AuthGuard';
import { Login } from './components/auth/Login';
import { AdminUsers } from './components/admin/AdminUsers';
import { SalesLandingPage } from './components/landing/SalesLandingPage';
import { CheckoutPage } from './components/checkout/CheckoutPage';
import { ClientLogin } from './components/portal/ClientLogin';
import { ClientPortalDashboard } from './components/portal/ClientPortalDashboard';

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
import { ClientPortalOfficeTab } from './components/portal/ClientPortalOfficeTab';
import { NewTransactionModal } from './components/modals/NewTransactionModal';
import { TransactionStructure } from './types';
import { AmortizationModal } from './components/modals/AmortizationModal';
import { TransferModal } from './components/modals/TransferModal';
import { CashActionModal } from './components/modals/CashActionModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { SupportChatWidget } from './components/support/SupportChatWidget';

import { Building2, LogOut, Shield, Loader2, Lock } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from './lib/firebase';

import { SubscriptionGuard } from './components/auth/SubscriptionGuard';

const AppContent: React.FC = () => {
  // Default to 'Meu Dia & Agenda'
  const [activeTab, setActiveTab] = useState<string>(() => {
    const tab = localStorage.getItem('office_active_tab') || 'today';
    console.log("AppContent activeTab init:", tab);
    return tab;
  });

  useEffect(() => {
    localStorage.setItem('office_active_tab', activeTab);
  }, [activeTab]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Modals state
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [newTxInitialType, setNewTxInitialType] = useState<'income' | 'expense'>('expense');
  const [newTxInitialCategoryOrSource, setNewTxInitialCategoryOrSource] = useState<string | undefined>();
  const [newTxInitialStructure, setNewTxInitialStructure] = useState<TransactionStructure | undefined>();

  const [isAmortizationModalOpen, setIsAmortizationModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleOpenNewTx = (
    initialType: 'income' | 'expense' = 'expense',
    catOrSource?: string,
    structure?: TransactionStructure
  ) => {
    setNewTxInitialType(initialType);
    if (catOrSource === 'contrato' || catOrSource === 'recorrente' || catOrSource === 'avulso') {
      setNewTxInitialStructure(catOrSource as TransactionStructure);
      setNewTxInitialCategoryOrSource(undefined);
    } else {
      setNewTxInitialStructure(structure);
      setNewTxInitialCategoryOrSource(catOrSource);
    }
    setIsNewTxModalOpen(true);
  };

  const { user, profile } = useAuth();
  const isCollaborator = !!profile?.joinedOwnerUid;
  const collaboratorObj = isCollaborator
    ? profile?.collaborators?.find((c) => c.uid === user?.uid)
    : null;
  const permissions = collaboratorObj?.permissions;

  const isTabAllowed = (tab: string): boolean => {
    if (!isCollaborator || !permissions) return true;
    switch (tab) {
      case 'today': return permissions.today !== false;
      case 'actions': return permissions.actions !== false;
      case 'leads': return permissions.leads !== false;
      case 'home':
      case 'projects': return permissions.projects !== false;
      case 'suppliers': return permissions.suppliers !== false;
      case 'team': return permissions.team !== false;
      case 'portal_cliente':
      case 'freelance': return permissions.clients !== false;
      case 'deadlines': return permissions.deadlines !== false;
      case 'banks': return permissions.finance !== false;
      case 'dashboard': return permissions.health !== false && permissions.finance !== false;
      case 'goals': return permissions.goals !== false;
      case 'budget': return permissions.budget !== false;
      default: return true;
    }
  };

  const renderCurrentTab = () => {
    if (!isTabAllowed(activeTab)) {
      return (
        <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-8 text-center max-w-lg mx-auto my-12 space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-serif font-bold text-[#fcf8f5]">Acesso Restrito ao Módulo</h3>
          <p className="text-xs text-[#a89c93] leading-relaxed">
            Você não possui permissão concedida pelo administrador do escritório para acessar este módulo. Caso precise de acesso, solicite ao gestor para liberar a permissão no painel de equipe.
          </p>
          <button
            onClick={() => setActiveTab('today')}
            className="px-5 py-2.5 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-black font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
          >
            Ir para Meu Dia & Agenda
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'today': return <TodayTab />;
      case 'actions': return <ActionsTab />;
      case 'leads': return <LeadsTab />;
      case 'dashboard': return <BusinessDashboardTab />;
      case 'home': return <HomeProjectsTab onNavigateTab={setActiveTab} onOpenNewTxModal={handleOpenNewTx} />;
      case 'projects': return <ProjectsManagementTab onNavigateTab={setActiveTab} />;
      case 'suppliers': return <SuppliersTab />;
      case 'team': return <TeamTab />;
      case 'deadlines': return <DeadlinesAndInstallmentsTab />;
      case 'freelance': return <FreelanceClientsTab />;
      case 'portal_cliente': return <ClientPortalOfficeTab onNavigateTab={setActiveTab} />;
      case 'banks': return <BanksAndCashTab onOpenTransferModal={() => setIsTransferModalOpen(true)} onOpenCashModal={() => setIsCashModalOpen(true)} onOpenNewTxModal={handleOpenNewTx} />;
      case 'goals': return <SavingsGoalsTab />;
      case 'budget': return <BudgetAndReportsTab />;
      case 'settings': return <SettingsTab />;
      default: return <TodayTab />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-body)] text-[var(--text-main)] flex flex-col lg:flex-row selection:bg-[var(--theme-primary)]/30 selection:text-[#fcf8f5] font-sans antialiased">
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
          {renderCurrentTab()}
        </main>

        <FooterBar />
      </div>

      <NewTransactionModal
        isOpen={isNewTxModalOpen}
        onClose={() => setIsNewTxModalOpen(false)}
        initialType={newTxInitialType}
        initialCategoryOrSource={newTxInitialCategoryOrSource}
        initialStructure={newTxInitialStructure}
      />
      <AmortizationModal isOpen={isAmortizationModalOpen} onClose={() => setIsAmortizationModalOpen(false)} />
      <TransferModal isOpen={isTransferModalOpen} onClose={() => setIsTransferModalOpen(false)} />
      <CashActionModal isOpen={isCashModalOpen} onClose={() => setIsCashModalOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <SupportChatWidget />
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
              <div className="w-8 h-8 bg-[var(--theme-primary)] rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-black" />
              </div>
              <span className="font-serif font-bold text-lg text-[#fcf8f5] tracking-wide">
                Admin | <span className="text-[var(--theme-primary)]">Escritório Online</span>
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
      <div className="min-h-screen bg-[var(--bg-body)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[var(--theme-primary)] animate-spin" />
      </div>
    );
  }

  // If logged in, redirect straight to app
  if (user) {
    return <Navigate to="/app" replace />;
  }

  return <SalesLandingPage />;
};

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
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

            {/* Client Portal Routes (Dedicated Client Login & Real-time Isolated Dashboard) */}
            <Route path="/cliente/login" element={<ClientLogin />} />
            <Route path="/cliente/dashboard" element={<ClientPortalDashboard />} />
            <Route path="/cliente" element={<Navigate to="/cliente/login" replace />} />
            <Route path="/portal-cliente" element={<Navigate to="/cliente/login" replace />} />
            
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
                  <AppContent />
                </SubscriptionGuard>
              </AuthGuard>
            } />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </FinanceProvider>
    </AuthProvider>
  );
}
