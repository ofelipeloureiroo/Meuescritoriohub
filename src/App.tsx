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
import { OAuthProxy } from './components/auth/OAuthProxy';

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
import { ListsTab } from './components/actions/ListsTab';
import { InstagramTab } from './components/marketing/InstagramTab';
import { LeadsTab } from './components/leads/LeadsTab';
import { TodayTab } from './components/today/TodayTab';
import { TeamTab } from './components/team/TeamTab';
import { SuppliersTab } from './components/suppliers/SuppliersTab';
import { SettingsTab } from './components/settings/SettingsTab';
import { ClientPortalOfficeTab } from './components/portal/ClientPortalOfficeTab';
import { ExpressConsultingTab } from './components/projects/ExpressConsultingTab';
import { TimeTrackerTab } from './components/projects/TimeTrackerTab';
import { WhatsAppCenterTab } from './components/whatsapp/WhatsAppCenterTab';
import { PublicConsultoriaPage } from './components/projects/PublicConsultoriaPage';
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
  // Default to 'Painel do Escritório'
  const [activeTab, setActiveTab] = useState<string>(() => {
    const tab = localStorage.getItem('office_active_tab') || 'dashboard';
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

  const { user, profile, logout } = useAuth();
  const isCollaborator = !!profile?.joinedOwnerUid;
  const collaboratorObj = isCollaborator
    ? profile?.collaborators?.find((c) => c.uid === user?.uid)
    : null;
  const permissions = collaboratorObj?.permissions;

  const isTabAllowed = (tab: string): boolean => {
    if (!isCollaborator || !permissions) return true;
    switch (tab) {
      case 'today': return permissions.today !== false;
      case 'listas':
      case 'actions': return permissions.actions !== false;
      case 'leads': return permissions.leads !== false;
      case 'home':
      case 'projects': return permissions.projects !== false;
      case 'suppliers': return permissions.suppliers !== false;
      case 'team': return permissions.team !== false;
      case 'portal_cliente':
      case 'freelance': return permissions.clients !== false;
      case 'recebimentos':
      case 'deadlines': return permissions.deadlines !== false;
      case 'financeiro':
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
      case 'instagram': return <InstagramTab />;
      case 'actions': return <ActionsTab />;
      case 'listas': return <ListsTab />;
      case 'leads': return <LeadsTab />;
      case 'whatsapp_center': return <WhatsAppCenterTab onNavigateTab={setActiveTab} />;
      case 'dashboard': return <BusinessDashboardTab onNavigateTab={setActiveTab} />;
      case 'home': return <HomeProjectsTab onNavigateTab={setActiveTab} onOpenNewTxModal={handleOpenNewTx} />;
      case 'projects': return <ProjectsManagementTab onNavigateTab={setActiveTab} />;
      case 'time_tracker': return <TimeTrackerTab />;
      case 'consultoria_expressa': return <ExpressConsultingTab onExit={() => setActiveTab('projects')} />;
      case 'suppliers': return <SuppliersTab />;
      case 'team': return <TeamTab />;
      case 'recebimentos':
      case 'deadlines': return <DeadlinesAndInstallmentsTab />;
      case 'freelance': return <FreelanceClientsTab />;
      case 'portal_cliente': return <ClientPortalOfficeTab onNavigateTab={setActiveTab} />;
      case 'financeiro':
      case 'banks': return <BanksAndCashTab onOpenTransferModal={() => setIsTransferModalOpen(true)} onOpenCashModal={() => setIsCashModalOpen(true)} onOpenNewTxModal={handleOpenNewTx} />;
      case 'goals': return <SavingsGoalsTab />;
      case 'budget': return <BudgetAndReportsTab />;
      case 'settings': return <SettingsTab />;
      default: return <TodayTab />;
    }
  };

  if (activeTab === 'consultoria_expressa') {
    return (
      <div className="fixed inset-0 z-50 bg-[#12100e] text-[#fcf8f5] overflow-y-auto w-full h-full font-sans antialiased selection:bg-[#c58a4b]/30">
        <ExpressConsultingTab onExit={() => setActiveTab('projects')} />
        <SupportChatWidget />
      </div>
    );
  }

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
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#faf7f2] text-zinc-900 flex flex-col font-sans antialiased">
      <header className="bg-white border-b border-zinc-200/90 sticky top-0 z-40 shadow-2xs">
        <div className="w-full max-w-full px-4 sm:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#b5986e] rounded-xl flex items-center justify-center text-white shadow-xs">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <span className="font-serif font-extrabold text-xl text-zinc-900 tracking-tight">
                Admin <span className="text-zinc-400 font-sans text-sm font-normal">|</span> <span className="text-[#b5986e]">Escritório Online</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/app" className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs sm:text-sm transition-all shadow-2xs">
                Voltar ao App
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold transition-all text-xs sm:text-sm cursor-pointer shadow-2xs"
              >
                <LogOut className="w-4 h-4" /> Sair
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-full px-4 sm:px-8 py-6 sm:py-8">
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
            <Route path="/oauth-proxy" element={<OAuthProxy />} />

            {/* Public Presentation Link for Express Consulting */}
            <Route path="/consultoria/:consultationId" element={<PublicConsultoriaPage />} />
            <Route path="/consultoria" element={<PublicConsultoriaPage />} />

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
