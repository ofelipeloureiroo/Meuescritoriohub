import React from 'react';
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
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { NICHES } from '../utils/theme';

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  alertBadge?: boolean;
  visible: boolean;
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
        {
          id: 'freelance',
          label: 'Clientes & Contratos',
          icon: Briefcase,
          visible: !isCollaborator || !permissions || permissions.clients !== false,
        },
        {
          id: 'deadlines',
          label: 'Prazos & Cobranças',
          icon: Clock,
          badge: totalDeadlinesAlerts > 0 ? `${totalDeadlinesAlerts} Alertas` : undefined,
          alertBadge: overdueInstallments.length > 0 || dueSoonInstallments.length > 0,
          visible: !isCollaborator || !permissions || permissions.deadlines !== false,
        },
        {
          id: 'portal_cliente',
          label: 'Radar do Cliente',
          icon: KeyRound,
          badge: 'Novo',
          visible: !isCollaborator || !permissions || permissions.clients !== false,
        },
      ],
    },
    {
      title: 'Financeiro & Estratégico',
      items: [
        {
          id: 'banks',
          label: 'Financeiro (Bancos)',
          icon: Wallet,
          visible: !isCollaborator || !permissions || permissions.finance !== false,
        },
        {
          id: 'dashboard',
          label: 'Saúde do Negócio',
          icon: TrendingUp,
          visible:
            !isCollaborator ||
            !permissions ||
            (permissions.health !== undefined ? permissions.health : permissions.finance !== false),
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
        ...(shouldShowPortfolio
          ? [
              {
                id: 'home',
                label: 'Portfólio',
                icon: Home,
                visible: true,
              },
            ]
          : []),
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

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (setIsMobileOpen) {
      setIsMobileOpen(false);
    }
  };

  const whatsappUrl = `https://wa.me/5521998213069?text=${encodeURIComponent(
    'Olá! Preciso de suporte no Meu Escritório Online.'
  )}`;
  const instagramUrl = 'https://www.instagram.com/meuescritorio.online';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#161311] border-r border-[#2d2520] text-[#ded5cc] select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#2d2520] flex items-center justify-between">
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
                className="font-serif font-bold text-sm tracking-wider text-[#fcf8f5] uppercase leading-none truncate max-w-[150px]"
                title={architectProfile?.name || profile?.companyName || 'Meu Negócio'}
              >
                {architectProfile?.name || profile?.companyName || 'MEU ESCRITÓRIO'}
              </span>
              <span className="text-[9px] font-extrabold uppercase tracking-widest px-1.5 py-0.2 rounded-md bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border border-[var(--theme-badge-border)] shrink-0">
                ONLINE
              </span>
            </div>
            <span className="text-[10px] text-[#a89c93] tracking-wide mt-0.5 truncate max-w-[160px]">
              {architectProfile?.title || 'Gestão & Negócios'}
            </span>
          </div>
        </button>

        {setIsMobileOpen && (
          <button
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#221c18] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Links Scrollable */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-thin scrollbar-thumb-[#2d2520] scrollbar-track-transparent">
        {navGroups.map((group, groupIdx) => {
          const visibleItems = group.items.filter((item) => item.visible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={groupIdx} className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#73655c]">
                {group.title}
              </h4>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer text-left border ${
                        isActive
                          ? 'bg-[#241e1b] border-[rgba(var(--theme-primary-rgb),0.55)] text-[var(--theme-primary)] font-semibold shadow-xs'
                          : 'bg-transparent border-transparent hover:bg-[#201a17] text-[#a89c93] hover:text-[#fcf8f5]'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Icon
                          className="w-4 h-4 shrink-0 transition-colors"
                          style={{
                            color: isActive ? 'var(--theme-primary)' : '#8c7e73',
                          }}
                        />
                        <span className="truncate text-xs">{item.label}</span>
                      </div>

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
                                  backgroundColor: '#14110f',
                                  color: '#8c7e73',
                                  borderColor: '#382f29',
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
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sticky Sidebar */}
      <aside className="hidden lg:block w-64 xl:w-72 shrink-0 h-screen sticky top-0 z-30 shadow-xl">
        {sidebarContent}
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
