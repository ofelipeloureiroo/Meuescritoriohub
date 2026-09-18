import React, { useRef, useState } from 'react';
import {
  Menu,
  Settings,
  Calendar,
  Building2,
  FolderOpen,
  Briefcase,
  KeyRound,
  Users,
  Clock,
  TrendingUp,
  Target,
  PieChart,
  Home,
  Package,
  ChevronDown,
  LogOut,
  DollarSign,
  ListChecks,
  Instagram,
  Sparkles,
  LayoutDashboard,
  MessageSquare,
  LayoutGrid,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';

interface TopBarProps {
  activeTab: string;
  setActiveTab?: (tab: string) => void;
  onOpenMobileSidebar: () => void;
  onOpenNewTxModal?: () => void;
  onOpenSettings: () => void;
}

function WalletIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}

const TAB_TITLES: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  dashboard: { label: 'Painel do Escritório', icon: LayoutDashboard, description: 'O que precisa da sua atenção hoje • Administração' },
  today: { label: 'Meu Dia & Agenda', icon: Calendar, description: 'Compromissos, prazos do dia e ações prioritárias' },
  actions: { label: 'Central de Ações', icon: Clock, description: 'Fluxo de tarefas e pendências de projetos' },
  leads: { label: 'Leads & Comercial', icon: Users, description: 'Pipeline de vendas, propostas e captação' },
  whatsapp_center: { label: 'Central de Atendimento WhatsApp', icon: MessageSquare, description: 'Comunicação integrada em tempo real entre clientes e membros da equipe' },
  projects: { label: 'Gestão de Projetos', icon: FolderOpen, description: 'Acompanhamento de etapas, cronogramas e entregas' },
  consultoria_expressa: { label: 'Consultoria Expressa', icon: Sparkles, description: 'Propostas ágeis de redesign de ambientes com Inteligência Artificial' },
  suppliers: { label: 'Fornecedores', icon: Package, description: 'Catálogo de parceiros, lojas e contatos técnicos' },
  team: { label: 'Equipe & Colaboradores', icon: Users, description: 'Membros, funções, permissões e convites' },
  freelance: { label: 'Clientes & Contratos', icon: Briefcase, description: 'Cadastro de clientes, contratos e propostas' },
  portal_cliente: { label: 'Site do Cliente', icon: KeyRound, description: 'Acessos exclusivos, acompanhamento de etapas e transparência' },
  deadlines: { label: 'Prazos & Cobranças', icon: Clock, description: 'Controle de parcelas a vencer e etapas críticas' },
  recebimentos: { label: 'Recebimentos', icon: DollarSign, description: 'Controle de parcelas a receber, cobranças e entregas' },
  banks: { label: 'Financeiro & Bancos', icon: WalletIcon, description: 'Contas, extrato, conciliação e fluxo de caixa' },
  financeiro: { label: 'Financeiro', icon: DollarSign, description: 'Gestão financeira, caixas e extrato bancário' },
  listas: { label: 'Listas & Tarefas', icon: ListChecks, description: 'Listas operacionais e pendências do escritório' },
  instagram: { label: 'Instagram', icon: Instagram, description: 'Planejamento de conteúdo e calendário editorial' },
  goals: { label: 'Metas & Objetivos', icon: Target, description: 'Planejamento financeiro e reservas estratégicas' },
  budget: { label: 'Orçamento Anual', icon: PieChart, description: 'Teto de gastos e planejamento orçamentário' },
  home: { label: 'Portfólio & Mostra', icon: Home, description: 'Galeria visual de projetos finalizados' },
  settings: { label: 'Configurações do Escritório', icon: Settings, description: 'Preferências, nicho, dados cadastrais e backup' },
};

const CATEGORIES = [
  {
    id: 'home',
    label: 'Início',
    tabs: [
      { id: 'dashboard', label: 'Painel' },
      { id: 'today', label: 'Meu Dia & Agenda' },
      { id: 'actions', label: 'Central de Ações' },
    ],
  },
  {
    id: 'projects',
    label: 'Operação',
    tabs: [
      { id: 'projects', label: 'Gestão de Projetos' },
      { id: 'consultoria_expressa', label: 'Consultoria Expressa' },
      { id: 'suppliers', label: 'Fornecedores' },
      { id: 'team', label: 'Equipe' },
    ],
  },
  {
    id: 'comercial',
    label: 'Comercial',
    tabs: [
      { id: 'leads', label: 'Leads (Comercial)' },
      { id: 'whatsapp_center', label: 'Atendimento WhatsApp' },
      { id: 'freelance', label: 'Clientes & Contratos' },
      { id: 'portal_cliente', label: 'Site do Cliente' },
    ],
  },
  {
    id: 'financial',
    label: 'Financeiro',
    tabs: [
      { id: 'banks', label: 'Financeiro & Bancos' },
      { id: 'deadlines', label: 'Recebimentos & Prazos' },
      { id: 'listas', label: 'Listas & Tarefas' },
      { id: 'goals', label: 'Metas & Objetivos' },
      { id: 'budget', label: 'Orçamento' },
    ],
  },
  {
    id: 'marketing',
    label: 'Marketing',
    tabs: [
      { id: 'instagram', label: 'Instagram' },
      { id: 'home', label: 'Portfólio' },
    ],
  },
  {
    id: 'settings',
    label: 'Configurações',
    tabs: [
      { id: 'settings', label: 'Configurações' },
    ],
  },
];

const ALL_QUICK_ACTIONS = Array.from(
  new Map(
    CATEGORIES.flatMap(cat => cat.tabs)
      .filter(tab => tab.id !== 'settings')
      .map(tab => {
        const info = TAB_TITLES[tab.id] || { label: tab.label, icon: Building2 };
        const shortLabel = tab.id === 'leads' ? 'Leads' :
                           tab.id === 'whatsapp_center' ? 'WhatsApp' :
                           tab.id === 'consultoria_expressa' ? 'Consultoria' :
                           tab.label;
        return [
          tab.id,
          {
            id: tab.id,
            label: info.label,
            shortLabel,
            icon: info.icon,
          }
        ];
      })
  ).values()
);

const DESKTOP_QUICK_ACTIONS = [
  { id: 'dashboard', label: 'Painel do Escritório', icon: LayoutDashboard },
  { id: 'today', label: 'Meu Dia & Agenda', icon: Calendar },
  { id: 'actions', label: 'Central de Ações', icon: Clock },
  { id: 'projects', label: 'Gestão de Projetos', icon: FolderOpen },
];

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

export const TopBar: React.FC<TopBarProps> = ({
  activeTab,
  setActiveTab,
  onOpenMobileSidebar,
  onOpenSettings,
}) => {
  const { architectProfile, selectedMonth, setSelectedMonth } = useFinance();
  const { user, profile, logout } = useAuth();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const [showAllFunctions, setShowAllFunctions] = useState(false);

  const currentTabInfo = TAB_TITLES[activeTab] || {
    label: 'Meu Escritório Online',
    icon: Building2,
    description: 'Gestão integrada de arquitetura e design',
  };

  const Icon = currentTabInfo.icon;

  // Format month for display (e.g. "Setembro de 2026")
  const formatMonthDisplay = (monthStr: string) => {
    if (!monthStr || !monthStr.includes('-')) return monthStr;
    const [year, month] = monthStr.split('-');
    const monthIndex = parseInt(month, 10) - 1;
    const monthName = MONTH_NAMES[monthIndex] || month;
    return `${monthName} de ${year}`;
  };

  // Short format for mobile (e.g. "Set/26")
  const formatMonthDisplayShort = (monthStr: string) => {
    if (!monthStr || !monthStr.includes('-')) return monthStr;
    const [year, month] = monthStr.split('-');
    const monthIndex = parseInt(month, 10) - 1;
    const shortNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const shortName = shortNames[monthIndex] || month;
    const shortYear = year.slice(-2);
    return `${shortName}/${shortYear}`;
  };

  const isOwner = !user?.email || 
    user.email.toLowerCase() === 'lfquadrosdecorativos@gmail.com' || 
    user.email.toLowerCase().includes('master_escritorio');

  const userName =
    architectProfile?.ownerName?.trim() ||
    architectProfile?.name?.trim() ||
    profile?.companyName?.trim() ||
    profile?.name?.trim() ||
    user?.displayName?.trim() ||
    (isOwner ? 'Carlos Felipe' : 'Meu Escritório');

  const userPhoto = architectProfile?.photoUrl || profile?.photoUrl || user?.photoURL || '';

  const userInitials = (userName.slice(0, 2) || 'LF').toUpperCase();

  const isCollaborator = !!profile?.joinedOwnerUid;
  const collaboratorObj = isCollaborator
    ? profile?.collaborators?.find((c) => c.uid === user?.uid)
    : null;
  const permissions = collaboratorObj?.permissions;

  const isTabAllowed = (tabId: string): boolean => {
    if (!isCollaborator || !permissions) return true;
    switch (tabId) {
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

  const allowedActions = ALL_QUICK_ACTIONS.filter((item) => isTabAllowed(item.id));
  const midIndex = Math.ceil(allowedActions.length / 2);
  const firstRowActions = allowedActions.slice(0, midIndex);
  const secondRowActions = allowedActions.slice(midIndex);

  const activeCategory = CATEGORIES.find(c =>
    c.tabs.some(t => t.id === activeTab) ||
    (activeTab === 'financeiro' && c.id === 'financial') ||
    (activeTab === 'recebimentos' && c.id === 'financial') ||
    (activeTab === 'listas' && c.id === 'financial')
  ) || CATEGORIES[0];

  return (
    <header className="w-full bg-[var(--bg-header)]/95 backdrop-blur-md border-b border-[var(--border-color)] sticky top-0 z-20 px-3 sm:px-6 lg:px-8 pt-3 pb-0">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3 pb-3">
        {/* Left: Mobile Menu Button & Context Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--theme-primary)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
            title="Abrir Menu Completo"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
            <span className="hidden xs:inline text-[11px] font-bold text-[var(--text-muted)]">Menu</span>
          </button>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-center text-[var(--theme-primary)] shrink-0 shadow-xs">
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h1 className="font-serif font-bold text-xs sm:text-sm md:text-base text-[var(--text-main)] whitespace-nowrap leading-tight">
                  {architectProfile?.name || profile?.companyName || 'Meu Escritório'}
                </h1>
                <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded-full bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border border-[var(--theme-badge-border)]">
                  {activeCategory.label}
                </span>
              </div>
              <span className="hidden sm:inline text-[11px] text-[var(--text-muted)] mt-0.5">
                {currentTabInfo.description}
              </span>
            </div>
          </div>
        </div>

        {/* Right Corner: User Profile & Date Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* User Profile Info */}
          <button
            onClick={() => setActiveTab?.('settings')}
            className={`flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl transition-all border cursor-pointer text-left shrink-0 ${
              activeTab === 'settings'
                ? 'bg-[var(--bg-card)] border-[var(--theme-primary)] text-[var(--theme-primary)] shadow-xs'
                : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] border-[var(--border-color)] hover:border-[var(--theme-primary)]/40'
            }`}
            title="Abrir Configurações do Perfil"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full p-0.5 flex items-center justify-center overflow-hidden border border-[var(--theme-primary)]/40 shadow-xs shrink-0 bg-[var(--bg-card-secondary)]">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName}
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-[var(--bg-card-hover)] rounded-full flex items-center justify-center font-serif font-bold text-xs text-[var(--theme-primary)]">
                  {userInitials}
                </div>
              )}
            </div>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="text-xs font-semibold text-[var(--text-main)] truncate max-w-[120px] lg:max-w-[140px] leading-tight">
                {userName}
              </span>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1 leading-none mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Plano Pro
              </span>
            </div>
          </button>

          {/* Styled Date / Month Picker */}
          <div
            onClick={() => dateInputRef.current?.showPicker?.() || dateInputRef.current?.focus()}
            className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border border-[var(--border-color)] hover:border-[var(--theme-primary)]/50 text-[var(--text-main)] text-xs font-medium transition-all shadow-xs cursor-pointer group shrink-0"
            title="Alterar Mês de Competência"
          >
            <Calendar className="w-3.5 h-3.5 text-[var(--theme-primary)] group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-xs text-[var(--text-main)] font-semibold whitespace-nowrap hidden sm:inline">
              {formatMonthDisplay(selectedMonth)}
            </span>
            <span className="text-[11px] text-[var(--text-main)] font-semibold whitespace-nowrap sm:hidden">
              {formatMonthDisplayShort(selectedMonth)}
            </span>
            <ChevronDown className="w-3 h-3 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors shrink-0" />

            {/* Invisible native month picker overlay */}
            <input
              ref={dateInputRef}
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>

          {/* Settings Shortcut Button */}
          <button
            onClick={() => setActiveTab?.('settings')}
            className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
              activeTab === 'settings'
                ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border-[var(--theme-primary)]/50 shadow-xs'
                : 'bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
            }`}
            title="Configurações do Escritório"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Top Button to Leave the Office / Sair do Escritório */}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-red-950/25 hover:bg-red-900/40 border border-red-500/30 hover:border-red-500/50 text-red-300 hover:text-red-100 text-xs font-semibold transition-all shadow-xs cursor-pointer shrink-0"
            title="Sair do Escritório e encerrar sessão"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>

      {/* Bottom Row: Desktop Navigation Tabs (Strictly 2 centered rows without wrapping) */}
      <div className="hidden lg:block max-w-7xl mx-auto border-t border-[var(--border-color)] pt-2 pb-2">
        <nav className="flex flex-col items-center gap-1.5 w-full">
          {/* Linha 1 */}
          <div className="flex items-center justify-center gap-x-1 sm:gap-x-1.5 xl:gap-x-2 w-full flex-nowrap overflow-x-auto no-scrollbar">
            {firstRowActions.map((item) => {
              const ItemIcon = item.icon;
              const isActive = activeTab === item.id ||
                (item.id === 'banks' && activeTab === 'financeiro') ||
                (item.id === 'deadlines' && activeTab === 'recebimentos') ||
                (item.id === 'actions' && activeTab === 'listas');

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab?.(item.id)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[var(--theme-primary)] text-black font-bold shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                  title={item.label}
                >
                  <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-black' : 'text-[var(--theme-primary)]'}`} />
                  <span>{item.shortLabel}</span>
                </button>
              );
            })}
          </div>

          {/* Linha 2 */}
          <div className="flex items-center justify-center gap-x-1 sm:gap-x-1.5 xl:gap-x-2 w-full flex-nowrap overflow-x-auto no-scrollbar">
            {secondRowActions.map((item) => {
              const ItemIcon = item.icon;
              const isActive = activeTab === item.id ||
                (item.id === 'banks' && activeTab === 'financeiro') ||
                (item.id === 'deadlines' && activeTab === 'recebimentos') ||
                (item.id === 'actions' && activeTab === 'listas');

              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab?.(item.id)}
                  className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[var(--theme-primary)] text-black font-bold shadow-xs'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
                  }`}
                  title={item.label}
                >
                  <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-black' : 'text-[var(--theme-primary)]'}`} />
                  <span>{item.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Mobile Horizontally Scrollable Fast Navigation Pills */}
      <div className="lg:hidden mt-1 pb-3 border-t border-[var(--border-color)] pt-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 px-0.5 scroll-smooth">
          {ALL_QUICK_ACTIONS.map((item) => {
            const ItemIcon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'banks' && activeTab === 'financeiro') ||
              (item.id === 'deadlines' && activeTab === 'recebimentos') ||
              (item.id === 'actions' && activeTab === 'listas');

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab?.(item.id)}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-[var(--theme-primary)] text-black shadow-md font-bold'
                    : 'bg-[var(--bg-card)] text-[var(--text-muted)] border border-[var(--border-color)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)]'
                }`}
                title={item.label}
              >
                <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-black' : 'text-[var(--theme-primary)]'}`} />
                <span>{item.shortLabel}</span>
              </button>
            );
          })}

          {/* Quick full drawer trigger */}
          <button
            onClick={onOpenMobileSidebar}
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-[var(--bg-card-hover)] text-[var(--theme-primary)] border border-[var(--theme-primary)]/40 hover:bg-[var(--bg-card-secondary)] transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>Todos</span>
          </button>
        </div>
      </div>
    </header>
  );
};

