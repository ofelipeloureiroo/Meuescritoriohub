import React, { useState } from 'react';
import {
  Banknote,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  CreditCard,
  Download,
  FolderOpen,
  Globe,
  Home,
  Instagram,
  MapPin,
  Package,
  PieChart,
  Plus,
  Settings,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatters';
import { NICHES } from '../utils/theme';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewTxModal: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewTxModal,
  onOpenSettings,
}) => {
  const {
    architectProfile,
    totalNetWorth,
    totalPhysicalCash,
    selectedMonth,
    setSelectedMonth,
    statesWithJobsCount,
    architectureProjects,
    ongoingArchitectureProjects,
    dueSoonInstallments,
    overdueInstallments,
    dueSoonMilestones,
    overdueMilestones,
  } = useFinance();

  const { user, profile } = useAuth();

  const handleMonthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(e.target.value);
  };

  const totalDeadlinesAlerts =
    dueSoonInstallments.length +
    overdueInstallments.length +
    dueSoonMilestones.length +
    overdueMilestones.length;

  const currentNiche =
    (architectProfile?.niche && NICHES[architectProfile.niche]) || NICHES.outro;
  const shouldShowPortfolio = architectProfile?.showPortfolio ?? currentNiche.hasPortfolio;

  // Dynamic counts for team and suppliers
  const teamMembersCount = (() => {
    try {
      const saved = localStorage.getItem('meu_escritorio_equipe_v1');
      if (saved) {
        const arr = JSON.parse(saved);
        return Array.isArray(arr) ? arr.length : 1;
      }
    } catch {}
    return 1;
  })();

  const suppliersCount = (() => {
    try {
      const saved = localStorage.getItem('meu_escritorio_fornecedores_v1');
      if (saved) {
        const arr = JSON.parse(saved);
        return Array.isArray(arr) ? arr.length : 0;
      }
    } catch {}
    return 0;
  })();



  // Tab definitions
  const allNavItems = [
    { id: 'today', label: 'Meu Dia & Agenda', icon: Calendar },
    { id: 'actions', label: 'Central de Ações', icon: Clock },
    { id: 'leads', label: 'Leads (Comercial)', icon: Users },
    {
      id: 'projects',
      label: 'Gestão de Projetos',
      icon: FolderOpen,
      badge: ongoingArchitectureProjects.length > 0 ? `${ongoingArchitectureProjects.length} Ativos` : undefined,
    },
    {
      id: 'suppliers',
      label: 'Fornecedores',
      icon: Package,
      badge: suppliersCount > 0 ? `${suppliersCount}` : undefined,
    },
    { id: 'team', label: 'Equipe', icon: Users, badge: `${teamMembersCount}` },
    { id: 'freelance', label: 'Clientes & Contratos', icon: Briefcase },
    {
      id: 'deadlines',
      label: 'Prazos & Cobranças',
      icon: Clock,
      badge: totalDeadlinesAlerts > 0 ? `${totalDeadlinesAlerts} Alertas` : undefined,
      alertBadge: overdueInstallments.length > 0 || dueSoonInstallments.length > 0,
    },
    { id: 'banks', label: 'Financeiro', icon: Wallet },
    { id: 'dashboard', label: 'Saúde do Negócio', icon: TrendingUp },
    { id: 'goals', label: 'Metas & Objetivos', icon: Target },
    { id: 'budget', label: 'Orçamento', icon: PieChart },
    ...(shouldShowPortfolio ? [{ id: 'home', label: 'Portfólio', icon: Home }] : []),
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  // Collaborator permission filter
  const isCollaborator = !!profile?.joinedOwnerUid;
  const collaboratorObj = isCollaborator 
    ? profile?.collaborators?.find(c => c.uid === user?.uid) 
    : null;
  const permissions = collaboratorObj?.permissions;

  const canViewFinance = !isCollaborator || (permissions ? permissions.finance === true : false);

  const navItems = allNavItems.filter((item) => {
    if (isCollaborator && permissions) {
      if (item.id === 'today') {
        return permissions.today !== false;
      }
      if (item.id === 'actions') {
        return permissions.actions !== undefined ? permissions.actions : permissions.projects !== false;
      }
      if (item.id === 'leads') {
        return permissions.leads !== undefined ? permissions.leads : permissions.clients !== false;
      }
      if (item.id === 'projects') {
        return permissions.projects !== false;
      }
      if (item.id === 'suppliers') {
        return permissions.suppliers !== undefined ? permissions.suppliers : permissions.clients !== false;
      }
      if (item.id === 'team') {
        return permissions.team !== undefined ? permissions.team : permissions.projects !== false;
      }
      if (item.id === 'freelance') {
        return permissions.clients !== false;
      }
      if (item.id === 'deadlines') {
        return permissions.deadlines !== false;
      }
      if (item.id === 'banks') {
        return permissions.finance !== false;
      }
      if (item.id === 'dashboard') {
        return permissions.health !== undefined ? permissions.health : permissions.finance !== false;
      }
      if (item.id === 'goals') {
        return permissions.goals !== false;
      }
      if (item.id === 'budget') {
        return permissions.budget !== false;
      }
      if (item.id === 'home') {
        return permissions.portfolio !== false;
      }
    }
    return true;
  });



  return (
    <header className="sticky top-0 z-40 bg-[#14110f]/95 backdrop-blur-md border-b border-[#3d342f]">
      {/* Top Banner & Balance Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-4 border-b border-[#3d342f]">
          {/* Logo do Meu Escritório Online & Identidade do Profissional */}
          <div className="flex items-center gap-4 w-full md:w-auto justify-between">
            <div className="flex items-center gap-3.5">
              {/* Brand Logo: Meu Escritório Online */}
              <button
                onClick={() => setActiveTab('projects')}
                className="flex items-center gap-3 text-left group cursor-pointer hover:opacity-95 transition-opacity"
                title="Meu Escritório Online - Início"
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md bg-[var(--theme-primary)] text-black group-hover:bg-[var(--theme-primary-hover)] transition-colors flex-shrink-0"
                >
                  <Building2 className="w-5 h-5 text-black" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <span className="font-serif font-bold text-base sm:text-lg tracking-wider text-[#fcf8f5] uppercase leading-none">
                      MEU ESCRITÓRIO
                    </span>
                    <span className="text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border border-[var(--theme-badge-border)]">
                      ONLINE
                    </span>
                  </div>
                  <span className="text-[10px] text-[#a89c93] tracking-wide mt-0.5">
                    {architectProfile?.name || profile?.companyName || 'Ateliê & Escritório Online'}
                  </span>
                </div>
              </button>

              {/* Subtle divider */}
              <div className="hidden lg:block h-6 w-px bg-[#3d342f]" />

              {/* User / Studio badge */}
              <div className="hidden sm:flex items-center gap-2.5 pl-1">
                <div
                  className="w-7 h-7 rounded-full p-0.5 flex items-center justify-center overflow-hidden border border-[#3d342f]"
                >
                  {architectProfile?.photoUrl ? (
                    <img
                      src={architectProfile.photoUrl}
                      alt={architectProfile.name || 'Perfil'}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#1c1815] rounded-full flex items-center justify-center font-serif font-bold text-[11px] text-[var(--theme-primary)]">
                      {((architectProfile?.name || profile?.companyName || user?.displayName || 'LF').slice(0, 2)).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-[#ded5cc]">
                    {architectProfile?.name || profile?.companyName || user?.displayName || 'LF Quadros & Decoração'}
                  </span>
                  <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border border-[var(--theme-badge-border)]">
                    Pro
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Controls: Month Selector, Settings, Admin */}
          <div className="flex items-center gap-2.5 sm:gap-3 w-full md:w-auto justify-end">
            {/* Month Picker */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1c1815] border border-[#3d342f] text-[#a89c93] text-xs">
              <Calendar className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} />
              <input
                type="month"
                value={selectedMonth}
                onChange={handleMonthChange}
                className="bg-transparent text-[#fcf8f5] text-xs font-medium focus:outline-none cursor-pointer"
              />
            </div>


            {/* Settings Button */}
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center justify-center w-8 h-8 rounded-full border transition-colors cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-[#241e1b] text-[var(--theme-primary)] border-[rgba(var(--theme-primary-rgb),0.55)]'
                  : 'bg-[#1c1815] hover:bg-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5] border-[#3d342f]'
              }`}
              title="Configurações & Backup"
            >
              <Settings className="w-4 h-4" />
            </button>

            {/* Admin Panel Link */}
            <a
              href="/admin"
              className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1c1815] hover:bg-[#3d342f] text-[#a89c93] hover:text-[var(--theme-primary)] border border-[#3d342f] transition-colors cursor-pointer"
              title="Painel Admin / Assinantes"
            >
              <ShieldCheck className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Navigation Tabs: Grade Unificada com Visibilidade Total de Todos os Botões */}
        <nav className="py-2.5">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1.5 sm:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center justify-between gap-1.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer w-full text-left border ${
                    isActive
                      ? "bg-[#241e1b] border-[rgba(var(--theme-primary-rgb),0.55)] shadow-xs font-semibold"
                      : "bg-[#181412] hover:bg-[#201a17] text-[#a89c93] hover:text-[#fcf8f5] border-[#302722]/80 hover:border-[#423630]"
                  }`}
                  style={
                    isActive
                      ? {
                          color: "var(--theme-primary)",
                        }
                      : undefined
                  }
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <Icon
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: isActive ? "var(--theme-primary)" : "#a89c93" }}
                    />
                    <span className="truncate text-[11px] sm:text-xs font-medium">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className="px-1.5 py-0.5 rounded-full text-[9px] font-bold border leading-none shrink-0"
                      style={
                        item.alertBadge
                          ? {
                              backgroundColor: "rgba(245, 158, 11, 0.2)",
                              color: "#fcd34d",
                              borderColor: "rgba(245, 158, 11, 0.4)",
                            }
                          : isActive
                          ? {
                              backgroundColor: "var(--theme-badge-bg)",
                              color: "var(--theme-badge-text)",
                              borderColor: "var(--theme-badge-border)",
                            }
                          : {
                              backgroundColor: "#14110f",
                              color: "#8c7e73",
                              borderColor: "#382f29",
                            }
                      }
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </header>
  );
};
