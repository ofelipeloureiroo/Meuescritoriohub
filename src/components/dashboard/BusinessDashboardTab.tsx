import React, { useState, useEffect, useMemo } from 'react';
import {
  LayoutDashboard,
  DollarSign,
  CheckCircle2,
  Circle,
  FolderOpen,
  Calendar,
  Building2,
  Users,
  Clock,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  Sliders,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Edit2,
  X,
  Check,
  Briefcase,
  Layers,
  MapPin,
  Timer,
  Search,
  Filter,
  Trash2,
  TrendingUp,
  Phone,
  Mail,
  UserCheck,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AppAction, ArchitectureProject, Client, TeamMember } from '../../types';

export interface TeamProjectAllocation {
  memberId: string;
  memberName: string;
  roleTitle: string;
  avatarUrl?: string;
  initials: string;
  color: string;
  assignedProjectId?: string;
  currentProjectTitle: string;
  currentStage: string;
  taskDetail: string;
  deadline?: string;
  lastUpdated?: string;
}

const DEFAULT_SECTORS_CONFIG = {
  finance: true,
  tasks: true,
  team_activity: true,
  projects: true,
  week_calendar: true,
  construction: true,
  crm_followup: true,
};

const INITIAL_TEAM_ALLOCATIONS: TeamProjectAllocation[] = [
  {
    memberId: 'member_1',
    memberName: 'Laíne Paula Loureiro',
    roleTitle: 'Arquiteta Titular & Sócia',
    initials: 'LP',
    color: '#c58a4b',
    currentProjectTitle: 'Residência Alphaville',
    currentStage: 'Projeto Executivo',
    taskDetail: 'Revisão final do Projeto Executivo e Aprovação de Marcenaria',
    deadline: '2026-09-25',
  },
  {
    memberId: 'member_2',
    memberName: 'Maria Laura',
    roleTitle: 'Coordenadora de Projetos',
    initials: 'ML',
    color: '#8c7456',
    currentProjectTitle: 'Apartamento Jardins 302',
    currentStage: 'Modelagem 3D & Render',
    taskDetail: 'Modelagem da Cozinha Gourmet Integrada e Renders no Lumion',
    deadline: '2026-09-30',
  },
  {
    memberId: 'member_3',
    memberName: 'Carlos Eduardo',
    roleTitle: 'Arquiteto Desenvolvedor',
    initials: 'CE',
    color: '#4f7a61',
    currentProjectTitle: 'Clínica Dermatológica Harmonia',
    currentStage: 'Detalhamento Executivo',
    taskDetail: 'Detalhamento de paginação de piso, forro e pontos elétricos',
    deadline: '2026-10-05',
  },
  {
    memberId: 'member_4',
    memberName: 'Beatriz Vasconcelos',
    roleTitle: 'Estagiária de Arquitetura',
    initials: 'BV',
    color: '#7b6194',
    currentProjectTitle: 'Consultório Dr. Marcelo',
    currentStage: 'Estudo Preliminar & Medição',
    taskDetail: 'Levantamento métrico cadastral e conferência de pontos in loco',
    deadline: '2026-09-20',
  },
];

interface BusinessDashboardTabProps {
  onNavigateTab?: (tab: string) => void;
}

export const BusinessDashboardTab: React.FC<BusinessDashboardTabProps> = ({ onNavigateTab }) => {
  const { user, profile } = useAuth();
  const {
    architectProfile,
    transactions,
    architectureProjects,
    clients,
    freelanceProjects,
    projectInstallments,
    projectMilestones,
    actions,
    addAppAction,
    updateAppAction,
    deleteAppAction,
    selectedMonth,
    monthlyTotalIncome,
    monthlyTotalExpense,
    monthlyBalance,
  } = useFinance();

  // Navigation handler to any office module
  const handleNav = (tab: string) => {
    if (onNavigateTab) {
      onNavigateTab(tab);
    } else {
      localStorage.setItem('office_active_tab', tab);
      window.location.reload();
    }
  };

  // 1. Sectors Configuration State (persisted in localStorage)
  const [sectorsConfig, setSectorsConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('meu_escritorio_dashboard_sectors_v2');
      return saved ? { ...DEFAULT_SECTORS_CONFIG, ...JSON.parse(saved) } : DEFAULT_SECTORS_CONFIG;
    } catch {
      return DEFAULT_SECTORS_CONFIG;
    }
  });

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [showCustomizeModal, setShowCustomizeModal] = useState(false);

  const toggleSectionCollapse = (sectionId: string) => {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const saveSectorsConfig = (newConfig: typeof DEFAULT_SECTORS_CONFIG) => {
    setSectorsConfig(newConfig);
    try {
      localStorage.setItem('meu_escritorio_dashboard_sectors_v2', JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Could not save sectors config', e);
    }
  };

  // 2. Team Members & Project Allocations (persisted and synced with office projects)
  const [teamAllocations, setTeamAllocations] = useState<TeamProjectAllocation[]>(() => {
    try {
      const saved = localStorage.getItem('meu_escritorio_team_allocations_v2');
      return saved ? JSON.parse(saved) : INITIAL_TEAM_ALLOCATIONS;
    } catch {
      return INITIAL_TEAM_ALLOCATIONS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('meu_escritorio_team_allocations_v2', JSON.stringify(teamAllocations));
    } catch (e) {
      console.warn('Could not save team allocations', e);
    }
  }, [teamAllocations]);

  // Modal to change which project a member is working on
  const [editingAllocation, setEditingAllocation] = useState<TeamProjectAllocation | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [customProjectTitle, setCustomProjectTitle] = useState('');
  const [selectedStage, setSelectedStage] = useState('');
  const [customTaskDetail, setCustomTaskDetail] = useState('');

  const handleOpenEditAllocation = (member: TeamProjectAllocation) => {
    setEditingAllocation(member);
    setSelectedProjectId(member.assignedProjectId || '');
    setCustomProjectTitle(member.currentProjectTitle);
    setSelectedStage(member.currentStage);
    setCustomTaskDetail(member.taskDetail);
  };

  const handleSaveAllocation = () => {
    if (!editingAllocation) return;

    let projectTitle = customProjectTitle.trim();
    let stage = selectedStage.trim() || 'Em Desenvolvimento';

    if (selectedProjectId) {
      const found = architectureProjects.find((p) => p.id === selectedProjectId);
      if (found) {
        projectTitle = found.title;
        if (!selectedStage.trim()) {
          stage = found.status === 'obra' ? 'Acompanhamento de Obra' : found.status === 'executivo' ? 'Projeto Executivo' : 'Estudo & Anteprojeto';
        }
      }
    }

    const updated = teamAllocations.map((m) =>
      m.memberId === editingAllocation.memberId
        ? {
            ...m,
            assignedProjectId: selectedProjectId || undefined,
            currentProjectTitle: projectTitle || 'Geral do Escritório',
            currentStage: stage,
            taskDetail: customTaskDetail.trim() || 'Desenvolvimento de projetos do escritório',
            lastUpdated: new Date().toISOString(),
          }
        : m
    );

    setTeamAllocations(updated);
    setEditingAllocation(null);
  };

  // 3. Project Filter Pill State
  type ProjectFilterCategory = 'todos' | 'critico' | 'ok' | 'obra' | 'estudo' | 'entregue';
  const [projectFilter, setProjectFilter] = useState<ProjectFilterCategory>('todos');

  // 4. Quick Inline Task Input for "Tarefas de Hoje"
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskCategory, setQuickTaskCategory] = useState<'Projeto' | 'Financeiro' | 'Obra' | 'Reunião' | 'Geral'>('Projeto');
  const [quickTaskPriority, setQuickTaskPriority] = useState<'high' | 'medium' | 'low'>('high');

  const handleAddQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    addAppAction({
      description: quickTaskTitle.trim(),
      type: quickTaskCategory,
      area: quickTaskCategory === 'Financeiro' ? 'Financeiro' : quickTaskCategory === 'Reunião' ? 'Comercial' : 'Operação',
      origin: 'Projeto',
      date: todayStr,
      status: 'pending',
      time: '14:00',
      notes: 'Adicionado diretamente pelo Painel do Escritório',
    });
    setQuickTaskTitle('');
  };

  // 5. Date & Time computation
  const todayDate = useMemo(() => new Date(), []);
  const todayFormattedBR = useMemo(() => {
    return todayDate.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
    });
  }, [todayDate]);

  const todayIsoDate = useMemo(() => todayDate.toISOString().split('T')[0], [todayDate]);

  // 6. Financeiro de Hoje Calculations
  const receivablesToday = useMemo(() => {
    const inst = projectInstallments.filter(
      (p) => p.status !== 'paid' && (p.dueDate === todayIsoDate || p.dueDate.startsWith(selectedMonth))
    );
    const tx = transactions.filter(
      (t) => t.type === 'income' && t.date === todayIsoDate
    );
    return {
      installments: inst,
      transactions: tx,
      total: inst.reduce((sum, i) => sum + (i.amount || 0), 0) + tx.reduce((sum, t) => sum + (t.amount || 0), 0),
    };
  }, [projectInstallments, transactions, todayIsoDate, selectedMonth]);

  const payablesToday = useMemo(() => {
    const tx = transactions.filter(
      (t) => t.type === 'expense' && (t.date === todayIsoDate || (t.status === 'pending' && t.date.startsWith(selectedMonth)))
    );
    return {
      transactions: tx,
      total: tx.reduce((sum, t) => sum + (t.amount || 0), 0),
    };
  }, [transactions, todayIsoDate, selectedMonth]);

  // 7. Tarefas de Hoje (DO DIA)
  const todayTasks = useMemo(() => {
    return actions.filter(
      (a) => a.date === todayIsoDate || a.status === 'in_progress' || (a.status === 'pending' && a.area === 'Operação')
    );
  }, [actions, todayIsoDate]);

  const completedTodayTasks = useMemo(() => todayTasks.filter((t) => t.status === 'completed'), [todayTasks]);
  const tasksPercentage = todayTasks.length > 0 ? Math.round((completedTodayTasks.length / todayTasks.length) * 100) : 0;

  // 8. Filtered Projects based on pill selection
  const filteredProjects = useMemo(() => {
    const active = architectureProjects;

    switch (projectFilter) {
      case 'critico':
        return active.filter((p) => {
          if (p.status === 'entregue') return false;
          if (!p.deliveryDate) return false;
          const diffDays = Math.ceil((new Date(p.deliveryDate).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= 7;
        });
      case 'ok':
        return active.filter((p) => {
          if (p.status === 'entregue') return false;
          if (!p.deliveryDate) return true;
          const diffDays = Math.ceil((new Date(p.deliveryDate).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays > 7;
        });
      case 'obra':
        return active.filter((p) => p.status === 'obra' || p.category?.toLowerCase().includes('obra'));
      case 'estudo':
        return active.filter((p) => p.status === 'estudo_preliminar' || p.status === 'anteprojeto');
      case 'entregue':
        return active.filter((p) => p.status === 'entregue');
      case 'todos':
      default:
        return active.filter((p) => p.status !== 'entregue');
    }
  }, [architectureProjects, projectFilter, todayDate]);

  // 9. Agenda da Semana (7 Days calculation)
  const weekDays = useMemo(() => {
    const curr = new Date(todayDate);
    const dayOfWeek = curr.getDay(); // 0 = Sun, 1 = Mon ...
    const distanceToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(curr);
    monday.setDate(curr.getDate() + distanceToMonday);

    const days = [];
    const dayNames = ['SEGUNDA', 'TERÇA', 'QUARTA', 'QUINTA', 'SEXTA', 'SÁBADO', 'DOMINGO'];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const isoStr = d.toISOString().split('T')[0];
      const isToday = isoStr === todayIsoDate;
      const dayNum = String(d.getDate()).padStart(2, '0');

      const dayActions = actions.filter((a) => a.date === isoStr);
      const dayMilestones = projectMilestones.filter((m) => m.dueDate === isoStr);

      days.push({
        label: dayNames[i],
        dayNum,
        isoStr,
        isToday,
        actions: dayActions,
        milestones: dayMilestones,
        totalItems: dayActions.length + dayMilestones.length,
      });
    }
    return days;
  }, [todayDate, todayIsoDate, actions, projectMilestones]);

  const [selectedWeekDayIso, setSelectedWeekDayIso] = useState<string>(todayIsoDate);

  const selectedDayItems = useMemo(() => {
    const dayActions = actions.filter((a) => a.date === selectedWeekDayIso);
    const dayMilestones = projectMilestones.filter((m) => m.dueDate === selectedWeekDayIso);
    return { dayActions, dayMilestones };
  }, [actions, projectMilestones, selectedWeekDayIso]);

  // 10. Obras em Andamento
  const ongoingConstructions = useMemo(() => {
    return architectureProjects.filter(
      (p) =>
        p.status === 'obra' ||
        p.category?.toLowerCase().includes('obra') ||
        (p.reports && p.reports.length > 0)
    );
  }, [architectureProjects]);

  // 11. CRM — Leads & Follow-ups Ativos
  const activeLeads = useMemo(() => {
    return clients.filter(
      (c) =>
        c.status === 'lead' ||
        c.pipelineStage !== undefined ||
        c.notes?.toLowerCase().includes('follow') ||
        c.pendingAmount > 0
    );
  }, [clients]);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300 font-sans">
      {/* ========================================================================= */}
      {/* HEADER: PAINEL DO ESCRITÓRIO */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1a1614] p-5 sm:p-6 rounded-2xl border border-[#3d342f] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--theme-primary)]/15 border border-[var(--theme-primary)]/30 text-[var(--theme-primary)] flex items-center justify-center font-bold shadow-2xs">
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#fcf8f5] tracking-tight">
              Painel do Escritório
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#a89c93] mt-1 flex items-center gap-2">
            <span>Visão Integrada de Projetos, Agenda, Equipe e Financeiro</span>
            <span className="inline-block w-1 h-1 rounded-full bg-[#a89c93]" />
            <span className="text-[var(--theme-primary)] font-medium">Administração</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#251e1a] hover:bg-[#2f2621] text-[#fcf8f5] border border-[#3d342f] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
          >
            <Sliders className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
            <span>Personalizar setores</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTOR 1: FINANCEIRO DE HOJE & MÊS */}
      {/* ========================================================================= */}
      {sectorsConfig.finance && (
        <div className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#3d342f]/80 bg-[#161311]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#fcf8f5]">Financeiro de Hoje & Mês</h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNav('financeiro')}
                className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Ir para o Financeiro</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleSectionCollapse('finance')}
                className="p-1 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#251e1a] cursor-pointer"
                title="Minimizar / Expandir"
              >
                {collapsedSections.finance ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!collapsedSections.finance && (
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: A Receber */}
              <div className="p-4 rounded-2xl bg-[#12100e] border border-emerald-900/30 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#a89c93]">↙ A receber hoje / mês</span>
                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-emerald-400">
                    {formatCurrency(receivablesToday.total)}
                  </div>
                  <p className="text-[11px] text-[#8c827a] mt-0.5">
                    {receivablesToday.installments.length} parcela(s) pendente(s)
                  </p>
                </div>
              </div>

              {/* Card 2: A Pagar */}
              <div className="p-4 rounded-2xl bg-[#12100e] border border-rose-900/30 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#a89c93]">↗ A pagar hoje / mês</span>
                  <div className="w-6 h-6 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-400">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-rose-400">
                    {formatCurrency(payablesToday.total)}
                  </div>
                  <p className="text-[11px] text-[#8c827a] mt-0.5">
                    {payablesToday.transactions.length} despesa(s) agendada(s)
                  </p>
                </div>
              </div>

              {/* Card 3: Receitas do Mês */}
              <div className="p-4 rounded-2xl bg-[#12100e] border border-[#2e2621] flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#a89c93]">Receita Total do Mês</span>
                  <span className="text-[10px] font-bold text-[var(--theme-primary)] bg-[var(--theme-primary)]/10 px-2 py-0.5 rounded">
                    {selectedMonth}
                  </span>
                </div>
                <div>
                  <div className="text-xl font-bold text-[#fcf8f5]">
                    {formatCurrency(monthlyTotalIncome)}
                  </div>
                  <p className="text-[11px] text-[#8c827a] mt-0.5">Entradas confirmadas</p>
                </div>
              </div>

              {/* Card 4: Saldo Operacional */}
              <div className="p-4 rounded-2xl bg-[#12100e] border border-[#2e2621] flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#a89c93]">Saldo do Mês</span>
                  <TrendingUp className="w-4 h-4 text-[var(--theme-primary)]" />
                </div>
                <div>
                  <div className={`text-xl font-bold ${monthlyBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(monthlyBalance)}
                  </div>
                  <p className="text-[11px] text-[#8c827a] mt-0.5">Despesas: {formatCurrency(monthlyTotalExpense)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTOR 2: TAREFAS DE HOJE (DO DIA) */}
      {/* ========================================================================= */}
      {sectorsConfig.tasks && (
        <div className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#3d342f]/80 bg-[#161311]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#fcf8f5]">Tarefas de Hoje (DO DIA)</h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[#a89c93] bg-[#221c18] px-2.5 py-1 rounded-lg border border-[#3d342f]">
                {completedTodayTasks.length} de {todayTasks.length} concluídas ({tasksPercentage}%)
              </span>
              <button
                onClick={() => handleNav('actions')}
                className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Central de Ações</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleSectionCollapse('tasks')}
                className="p-1 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#251e1a] cursor-pointer"
                title="Minimizar / Expandir"
              >
                {collapsedSections.tasks ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!collapsedSections.tasks && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Add Task Inline Form */}
              <form onSubmit={handleAddQuickTask} className="flex flex-col sm:flex-row items-center gap-2">
                <input
                  type="text"
                  placeholder="Adicionar nova tarefa para hoje no escritório..."
                  value={quickTaskTitle}
                  onChange={(e) => setQuickTaskTitle(e.target.value)}
                  className="flex-1 px-4 py-2.5 bg-[#0e0c0b] border border-[#3d342f] rounded-xl text-xs text-[#fcf8f5] placeholder-[#6b625b] focus:outline-none focus:border-[var(--theme-primary)]"
                />
                <select
                  value={quickTaskCategory}
                  onChange={(e) => setQuickTaskCategory(e.target.value as any)}
                  className="px-3 py-2.5 bg-[#0e0c0b] border border-[#3d342f] rounded-xl text-xs text-[#fcf8f5] focus:outline-none"
                >
                  <option value="Projeto">Projeto</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Obra">Obra</option>
                  <option value="Reunião">Reunião</option>
                  <option value="Geral">Geral</option>
                </select>
                <select
                  value={quickTaskPriority}
                  onChange={(e) => setQuickTaskPriority(e.target.value as any)}
                  className="px-3 py-2.5 bg-[#0e0c0b] border border-[#3d342f] rounded-xl text-xs text-[#fcf8f5] focus:outline-none"
                >
                  <option value="high">Alta prioridade</option>
                  <option value="medium">Média prioridade</option>
                  <option value="low">Baixa prioridade</option>
                </select>
                <button
                  type="submit"
                  disabled={!quickTaskTitle.trim()}
                  className="px-4 py-2.5 bg-[var(--theme-primary)] hover:opacity-90 disabled:opacity-40 text-black text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Adicionar</span>
                </button>
              </form>

              {/* Tasks List */}
              {todayTasks.length > 0 ? (
                <div className="divide-y divide-[#2d2520] border border-[#3d342f] rounded-xl overflow-hidden bg-[#12100e]">
                  {todayTasks.map((task) => {
                    const isDone = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-[#1c1815] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() =>
                              updateAppAction(task.id, {
                                status: isDone ? 'pending' : 'completed',
                                completedAt: isDone ? undefined : new Date().toISOString(),
                              })
                            }
                            className="cursor-pointer text-[#a89c93] hover:text-[var(--theme-primary)] shrink-0"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </button>
                          <span
                            className={`text-xs sm:text-sm truncate ${
                              isDone ? 'line-through text-[#6b625b]' : 'text-[#fcf8f5] font-medium'
                            }`}
                          >
                            {task.description}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {task.type && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#251e1a] text-[#a89c93] border border-[#3d342f]">
                              {task.type}
                            </span>
                          )}
                          {task.area && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#1a1614] text-[var(--theme-primary)] border border-[#3d342f]">
                              {task.area}
                            </span>
                          )}
                          <button
                            onClick={() => deleteAppAction(task.id)}
                            className="p-1 text-[#6b625b] hover:text-rose-400 cursor-pointer"
                            title="Remover"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#a89c93] flex flex-col items-center justify-center gap-2 border border-dashed border-[#3d342f] rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-[#6b625b]" />
                  <span>Nenhuma tarefa agendada para hoje. Adicione acima para conectar à Central de Ações.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTOR 3: EQUIPE DO ESCRITÓRIO & PROJETOS EM ANDAMENTO */}
      {/* ========================================================================= */}
      {sectorsConfig.team_activity && (
        <div className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#3d342f]/80 bg-[#161311]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[var(--theme-primary)] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[#fcf8f5] flex items-center gap-2">
                  <span>Equipe & Projetos do Escritório</span>
                </h2>
                <p className="text-[11px] text-[#a89c93]">Qual projeto cada integrante está desenvolvendo</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNav('team')}
                className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Gestão de Equipe</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleSectionCollapse('team_activity')}
                className="p-1 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#251e1a] cursor-pointer"
                title="Minimizar / Expandir"
              >
                {collapsedSections.team_activity ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!collapsedSections.team_activity && (
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {teamAllocations.map((member) => {
                  // Find if there's a matching architecture project
                  const linkedArchProj = architectureProjects.find(
                    (p) => p.id === member.assignedProjectId || p.title.toLowerCase() === member.currentProjectTitle.toLowerCase()
                  );

                  return (
                    <div
                      key={member.memberId}
                      className="p-4 sm:p-5 rounded-2xl bg-[#12100e] border border-[#2e2621] hover:border-[var(--theme-primary)]/40 transition-all flex flex-col justify-between space-y-3.5 group"
                    >
                      {/* Top: Member Info & Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-[#12100e] shrink-0 relative shadow-xs"
                            style={{ backgroundColor: member.color || '#c58a4b' }}
                          >
                            {member.initials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-[#fcf8f5] truncate">{member.memberName}</h4>
                            <p className="text-xs text-[#a89c93] truncate">{member.roleTitle}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenEditAllocation(member)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#1f1916] hover:bg-[#2c241f] border border-[#3d342f] text-[11px] font-semibold text-[var(--theme-primary)] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          title="Alterar projeto deste integrante"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Alterar Projeto</span>
                        </button>
                      </div>

                      {/* Project Details Box */}
                      <div className="p-3 rounded-xl bg-[#1a1614] border border-[#3d342f]/80 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider min-w-0">
                            <Layers className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{member.currentProjectTitle}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#251e1a] text-amber-400 border border-amber-500/20 shrink-0">
                            {member.currentStage}
                          </span>
                        </div>
                        <p className="text-xs text-[#ded7d1] font-medium leading-relaxed">{member.taskDetail}</p>
                        {linkedArchProj && (
                          <div className="flex items-center justify-between text-[11px] text-[#8c827a] pt-1 border-t border-[#251e1a]">
                            <span>Cliente: <strong className="text-[#fcf8f5]">{linkedArchProj.clientName}</strong></span>
                            {linkedArchProj.deliveryDate && (
                              <span>Entrega: {formatDate(linkedArchProj.deliveryDate)}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer: Quick Project Link */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[#201a17]">
                        <span className="text-[#8c827a] text-[11px]">
                          {linkedArchProj ? `Status: ${linkedArchProj.status}` : 'Projeto Ativo'}
                        </span>
                        <button
                          onClick={() => handleNav('projects')}
                          className="text-[11px] font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <span>Abrir no Módulo de Projetos</span>
                          <ArrowUpRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTOR 4: PROJETOS POR CATEGORIA DE PRAZO & STATUS */}
      {/* ========================================================================= */}
      {sectorsConfig.projects && (
        <div className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#3d342f]/80 bg-[#161311]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 text-[var(--theme-primary)] flex items-center justify-center">
                <FolderOpen className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#fcf8f5]">Projetos do Escritório</h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNav('projects')}
                className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Gestão de Projetos</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleSectionCollapse('projects')}
                className="p-1 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#251e1a] cursor-pointer"
                title="Minimizar / Expandir"
              >
                {collapsedSections.projects ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!collapsedSections.projects && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'todos', label: 'Todos os Ativos', count: architectureProjects.filter((p) => p.status !== 'entregue').length },
                  { id: 'critico', label: 'Prazo Crítico (≤ 7 dias)', count: architectureProjects.filter((p) => {
                    if (p.status === 'entregue' || !p.deliveryDate) return false;
                    const diffDays = Math.ceil((new Date(p.deliveryDate).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
                    return diffDays <= 7;
                  }).length },
                  { id: 'ok', label: 'Prazo OK', count: architectureProjects.filter((p) => {
                    if (p.status === 'entregue') return false;
                    if (!p.deliveryDate) return true;
                    const diffDays = Math.ceil((new Date(p.deliveryDate).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
                    return diffDays > 7;
                  }).length },
                  { id: 'obra', label: 'Em Fase de Obra', count: architectureProjects.filter((p) => p.status === 'obra').length },
                  { id: 'estudo', label: 'Estudo / Anteprojeto', count: architectureProjects.filter((p) => p.status === 'estudo_preliminar' || p.status === 'anteprojeto').length },
                  { id: 'entregue', label: 'Concluídos', count: architectureProjects.filter((p) => p.status === 'entregue').length },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    onClick={() => setProjectFilter(pill.id as any)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                      projectFilter === pill.id
                        ? 'bg-[var(--theme-primary)] text-black font-bold shadow-xs'
                        : 'bg-[#221c18] hover:bg-[#2c241f] text-[#a89c93] hover:text-[#fcf8f5] border border-[#3d342f]'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                        projectFilter === pill.id ? 'bg-black/20 text-black font-bold' : 'bg-[#14110f] text-[#a89c93]'
                      }`}
                    >
                      {pill.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Projects Grid */}
              {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredProjects.map((project) => (
                    <div
                      key={project.id}
                      onClick={() => handleNav('projects')}
                      className="p-4 rounded-2xl bg-[#12100e] border border-[#2e2621] hover:border-[var(--theme-primary)]/50 transition-all flex flex-col justify-between space-y-3 cursor-pointer group"
                    >
                      {/* Top */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-[#fcf8f5] truncate group-hover:text-[var(--theme-primary)] transition-colors">
                            {project.title}
                          </h4>
                          <p className="text-[11px] text-[#a89c93] truncate">{project.clientName || 'Cliente'}</p>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--theme-primary)]/15 text-[var(--theme-primary)] border border-[var(--theme-primary)]/30 shrink-0">
                          {project.status || 'Ativo'}
                        </span>
                      </div>

                      {/* Location & Honorários */}
                      <div className="flex items-center justify-between text-xs text-[#a89c93]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#8c827a]" />
                          <span className="truncate">{project.location || project.state || 'Brasil'}</span>
                        </span>
                        {project.honorarios ? (
                          <span className="font-semibold text-[#fcf8f5]">{formatCurrency(project.honorarios)}</span>
                        ) : null}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-[11px] text-[#8c827a] pt-1 border-t border-[#251e1a]">
                        <span>Prazo: {project.deliveryDate ? formatDate(project.deliveryDate) : 'A definir'}</span>
                        <span className="text-[var(--theme-primary)] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          Ver projeto →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#a89c93] flex flex-col items-center justify-center gap-2 border border-dashed border-[#3d342f] rounded-xl">
                  <FolderOpen className="w-6 h-6 text-[#6b625b]" />
                  <span>Nenhum projeto encontrado nesta categoria de filtro.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTOR 5: AGENDA DA SEMANA (7 DIAS) */}
      {/* ========================================================================= */}
      {sectorsConfig.week_calendar && (
        <div className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#3d342f]/80 bg-[#161311]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#fcf8f5]">Agenda da Semana (7 Dias)</h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNav('today')}
                className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Abrir Agenda Completa</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleSectionCollapse('week_calendar')}
                className="p-1 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#251e1a] cursor-pointer"
                title="Minimizar / Expandir"
              >
                {collapsedSections.week_calendar ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!collapsedSections.week_calendar && (
            <div className="p-4 sm:p-6 space-y-4">
              {/* 7 Days Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 sm:gap-2.5">
                {weekDays.map((day) => {
                  const isSelected = selectedWeekDayIso === day.isoStr;
                  return (
                    <button
                      key={day.isoStr}
                      onClick={() => setSelectedWeekDayIso(day.isoStr)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer text-left flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? 'bg-[var(--theme-primary)]/15 border-[var(--theme-primary)] text-[#fcf8f5] shadow-xs'
                          : day.isToday
                          ? 'bg-[#251e1a] border-[var(--theme-primary)]/50 text-[#fcf8f5]'
                          : 'bg-[#12100e] border-[#2e2621] text-[#a89c93] hover:border-[#3d342f]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider">{day.label}</span>
                        {day.isToday && (
                          <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-[var(--theme-primary)] text-black">
                            HOJE
                          </span>
                        )}
                      </div>

                      <div className="text-base font-bold text-[#fcf8f5]">{day.dayNum}</div>

                      <div className="text-[10px] text-[#8c827a]">
                        {day.totalItems > 0 ? (
                          <span className="text-[var(--theme-primary)] font-semibold">
                            {day.totalItems} compromisso(s)
                          </span>
                        ) : (
                          <span>Livre</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Agenda Items */}
              <div className="p-4 rounded-2xl bg-[#12100e] border border-[#2e2621] space-y-3">
                <div className="flex items-center justify-between text-xs text-[#a89c93]">
                  <span>Compromissos e Entregas para <strong>{formatDate(selectedWeekDayIso)}</strong></span>
                  <button
                    onClick={() => handleNav('today')}
                    className="text-[var(--theme-primary)] font-bold hover:underline"
                  >
                    + Adicionar à Agenda
                  </button>
                </div>

                {selectedDayItems.dayActions.length > 0 || selectedDayItems.dayMilestones.length > 0 ? (
                  <div className="space-y-2">
                    {selectedDayItems.dayActions.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 rounded-xl bg-[#1a1614] border border-[#3d342f] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                            {act.time || '14:00'}
                          </span>
                          <span className="font-semibold text-[#fcf8f5]">{act.description}</span>
                        </div>
                        <span className="text-[11px] text-[#8c827a]">{act.area || 'Operação'}</span>
                      </div>
                    ))}

                    {selectedDayItems.dayMilestones.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl bg-[#1a1614] border border-amber-500/30 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                            Entrega
                          </span>
                          <span className="font-semibold text-[#fcf8f5]">{m.title}</span>
                        </div>
                        <span className="text-[11px] text-[#8c827a]">{m.projectTitle}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[#8c827a] flex flex-col items-center justify-center gap-1.5">
                    <Calendar className="w-5 h-5 text-[#6b625b]" />
                    <span>Nenhum compromisso ou entrega agendada para esta data.</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTOR 6: OBRAS EM ANDAMENTO */}
      {/* ========================================================================= */}
      {sectorsConfig.construction && (
        <div className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#3d342f]/80 bg-[#161311]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-600/10 border border-amber-600/20 text-amber-500 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#fcf8f5]">Obras em Andamento</h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8c827a]">{ongoingConstructions.length} em andamento</span>
              <button
                onClick={() => toggleSectionCollapse('construction')}
                className="p-1 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#251e1a] cursor-pointer"
                title="Minimizar / Expandir"
              >
                {collapsedSections.construction ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!collapsedSections.construction && (
            <div className="p-4 sm:p-6">
              {ongoingConstructions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {ongoingConstructions.map((obra) => (
                    <div
                      key={obra.id}
                      onClick={() => handleNav('projects')}
                      className="p-4 rounded-2xl bg-[#12100e] border border-[#2e2621] hover:border-amber-500/40 transition-all cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-[#fcf8f5] truncate">{obra.title}</h4>
                          <p className="text-[11px] text-[#a89c93] truncate">{obra.clientName || 'Cliente'}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Em Obra
                        </span>
                      </div>

                      {obra.description && (
                        <p className="text-xs text-[#a89c93] line-clamp-2">{obra.description}</p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-[#8c827a] pt-1 border-t border-[#251e1a]">
                        <span>Prazo: {obra.deliveryDate ? formatDate(obra.deliveryDate) : 'Acompanhamento'}</span>
                        <span className="text-amber-400 font-semibold">Ver detalhes →</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#a89c93] flex flex-col items-center justify-center gap-2 border border-dashed border-[#3d342f] rounded-xl">
                  <Building2 className="w-6 h-6 text-[#6b625b]" />
                  <span>Nenhuma obra em andamento registrada no momento.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTOR 7: CRM — LEADS & FOLLOW-UPS */}
      {/* ========================================================================= */}
      {sectorsConfig.crm_followup && (
        <div className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#3d342f]/80 bg-[#161311]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#fcf8f5]">CRM — Leads & Oportunidades</h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNav('leads')}
                className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Abrir CRM</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleSectionCollapse('crm_followup')}
                className="p-1 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#251e1a] cursor-pointer"
                title="Minimizar / Expandir"
              >
                {collapsedSections.crm_followup ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!collapsedSections.crm_followup && (
            <div className="p-4 sm:p-6">
              {activeLeads.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {activeLeads.map((lead) => {
                    const cleanPhone = (lead.phone || lead.whatsapp || '').replace(/\D/g, '');
                    return (
                      <div
                        key={lead.id}
                        className="p-4 rounded-2xl bg-[#12100e] border border-[#2e2621] hover:border-teal-500/40 transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-[#fcf8f5]">{lead.name}</h4>
                            <p className="text-[11px] text-[#a89c93]">{lead.serviceType || lead.projectType || 'Projeto de Arquitetura'}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30">
                            {lead.pipelineStage || 'Em Contato'}
                          </span>
                        </div>

                        {lead.estimatedValue ? (
                          <div className="text-xs text-[#ded7d1]">
                            Valor Estimado: <strong className="text-emerald-400">{formatCurrency(lead.estimatedValue)}</strong>
                          </div>
                        ) : null}

                        {cleanPhone ? (
                          <div className="flex items-center gap-2">
                            <a
                              href={`https://wa.me/55${cleanPhone}?text=${encodeURIComponent(
                                `Olá ${lead.name}, tudo bem? Sou do escritório ${architectProfile.name || 'de Arquitetura'}. Gostaria de dar seguimento à sua solicitação de projeto.`
                              )}`}
                              target="_blank"
                              rel="noreferrer"
                              className="w-full py-2 bg-[#25d366]/15 hover:bg-[#25d366]/25 text-[#25d366] border border-[#25d366]/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>Chamar no WhatsApp</span>
                            </a>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#a89c93] flex flex-col items-center justify-center gap-2 border border-dashed border-[#3d342f] rounded-xl">
                  <Users className="w-6 h-6 text-[#6b625b]" />
                  <span>Nenhum lead em negociação no momento.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PERSONALIZAR SETORES */}
      {/* ========================================================================= */}
      {showCustomizeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in">
          <div className="bg-[#1c1815] text-[#fcf8f5] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[#3d342f] flex flex-col">
            <div className="p-5 bg-[#14110f] border-b border-[#3d342f] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-[var(--theme-primary)]" />
                <h3 className="text-base font-bold text-[#fcf8f5]">Personalizar Setores do Painel</h3>
              </div>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="p-1 text-[#a89c93] hover:text-[#fcf8f5] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-[#a89c93] mb-4">
                Selecione os blocos e setores que deseja visualizar no Painel do Escritório:
              </p>

              {[
                { key: 'finance', label: 'Financeiro de Hoje (A receber / A pagar)', icon: DollarSign },
                { key: 'tasks', label: 'Tarefas de Hoje (DO DIA)', icon: CheckCircle2 },
                { key: 'team_activity', label: 'Equipe & Projetos do Escritório', icon: Users },
                { key: 'projects', label: 'Projetos (Filtros por Prazo e Status)', icon: FolderOpen },
                { key: 'week_calendar', label: 'Agenda da Semana (7 dias)', icon: Calendar },
                { key: 'construction', label: 'Obras em Andamento', icon: Building2 },
                { key: 'crm_followup', label: 'CRM — Leads & Oportunidades', icon: Users },
              ].map((item) => {
                const ItemIcon = item.icon;
                const isChecked = (sectorsConfig as any)[item.key];
                return (
                  <label
                    key={item.key}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-[#251e1a] border-[var(--theme-primary)]/50 text-[#fcf8f5]'
                        : 'bg-[#12100e] border-[#2e2621] text-[#6b625b]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ItemIcon className={`w-4 h-4 ${isChecked ? 'text-[var(--theme-primary)]' : 'text-[#6b625b]'}`} />
                      <span className="text-xs font-semibold">{item.label}</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) =>
                        saveSectorsConfig({
                          ...sectorsConfig,
                          [item.key]: e.target.checked,
                        })
                      }
                      className="w-4 h-4 accent-[var(--theme-primary)] rounded cursor-pointer"
                    />
                  </label>
                );
              })}
            </div>

            <div className="p-4 bg-[#14110f] border-t border-[#3d342f] flex justify-end">
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="px-5 py-2.5 bg-[var(--theme-primary)] hover:opacity-90 text-black text-xs font-bold rounded-xl cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ALTERAR PROJETO DO INTEGRANTE */}
      {/* ========================================================================= */}
      {editingAllocation && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in">
          <div className="bg-[#1c1815] text-[#fcf8f5] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-[#3d342f] flex flex-col">
            <div className="p-5 bg-[#14110f] border-b border-[#3d342f] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-black"
                  style={{ backgroundColor: editingAllocation.color || '#c58a4b' }}
                >
                  {editingAllocation.initials}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#fcf8f5]">{editingAllocation.memberName}</h3>
                  <p className="text-[10px] text-[#a89c93]">{editingAllocation.roleTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAllocation(null)}
                className="p-1 text-[#a89c93] hover:text-[#fcf8f5] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Select from existing office projects */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#a89c93]">Selecionar Projeto do Escritório</label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    const found = architectureProjects.find((p) => p.id === e.target.value);
                    if (found) {
                      setCustomProjectTitle(found.title);
                      setSelectedStage(found.status === 'obra' ? 'Acompanhamento de Obra' : found.status === 'executivo' ? 'Projeto Executivo' : 'Estudo Preliminar');
                    }
                  }}
                  className="w-full px-3.5 py-2.5 bg-[#0e0c0b] border border-[#3d342f] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                >
                  <option value="">-- Outro / Título personalizado --</option>
                  {architectureProjects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.title} ({proj.clientName || 'Cliente'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#a89c93]">Nome do Projeto</label>
                <input
                  type="text"
                  value={customProjectTitle}
                  onChange={(e) => setCustomProjectTitle(e.target.value)}
                  placeholder="Ex: Residência Alphaville - Suíte Master"
                  className="w-full px-3.5 py-2.5 bg-[#0e0c0b] border border-[#3d342f] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#a89c93]">Etapa / Fase Atual</label>
                <input
                  type="text"
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  placeholder="Ex: Projeto Executivo, Modelagem 3D, Detalhamento..."
                  className="w-full px-3.5 py-2.5 bg-[#0e0c0b] border border-[#3d342f] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#a89c93]">Atividade / Tarefa Específica</label>
                <textarea
                  rows={3}
                  value={customTaskDetail}
                  onChange={(e) => setCustomTaskDetail(e.target.value)}
                  placeholder="Ex: Modelagem 3D da cozinha e detalhamento de marcenaria"
                  className="w-full p-3 bg-[#0e0c0b] border border-[#3d342f] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                />
              </div>
            </div>

            <div className="p-4 bg-[#14110f] border-t border-[#3d342f] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingAllocation(null)}
                className="px-4 py-2 border border-[#3d342f] bg-[#1a1614] text-[#a89c93] hover:text-[#fcf8f5] text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveAllocation}
                className="px-5 py-2 bg-[var(--theme-primary)] hover:opacity-90 text-black text-xs font-bold rounded-xl cursor-pointer shadow-md"
              >
                Salvar Alteração
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
