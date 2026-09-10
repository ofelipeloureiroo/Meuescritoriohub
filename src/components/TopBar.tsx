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

const TOP_QUICK_ACTIONS = [
  { id: 'today', label: 'Meu Dia & Agenda', shortLabel: 'Meu Dia & Agenda', icon: Calendar },
  { id: 'actions', label: 'Central de Ações', shortLabel: 'Central de Ações', icon: Clock },
  { id: 'projects', label: 'Gestão de Projetos', shortLabel: 'Gestão de Projetos', icon: FolderOpen },
  { id: 'leads', label: 'Leads', shortLabel: 'Leads', icon: Users },
];

const TAB_TITLES: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  today: { label: 'Meu Dia & Agenda', icon: Calendar, description: 'Compromissos, prazos do dia e ações prioritárias' },
  actions: { label: 'Central de Ações', icon: Clock, description: 'Fluxo de tarefas e pendências de projetos' },
  leads: { label: 'Leads & Comercial', icon: Users, description: 'Pipeline de vendas, propostas e captação' },
  projects: { label: 'Gestão de Projetos', icon: FolderOpen, description: 'Acompanhamento de etapas, cronogramas e entregas' },
  suppliers: { label: 'Fornecedores', icon: Package, description: 'Catálogo de parceiros, lojas e contatos técnicos' },
  team: { label: 'Equipe & Colaboradores', icon: Users, description: 'Membros, funções, permissões e convites' },
  freelance: { label: 'Clientes & Contratos', icon: Briefcase, description: 'Cadastro de clientes, contratos e propostas' },
  portal_cliente: { label: 'Radar da Cliente', icon: KeyRound, description: 'Acessos exclusivos, acompanhamento de etapas e transparência' },
  deadlines: { label: 'Prazos & Cobranças', icon: Clock, description: 'Controle de parcelas a vencer e etapas críticas' },
  banks: { label: 'Financeiro & Bancos', icon: WalletIcon, description: 'Contas, extrato, conciliação e fluxo de caixa' },
  dashboard: { label: 'Saúde do Negócio', icon: TrendingUp, description: 'Métricas financeiras, lucratividade e DRE' },
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
  const { user, profile } = useAuth();
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

  const userName =
    architectProfile?.name ||
    profile?.companyName ||
    user?.displayName ||
    'Carlos Felipe';

  const userInitials = (userName.slice(0, 2) || 'CF').toUpperCase();

  return (
    <header className="w-full bg-[#161311]/90 backdrop-blur-md border-b border-[#2d2520] sticky top-0 z-20 px-4 sm:px-6 lg:px-8 py-2.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left: Mobile Menu Button & Tab Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenMobileSidebar}
            className="lg:hidden p-2 rounded-xl bg-[#221c18] border border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#2c241f] transition-colors cursor-pointer shrink-0"
            title="Abrir Menu Lateral"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#221c18] border border-[#3d342f] flex items-center justify-center text-[var(--theme-primary)] shrink-0 shadow-xs">
              <Icon className="w-4 h-4" />
            </div>
            <div className="flex flex-col min-w-0">
              <h1 className="font-serif font-bold text-sm sm:text-base text-[#fcf8f5] truncate leading-tight">
                {currentTabInfo.label}
              </h1>
              <span className="hidden xl:inline text-[11px] text-[#a89c93] truncate">
                {currentTabInfo.description}
              </span>
            </div>
          </div>
        </div>

        {/* Center: 4 Quick Navigation Buttons requested by user */}
        <nav className="hidden md:flex items-center gap-1.5 bg-[#12100e] p-1 rounded-xl border border-[#2d2520] shadow-inner shrink-0">
          {TOP_QUICK_ACTIONS.map((item) => {
            const ItemIcon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab?.(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-[var(--theme-primary)]/15 text-[var(--theme-primary)] border border-[var(--theme-primary)]/40 shadow-xs'
                    : 'text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#201a17] border border-transparent'
                }`}
                title={`Ir para ${item.label}`}
              >
                <ItemIcon className={`w-3.5 h-3.5 ${isActive ? 'text-[var(--theme-primary)]' : 'text-[#8c827a]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Corner: User Profile & Date Selector */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* User Profile Info */}
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1 rounded-xl hover:bg-[#201a17] border border-transparent hover:border-[#382f29] transition-all cursor-pointer text-left"
            title="Abrir Configurações do Perfil"
          >
            <div className="w-8 h-8 rounded-full p-0.5 flex items-center justify-center overflow-hidden border border-[var(--theme-primary)]/40 shadow-xs shrink-0 bg-[#12100e]">
              {architectProfile?.photoUrl ? (
                <img
                  src={architectProfile.photoUrl}
                  alt={userName}
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="w-full h-full bg-[#201a17] rounded-full flex items-center justify-center font-serif font-bold text-xs text-[var(--theme-primary)]">
                  {userInitials}
                </div>
              )}
            </div>
            <div className="hidden sm:flex flex-col min-w-0">
              <span className="text-xs font-semibold text-[#fcf8f5] truncate max-w-[140px] leading-tight">
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
            className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#1c1815] hover:bg-[#241e1b] border border-[#3d342f] hover:border-[var(--theme-primary)]/50 text-[#fcf8f5] text-xs font-medium transition-all shadow-xs cursor-pointer group"
            title="Alterar Mês de Competência"
          >
            <Calendar className="w-3.5 h-3.5 text-[var(--theme-primary)] group-hover:scale-110 transition-transform shrink-0" />
            <span className="text-xs text-[#fcf8f5] font-semibold whitespace-nowrap">
              {formatMonthDisplay(selectedMonth)}
            </span>
            <ChevronDown className="w-3 h-3 text-[#a89c93] group-hover:text-[#fcf8f5] transition-colors" />

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
            className="p-2 rounded-xl bg-[#1c1815] hover:bg-[#2c241f] border border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5] transition-colors cursor-pointer shrink-0"
            title="Configurações do Escritório"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation for the 4 buttons */}
      <div className="md:hidden mt-2 pt-2 border-t border-[#2d2520] grid grid-cols-4 gap-1.5 max-w-7xl mx-auto">
        {TOP_QUICK_ACTIONS.map((item) => {
          const ItemIcon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab?.(item.id)}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold transition-all cursor-pointer truncate ${
                isActive
                  ? 'bg-[var(--theme-primary)]/15 text-[var(--theme-primary)] border border-[var(--theme-primary)]/40 shadow-xs'
                  : 'bg-[#1c1815] text-[#a89c93] border border-[#2d2520] hover:text-[#fcf8f5]'
              }`}
              title={item.label}
            >
              <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-[var(--theme-primary)]' : 'text-[#8c827a]'}`} />
              <span className="truncate">
                {item.id === 'today' ? 'Meu Dia' : item.id === 'actions' ? 'Ações' : item.id === 'projects' ? 'Projetos' : 'Leads'}
              </span>
            </button>
          );
        })}
      </div>
    </header>
  );
};

