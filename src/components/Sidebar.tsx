import React, { useState, useEffect, useMemo } from 'react';
import {
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  Clock,
  ExternalLink,
  FolderOpen,
  Home,
  Instagram,
  KeyRound,
  MessageCircle,
  Package,
  PieChart,
  Plus,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  Users,
  Wallet,
  X,
  ChevronRight,
  Headphones,
  DollarSign,
  ListChecks,
  Image as ImageIcon,
  Sparkles,
  LayoutDashboard,
  Sun,
  Moon,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { BG_THEMES, NICHES } from '../utils/theme';
import { BgThemeId } from '../types';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  alertBadge?: boolean;
  visible: boolean;
  hasChevron?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenNewTxModal?: () => void;
  onOpenSettings?: () => void;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewTxModal,
  onOpenSettings,
  isMobileOpen = false,
  setIsMobileOpen,
}) => {
  const {
    architectProfile,
    selectedMonth,
    setSelectedMonth,
    ongoingArchitectureProjects,
    dueSoonInstallments,
    overdueInstallments,
    dueSoonMilestones,
    overdueMilestones,
    changeBgTheme,
  } = useFinance();

  const { user, profile } = useAuth();

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

  // Collaborator permission filter
  const isCollaborator = !!profile?.joinedOwnerUid;
  const collaboratorObj = isCollaborator
    ? profile?.collaborators?.find((c) => c.uid === user?.uid)
    : null;
  const permissions = collaboratorObj?.permissions;

  // Grouped Navigation Items
  const navGroups: NavGroup[] = [
    {
      title: 'Comercial & Produtividade',
      items: [
        {
          id: 'today',
          label: 'Meu Dia & Agenda',
          icon: Calendar,
          visible: !isCollaborator || !permissions || permissions.today !== false,
        },
        {
          id: 'actions',
          label: 'Central de Ações',
          icon: Clock,
          visible:
            !isCollaborator ||
            !permissions ||
            (permissions.actions !== undefined ? permissions.actions : permissions.projects !== false),
        },
        {
          id: 'leads',
          label: 'Leads (Comercial)',
          icon: Users,
          visible:
            !isCollaborator ||
            !permissions ||
            (permissions.leads !== undefined ? permissions.leads : permissions.clients !== false),
        },
        {
          id: 'whatsapp_center',
          label: 'Atendimento WhatsApp',
          icon: MessageCircle,
          badge: 'Novo',
          visible:
            !isCollaborator ||
            !permissions ||
            (permissions.clients !== undefined ? permissions.clients : permissions.projects !== false),
        },
      ],
    },
    {
      title: 'Operação & Projetos',
      items: [
        {
          id: 'projects',
          label: 'Gestão de Projetos',
          icon: FolderOpen,
          badge:
            ongoingArchitectureProjects.length > 0
              ? `${ongoingArchitectureProjects.length} Ativos`
              : undefined,
          visible: !isCollaborator || !permissions || permissions.projects !== false,
        },
        {
          id: 'time_tracker',
          label: 'Rastreador de Tempo',
          icon: Clock,
          badge: 'Novo',
          visible: !isCollaborator || !permissions || permissions.projects !== false,
        },
        {
          id: 'consultoria_expressa',
          label: 'Consultoria Expressa',
          icon: Sparkles,
          badge: 'Novo',
          visible: !isCollaborator || !permissions || permissions.projects !== false,
        },
        {
          id: 'freelance',
          label: 'Clientes & Contratos',
          icon: Briefcase,
          visible: !isCollaborator || !permissions || permissions.clients !== false,
        },
        {
          id: 'portal_cliente',
          label: 'Site do Cliente',
          icon: KeyRound,
          badge: 'Novo',
          visible: !isCollaborator || !permissions || permissions.clients !== false,
        },
        {
          id: 'suppliers',
          label: 'Fornecedores',
          icon: Package,
          badge: suppliersCount > 0 ? `${suppliersCount}` : undefined,
          visible:
            !isCollaborator ||
            !permissions ||
            (permissions.suppliers !== undefined ? permissions.suppliers : permissions.clients !== false),
        },
        {
          id: 'team',
          label: 'Equipe',
          icon: Users,
          badge: `${teamMembersCount}`,
          visible:
            !isCollaborator ||
            !permissions ||
            (permissions.team !== undefined ? permissions.team : permissions.projects !== false),
        },
      ],
    },
    {
      title: 'ADMINISTRATIVO',
      items: [
        {
          id: 'banks',
          label: 'Financeiro',
          icon: DollarSign,
          visible: !isCollaborator || !permissions || permissions.finance !== false,
        },
        {
          id: 'deadlines',
          label: 'Recebimentos',
          icon: DollarSign,
          badge: totalDeadlinesAlerts > 0 ? `${totalDeadlinesAlerts} Alertas` : undefined,
          alertBadge: overdueInstallments.length > 0 || dueSoonInstallments.length > 0,
          visible: !isCollaborator || !permissions || permissions.deadlines !== false,
        },
        {
          id: 'listas',
          label: 'Listas',
          icon: ListChecks,
          hasChevron: true,
          visible:
            !isCollaborator ||
            !permissions ||
            (permissions.actions !== undefined ? permissions.actions : permissions.projects !== false),
        },
        {
          id: 'goals',
          label: 'Metas & Objetivos',
          icon: Target,
          visible: !isCollaborator || !permissions || permissions.goals !== false,
        },
        {
          id: 'budget',
          label: 'Orçamento',
          icon: PieChart,
          visible: !isCollaborator || !permissions || permissions.budget !== false,
        },
      ],
    },
    {
      title: 'MARKETING',
      items: [
        {
          id: 'instagram',
          label: 'Instagram',
          icon: Instagram,
          visible: true,
        },
        {
          id: 'home',
          label: 'Portfólio',
          icon: ImageIcon,
          hasChevron: true,
          visible: true,
        },
      ],
    },
    {
      title: 'Sistema',
      items: [
        {
          id: 'settings',
          label: 'Configurações',
          icon: Settings,
          visible: true,
        },
      ],
    },
  ];

  // Dynamic tracking of most used tabs for the sidebar
  const [tabUsage, setTabUsage] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem('meu_escritorio_tab_usage_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      projects: 30,
      leads: 26,
      freelance: 22,
      banks: 18,
      today: 15,
      actions: 12,
      whatsapp_center: 10,
      consultoria_expressa: 8,
      deadlines: 6,
    };
  });

  // Track tab visits to update usage
  useEffect(() => {
    if (!activeTab || activeTab === 'dashboard' || activeTab === 'settings') return;
    setTabUsage((prev) => {
      const current = prev[activeTab] || 0;
      const updated = { ...prev, [activeTab]: current + 1 };
      try {
        localStorage.setItem('meu_escritorio_tab_usage_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, [activeTab]);

  // All candidate functional tabs for the "most used" ranking
  const ALL_APP_TABS = useMemo(() => [
    { id: 'projects', label: 'Gestão de Projetos', icon: FolderOpen },
    { id: 'leads', label: 'Leads & Comercial', icon: Users },
    { id: 'freelance', label: 'Clientes & Contratos', icon: Briefcase },
    { id: 'banks', label: 'Financeiro & Bancos', icon: DollarSign },
    { id: 'today', label: 'Meu Dia & Agenda', icon: Calendar },
    { id: 'actions', label: 'Central de Ações', icon: Clock },
    { id: 'whatsapp_center', label: 'Atendimento WhatsApp', icon: MessageCircle },
    { id: 'consultoria_expressa', label: 'Consultoria Expressa', icon: Sparkles },
    { id: 'portal_cliente', label: 'Site do Cliente', icon: KeyRound },
    { id: 'deadlines', label: 'Prazos & Cobranças', icon: Clock },
    { id: 'suppliers', label: 'Fornecedores', icon: Package },
    { id: 'team', label: 'Equipe & Membros', icon: Users },
    { id: 'instagram', label: 'Instagram', icon: Instagram },
    { id: 'home', label: 'Portfólio', icon: ImageIcon },
    { id: 'listas', label: 'Listas & Tarefas', icon: ListChecks },
    { id: 'goals', label: 'Metas & Objetivos', icon: Target },
    { id: 'budget', label: 'Orçamento', icon: PieChart },
  ], []);

  // Compute most used tabs excluding 'dashboard' and 'settings'
  const mostUsedTabs = useMemo(() => {
    const allowed = ALL_APP_TABS.filter((tab) => {
      if (isCollaborator && permissions) {
        if (tab.id === 'today' && permissions.today === false) return false;
        if (tab.id === 'actions' && permissions.actions === false) return false;
        if (tab.id === 'leads' && permissions.leads === false) return false;
        if (tab.id === 'projects' && permissions.projects === false) return false;
        if (tab.id === 'freelance' && permissions.clients === false) return false;
        if (tab.id === 'banks' && permissions.finance === false) return false;
        if (tab.id === 'deadlines' && permissions.deadlines === false) return false;
        if (tab.id === 'team' && permissions.team === false) return false;
        if (tab.id === 'suppliers' && permissions.suppliers === false) return false;
      }
      return true;
    });

    const sorted = [...allowed].sort((a, b) => {
      const countA = tabUsage[a.id] || 0;
      const countB = tabUsage[b.id] || 0;
      return countB - countA;
    });

    // Top 8 most used tabs
    const topItems = sorted.slice(0, 8);

    // If current active tab is not in top 8 (and not dashboard or settings), show it as active item
    if (
      activeTab &&
      activeTab !== 'dashboard' &&
      activeTab !== 'settings' &&
      !topItems.some((t) => t.id === activeTab || (t.id === 'banks' && ['financeiro', 'recebimentos', 'listas'].includes(activeTab)))
    ) {
      const currentTabDef = allowed.find((t) => t.id === activeTab);
      if (currentTabDef) {
        topItems.push(currentTabDef);
      }
    }

    return topItems;
  }, [ALL_APP_TABS, tabUsage, isCollaborator, permissions, activeTab]);

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const instagramUrl = 'https://www.instagram.com/meuescritorio.online';

  const currentBgKey = (architectProfile?.bgTheme || (localStorage.getItem('app_bg_theme') as BgThemeId) || 'light_cream');
  const isLight = !BG_THEMES[currentBgKey]?.isDark;

  const desktopSidebarContent = (
    <div className="flex flex-col h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] text-[var(--text-main)] select-none transition-all duration-300 items-center py-6 justify-between">
      {/* Top Brand / Photo + Início Fixo + Mais Usados */}
      <div className="flex flex-col items-center gap-5 w-full px-2">
        <button
          onClick={() => handleNavClick('dashboard')}
          className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center shadow-md bg-[var(--theme-primary)] text-black shrink-0 hover:opacity-90 transition-all border border-[var(--theme-primary)]/40 relative group cursor-pointer"
          title="Ir para Painel do Escritório"
        >
          {architectProfile?.photoUrl || profile?.photoUrl || user?.photoURL ? (
            <img
              src={architectProfile?.photoUrl || profile?.photoUrl || user?.photoURL}
              alt="Logo"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <Building2 className="w-5 h-5 text-black" />
          )}
          {/* Online Dot */}
          <span className="absolute bottom-[-1px] right-[-1px] w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[var(--bg-sidebar)]" />
        </button>

        {/* Divider */}
        <div className="w-8 h-px bg-[var(--border-color)]" />

        {/* Navigation Stack: Início (Fixo) + Mais Usados */}
        <div className="flex flex-col gap-1.5 w-full items-center overflow-y-auto overflow-x-hidden max-h-[calc(100vh-230px)] py-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {/* 1. Início (Fixo no topo) */}
          <button
            onClick={() => handleNavClick('dashboard')}
            className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer relative group border shrink-0 ${
              activeTab === 'dashboard'
                ? 'bg-[rgba(var(--theme-primary-rgb),0.12)] border-[rgba(var(--theme-primary-rgb),0.45)] text-[var(--theme-primary)] shadow-xs'
                : 'bg-transparent border-transparent hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
            title="Início"
          >
            <Home
              className="w-5 h-5 shrink-0 transition-colors"
              style={{
                color: activeTab === 'dashboard' ? 'var(--theme-primary)' : 'var(--text-muted)',
              }}
            />
            
            {/* Tooltip on hover */}
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-950 text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap shadow-md z-50 pointer-events-none">
              Início
            </div>
          </button>

          {/* Divider separating Início from Most Used */}
          <div className="w-6 h-px bg-[var(--border-color)]/70 my-0.5 shrink-0" />

          {/* 2. O restante dos ícones: Mais Usados */}
          {mostUsedTabs.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'banks' && ['financeiro', 'recebimentos', 'listas'].includes(activeTab)) ||
              (item.id === 'projects' && ['projects', 'consultoria_expressa'].includes(activeTab));

            let hasAlert = false;
            if (item.id === 'banks' && totalDeadlinesAlerts > 0) hasAlert = true;
            if (item.id === 'deadlines' && totalDeadlinesAlerts > 0) hasAlert = true;
            if (item.id === 'projects' && ongoingArchitectureProjects.length > 0) hasAlert = true;
            if (item.id === 'actions' && (dueSoonMilestones.length > 0 || overdueMilestones.length > 0)) hasAlert = true;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 cursor-pointer relative group border shrink-0 ${
                  isActive
                    ? 'bg-[rgba(var(--theme-primary-rgb),0.12)] border-[rgba(var(--theme-primary-rgb),0.45)] text-[var(--theme-primary)] shadow-xs'
                    : 'bg-transparent border-transparent hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
                title={item.label}
              >
                <Icon
                  className="w-5 h-5 shrink-0 transition-colors"
                  style={{
                    color: isActive ? 'var(--theme-primary)' : 'var(--text-muted)',
                  }}
                />
                
                {/* Red dot badge for alerts */}
                {hasAlert && (
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-[var(--bg-sidebar)]" />
                )}

                {/* Tooltip on hover */}
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-950 text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap shadow-md z-50 pointer-events-none">
                  {item.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Profile / Theme */}
      <div className="flex flex-col items-center gap-4 w-full px-2">
        {/* Simple Theme Toggle Icon */}
        <button
          onClick={() => changeBgTheme(isLight ? 'dark_warm' : 'light_cream')}
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-[var(--bg-input)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer group relative"
        >
          {isLight ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
          
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-950 text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap shadow-md z-50 pointer-events-none">
            {isLight ? 'Modo Escuro' : 'Modo Claro'}
          </div>
        </button>

        {/* Settings Shortcut */}
        <button
          onClick={() => handleNavClick('settings')}
          className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all cursor-pointer group relative border ${
            activeTab === 'settings'
              ? 'bg-[rgba(var(--theme-primary-rgb),0.12)] border-[rgba(var(--theme-primary-rgb),0.45)] text-[var(--theme-primary)]'
              : 'bg-transparent border-transparent hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
          }`}
        >
          <Settings className="w-4.5 h-4.5" />
          
          <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-zinc-950 text-white text-[11px] font-bold rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 whitespace-nowrap shadow-md z-50 pointer-events-none">
            Configurações
          </div>
        </button>
      </div>
    </div>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] text-[var(--text-main)] select-none transition-all duration-300">
      {/* Brand Header */}
      <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
        <button
          onClick={() => handleNavClick('today')}
          className="flex items-center gap-3 text-left group cursor-pointer hover:opacity-95 transition-opacity"
          title="Ir para Meu Dia & Agenda"
        >
          <div className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-md bg-[var(--theme-primary)] text-black shrink-0 group-hover:opacity-90 transition-all border border-[var(--theme-primary)]/40">
            {architectProfile?.photoUrl || profile?.photoUrl || user?.photoURL ? (
              <img
                src={architectProfile?.photoUrl || profile?.photoUrl || user?.photoURL}
                alt="Logo / Foto"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Building2 className="w-5 h-5 text-black" />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="font-serif font-bold text-sm tracking-wider text-[var(--text-main)] uppercase leading-none truncate max-w-[150px]"
                title={architectProfile?.name || profile?.companyName || 'Meu Negócio'}
              >
                {architectProfile?.name || profile?.companyName || 'MEU ESCRITÓRIO'}
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.2 rounded-md bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border border-[var(--theme-badge-border)] shrink-0">
                ONLINE
              </span>
            </div>
            <span 
              className="text-[10px] text-[var(--text-muted)] tracking-wide mt-0.5 truncate max-w-[160px]"
              title={architectProfile?.ownerName ? `${architectProfile.ownerName}${architectProfile.title ? ` • ${architectProfile.title}` : ''}` : (architectProfile?.title || 'Gestão & Negócios')}
            >
              {architectProfile?.ownerName ? `${architectProfile.ownerName}${architectProfile.title ? ` • ${architectProfile.title}` : ''}` : (architectProfile?.title || 'Gestão & Negócios')}
            </span>
          </div>
        </button>

        {setIsMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links Scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin scrollbar-thumb-[var(--border-color)] scrollbar-track-transparent">
        {/* Standalone Dashboard Item (Above Comercial & Produtividade, without group header) */}
        {(!isCollaborator || !permissions || permissions.health !== false) && (
          <div className="space-y-0.5">
            <button
              onClick={() => handleNavClick('dashboard')}
              className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer text-left border ${
                activeTab === 'dashboard'
                  ? 'bg-[rgba(var(--theme-primary-rgb),0.12)] border-[rgba(var(--theme-primary-rgb),0.45)] text-[var(--theme-primary)] font-bold shadow-xs'
                  : 'bg-transparent border-transparent hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                <LayoutDashboard
                  className="w-4 h-4 shrink-0 transition-colors"
                  style={{
                    color: activeTab === 'dashboard' ? 'var(--theme-primary)' : 'var(--text-muted)',
                  }}
                />
                <span className="truncate text-xs">Painel do Escritório</span>
              </div>
            </button>
          </div>
        )}

        {navGroups.map((group, groupIdx) => {
          const visibleItems = group.items.filter((item) => item.visible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={groupIdx} className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] opacity-80">
                {group.title}
              </h4>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    activeTab === item.id ||
                    (item.id === 'banks' && activeTab === 'financeiro') ||
                    (item.id === 'deadlines' && activeTab === 'recebimentos') ||
                    (item.id === 'actions' && activeTab === 'listas');

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer text-left border ${
                        isActive
                          ? 'bg-[rgba(var(--theme-primary-rgb),0.12)] border-[rgba(var(--theme-primary-rgb),0.45)] text-[var(--theme-primary)] font-semibold shadow-xs'
                          : 'bg-transparent border-transparent hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Icon
                          className="w-4 h-4 shrink-0 transition-colors"
                          style={{
                            color: isActive ? 'var(--theme-primary)' : 'var(--text-muted)',
                          }}
                        />
                        <span className="truncate text-xs">{item.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.badge && (
                          <span
                            className="px-1.5 py-0.5 rounded-full text-[9px] font-bold border leading-none shrink-0"
                            style={
                              item.alertBadge
                                ? {
                                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                                    color: '#fcd34d',
                                    borderColor: 'rgba(245, 158, 11, 0.4)',
                                  }
                                : isActive
                                ? {
                                    backgroundColor: 'var(--theme-badge-bg)',
                                    color: 'var(--theme-badge-text)',
                                    borderColor: 'var(--theme-badge-border)',
                                  }
                                : {
                                    backgroundColor: 'var(--bg-input)',
                                    color: 'var(--text-muted)',
                                    borderColor: 'var(--border-subtle)',
                                  }
                            }
                          >
                            {item.badge}
                          </span>
                        )}

                        {item.hasChevron && (
                          <ChevronRight
                            className={`w-3.5 h-3.5 shrink-0 transition-transform ${
                              isActive ? 'text-[var(--theme-primary)]' : 'text-[var(--text-muted)]'
                            }`}
                          />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Segmented Theme Toggle Footer */}
      <div className="p-3.5 border-t border-[var(--border-color)] bg-[var(--bg-card-secondary)]/30 flex flex-col gap-2 shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Aparência</span>
        </div>
        <div className="grid grid-cols-2 p-1 bg-[var(--bg-input)] rounded-xl border border-[var(--border-color)]">
          <button
            onClick={() => changeBgTheme('dark_warm')}
            className={`flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-lg transition-all duration-150 cursor-pointer ${
              !isLight
                ? 'bg-[var(--bg-card-hover)] text-[var(--theme-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Escuro</span>
          </button>
          <button
            onClick={() => changeBgTheme('light_cream')}
            className={`flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold rounded-lg transition-all duration-150 cursor-pointer ${
              isLight
                ? 'bg-[var(--bg-card-hover)] text-[var(--theme-primary)] shadow-xs'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Claro</span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-20 shrink-0 h-screen sticky top-0 z-30 shadow-xl">
        {desktopSidebarContent}
      </aside>

      {/* Mobile Drawer Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex animate-in fade-in duration-150">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-xs"
            onClick={() => setIsMobileOpen?.(false)}
          />
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
