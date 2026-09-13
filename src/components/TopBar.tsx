import React, { useRef } from 'react';
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

const ALL_QUICK_ACTIONS = [
  { id: 'dashboard', label: 'Painel do Escritório', shortLabel: 'Painel', icon: LayoutDashboard },
  { id: 'today', label: 'Meu Dia & Agenda', shortLabel: 'Meu Dia', icon: Calendar },
  { id: 'actions', label: 'Central de Ações', shortLabel: 'Ações', icon: Clock },
  { id: 'projects', label: 'Gestão de Projetos', shortLabel: 'Projetos', icon: FolderOpen },
  { id: 'leads', label: 'Leads & Comercial', shortLabel: 'Leads', icon: Users },
  { id: 'freelance', label: 'Clientes & Contratos', shortLabel: 'Clientes', icon: Briefcase },
  { id: 'banks', label: 'Financeiro & Bancos', shortLabel: 'Financeiro', icon: DollarSign },
  { id: 'deadlines', label: 'Recebimentos', shortLabel: 'Recebimentos', icon: Clock },
  { id: 'portal_cliente', label: 'Radar do Cliente', shortLabel: 'Radar Cliente', icon: KeyRound },
  { id: 'suppliers', label: 'Fornecedores', shortLabel: 'Fornecedores', icon: Package },
  { id: 'team', label: 'Equipe', shortLabel: 'Equipe', icon: Users },
  { id: 'listas', label: 'Listas & Tarefas', shortLabel: 'Listas', icon: ListChecks },
  { id: 'instagram', label: 'Instagram', shortLabel: 'Instagram', icon: Instagram },
];

const DESKTOP_QUICK_ACTIONS = [
  { id: 'dashboard', label: 'Painel do Escritório', icon: LayoutDashboard },
  { id: 'today', label: 'Meu Dia & Agenda', icon: Calendar },
  { id: 'actions', label: 'Central de Ações', icon: Clock },
  { id: 'projects', label: 'Gestão de Projetos', icon: FolderOpen },
];

const TAB_TITLES: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  dashboard: { label: 'Painel do Escritório', icon: LayoutDashboard, description: 'O que precisa da sua atenção hoje • Administração' },
  today: { label: 'Meu Dia & Agenda', icon: Calendar, description: 'Compromissos, prazos do dia e ações prioritárias' },
  actions: { label: 'Central de Ações', icon: Clock, description: 'Fluxo de tarefas e pendências de projetos' },
  leads: { label: 'Leads & Comercial', icon: Users, description: 'Pipeline de vendas, propostas e captação' },
  projects: { label: 'Gestão de Projetos', icon: FolderOpen, description: 'Acompanhamento de etapas, cronogramas e entregas' },
  consultoria_expressa: { label: 'Consultoria Expressa', icon: Sparkles, description: 'Propostas ágeis de redesign de ambientes com Inteligência Artificial' },
  suppliers: { label: 'Fornecedores', icon: Package, description: 'Catálogo de parceiros, lojas e contatos técnicos' },
  team: { label: 'Equipe & Colaboradores', icon: Users, description: 'Membros, funções, permissões e convites' },
  freelance: { label: 'Clientes & Contratos', icon: Briefcase, description: 'Cadastro de clientes, contratos e propostas' },
  portal_cliente: { label: 'Radar do Cliente', icon: KeyRound, description: 'Acessos exclusivos, acompanhamento de etapas e transparência' },
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
    architectProfile?.name?.trim() ||
    profile?.companyName?.trim() ||
    profile?.name?.trim() ||
    user?.displayName?.trim() ||
    (isOwner ? 'LF Quadros & Decoração' : 'Meu Escritório');

  const userPhoto = architectProfile?.photoUrl || profile?.photoUrl || user?.photoURL || '';

  const userInitials = (userName.slice(0, 2) || 'LF').toUpperCase();

  return (
    <header className="w-full bg-[#161311]/95 backdrop-blur-md border-b border-[#2d2520] sticky top-0 z-20 px-3 sm:px-6 lg:px-8 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3">
        {/* Left: Mobile Menu Button & Tab Title */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-[#221c18] border border-[#3d342f] text-[var(--theme-primary)] hover:text-[#fcf8f5] hover:bg-[#2c241f] transition-colors cursor-pointer shrink-0 shadow-xs flex items-center gap-1.5"
            title="Abrir Menu Completo"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
            <span className="hidden xs:inline text-[11px] font-bold text-[#a89c93]">Menu</span>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-[#221c18] border border-[#3d342f] flex items-center justify-center text-[var(--theme-primary)] shrink-0 shadow-xs">
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <h1 className="font-serif font-bold text-xs sm:text-sm md:text-base text-[#fcf8f5] whitespace-nowrap leading-tight">
                {currentTabInfo.label}
              </h1>
              <span className="hidden 2xl:inline text-[11px] text-[#a89c93] whitespace-nowrap">
                {currentTabInfo.description}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Quick Navigation Buttons (visible on larger screens) */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-[#12100e] p-1.5 rounded-xl border border-[#2d2520] shadow-inner shrink-0">
          {DESKTOP_QUICK_ACTIONS.map((item) => {
            const ItemIcon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab?.(item.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/50 shadow-xs font-bold'
                    : 'text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#201a17] border border-transparent'
                }`}
                title={`Ir para ${item.label}`}
              >
                <ItemIcon className={`w-4 h-4 ${isActive ? 'text-[var(--theme-primary)]' : 'text-[#8c827a]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Corner: User Profile & Date Selector */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* User Profile Info */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl hover:bg-[#201a17] border border-transparent hover:border-[#382f29] transition-all cursor-pointer text-left shrink-0"
            title="Abrir Configurações do Perfil"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full p-0.5 flex items-center justify-center overflow-hidden border border-[var(--theme-primary)]/40 shadow-xs shrink-0 bg-[#12100e]">
              {userPhoto ? (
                <img
                  src={userPhoto}
                  alt={userName}
                  className="w-full h-full object-cover rounded-full"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-[#201a17] rounded-full flex items-center justify-center font-serif font-bold text-xs text-[var(--theme-primary)]">
                  {userInitials}
                </div>
              )}
            </div>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="text-xs font-semibold text-[#fcf8f5] truncate max-w-[120px] lg:max-w-[140px] leading-tight">
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
            className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#1c1815] hover:bg-[#241e1b] border border-[#3d342f] hover:border-[var(--theme-primary)]/50 text-[#fcf8f5] text-xs font-medium transition-all shadow-xs cursor-pointer group shrink-0"
            title="Alterar Mês de Competência"
          >
            <Calendar className="w-3.5 h-3.5 text-[var(--theme-primary)] group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-xs text-[#fcf8f5] font-semibold whitespace-nowrap hidden sm:inline">
              {formatMonthDisplay(selectedMonth)}
            </span>
            <span className="text-[11px] text-[#fcf8f5] font-semibold whitespace-nowrap sm:hidden">
              {formatMonthDisplayShort(selectedMonth)}
            </span>
            <ChevronDown className="w-3 h-3 text-[#a89c93] group-hover:text-[#fcf8f5] transition-colors shrink-0" />

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
            onClick={onOpenSettings}
            className="p-1.5 sm:p-2 rounded-xl bg-[#1c1815] hover:bg-[#2c241f] border border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5] transition-colors cursor-pointer shrink-0"
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

      {/* Mobile Horizontally Scrollable Fast Navigation Pills */}
      <div className="md:hidden mt-2 pt-1.5 border-t border-[#2d2520]">
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
                    : 'bg-[#1c1815] text-[#a89c93] border border-[#2d2520] hover:text-[#fcf8f5] hover:bg-[#251e1a]'
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
            className="flex items-center gap-1 py-1.5 px-2.5 rounded-xl text-xs font-bold bg-[#251e1a] text-[var(--theme-primary)] border border-[var(--theme-primary)]/40 hover:bg-[#322822] transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Menu className="w-3.5 h-3.5" />
            <span>Todos</span>
          </button>
        </div>
      </div>
    </header>
  );
};

