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
  Play,
  Pause,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { AppAction, ArchitectureProject, Client, TeamMember } from '../../types';

// Live Team Member Activity Interface
export interface TeamLiveActivity {
  memberId: string;
  memberName: string;
  roleTitle: string;
  avatarUrl?: string;
  initials: string;
  color: string;
  status: 'active' | 'meeting' | 'site_visit' | 'modeling_3d' | 'detailing' | 'break';
  statusLabel: string;
  currentProject: string;
  currentTask: string;
  startedAt: string; // HH:MM or ISO
  elapsedMinutes?: number;
  lastUpdated: string;
}

const DEFAULT_SECTORS_CONFIG = {
  finance: true,
  tasks: true,
  team_activity: true,
  projects: true,
  week_calendar: true,
  construction: true,
  crm_followup: true,
  business_health: true,
};

const INITIAL_TEAM_ACTIVITIES: TeamLiveActivity[] = [
  {
    memberId: 'member_1',
    memberName: 'Laíne Paula Loureiro',
    roleTitle: 'Arquiteta Titular & Sócia',
    initials: 'LP',
    color: '#c58a4b',
    status: 'active',
    statusLabel: 'Em Produção',
    currentProject: 'Residência Alphaville',
    currentTask: 'Revisão final do Projeto Executivo e Aprovação de Marcenaria',
    startedAt: '09:00',
    lastUpdated: new Date().toISOString(),
  },
  {
    memberId: 'member_2',
    memberName: 'Maria Laura',
    roleTitle: 'Coordenadora de Projetos',
    initials: 'ML',
    color: '#8c7456',
    status: 'modeling_3d',
    statusLabel: 'Modelagem 3D & Render',
    currentProject: 'Apartamento Jardins 302',
    currentTask: 'Modelagem da Cozinha Gourmet Integrada e Renders no Lumion',
    startedAt: '10:15',
    lastUpdated: new Date().toISOString(),
  },
  {
    memberId: 'member_3',
    memberName: 'Carlos Eduardo',
    roleTitle: 'Arquiteto Desenvolvedor',
    initials: 'CE',
    color: '#4f7a61',
    status: 'detailing',
    statusLabel: 'Detalhamento Executivo',
    currentProject: 'Clínica Dermatológica Harmonia',
    currentTask: 'Detalhamento de paginação de piso, forro e pontos elétricos',
    startedAt: '08:45',
    lastUpdated: new Date().toISOString(),
  },
  {
    memberId: 'member_4',
    memberName: 'Beatriz Vasconcelos',
    roleTitle: 'Estagiária de Arquitetura',
    initials: 'BV',
    color: '#7b6194',
    status: 'site_visit',
    statusLabel: 'Visita Técnica / Medição',
    currentProject: 'Consultório Dr. Marcelo',
    currentTask: 'Levantamento métrico cadastral e conferência de pontos in loco',
    startedAt: '11:00',
    lastUpdated: new Date().toISOString(),
  },
];

interface BusinessDashboardTabProps {
  onNavigateTab?: (tab: string) => void;
}

export const BusinessDashboardTab: React.FC<BusinessDashboardTabProps> = ({ onNavigateTab }) => {
  const { user, profile } = useAuth();
  const {
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
    addTransaction,
    selectedMonth,
  } = useFinance();

  // Navigation handler
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
      const saved = localStorage.getItem('meu_escritorio_dashboard_sectors_v1');
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
      localStorage.setItem('meu_escritorio_dashboard_sectors_v1', JSON.stringify(newConfig));
    } catch (e) {
      console.warn('Could not save sectors config', e);
    }
  };

  // 2. Team Live Activities State
  const [teamActivities, setTeamActivities] = useState<TeamLiveActivity[]>(() => {
    try {
      const saved = localStorage.getItem('meu_escritorio_team_live_activities_v1');
      return saved ? JSON.parse(saved) : INITIAL_TEAM_ACTIVITIES;
    } catch {
      return INITIAL_TEAM_ACTIVITIES;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('meu_escritorio_team_live_activities_v1', JSON.stringify(teamActivities));
    } catch (e) {
      console.warn('Could not save team activities', e);
    }
  }, [teamActivities]);

  // Modal to update collaborator activity
  const [editingMemberActivity, setEditingMemberActivity] = useState<TeamLiveActivity | null>(null);
  const [editStatus, setEditStatus] = useState<TeamLiveActivity['status']>('active');
  const [editProject, setEditProject] = useState('');
  const [editTask, setEditTask] = useState('');

  const handleOpenEditActivity = (member: TeamLiveActivity) => {
    setEditingMemberActivity(member);
    setEditStatus(member.status);
    setEditProject(member.currentProject);
    setEditTask(member.currentTask);
  };

  const handleSaveMemberActivity = () => {
    if (!editingMemberActivity) return;
    const statusLabels: Record<TeamLiveActivity['status'], string> = {
      active: 'Em Produção',
      meeting: 'Em Reunião',
      site_visit: 'Visita Técnica / Obra',
      modeling_3d: 'Modelagem 3D & Render',
      detailing: 'Detalhamento Executivo',
      break: 'Pausa / Almoço',
    };

    const updated = teamActivities.map((m) =>
      m.memberId === editingMemberActivity.memberId
        ? {
            ...m,
            status: editStatus,
            statusLabel: statusLabels[editStatus],
            currentProject: editProject.trim() || 'Geral do Escritório',
            currentTask: editTask.trim() || 'Em atividades operacionais',
            lastUpdated: new Date().toISOString(),
          }
        : m
    );
    setTeamActivities(updated);
    setEditingMemberActivity(null);
  };

  // 3. Project Filter Pill State
  type ProjectFilterCategory = 'critico' | 'ok' | 'nao_iniciada' | 'pausa' | 'standby';
  const [projectFilter, setProjectFilter] = useState<ProjectFilterCategory>('critico');

  // 4. Quick Inline Task Input for "Tarefas de Hoje"
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [quickTaskCategory, setQuickTaskCategory] = useState<'Projeto' | 'Financeiro' | 'Obra' | 'Reunião' | 'Geral'>('Projeto');
  const [quickTaskPriority, setQuickTaskPriority] = useState<'high' | 'medium' | 'low'>('high');

  const handleAddQuickTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    const todayStr = new Date().toISOString().split('T')[0];
    addAppAction({
      title: quickTaskTitle.trim(),
      category: quickTaskCategory,
      priority: quickTaskPriority,
      completed: false,
      date: todayStr,
      dueDate: todayStr,
      time: '14:00',
      description: 'Adicionado diretamente pelo Painel do Escritório',
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
  // A receber hoje / no mês
  const receivablesToday = useMemo(() => {
    // Check installments
    const inst = projectInstallments.filter(
      (p) => !p.paid && (p.dueDate === todayIsoDate || p.dueDate.startsWith(selectedMonth))
    );
    // Check income transactions for today
    const tx = transactions.filter(
      (t) => t.type === 'income' && t.date === todayIsoDate
    );
    return {
      installments: inst,
      transactions: tx,
      total: inst.reduce((sum, i) => sum + (i.amount || 0), 0) + tx.reduce((sum, t) => sum + (t.amount || 0), 0),
    };
  }, [projectInstallments, transactions, todayIsoDate, selectedMonth]);

  // A pagar hoje / no mês
  const payablesToday = useMemo(() => {
    const tx = transactions.filter(
      (t) => t.type === 'expense' && (t.date === todayIsoDate || (t.isPending && t.date.startsWith(selectedMonth)))
    );
    return {
      transactions: tx,
      total: tx.reduce((sum, t) => sum + (t.amount || 0), 0),
    };
  }, [transactions, todayIsoDate, selectedMonth]);

  // 7. Tarefas de Hoje (DO DIA)
  const todayTasks = useMemo(() => {
    return actions.filter((a) => a.date === todayIsoDate || a.dueDate === todayIsoDate || (!a.completed && a.priority === 'high'));
  }, [actions, todayIsoDate]);

  const completedTodayTasks = useMemo(() => todayTasks.filter((t) => t.completed), [todayTasks]);
  const tasksPercentage = todayTasks.length > 0 ? Math.round((completedTodayTasks.length / todayTasks.length) * 100) : 0;

  // 8. Filtered Projects based on pill selection
  const filteredProjects = useMemo(() => {
    const active = architectureProjects.filter((p) => p.status !== 'completed');

    switch (projectFilter) {
      case 'critico':
        // Prazo crítico: deadlines overdue or within next 7 days, or high priority
        return active.filter((p) => {
          if (!p.deadline) return false;
          const diffDays = Math.ceil((new Date(p.deadline).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays <= 7 || p.status === 'delayed';
        });
      case 'ok':
        // Prazo ok: ongoing projects with healthy deadline (> 7 days)
        return active.filter((p) => {
          if (!p.deadline) return true;
          const diffDays = Math.ceil((new Date(p.deadline).getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          return diffDays > 7 && p.status !== 'delayed' && p.status !== 'paused';
        });
      case 'nao_iniciada':
        return active.filter((p) => p.progress === 0 || p.currentStage?.toLowerCase().includes('briefing') || p.status === 'planning');
      case 'pausa':
        return active.filter((p) => p.status === 'paused' || p.category?.toLowerCase().includes('pausa'));
      case 'standby':
        return active.filter((p) => p.status === 'on_hold' || p.category?.toLowerCase().includes('standby'));
      default:
        return active;
    }
  }, [architectureProjects, projectFilter, todayDate]);

  // 9. Agenda da Semana (7 Days calculation)
  const weekDays = useMemo(() => {
    const curr = new Date(todayDate);
    // Find Monday of current week
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

      // Find events/actions for this day
      const dayActions = actions.filter((a) => a.date === isoStr || a.dueDate === isoStr);
      const dayMilestones = projectMilestones.filter((m) => m.date === isoStr);

      days.push({
        label: dayNames[i],
        dayNum,
        isoStr,
        isToday,
        actions: dayActions,
        milestones: dayMilestones,
        isFree: dayActions.length === 0 && dayMilestones.length === 0,
      });
    }
    return days;
  }, [todayDate, todayIsoDate, actions, projectMilestones]);

  // 10. Obras em Andamento
  const ongoingConstructions = useMemo(() => {
    return architectureProjects.filter(
      (p) =>
        p.status === 'in_progress' &&
        (p.category?.toLowerCase().includes('obra') ||
          p.currentStage?.toLowerCase().includes('obra') ||
          p.currentStage?.toLowerCase().includes('execução') ||
          p.currentStage?.toLowerCase().includes('acompanhamento') ||
          p.constructionReports?.length > 0)
    );
  }, [architectureProjects]);

  // 11. CRM — Follow-ups Ativos
  const activeFollowups = useMemo(() => {
    return clients.filter(
      (c) =>
        c.status === 'lead' ||
        c.status === 'prospect' ||
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
            <span>O que precisa da sua atenção hoje</span>
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
      {/* SECTOR 1: FINANCEIRO DE HOJE */}
      {/* ========================================================================= */}
      {sectorsConfig.finance && (
        <div className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#3d342f]/80 bg-[#161311]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#fcf8f5]">Financeiro de Hoje</h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[#a89c93] bg-[#221c18] px-2.5 py-1 rounded-lg border border-[#3d342f]">
                {todayFormattedBR}
              </span>
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
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Card: A Receber */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-950/15 border border-emerald-500/20 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">A receber</span>
                  </div>
                  <span className="text-base sm:text-lg font-mono font-bold text-emerald-400">
                    {formatCurrency(receivablesToday.total)}
                  </span>
                </div>

                {receivablesToday.installments.length > 0 || receivablesToday.transactions.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {receivablesToday.installments.map((inst) => (
                      <div
                        key={inst.id}
                        className="p-2.5 rounded-xl bg-[#14110f]/80 border border-emerald-500/20 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-[#fcf8f5] truncate">{inst.projectTitle || 'Projeto'}</p>
                          <p className="text-[10px] text-[#a89c93] truncate">{inst.clientName || 'Cliente'}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-bold text-emerald-400 block">{formatCurrency(inst.amount)}</span>
                          <span className="text-[9px] text-emerald-400/80">Vence hoje</span>
                        </div>
                      </div>
                    ))}
                    {receivablesToday.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-xl bg-[#14110f]/80 border border-emerald-500/20 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-[#fcf8f5] truncate">{tx.description}</p>
                          <p className="text-[10px] text-[#a89c93] truncate">{tx.category}</p>
                        </div>
                        <span className="font-mono font-bold text-emerald-400 shrink-0">{formatCurrency(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[#a89c93] flex flex-col items-center justify-center gap-1">
                    <span>Nenhum lançamento nesta data.</span>
                    <button
                      onClick={() => handleNav('recebimentos')}
                      className="text-[11px] text-emerald-400 font-bold hover:underline cursor-pointer mt-1"
                    >
                      + Ver contas a receber
                    </button>
                  </div>
                )}
              </div>

              {/* Card: A Pagar */}
              <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/15 border border-rose-500/20 flex flex-col justify-between space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ArrowUpRight className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">A pagar</span>
                  </div>
                  <span className="text-base sm:text-lg font-mono font-bold text-rose-400">
                    {formatCurrency(payablesToday.total)}
                  </span>
                </div>

                {payablesToday.transactions.length > 0 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {payablesToday.transactions.map((tx) => (
                      <div
                        key={tx.id}
                        className="p-2.5 rounded-xl bg-[#14110f]/80 border border-rose-500/20 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-[#fcf8f5] truncate">{tx.description}</p>
                          <p className="text-[10px] text-[#a89c93] truncate">{tx.category}</p>
                        </div>
                        <span className="font-mono font-bold text-rose-400 shrink-0">{formatCurrency(tx.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[#a89c93] flex flex-col items-center justify-center gap-1">
                    <span>Nenhum lançamento nesta data.</span>
                    <button
                      onClick={() => handleNav('financeiro')}
                      className="text-[11px] text-rose-400 font-bold hover:underline cursor-pointer mt-1"
                    >
                      + Lançar nova despesa
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTOR 2: TAREFAS DE HOJE */}
      {/* ========================================================================= */}
      {sectorsConfig.tasks && (
        <div className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#3d342f]/80 bg-[#161311]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 text-[var(--theme-primary)] flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#fcf8f5]">Tarefas de Hoje</h2>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-[#a89c93]">
                <span>Planejadas <strong className="text-[#fcf8f5]">{todayTasks.length}</strong></span>
                <span>•</span>
                <span>Concluídas <strong className="text-emerald-400">{completedTodayTasks.length}</strong></span>
                <span className="px-2 py-0.5 rounded-full bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] font-bold text-[10px]">
                  {tasksPercentage}%
                </span>
              </div>
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
              {/* Quick Task Creator Input */}
              <form onSubmit={handleAddQuickTask} className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                <input
                  type="text"
                  placeholder="Adicionar nova tarefa ao DO DIA..."
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
                  {todayTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-[#1c1815] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => updateAppAction(task.id, { completed: !task.completed })}
                          className="cursor-pointer text-[#a89c93] hover:text-[var(--theme-primary)] shrink-0"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                        <span
                          className={`text-xs sm:text-sm truncate ${
                            task.completed ? 'line-through text-[#6b625b]' : 'text-[#fcf8f5] font-medium'
                          }`}
                        >
                          {task.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {task.category && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#251e1a] text-[#a89c93] border border-[#3d342f]">
                            {task.category}
                          </span>
                        )}
                        {task.priority === 'high' && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                            Alta
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
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#a89c93] flex flex-col items-center justify-center gap-2 border border-dashed border-[#3d342f] rounded-xl">
                  <CheckCircle2 className="w-6 h-6 text-[#6b625b]" />
                  <span>Nenhuma tarefa adicionada ao DO DIA.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTOR 3: O QUE CADA COLABORADOR ESTÁ FAZENDO NO MOMENTO (TEMPO REAL) */}
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
                  <span>Atividades da Equipe em Tempo Real</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[var(--theme-primary)] bg-[#251e1a] px-2.5 py-1 rounded-lg border border-[#3d342f]">
                {teamActivities.length} colaboradores
              </span>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {teamActivities.map((member) => {
                  const statusColors: Record<TeamLiveActivity['status'], { badge: string; dot: string }> = {
                    active: { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
                    meeting: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', dot: 'bg-amber-400' },
                    site_visit: { badge: 'bg-orange-500/15 text-orange-400 border-orange-500/30', dot: 'bg-orange-400' },
                    modeling_3d: { badge: 'bg-blue-500/15 text-blue-400 border-blue-500/30', dot: 'bg-blue-400' },
                    detailing: { badge: 'bg-purple-500/15 text-purple-400 border-purple-500/30', dot: 'bg-purple-400' },
                    break: { badge: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30', dot: 'bg-zinc-400' },
                  };

                  const colors = statusColors[member.status] || statusColors.active;

                  return (
                    <div
                      key={member.memberId}
                      className="p-4 rounded-2xl bg-[#12100e] border border-[#2e2621] hover:border-[var(--theme-primary)]/40 transition-all flex flex-col justify-between space-y-3 group"
                    >
                      {/* Member Top Bar */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold text-[#12100e] shrink-0 relative shadow-2xs"
                            style={{ backgroundColor: member.color || '#c58a4b' }}
                          >
                            {member.initials}
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#12100e] ${colors.dot}`}
                            />
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-xs sm:text-sm font-bold text-[#fcf8f5] truncate">{member.memberName}</h4>
                            <p className="text-[11px] text-[#a89c93] truncate">{member.roleTitle}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${colors.badge}`}>
                            {member.statusLabel}
                          </span>
                          <button
                            onClick={() => handleOpenEditActivity(member)}
                            className="p-1 rounded-lg text-[#a89c93] hover:text-[var(--theme-primary)] hover:bg-[#251e1a] cursor-pointer"
                            title="Atualizar atividade deste colaborador"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Current Activity Box */}
                      <div className="p-2.5 rounded-xl bg-[#1a1614] border border-[#3d342f]/80 space-y-1">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--theme-primary)] uppercase tracking-wider">
                          <Layers className="w-3 h-3" />
                          <span className="truncate">{member.currentProject}</span>
                        </div>
                        <p className="text-xs text-[#fcf8f5] font-medium leading-snug">{member.currentTask}</p>
                      </div>

                      {/* Footer: Start time & timer */}
                      <div className="flex items-center justify-between text-[10px] text-[#8c827a] pt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[var(--theme-primary)]" />
                          <span>Iniciado às {member.startedAt}</span>
                        </span>
                        <button
                          onClick={() => handleOpenEditActivity(member)}
                          className="text-[11px] font-bold text-[var(--theme-primary)] hover:underline cursor-pointer"
                        >
                          Atualizar status →
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
      {/* SECTOR 4: PROJETOS (COM FILTROS DE PRAZO DA REFERÊNCIA) */}
      {/* ========================================================================= */}
      {sectorsConfig.projects && (
        <div className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3 border-b border-[#3d342f]/80 bg-[#161311]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <FolderOpen className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#fcf8f5]">Projetos</h2>
            </div>

            {/* Filter Pills matching the reference screenshot */}
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'critico', label: 'Prazo crítico' },
                { id: 'ok', label: 'Prazo ok' },
                { id: 'nao_iniciada', label: 'Etapa não iniciada' },
                { id: 'pausa', label: 'Pausa cliente' },
                { id: 'standby', label: 'Standby' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setProjectFilter(tab.id as ProjectFilterCategory)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    projectFilter === tab.id
                      ? 'bg-[#251e1a] text-[#fcf8f5] border border-[var(--theme-primary)] shadow-2xs'
                      : 'bg-[#12100e] text-[#a89c93] border border-[#2d2520] hover:text-[#fcf8f5]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[#8c827a]">máximo 15</span>
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
            <div className="p-4 sm:p-6">
              {filteredProjects.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {filteredProjects.slice(0, 15).map((project) => (
                    <div
                      key={project.id}
                      onClick={() => handleNav('projects')}
                      className="p-4 rounded-2xl bg-[#12100e] border border-[#2e2621] hover:border-[var(--theme-primary)] transition-all cursor-pointer space-y-3 group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-[#fcf8f5] group-hover:text-[var(--theme-primary)] truncate transition-colors">
                            {project.title}
                          </h4>
                          <p className="text-[11px] text-[#a89c93] truncate">{project.clientName || 'Cliente'}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#251e1a] text-[var(--theme-primary)] border border-[#3d342f] shrink-0">
                          {project.currentStage || 'Em andamento'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-[#a89c93]">
                          <span>Progresso</span>
                          <span className="font-bold text-[#fcf8f5]">{project.progress || 0}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#251e1a] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-[var(--theme-primary)] transition-all"
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-[11px] text-[#8c827a] pt-1 border-t border-[#251e1a]">
                        <span>Prazo: {project.deadline ? formatDate(project.deadline) : 'A definir'}</span>
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
                  <span>Nenhum projeto nesta categoria.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTOR 5: AGENDA DA SEMANA (7 COLUNAS DA REFERÊNCIA) */}
      {/* ========================================================================= */}
      {sectorsConfig.week_calendar && (
        <div className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#3d342f]/80 bg-[#161311]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#fcf8f5]">Agenda da Semana</h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNav('today')}
                className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Abrir agenda</span>
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
            <div className="p-4 sm:p-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                {weekDays.map((day) => (
                  <div
                    key={day.isoStr}
                    onClick={() => handleNav('today')}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between min-h-[140px] ${
                      day.isToday
                        ? 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)] shadow-sm'
                        : 'bg-[#12100e] border-[#2e2621] hover:border-[#3d342f]'
                    }`}
                  >
                    <div className="flex items-center justify-between border-b border-[#2e2621]/60 pb-2">
                      <span className={`text-[10px] font-bold tracking-wider ${day.isToday ? 'text-[var(--theme-primary)]' : 'text-[#a89c93]'}`}>
                        {day.label}
                      </span>
                      <span className={`text-sm font-bold ${day.isToday ? 'text-[var(--theme-primary)]' : 'text-[#fcf8f5]'}`}>
                        {day.dayNum}
                      </span>
                    </div>

                    <div className="py-2 space-y-1.5 flex-1">
                      {day.actions.length > 0 ? (
                        day.actions.slice(0, 3).map((act) => (
                          <div
                            key={act.id}
                            className="p-1.5 rounded bg-[#1c1815] text-[10px] text-[#fcf8f5] truncate border border-[#3d342f]"
                            title={act.title}
                          >
                            • {act.title}
                          </div>
                        ))
                      ) : (
                        <div className="h-full flex items-center justify-center text-[11px] text-[#6b625b]">
                          Livre
                        </div>
                      )}
                    </div>

                    {day.isToday && (
                      <div className="text-[9px] font-bold uppercase text-center text-[var(--theme-primary)] pt-1">
                        Hoje
                      </div>
                    )}
                  </div>
                ))}
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
                          {obra.currentStage || 'Em Obra'}
                        </span>
                      </div>

                      {obra.notes && (
                        <p className="text-xs text-[#a89c93] line-clamp-2">{obra.notes}</p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-[#8c827a] pt-1 border-t border-[#251e1a]">
                        <span>Prazo: {obra.deadline ? formatDate(obra.deadline) : 'Acompanhamento'}</span>
                        <span className="text-amber-400 font-semibold">Ver detalhes →</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#a89c93] flex flex-col items-center justify-center gap-2 border border-dashed border-[#3d342f] rounded-xl">
                  <Building2 className="w-6 h-6 text-[#6b625b]" />
                  <span>Nenhuma obra em andamento.</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTOR 7: CRM — FOLLOW-UPS ATIVOS */}
      {/* ========================================================================= */}
      {sectorsConfig.crm_followup && (
        <div className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[#3d342f]/80 bg-[#161311]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[#fcf8f5]">CRM — Follow-ups Ativos</h2>
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
              {activeFollowups.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {activeFollowups.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-4 rounded-2xl bg-[#12100e] border border-[#2e2621] hover:border-teal-500/40 transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-[#fcf8f5]">{lead.name}</h4>
                          <p className="text-[11px] text-[#a89c93]">{lead.serviceType || 'Consultoria / Projeto'}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30">
                          Follow-up
                        </span>
                      </div>

                      {lead.phone && (
                        <div className="flex items-center gap-2">
                          <a
                            href={`https://wa.me/55${lead.phone.replace(/\D/g, '')}?text=${encodeURIComponent(
                              `Olá ${lead.name}, tudo bem? Gostaria de saber se você teve a oportunidade de avaliar nossa proposta de projeto.`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="w-full py-2 bg-[#25d366]/15 hover:bg-[#25d366]/25 text-[#25d366] border border-[#25d366]/30 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>Chamar no WhatsApp</span>
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[#a89c93] flex flex-col items-center justify-center gap-2 border border-dashed border-[#3d342f] rounded-xl">
                  <Users className="w-6 h-6 text-[#6b625b]" />
                  <span>Nenhum lead na coluna Follow-up Ativo.</span>
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
                { key: 'team_activity', label: 'Atividades da Equipe em Tempo Real', icon: Users },
                { key: 'projects', label: 'Projetos (Filtros por Prazo e Status)', icon: FolderOpen },
                { key: 'week_calendar', label: 'Agenda da Semana (7 dias)', icon: Calendar },
                { key: 'construction', label: 'Obras em Andamento', icon: Building2 },
                { key: 'crm_followup', label: 'CRM — Follow-ups Ativos', icon: Users },
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
      {/* MODAL: EDITAR ATIVIDADE DO COLABORADOR */}
      {/* ========================================================================= */}
      {editingMemberActivity && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in">
          <div className="bg-[#1c1815] text-[#fcf8f5] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-[#3d342f] flex flex-col">
            <div className="p-5 bg-[#14110f] border-b border-[#3d342f] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-black"
                  style={{ backgroundColor: editingMemberActivity.color || '#c58a4b' }}
                >
                  {editingMemberActivity.initials}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#fcf8f5]">{editingMemberActivity.memberName}</h3>
                  <p className="text-[10px] text-[#a89c93]">{editingMemberActivity.roleTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingMemberActivity(null)}
                className="p-1 text-[#a89c93] hover:text-[#fcf8f5] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#a89c93]">Status do momento</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'active', label: '🟢 Em Produção' },
                    { id: 'modeling_3d', label: '🔵 Modelagem 3D' },
                    { id: 'detailing', label: '🟣 Detalhamento' },
                    { id: 'site_visit', label: '🟠 Visita Técnica' },
                    { id: 'meeting', label: '🟡 Em Reunião' },
                    { id: 'break', label: '⚪ Pausa / Almoço' },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setEditStatus(s.id as any)}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all cursor-pointer ${
                        editStatus === s.id
                          ? 'bg-[var(--theme-primary)] text-black font-bold shadow-xs'
                          : 'bg-[#0e0c0b] text-[#a89c93] border border-[#3d342f] hover:text-[#fcf8f5]'
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#a89c93]">Projeto em andamento</label>
                <input
                  type="text"
                  value={editProject}
                  onChange={(e) => setEditProject(e.target.value)}
                  placeholder="Ex: Residência Alphaville - Suíte Master"
                  className="w-full px-3.5 py-2.5 bg-[#0e0c0b] border border-[#3d342f] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#a89c93]">O que está fazendo agora (detalhe)</label>
                <textarea
                  rows={3}
                  value={editTask}
                  onChange={(e) => setEditTask(e.target.value)}
                  placeholder="Ex: Modelagem 3D do closet e renderização de vistas principais no Lumion"
                  className="w-full p-3 bg-[#0e0c0b] border border-[#3d342f] rounded-xl text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                />
              </div>
            </div>

            <div className="p-4 bg-[#14110f] border-t border-[#3d342f] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingMemberActivity(null)}
                className="px-4 py-2 border border-[#3d342f] bg-[#1a1614] text-[#a89c93] hover:text-[#fcf8f5] text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveMemberActivity}
                className="px-5 py-2 bg-[var(--theme-primary)] hover:opacity-90 text-black text-xs font-bold rounded-xl cursor-pointer shadow-md"
              >
                Salvar Atividade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
