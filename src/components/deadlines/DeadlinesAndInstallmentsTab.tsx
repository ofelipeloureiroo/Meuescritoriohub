import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bell,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  ExternalLink,
  Filter,
  Layers,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  User,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ArchitectureProject, ProjectInstallment, ProjectMilestone } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { NotifyClientModal } from './NotifyClientModal';
import { ReceiveInstallmentModal } from './ReceiveInstallmentModal';
import { NewInstallmentModal } from './NewInstallmentModal';
import { NewMilestoneModal } from './NewMilestoneModal';
import { NewReportModal } from './NewReportModal';

interface DeadlinesAndInstallmentsTabProps {
  onNavigateToProject?: (projectId: string) => void;
}

type SubTabType = 'ongoing' | 'installments' | 'milestones' | 'quick_notify';

export const DeadlinesAndInstallmentsTab: React.FC<DeadlinesAndInstallmentsTabProps> = ({
  onNavigateToProject,
}) => {
  const {
    architectureProjects,
    projectInstallments,
    projectMilestones,
    deleteProjectInstallment,
    deleteProjectMilestone,
    toggleProjectMilestone,
    dueSoonInstallments,
    overdueInstallments,
    pendingInstallments,
    totalPendingInstallmentsAmount,
    totalPaidInstallmentsAmount,
    dueSoonMilestones,
    overdueMilestones,
    ongoingArchitectureProjects,
    architectProfile,
    updateProjectStatus,
    addConstructionReport,
  } = useFinance();

  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('ongoing');
  const [searchTerm, setSearchTerm] = useState('');
  const [installmentFilter, setInstallmentFilter] = useState<'all' | 'due_soon' | 'overdue' | 'paid'>('all');
  const [milestoneFilter, setMilestoneFilter] = useState<'all' | 'due_soon' | 'overdue' | 'completed'>('all');

  // Modal States
  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [selectedNotifyInstallment, setSelectedNotifyInstallment] = useState<ProjectInstallment | null>(null);
  const [selectedNotifyMilestone, setSelectedNotifyMilestone] = useState<ProjectMilestone | null>(null);

  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedReceiveInstallment, setSelectedReceiveInstallment] = useState<ProjectInstallment | null>(null);

  const [newInstallmentModalOpen, setNewInstallmentModalOpen] = useState(false);
  const [newMilestoneModalOpen, setNewMilestoneModalOpen] = useState(false);
  const [newReportModalOpen, setNewReportModalOpen] = useState(false);
  const [selectedProjectForReport, setSelectedProjectForReport] = useState<ArchitectureProject | null>(null);
  const [modalDefaultProjectId, setModalDefaultProjectId] = useState<string | undefined>();

  // Helpers
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const getDaysDiff = (dateStr: string) => {
    if (!dateStr) return 0;
    const today = new Date(todayStr);
    const target = new Date(dateStr);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'briefing':
        return { label: 'Briefing & Levantamento', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' };
      case 'estudo_preliminar':
        return { label: 'Estudo Preliminar', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' };
      case 'anteprojeto':
        return { label: 'Anteprojeto 3D', color: 'bg-[#c58a4b]/20 text-[#d49454] border-[#c58a4b]/40' };
      case 'executivo':
        return { label: 'Projeto Executivo', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30' };
      case 'obra':
        return { label: 'Acompanhamento de Obra', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' };
      case 'entregue':
        return { label: 'Entregue / Concluído', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };
      default:
        return { label: stage, color: 'bg-[#241e1b] text-[#a89c93] border-[#3d342f]' };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return { label: 'Urgente', color: 'bg-rose-500/20 text-rose-300 border-rose-500/40' };
      case 'alta':
        return { label: 'Alta', color: 'bg-amber-500/20 text-amber-300 border-amber-500/40' };
      case 'media':
        return { label: 'Média', color: 'bg-blue-500/20 text-blue-300 border-blue-500/40' };
      case 'baixa':
      default:
        return { label: 'Baixa', color: 'bg-[#241e1b] text-[#a89c93] border-[#3d342f]' };
    }
  };

  // Filtered lists
  const filteredInstallments = useMemo(() => {
    return projectInstallments.filter((inst) => {
      const matchesSearch =
        inst.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        inst.description.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (installmentFilter === 'due_soon') {
        const diff = getDaysDiff(inst.dueDate);
        return inst.status !== 'paid' && diff >= 0 && diff <= 7;
      }
      if (installmentFilter === 'overdue') {
        return inst.status === 'overdue' || (inst.status !== 'paid' && inst.dueDate < todayStr);
      }
      if (installmentFilter === 'paid') {
        return inst.status === 'paid';
      }
      return true;
    });
  }, [projectInstallments, searchTerm, installmentFilter, todayStr]);

  const filteredMilestones = useMemo(() => {
    return projectMilestones.filter((ms) => {
      const matchesSearch =
        ms.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ms.projectTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ms.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      if (milestoneFilter === 'due_soon') {
        const diff = getDaysDiff(ms.dueDate);
        return !ms.completed && diff >= 0 && diff <= 7;
      }
      if (milestoneFilter === 'overdue') {
        return !ms.completed && ms.dueDate < todayStr;
      }
      if (milestoneFilter === 'completed') {
        return ms.completed;
      }
      return true;
    });
  }, [projectMilestones, searchTerm, milestoneFilter, todayStr]);

  // Handlers for modal triggers
  const handleOpenNotifyInstallment = (installment: ProjectInstallment) => {
    setSelectedNotifyInstallment(installment);
    setSelectedNotifyMilestone(null);
    setNotifyModalOpen(true);
  };

  const handleOpenNotifyMilestone = (milestone: ProjectMilestone) => {
    setSelectedNotifyMilestone(milestone);
    setSelectedNotifyInstallment(null);
    setNotifyModalOpen(true);
  };

  const handleOpenReceiveModal = (installment: ProjectInstallment) => {
    setSelectedReceiveInstallment(installment);
    setReceiveModalOpen(true);
  };

  const handleOpenNewInstallment = (projectId?: string) => {
    setModalDefaultProjectId(projectId);
    setNewInstallmentModalOpen(true);
  };

  const handleOpenNewMilestone = (projectId?: string) => {
    setModalDefaultProjectId(projectId);
    setNewMilestoneModalOpen(true);
  };

  return (
    <div className="space-y-7 pb-16">
      {/* Top Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <span
              className="text-xs uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-badge-text)',
                border: '1px solid var(--theme-badge-border)',
              }}
            >
              Gestão de Projetos & Cobrança
            </span>
            <span className="text-xs text-[#a89c93]">
              • {ongoingArchitectureProjects.length} Projetos Ativos
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#fcf8f5] tracking-tight">
            Prazos, Entregas & Cobrança de Clientes
          </h1>
          <p className="text-xs sm:text-sm text-[#a89c93] mt-1 max-w-3xl">
            Acompanhe o andamento de cada projeto, controle vencimentos de parcelas de honorários e avise seus clientes com mensagens prontas no WhatsApp com 1 clique.
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenNewMilestone()}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-[#241e1b] hover:bg-[#322924] text-[#fcf8f5] rounded-xl text-xs font-semibold border border-[#3d342f] transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Clock className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
            <span>+ Novo Prazo</span>
          </button>

          <button
            onClick={() => handleOpenNewInstallment()}
            className="flex items-center gap-2 px-4 py-2.5 text-black font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer active:scale-95 hover:brightness-110"
            style={{
              backgroundColor: 'var(--theme-primary)',
            }}
          >
            <CreditCard className="w-4 h-4" />
            <span>+ Nova Parcela</span>
          </button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Metric 1: Ongoing Projects */}
        <div
          onClick={() => setActiveSubTab('ongoing')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            activeSubTab === 'ongoing'
              ? 'bg-[#241e1b] border-[var(--theme-primary)]/60 shadow-lg ring-1 ring-[var(--theme-primary)]/30'
              : 'bg-[#1a1614] border-[#3d342f] hover:border-[#a89c93]/40'
          }`}
        >
          <div className="flex items-center justify-between text-[#a89c93] mb-2">
            <span className="text-xs font-medium">Projetos Ativos</span>
            <Building2 className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
          </div>
          <div className="text-2xl font-serif font-bold text-[#fcf8f5]">
            {ongoingArchitectureProjects.length}
          </div>
          <div className="text-[11px] text-[#a89c93] mt-1">
            {architectureProjects.length} projetos no total
          </div>
        </div>

        {/* Metric 2: Due Soon Installments (Next 7 Days) */}
        <div
          onClick={() => {
            setActiveSubTab('installments');
            setInstallmentFilter('due_soon');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            dueSoonInstallments.length > 0
              ? 'bg-amber-950/20 border-amber-600/40 hover:border-amber-500'
              : 'bg-[#1a1614] border-[#3d342f]'
          }`}
        >
          <div className="flex items-center justify-between text-amber-400 mb-2">
            <span className="text-xs font-medium">Vencendo (7 dias)</span>
            <Bell className="w-4 h-4 animate-bounce" />
          </div>
          <div className="text-2xl font-serif font-bold text-amber-300">
            {dueSoonInstallments.length}
          </div>
          <div className="text-[11px] text-amber-200/80 mt-1 font-semibold">
            {formatCurrency(dueSoonInstallments.reduce((s, i) => s + i.amount, 0))}
          </div>
        </div>

        {/* Metric 3: Overdue Installments */}
        <div
          onClick={() => {
            setActiveSubTab('installments');
            setInstallmentFilter('overdue');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            overdueInstallments.length > 0
              ? 'bg-rose-950/25 border-rose-600/50 hover:border-rose-500 animate-pulse'
              : 'bg-[#1a1614] border-[#3d342f]'
          }`}
        >
          <div className="flex items-center justify-between text-rose-400 mb-2">
            <span className="text-xs font-medium">Parcelas Vencidas</span>
            <AlertCircle className="w-4 h-4" />
          </div>
          <div className="text-2xl font-serif font-bold text-rose-400">
            {overdueInstallments.length}
          </div>
          <div className="text-[11px] text-rose-300/80 mt-1 font-semibold">
            {formatCurrency(overdueInstallments.reduce((s, i) => s + i.amount, 0))}
          </div>
        </div>

        {/* Metric 4: Milestones Due Soon */}
        <div
          onClick={() => {
            setActiveSubTab('milestones');
            setMilestoneFilter('due_soon');
          }}
          className={`p-4 rounded-2xl border transition-all cursor-pointer ${
            dueSoonMilestones.length > 0 || overdueMilestones.length > 0
              ? 'bg-[#241e1b] border-[#d48b8e]/50'
              : 'bg-[#1a1614] border-[#3d342f]'
          }`}
        >
          <div className="flex items-center justify-between text-[#d48b8e] mb-2">
            <span className="text-xs font-medium">Prazos Próximos</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-serif font-bold text-[#fcf8f5]">
            {dueSoonMilestones.length + overdueMilestones.length}
          </div>
          <div className="text-[11px] text-[#a89c93] mt-1">
            {overdueMilestones.length > 0 ? (
              <span className="text-rose-400 font-semibold">{overdueMilestones.length} atrasado(s)</span>
            ) : (
              'Entregas esta semana'
            )}
          </div>
        </div>

        {/* Metric 5: Total Pending Receivable */}
        <div
          onClick={() => {
            setActiveSubTab('installments');
            setInstallmentFilter('all');
          }}
          className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-[#1a1614] border border-[#3d342f] hover:border-[#a89c93]/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-emerald-400 mb-2">
            <span className="text-xs font-medium">Total a Receber</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-2xl font-serif font-bold text-emerald-400">
            {formatCurrency(totalPendingInstallmentsAmount)}
          </div>
          <div className="text-[11px] text-[#a89c93] mt-1">
            {formatCurrency(totalPaidInstallmentsAmount)} já recebido
          </div>
        </div>
      </div>

      {/* Immediate Attention Alert Banners (If any due soon or overdue) */}
      {(dueSoonInstallments.length > 0 || overdueInstallments.length > 0) && (
        <div className="space-y-3">
          {overdueInstallments.map((inst) => (
            <div
              key={inst.id}
              className="p-4 rounded-2xl bg-rose-950/30 border border-rose-600/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0 mt-0.5 sm:mt-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                      Cobrança Vencida
                    </span>
                    <span className="text-xs text-rose-200/70">
                      • Venceu em {formatDate(inst.dueDate)}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[#fcf8f5]">
                    {inst.clientName} — {inst.projectTitle} ({formatCurrency(inst.amount)})
                  </h4>
                  <p className="text-xs text-rose-200/80">
                    Parcela {inst.installmentNumber}/{inst.totalInstallments}: {inst.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => handleOpenNotifyInstallment(inst)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Avisar Cliente no WhatsApp</span>
                </button>
                <button
                  onClick={() => handleOpenReceiveModal(inst)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[#241e1b] hover:bg-[#322924] text-emerald-400 rounded-xl text-xs font-semibold border border-[#3d342f] transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Dar Baixa</span>
                </button>
              </div>
            </div>
          ))}

          {dueSoonInstallments.map((inst) => {
            const diff = getDaysDiff(inst.dueDate);
            return (
              <div
                key={inst.id}
                className="p-4 rounded-2xl bg-amber-950/25 border border-amber-600/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0 mt-0.5 sm:mt-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                        Vencimento Próximo
                      </span>
                      <span className="text-xs text-amber-200/70">
                        • {diff === 0 ? 'Vence HOJE!' : diff === 1 ? 'Vence amanhã!' : `Vence em ${diff} dias (${formatDate(inst.dueDate)})`}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#fcf8f5]">
                      {inst.clientName} — {inst.projectTitle} ({formatCurrency(inst.amount)})
                    </h4>
                    <p className="text-xs text-[#a89c93]">
                      Parcela {inst.installmentNumber}/{inst.totalInstallments}: {inst.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => handleOpenNotifyInstallment(inst)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Lembrete WhatsApp</span>
                  </button>
                  <button
                    onClick={() => handleOpenReceiveModal(inst)}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[#241e1b] hover:bg-[#322924] text-emerald-400 rounded-xl text-xs font-semibold border border-[#3d342f] transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Dar Baixa</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-Navigation & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[#3d342f]">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('ongoing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeSubTab === 'ongoing'
                ? 'bg-[#241e1b] font-bold shadow-sm'
                : 'text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#1a1614]'
            }`}
            style={
              activeSubTab === 'ongoing'
                ? {
                    color: 'var(--theme-primary)',
                    border: '1px solid var(--theme-primary)',
                  }
                : undefined
            }
          >
            <Building2 className="w-4 h-4" />
            <span>Projetos em Andamento</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#14110f] text-[#a89c93]">
              {ongoingArchitectureProjects.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('installments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeSubTab === 'installments'
                ? 'bg-[#241e1b] font-bold shadow-sm'
                : 'text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#1a1614]'
            }`}
            style={
              activeSubTab === 'installments'
                ? {
                    color: 'var(--theme-primary)',
                    border: '1px solid var(--theme-primary)',
                  }
                : undefined
            }
          >
            <CreditCard className="w-4 h-4" />
            <span>Cobranças & Parcelas</span>
            {pendingInstallments.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                {pendingInstallments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('milestones')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeSubTab === 'milestones'
                ? 'bg-[#241e1b] font-bold shadow-sm'
                : 'text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#1a1614]'
            }`}
            style={
              activeSubTab === 'milestones'
                ? {
                    color: 'var(--theme-primary)',
                    border: '1px solid var(--theme-primary)',
                  }
                : undefined
            }
          >
            <Clock className="w-4 h-4" />
            <span>Prazos & Entregas</span>
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#14110f] text-[#a89c93]">
              {projectMilestones.filter((m) => !m.completed).length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('quick_notify')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeSubTab === 'quick_notify'
                ? 'bg-[#241e1b] text-emerald-400 border border-emerald-500/40 font-bold shadow-sm'
                : 'text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#1a1614]'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-emerald-400" />
            <span>Central WhatsApp</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-[#a89c93] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar projeto, cliente ou etapa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#fcf8f5] placeholder-[#a89c93]/60 focus:outline-none focus:border-[#c58a4b]"
          />
        </div>
      </div>

      {/* VIEW 1: PROJETOS EM ANDAMENTO */}
      {activeSubTab === 'ongoing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {ongoingArchitectureProjects.map((project) => {
              const projectInsts = projectInstallments.filter(
                (i) => i.projectId === project.id || i.projectTitle === project.title
              );
              const projectMs = projectMilestones.filter(
                (m) => m.projectId === project.id || m.projectTitle === project.title
              );

              const totalHonorarios = project.honorarios || 0;
              const paidAmount = project.paidAmount || 0;
              const pendingAmount = Math.max(0, totalHonorarios - paidAmount);
              const progressPct = totalHonorarios > 0 ? Math.min(100, Math.round((paidAmount / totalHonorarios) * 100)) : 0;
              const stageInfo = getStageBadge(project.status);

              return (
                <div
                  key={project.id}
                  className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-xl hover:border-[#c58a4b]/40 transition-all flex flex-col justify-between group"
                >
                  <div>
                    {/* Project Top Bar */}
                    <div className="p-5 border-b border-[#3d342f] bg-[#14110f]/60">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <select
                            value={project.status}
                            onChange={(e) => updateProjectStatus(project.id, e.target.value as ArchitectureProject['status'])}
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border outline-none cursor-pointer appearance-none ${stageInfo.color}`}
                          >
                            <option value="estudo_preliminar">Estudo Preliminar</option>
                            <option value="anteprojeto">Anteprojeto 3D</option>
                            <option value="executivo">Projeto Executivo</option>
                            <option value="obra">Acompanhamento de Obra</option>
                            <option value="entregue">Entregue / Concluído</option>
                          </select>
                          <h3 className="text-lg font-serif font-bold text-[#fcf8f5] mt-2 group-hover:text-[#c58a4b] transition-colors">
                            {project.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[#a89c93] mt-1">
                            <span className="flex items-center gap-1">
                              <User className="w-3.5 h-3.5 text-[#d49454]" />
                              {project.clientName}
                            </span>
                            {project.location && (
                              <span>• {project.location}</span>
                            )}
                            {project.areaM2 && (
                              <span>• {project.areaM2} m²</span>
                            )}
                          </div>
                        </div>

                        {/* Project Cover Thumbnail */}
                        {project.coverImage && (
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[#3d342f]">
                            <img
                              src={project.coverImage}
                              alt={project.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                      </div>

                      {/* Financial Progress Bar */}
                      <div className="mt-4 pt-3 border-t border-[#3d342f]/80">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-[#a89c93]">Honorários do Projeto:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#fcf8f5]">{formatCurrency(totalHonorarios)}</span>
                            <span className="text-[11px] text-emerald-400 font-medium">({progressPct}% quitado)</span>
                          </div>
                        </div>
                        <div className="w-full bg-[#14110f] rounded-full h-2 overflow-hidden border border-[#3d342f]">
                          <div
                            className="bg-gradient-to-r from-[#c58a4b] to-emerald-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[#a89c93] mt-1.5">
                          <span>Recebido: <strong className="text-emerald-400">{formatCurrency(paidAmount)}</strong></span>
                          <span>A Receber: <strong className="text-amber-300">{formatCurrency(pendingAmount)}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Section: Milestones & Installments Mini-list */}
                    <div className="p-5 space-y-4">
                      {/* Reports (if in 'obra' status or has reports) */}
                      {(project.status === 'obra' || (project.reports && project.reports.length > 0)) && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              Relatórios de Obra
                            </span>
                            <button
                              onClick={() => {
                                setSelectedProjectForReport(project);
                                setNewReportModalOpen(true);
                              }}
                              className="text-[11px] text-[#a89c93] hover:text-[#fcf8f5] flex items-center gap-1 cursor-pointer bg-[#28221e] px-2 py-1 rounded-md border border-[#3d342f]"
                            >
                              <Plus className="w-3 h-3" /> Novo Relatório
                            </button>
                          </div>
                          {(!project.reports || project.reports.length === 0) ? (
                            <div className="text-xs text-[#a89c93]/60 italic py-1">
                              Nenhum relatório de obra adicionado.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {project.reports.slice(0, 2).map((rep) => (
                                <div key={rep.id} className="p-2.5 rounded-xl border bg-[#241e1b] border-[#3d342f] flex flex-col gap-1">
                                  <div className="flex items-center justify-between text-[10px] text-[#a89c93]">
                                    <span>{formatDate(rep.date)}</span>
                                    {rep.images && rep.images.length > 0 && <span>{rep.images.length} fotos</span>}
                                  </div>
                                  <p className="text-xs text-[#fcf8f5] line-clamp-2">{rep.text}</p>
                                </div>
                              ))}
                              {project.reports.length > 2 && (
                                <div className="text-[10px] text-center text-[#a89c93] mt-1 cursor-pointer hover:text-[#fcf8f5]">
                                  Ver todos os {project.reports.length} relatórios
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Upcoming Milestones */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-[#d49454] uppercase tracking-wider flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Próximos Prazos de Entrega
                          </span>
                          <button
                            onClick={() => handleOpenNewMilestone(project.id)}
                            className="text-[11px] text-[#a89c93] hover:text-[#fcf8f5] flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Adicionar Prazo
                          </button>
                        </div>

                        {projectMs.length === 0 ? (
                          <div className="text-xs text-[#a89c93]/60 italic py-1">
                            Nenhum prazo cadastrado para este projeto.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {projectMs.slice(0, 3).map((ms) => {
                              const diff = getDaysDiff(ms.dueDate);
                              const isOverdue = !ms.completed && diff < 0;
                              return (
                                <div
                                  key={ms.id}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                                    ms.completed
                                      ? 'bg-[#14110f]/40 border-[#3d342f]/40 opacity-70'
                                      : isOverdue
                                      ? 'bg-rose-950/20 border-rose-600/30'
                                      : 'bg-[#241e1b] border-[#3d342f]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <input
                                      type="checkbox"
                                      checked={ms.completed}
                                      onChange={() => toggleProjectMilestone(ms.id)}
                                      className="w-4 h-4 rounded text-[#c58a4b] bg-[#14110f] border-[#3d342f] focus:ring-[#c58a4b] cursor-pointer"
                                    />
                                    <div>
                                      <span className={ms.completed ? 'line-through text-[#a89c93]' : 'font-medium text-[#fcf8f5]'}>
                                        {ms.title}
                                      </span>
                                      <div className="text-[10px] text-[#a89c93]">
                                        Data limite: {formatDate(ms.dueDate)}{' '}
                                        {isOverdue && <span className="text-rose-400 font-bold">(Atrasado {Math.abs(diff)}d)</span>}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleOpenNotifyMilestone(ms)}
                                    title="Avisar cliente no WhatsApp"
                                    className="p-1 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Installments in this project */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-[#d49454] uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5" />
                            Parcelas de Honorários
                          </span>
                          <button
                            onClick={() => handleOpenNewInstallment(project.id)}
                            className="text-[11px] text-[#a89c93] hover:text-[#fcf8f5] flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Nova Parcela
                          </button>
                        </div>

                        {projectInsts.length === 0 ? (
                          <div className="text-xs text-[#a89c93]/60 italic py-1">
                            Nenhuma parcela registrada.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {projectInsts.map((inst) => {
                              const isPaid = inst.status === 'paid';
                              const diff = getDaysDiff(inst.dueDate);
                              const isOverdue = !isPaid && diff < 0;

                              return (
                                <div
                                  key={inst.id}
                                  className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                                    isPaid
                                      ? 'bg-emerald-950/15 border-emerald-600/30 text-[#a89c93]'
                                      : isOverdue
                                      ? 'bg-rose-950/20 border-rose-600/30'
                                      : 'bg-[#241e1b] border-[#3d342f]'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-[#fcf8f5]">
                                        {inst.installmentNumber}/{inst.totalInstallments} • {inst.description}
                                      </span>
                                      {isPaid ? (
                                        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                          PAGO
                                        </span>
                                      ) : isOverdue ? (
                                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                                          VENCIDO
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-amber-300 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                          Vence {formatDate(inst.dueDate)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-emerald-400 font-bold mt-0.5">
                                      {formatCurrency(inst.amount)}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {!isPaid && (
                                      <button
                                        onClick={() => handleOpenReceiveModal(inst)}
                                        className="px-2 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 rounded-lg text-[11px] font-bold border border-emerald-500/30 transition-colors cursor-pointer"
                                      >
                                        Dar Baixa
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleOpenNotifyInstallment(inst)}
                                      className="p-1.5 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
                                      title="Avisar no WhatsApp"
                                    >
                                      <MessageCircle className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Project Card Footer */}
                  <div className="px-5 py-3.5 bg-[#14110f] border-t border-[#3d342f] flex items-center justify-between text-xs">
                    <div className="text-[#a89c93]">
                      Cliente: <strong className="text-[#fcf8f5]">{project.clientName}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      {project.clientPhone && (
                        <a
                          href={`https://wa.me/55${project.clientPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 transition-colors"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: COBRANÇAS & PARCELAS */}
      {activeSubTab === 'installments' && (
        <div className="space-y-4">
          {/* Sub-Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#a89c93] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filtrar:
              </span>
              <div className="flex items-center gap-1 bg-[#1c1815] p-1 rounded-xl border border-[#3d342f]">
                <button
                  onClick={() => setInstallmentFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    installmentFilter === 'all'
                      ? 'bg-[#c58a4b] text-black font-bold'
                      : 'text-[#a89c93] hover:text-[#fcf8f5]'
                  }`}
                >
                  Todas ({projectInstallments.length})
                </button>
                <button
                  onClick={() => setInstallmentFilter('due_soon')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    installmentFilter === 'due_soon'
                      ? 'bg-amber-500 text-black font-bold'
                      : 'text-amber-300 hover:text-amber-200'
                  }`}
                >
                  A Vencer ({dueSoonInstallments.length})
                </button>
                <button
                  onClick={() => setInstallmentFilter('overdue')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    installmentFilter === 'overdue'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'text-rose-300 hover:text-rose-200'
                  }`}
                >
                  Vencidas ({overdueInstallments.length})
                </button>
                <button
                  onClick={() => setInstallmentFilter('paid')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    installmentFilter === 'paid'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  Pagas ({projectInstallments.filter((i) => i.status === 'paid').length})
                </button>
              </div>
            </div>

            <button
              onClick={() => handleOpenNewInstallment()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#c58a4b] hover:bg-[#d49454] text-black font-bold rounded-xl text-xs shadow transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Parcela</span>
            </button>
          </div>

          {/* Installments Table / Cards */}
          <div className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-xl">
            <div className="divide-y divide-[#3d342f]">
              {filteredInstallments.length === 0 ? (
                <div className="p-12 text-center text-[#a89c93]">
                  <CreditCard className="w-12 h-12 text-[#3d342f] mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#fcf8f5]">Nenhuma parcela encontrada</p>
                  <p className="text-xs text-[#a89c93] mt-1">
                    Tente ajustar o filtro ou adicione uma nova parcela de honorários.
                  </p>
                </div>
              ) : (
                filteredInstallments.map((inst) => {
                  const isPaid = inst.status === 'paid';
                  const diff = getDaysDiff(inst.dueDate);
                  const isOverdue = !isPaid && diff < 0;

                  return (
                    <div
                      key={inst.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#241e1b]/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-serif font-bold text-base text-[#fcf8f5]">
                            {inst.projectTitle}
                          </span>
                          <span className="text-xs text-[#a89c93]">
                            • Parcela {inst.installmentNumber} de {inst.totalInstallments}
                          </span>
                          {isPaid ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                              Recebido em {inst.paidDate ? formatDate(inst.paidDate) : ''}
                            </span>
                          ) : isOverdue ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              Vencida há {Math.abs(diff)} dias
                            </span>
                          ) : diff <= 7 ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Vence em {diff} dias
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#241e1b] text-[#a89c93] border border-[#3d342f]">
                              Vence {formatDate(inst.dueDate)}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[#a89c93]">
                          Cliente: <strong className="text-[#d49454]">{inst.clientName}</strong>
                          {inst.clientPhone && ` (${inst.clientPhone})`} • {inst.description}
                        </p>

                        {inst.notes && (
                          <p className="text-[11px] text-[#a89c93]/80 italic">
                            Obs: {inst.notes}
                          </p>
                        )}
                      </div>

                      {/* Right side: Amount & Action Buttons */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-left sm:text-right">
                          <div className="text-lg font-bold text-emerald-400 font-serif">
                            {formatCurrency(inst.amount)}
                          </div>
                          <div className="text-[11px] text-[#a89c93]">
                            Vencimento: {formatDate(inst.dueDate)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isPaid ? (
                            <button
                              onClick={() => handleOpenReceiveModal(inst)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer active:scale-95"
                            >
                              Dar Baixa
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-emerald-400 font-semibold px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <Check className="w-3.5 h-3.5" /> Pago
                            </span>
                          )}

                          <button
                            onClick={() => handleOpenNotifyInstallment(inst)}
                            title="Avisar cliente pelo WhatsApp"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#241e1b] hover:bg-[#322924] text-emerald-400 rounded-xl text-xs font-semibold border border-[#3d342f] transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">WhatsApp</span>
                          </button>

                          <button
                            onClick={() => deleteProjectInstallment(inst.id)}
                            title="Excluir parcela"
                            className="p-1.5 text-[#a89c93] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 3: PRAZOS & ENTREGAS (MILESTONES) */}
      {activeSubTab === 'milestones' && (
        <div className="space-y-4">
          {/* Sub-Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#a89c93] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filtrar:
              </span>
              <div className="flex items-center gap-1 bg-[#1c1815] p-1 rounded-xl border border-[#3d342f]">
                <button
                  onClick={() => setMilestoneFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    milestoneFilter === 'all'
                      ? 'bg-[#d48b8e] text-black font-bold'
                      : 'text-[#a89c93] hover:text-[#fcf8f5]'
                  }`}
                >
                  Todos ({projectMilestones.length})
                </button>
                <button
                  onClick={() => setMilestoneFilter('due_soon')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    milestoneFilter === 'due_soon'
                      ? 'bg-amber-500 text-black font-bold'
                      : 'text-amber-300 hover:text-amber-200'
                  }`}
                >
                  Próximos 7 dias ({dueSoonMilestones.length})
                </button>
                <button
                  onClick={() => setMilestoneFilter('overdue')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    milestoneFilter === 'overdue'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'text-rose-300 hover:text-rose-200'
                  }`}
                >
                  Atrasados ({overdueMilestones.length})
                </button>
                <button
                  onClick={() => setMilestoneFilter('completed')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    milestoneFilter === 'completed'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  Concluídos ({projectMilestones.filter((m) => m.completed).length})
                </button>
              </div>
            </div>

            <button
              onClick={() => handleOpenNewMilestone()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#d48b8e] hover:bg-[#e09fa2] text-black font-bold rounded-xl text-xs shadow transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Prazo</span>
            </button>
          </div>

          {/* Milestones List */}
          <div className="bg-[#1a1614] rounded-2xl border border-[#3d342f] overflow-hidden shadow-xl">
            <div className="divide-y divide-[#3d342f]">
              {filteredMilestones.length === 0 ? (
                <div className="p-12 text-center text-[#a89c93]">
                  <Clock className="w-12 h-12 text-[#3d342f] mx-auto mb-3" />
                  <p className="text-sm font-medium text-[#fcf8f5]">Nenhum prazo encontrado</p>
                  <p className="text-xs text-[#a89c93] mt-1">
                    Crie um novo prazo para acompanhar as entregas das etapas de projeto.
                  </p>
                </div>
              ) : (
                filteredMilestones.map((ms) => {
                  const diff = getDaysDiff(ms.dueDate);
                  const isOverdue = !ms.completed && diff < 0;
                  const stageInfo = getStageBadge(ms.stage);
                  const priorityInfo = getPriorityBadge(ms.priority);

                  return (
                    <div
                      key={ms.id}
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[#241e1b]/50 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <input
                          type="checkbox"
                          checked={ms.completed}
                          onChange={() => toggleProjectMilestone(ms.id)}
                          className="w-5 h-5 rounded text-[#c58a4b] bg-[#14110f] border-[#3d342f] focus:ring-[#c58a4b] cursor-pointer shrink-0 mt-0.5"
                        />
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`font-semibold text-sm ${
                                ms.completed ? 'line-through text-[#a89c93]' : 'text-[#fcf8f5]'
                              }`}
                            >
                              {ms.title}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${stageInfo.color}`}>
                              {stageInfo.label}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${priorityInfo.color}`}>
                              {priorityInfo.label}
                            </span>
                          </div>

                          <p className="text-xs text-[#a89c93]">
                            Projeto: <strong className="text-[#fcf8f5]">{ms.projectTitle}</strong> • Cliente: {ms.clientName}
                          </p>

                          {ms.notes && (
                            <p className="text-[11px] text-[#a89c93]/80 italic">
                              Checklist: {ms.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right side: Due Date & WhatsApp Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-left sm:text-right">
                          <div className="text-xs font-semibold text-[#fcf8f5]">
                            {formatDate(ms.dueDate)}
                          </div>
                          <div className="text-[11px]">
                            {ms.completed ? (
                              <span className="text-emerald-400 font-bold">Concluído</span>
                            ) : isOverdue ? (
                              <span className="text-rose-400 font-bold">Atrasado ({Math.abs(diff)} dias)</span>
                            ) : diff <= 7 ? (
                              <span className="text-amber-300 font-bold">Faltam {diff} dias</span>
                            ) : (
                              <span className="text-[#a89c93]">Em andamento</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenNotifyMilestone(ms)}
                            title="Avisar cliente no WhatsApp"
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#241e1b] hover:bg-[#322924] text-emerald-400 rounded-xl text-xs font-semibold border border-[#3d342f] transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Avisar</span>
                          </button>

                          <button
                            onClick={() => deleteProjectMilestone(ms.id)}
                            title="Excluir prazo"
                            className="p-1.5 text-[#a89c93] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: CENTRAL DE NOTIFICAÇÕES & WHATSAPP */}
      {activeSubTab === 'quick_notify' && (
        <div className="space-y-6">
          <div className="p-6 bg-[#1a1614] rounded-2xl border border-[#3d342f] shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[#fcf8f5]">
                  Central de Comunicação & Notificações WhatsApp
                </h3>
                <p className="text-xs text-[#a89c93]">
                  Mensagens automáticas e padronizadas para manter uma comunicação elegante, transparente e profissional com seus clientes.
                </p>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Template Card 1: Próximo Vencimento */}
              <div className="p-4 bg-[#241e1b] rounded-xl border border-[#3d342f] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#d49454] font-semibold text-xs mb-1">
                    <Clock className="w-3.5 h-3.5" /> Lembrete de Parcela a Vencer
                  </div>
                  <h4 className="text-sm font-bold text-[#fcf8f5]">Aviso de Vencimento Próximo</h4>
                  <p className="text-xs text-[#a89c93] mt-1 leading-relaxed">
                    Lembrete cortês 3 a 5 dias antes do vencimento com valor, chave PIX e detalhes da etapa.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const firstDue = dueSoonInstallments[0] || pendingInstallments[0];
                    if (firstDue) handleOpenNotifyInstallment(firstDue);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Disparar Lembrete</span>
                </button>
              </div>

              {/* Template Card 2: Confirmação de Recebimento */}
              <div className="p-4 bg-[#241e1b] rounded-xl border border-[#3d342f] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmação & Recibo
                  </div>
                  <h4 className="text-sm font-bold text-[#fcf8f5]">Agradecimento de Pagamento</h4>
                  <p className="text-xs text-[#a89c93] mt-1 leading-relaxed">
                    Confirmação imediata do recebimento da parcela e reforço dos próximos passos do projeto.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const firstPaid = projectInstallments.find((i) => i.status === 'paid') || projectInstallments[0];
                    if (firstPaid) handleOpenNotifyInstallment(firstPaid);
                  }}
                  className="w-full py-2 bg-[#1c1815] hover:bg-[#322924] text-emerald-400 rounded-lg text-xs font-bold border border-[#3d342f] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Gerar Recibo WhatsApp</span>
                </button>
              </div>

              {/* Template Card 3: Etapa Concluída */}
              <div className="p-4 bg-[#241e1b] rounded-xl border border-[#3d342f] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[#d48b8e] font-semibold text-xs mb-1">
                    <Sparkles className="w-3.5 h-3.5" /> Entrega de Etapa
                  </div>
                  <h4 className="text-sm font-bold text-[#fcf8f5]">Aviso de Etapa Pronta</h4>
                  <p className="text-xs text-[#a89c93] mt-1 leading-relaxed">
                    Notifica o cliente que o Anteprojeto 3D ou Projeto Executivo foi finalizado para apresentação.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const firstMs = projectMilestones[0];
                    if (firstMs) handleOpenNotifyMilestone(firstMs);
                  }}
                  className="w-full py-2 bg-[#d48b8e] hover:bg-[#e09fa2] text-black rounded-lg text-xs font-bold shadow transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Avisar Etapa Pronta</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global Context Modals */}
      <NotifyClientModal
        isOpen={notifyModalOpen}
        onClose={() => setNotifyModalOpen(false)}
        installment={selectedNotifyInstallment}
        milestone={selectedNotifyMilestone}
      />

      <ReceiveInstallmentModal
        isOpen={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        installment={selectedReceiveInstallment}
        onOpenReceiptWhatsApp={handleOpenNotifyInstallment}
      />

      <NewInstallmentModal
        isOpen={newInstallmentModalOpen}
        onClose={() => setNewInstallmentModalOpen(false)}
        defaultProjectId={modalDefaultProjectId}
      />

      <NewMilestoneModal
        isOpen={newMilestoneModalOpen}
        onClose={() => setNewMilestoneModalOpen(false)}
        defaultProjectId={modalDefaultProjectId}
      />

      <NewReportModal
        isOpen={newReportModalOpen}
        onClose={() => setNewReportModalOpen(false)}
        project={selectedProjectForReport}
      />
    </div>
  );
};
