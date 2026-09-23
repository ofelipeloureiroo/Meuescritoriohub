import React, { useState, useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Barcode,
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
  FileSignature,
  FileText,
  CheckSquare,
  Filter,
  Layers,
  MessageCircle,
  Pencil,
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
import { ArchitectureProject, ProjectInstallment, ProjectMilestone, WorkContract } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { NotifyClientModal } from './NotifyClientModal';
import { ReceiveInstallmentModal } from './ReceiveInstallmentModal';
import { NewInstallmentModal } from './NewInstallmentModal';
import { NewMilestoneModal } from './NewMilestoneModal';
import { NewReportModal } from './NewReportModal';
import { BoletoModal } from './BoletoModal';
import { WorkContractModal } from '../contracts/WorkContractModal';
import { NewContractModal } from '../contracts/NewContractModal';

interface DeadlinesAndInstallmentsTabProps {
  onNavigateToProject?: (projectId: string) => void;
}

type SubTabType = 'ongoing' | 'installments' | 'contracts' | 'milestones' | 'quick_notify';

export const DeadlinesAndInstallmentsTab: React.FC<DeadlinesAndInstallmentsTabProps> = ({
  onNavigateToProject,
}) => {
  const {
    architectureProjects,
    projectInstallments,
    projectMilestones,
    deleteProjectInstallment,
    updateProjectInstallment,
    deleteProjectMilestone,
    toggleProjectMilestone,
    architectProfile,
    updateProjectStatus,
    addConstructionReport,
    workContracts,
  } = useFinance();

  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('ongoing');
  const [searchTerm, setSearchTerm] = useState('');
  const [projectStatusFilter, setProjectStatusFilter] = useState<'all' | 'ongoing' | 'delivered'>('all');
  const [installmentFilter, setInstallmentFilter] = useState<'all' | 'due_soon' | 'overdue' | 'paid'>('all');
  const [milestoneFilter, setMilestoneFilter] = useState<'all' | 'due_soon' | 'overdue' | 'completed'>('all');
  const [contractFilter, setContractFilter] = useState<'all' | 'signed' | 'awaiting_payment' | 'paid' | 'completed' | 'draft'>('all');

  // Modal States
  const [selectedContractForModal, setSelectedContractForModal] = useState<WorkContract | null>(null);
  const [isWorkContractModalOpen, setIsWorkContractModalOpen] = useState(false);
  const [isNewContractModalOpen, setIsNewContractModalOpen] = useState(false);

  const [notifyModalOpen, setNotifyModalOpen] = useState(false);
  const [selectedNotifyInstallment, setSelectedNotifyInstallment] = useState<ProjectInstallment | null>(null);
  const [selectedNotifyMilestone, setSelectedNotifyMilestone] = useState<ProjectMilestone | null>(null);

  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedReceiveInstallment, setSelectedReceiveInstallment] = useState<ProjectInstallment | null>(null);

  const [boletoModalOpen, setBoletoModalOpen] = useState(false);
  const [selectedBoletoInstallment, setSelectedBoletoInstallment] = useState<ProjectInstallment | null>(null);

  const [newInstallmentModalOpen, setNewInstallmentModalOpen] = useState(false);
  const [installmentToEdit, setInstallmentToEdit] = useState<ProjectInstallment | null>(null);
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

  // Unified Installments combining explicit projectInstallments, workContracts, and project honorarios
  const allUnifiedInstallments = useMemo(() => {
    const list: ProjectInstallment[] = [...projectInstallments];

    (workContracts || []).forEach((contract) => {
      const hasRealInst = projectInstallments.some(
        (i) => (contract.projectId && i.projectId === contract.projectId) ||
               (contract.projectTitle && i.projectTitle && i.projectTitle.trim().toLowerCase() === contract.projectTitle.trim().toLowerCase())
      );
      if (!hasRealInst && contract.totalAmount > 0) {
        const isPaid = contract.status === 'completed' || contract.status === 'paid';
        const isOverdue = contract.status === 'awaiting_payment' && !!contract.deadline && contract.deadline < todayStr;

        list.push({
          id: `synth-contract-${contract.id}`,
          projectId: contract.projectId || '',
          projectTitle: contract.projectTitle || contract.title || 'Projeto',
          clientName: contract.clientName || 'Cliente',
          installmentNumber: 1,
          totalInstallments: 1,
          amount: contract.totalAmount,
          dueDate: contract.deadline || todayStr,
          status: isPaid ? 'paid' : isOverdue ? 'overdue' : 'pending',
          paidAmount: isPaid ? contract.totalAmount : 0,
          description: 'Contrato de Serviços (Honorários Integrais)',
          createdAt: todayStr,
        });
      }
    });

    (architectureProjects || []).forEach((proj) => {
      const hasInst = list.some(
        (i) => (i.projectId && i.projectId === proj.id) ||
               (i.projectTitle && proj.title && i.projectTitle.trim().toLowerCase() === proj.title.trim().toLowerCase())
      );
      if (!hasInst && proj.honorarios && proj.honorarios > 0) {
        const isDone = proj.status === 'entregue' || proj.status === 'concluido';
        list.push({
          id: `synth-proj-${proj.id}`,
          projectId: proj.id,
          projectTitle: proj.title,
          clientName: proj.clientName,
          installmentNumber: 1,
          totalInstallments: 1,
          amount: proj.honorarios,
          dueDate: proj.deliveryDate || todayStr,
          status: isDone ? 'paid' : 'pending',
          paidAmount: isDone ? proj.honorarios : (proj.paidAmount || 0),
          description: 'Honorários de Projeto Técnico',
          createdAt: todayStr,
        });
      }
    });

    return list;
  }, [projectInstallments, workContracts, architectureProjects, todayStr]);

  // Unified Milestones combining explicit projectMilestones, workflow stages, and project delivery dates
  const allUnifiedMilestones = useMemo(() => {
    const list: ProjectMilestone[] = [...projectMilestones];

    (architectureProjects || []).forEach((proj) => {
      if (proj.stages && proj.stages.length > 0) {
        proj.stages.forEach((stg, idx) => {
          const exists = projectMilestones.some(
            (m) => (m.projectId === proj.id || (m.projectTitle && proj.title && m.projectTitle.trim().toLowerCase() === proj.title.trim().toLowerCase())) &&
                   m.title.toLowerCase().includes(stg.name.toLowerCase())
          );
          if (!exists) {
            const isDone = stg.status === 'completed' || proj.status === 'entregue' || proj.status === 'concluido' || (stg.tasks && stg.tasks.length > 0 && stg.tasks.every((t) => t.status === 'completed'));
            list.push({
              id: `synth-stg-${proj.id}-${stg.id || idx}`,
              projectId: proj.id,
              projectTitle: proj.title,
              clientName: proj.clientName,
              title: `Etapa: ${stg.name}`,
              stage: stg.name,
              dueDate: stg.dueDate || proj.deliveryDate || todayStr,
              completed: isDone,
              priority: 'media',
              createdAt: todayStr,
            });
          }
        });
      } else {
        const exists = projectMilestones.some(
          (m) => m.projectId === proj.id || (m.projectTitle && proj.title && m.projectTitle.trim().toLowerCase() === proj.title.trim().toLowerCase())
        );
        if (!exists) {
          const isDone = proj.status === 'entregue' || proj.status === 'concluido';
          list.push({
            id: `synth-proj-ms-${proj.id}`,
            projectId: proj.id,
            projectTitle: proj.title,
            clientName: proj.clientName,
            title: 'Entrega Final do Projeto',
            stage: 'Entrega Final',
            dueDate: proj.deliveryDate || todayStr,
            completed: isDone,
            priority: 'alta',
            createdAt: todayStr,
          });
        }
      }
    });

    return list;
  }, [projectMilestones, architectureProjects, todayStr]);

  // KPI Calculations
  const totalPendingInstallmentsAmount = useMemo(() => {
    return allUnifiedInstallments.filter((i) => i.status !== 'paid').reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [allUnifiedInstallments]);

  const totalPaidInstallmentsAmount = useMemo(() => {
    return allUnifiedInstallments.filter((i) => i.status === 'paid').reduce((sum, i) => sum + (i.paidAmount || i.amount || 0), 0);
  }, [allUnifiedInstallments]);

  const dueSoonInstallments = useMemo(() => {
    return allUnifiedInstallments.filter((i) => {
      if (i.status === 'paid') return false;
      const diff = getDaysDiff(i.dueDate);
      return diff >= 0 && diff <= 7;
    });
  }, [allUnifiedInstallments, todayStr]);

  const overdueInstallments = useMemo(() => {
    return allUnifiedInstallments.filter((i) => {
      if (i.status === 'paid') return false;
      if (i.status === 'overdue') return true;
      return i.dueDate < todayStr;
    });
  }, [allUnifiedInstallments, todayStr]);

  const pendingInstallments = useMemo(() => {
    return allUnifiedInstallments.filter((i) => i.status !== 'paid');
  }, [allUnifiedInstallments]);

  const dueSoonMilestones = useMemo(() => {
    return allUnifiedMilestones.filter((m) => {
      if (m.completed) return false;
      const diff = getDaysDiff(m.dueDate);
      return diff >= 0 && diff <= 7;
    });
  }, [allUnifiedMilestones, todayStr]);

  const overdueMilestones = useMemo(() => {
    return allUnifiedMilestones.filter((m) => !m.completed && m.dueDate < todayStr);
  }, [allUnifiedMilestones, todayStr]);

  const getStageBadge = (stage: string) => {
    switch (stage) {
      case 'briefing':
        return { label: 'Briefing & Levantamento', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-300 border-blue-500/30' };
      case 'estudo_preliminar':
        return { label: 'Estudo Preliminar', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 border-indigo-500/30' };
      case 'anteprojeto':
        return { label: 'Anteprojeto 3D', color: 'bg-[#c58a4b]/15 text-[#c58a4b] dark:text-[#d49454] border-[#c58a4b]/30' };
      case 'executivo':
        return { label: 'Projeto Executivo', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30' };
      case 'obra':
        return { label: 'Acompanhamento de Obra', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-300 border-amber-500/30' };
      case 'entregue':
      case 'concluido':
        return { label: 'Entregue / Concluído', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/30' };
      default:
        return { label: stage, color: 'bg-[var(--bg-card-secondary)] text-[var(--text-muted)] border-[var(--border-color)]' };
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgente':
        return { label: 'Urgente', color: 'bg-rose-500/15 text-rose-600 dark:text-rose-300 border-rose-500/30' };
      case 'alta':
        return { label: 'Alta', color: 'bg-amber-500/15 text-amber-600 dark:text-amber-300 border-amber-500/30' };
      case 'media':
        return { label: 'Média', color: 'bg-blue-500/15 text-blue-600 dark:text-blue-300 border-blue-500/30' };
      case 'baixa':
      default:
        return { label: 'Baixa', color: 'bg-[var(--bg-card-secondary)] text-[var(--text-muted)] border-[var(--border-color)]' };
    }
  };

  // Filtered lists
  const filteredInstallments = useMemo(() => {
    return allUnifiedInstallments.filter((inst) => {
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
  }, [allUnifiedInstallments, searchTerm, installmentFilter, todayStr]);

  const filteredMilestones = useMemo(() => {
    return allUnifiedMilestones.filter((ms) => {
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
  }, [allUnifiedMilestones, searchTerm, milestoneFilter, todayStr]);

  const displayProjects = useMemo(() => {
    return (architectureProjects || []).filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.location && p.location.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchesSearch) return false;

      const isDelivered = p.status === 'entregue' || p.status === 'concluido';
      if (projectStatusFilter === 'ongoing') return !isDelivered;
      if (projectStatusFilter === 'delivered') return isDelivered;
      return true;
    });
  }, [architectureProjects, searchTerm, projectStatusFilter]);

  const getContractEffectiveStatus = (contract: WorkContract) => {
    if (contract.status === 'completed') return 'completed';
    // Check if linked project is completed
    const linkedArch = architectureProjects.find(
      (p) => (contract.projectId && p.id === contract.projectId) || 
             (contract.projectTitle && p.title && p.title.trim().toLowerCase() === contract.projectTitle.trim().toLowerCase())
    );
    if (linkedArch) {
      const isArchDone = (linkedArch.stages && linkedArch.stages.length > 0 && linkedArch.stages.every(s => s.status === 'completed' || (s.tasks && s.tasks.length > 0 && s.tasks.every(t => t.status === 'completed')))) || linkedArch.status === 'entregue' || linkedArch.status === 'concluido';
      if (isArchDone) return 'completed';
    }
    return contract.status;
  };

  const filteredContracts = useMemo(() => {
    return (workContracts || []).filter((c) => {
      const matchesSearch =
        (c.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.projectTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.clientName || '').toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const effStatus = getContractEffectiveStatus(c);
      if (contractFilter === 'all') return true;
      if (contractFilter === 'signed') return effStatus === 'signed';
      if (contractFilter === 'awaiting_payment') return effStatus === 'awaiting_payment';
      if (contractFilter === 'paid') return effStatus === 'paid';
      if (contractFilter === 'completed') return effStatus === 'completed';
      if (contractFilter === 'draft') return effStatus === 'draft' || effStatus === 'sent_for_signature';
      return true;
    });
  }, [workContracts, searchTerm, contractFilter, architectureProjects]);

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

  const handleOpenBoletoModal = (installment: ProjectInstallment) => {
    setSelectedBoletoInstallment(installment);
    setBoletoModalOpen(true);
  };

  const handleOpenNewInstallment = (projectId?: string) => {
    setModalDefaultProjectId(projectId);
    setNewInstallmentModalOpen(true);
  };

  const handleOpenNewMilestone = (projectId?: string) => {
    setModalDefaultProjectId(projectId);
    setNewMilestoneModalOpen(true);
  };

  const activeProjectsCount = (architectureProjects || []).filter((p) => p.status !== 'entregue' && p.status !== 'concluido').length;

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
            <span className="text-xs text-[var(--text-muted)]">
              • {activeProjectsCount} Projetos Ativos
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text-main)] tracking-tight">
            Prazos, Entregas & Cobrança de Clientes
          </h1>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 max-w-3xl">
            Acompanhe o andamento de cada projeto, controle vencimentos de parcelas de honorários e avise seus clientes com mensagens prontas no WhatsApp com 1 clique.
          </p>
        </div>

        {/* Global Quick Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleOpenNewMilestone()}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card-secondary)] text-[var(--text-main)] rounded-xl text-xs font-semibold border border-[var(--border-color)] transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Clock className="w-4 h-4 text-[var(--theme-accent)]" />
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
              ? 'bg-[var(--bg-card-secondary)] border-[var(--theme-primary)]/60 shadow-lg ring-1 ring-[var(--theme-primary)]/30'
              : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--text-muted)]/40'
          }`}
        >
          <div className="flex items-center justify-between text-[var(--text-muted)] mb-2">
            <span className="text-xs font-medium">Projetos Ativos</span>
            <Building2 className="w-4 h-4 text-[var(--theme-primary)]" />
          </div>
          <div className="text-2xl font-serif font-bold text-[var(--text-main)]">
            {activeProjectsCount}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
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
              ? 'bg-amber-500/10 border-amber-600/40 hover:border-amber-500 text-amber-600 dark:text-amber-300'
              : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--text-muted)]/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Vencendo (7 dias)</span>
            <Bell className="w-4 h-4 animate-bounce text-amber-500" />
          </div>
          <div className="text-2xl font-serif font-bold text-amber-600 dark:text-amber-400">
            {dueSoonInstallments.length}
          </div>
          <div className="text-[11px] mt-1 font-semibold text-amber-500 dark:text-amber-300">
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
              ? 'bg-rose-500/10 border-rose-600/50 hover:border-rose-500 animate-pulse text-rose-600 dark:text-rose-400'
              : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--text-muted)]/40'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium">Parcelas Vencidas</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-serif font-bold text-rose-600 dark:text-rose-400">
            {overdueInstallments.length}
          </div>
          <div className="text-[11px] mt-1 font-semibold text-rose-500 dark:text-rose-300">
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
              ? 'bg-[var(--bg-card-secondary)] border-rose-500/30'
              : 'bg-[var(--bg-card)] border-[var(--border-color)] hover:border-[var(--text-muted)]/40'
          }`}
        >
          <div className="flex items-center justify-between text-[#d48b8e] mb-2">
            <span className="text-xs font-medium">Prazos Próximos</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-serif font-bold text-[var(--text-main)]">
            {dueSoonMilestones.length + overdueMilestones.length}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
            {overdueMilestones.length > 0 ? (
              <span className="text-rose-600 dark:text-rose-400 font-semibold">{overdueMilestones.length} atrasado(s)</span>
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
          className="col-span-2 lg:col-span-1 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--text-muted)]/40 transition-all cursor-pointer"
        >
          <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
            <span className="text-xs font-medium">Total a Receber</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="text-2xl font-serif font-bold text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalPendingInstallmentsAmount)}
          </div>
          <div className="text-[11px] text-[var(--text-muted)] mt-1">
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
              className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0 mt-0.5 sm:mt-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-rose-600 dark:text-rose-300 uppercase tracking-wider">
                      Cobrança Vencida
                    </span>
                    <span className="text-xs text-rose-600/75 dark:text-rose-200/70">
                      • Venceu em {formatDate(inst.dueDate)}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">
                    {inst.clientName} — {inst.projectTitle} ({formatCurrency(inst.amount)})
                  </h4>
                  <p className="text-xs text-[var(--text-muted)]">
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
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-secondary)] text-emerald-500 dark:text-emerald-400 rounded-xl text-xs font-semibold border border-[var(--border-color)] transition-colors cursor-pointer"
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
                className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 mt-0.5 sm:mt-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-300 uppercase tracking-wider">
                        Vencimento Próximo
                      </span>
                      <span className="text-xs text-amber-600/75 dark:text-amber-200/70">
                        • {diff === 0 ? 'Vence HOJE!' : diff === 1 ? 'Vence amanhã!' : `Vence em ${diff} dias (${formatDate(inst.dueDate)})`}
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[var(--text-main)]">
                      {inst.clientName} — {inst.projectTitle} ({formatCurrency(inst.amount)})
                    </h4>
                    <p className="text-xs text-[var(--text-muted)]">
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
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-secondary)] text-emerald-500 dark:text-emerald-400 rounded-xl text-xs font-semibold border border-[var(--border-color)] transition-colors cursor-pointer"
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-[var(--border-color)]">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('ongoing')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeSubTab === 'ongoing'
                ? 'bg-[var(--bg-card-secondary)] font-bold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-secondary)]'
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
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--bg-card)] text-[var(--text-muted)] font-bold">
              {architectureProjects.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('installments')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeSubTab === 'installments'
                ? 'bg-[var(--bg-card-secondary)] font-bold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-secondary)]'
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
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/25 text-amber-500 dark:text-amber-300 font-bold">
                {pendingInstallments.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('contracts')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeSubTab === 'contracts'
                ? 'bg-[var(--bg-card-secondary)] font-bold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-secondary)]'
            }`}
            style={
              activeSubTab === 'contracts'
                ? {
                    color: 'var(--theme-primary)',
                    border: '1px solid var(--theme-primary)',
                  }
                : undefined
            }
          >
            <Layers className="w-4 h-4" />
            <span>Contratos & Assinaturas</span>
            {(workContracts || []).length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[#c58a4b]/20 text-[#c58a4b] font-bold">
                {(workContracts || []).length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('milestones')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeSubTab === 'milestones'
                ? 'bg-[var(--bg-card-secondary)] font-bold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-secondary)]'
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
            <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] bg-[var(--bg-card)] text-[var(--text-muted)] font-bold">
              {allUnifiedMilestones.filter((m) => !m.completed).length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('quick_notify')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeSubTab === 'quick_notify'
                ? 'bg-[var(--bg-card-secondary)] text-emerald-500 border border-emerald-500/40 font-bold shadow-sm'
                : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-secondary)]'
            }`}
          >
            <MessageCircle className="w-4 h-4 text-emerald-500" />
            <span>Central WhatsApp</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-[var(--text-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar projeto, cliente ou etapa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--theme-primary)]"
          />
        </div>
      </div>

      {/* VIEW 1: PROJETOS EM ANDAMENTO E ENTREGUES */}
      {activeSubTab === 'ongoing' && (
        <div className="space-y-6">
          {/* Status Filter Pills */}
          <div className="flex items-center gap-2 bg-[var(--bg-card)] p-1.5 rounded-xl border border-[var(--border-color)] w-fit">
            <button
              onClick={() => setProjectStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                projectStatusFilter === 'all'
                  ? 'bg-[var(--theme-primary)] text-black shadow-xs font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Todos ({architectureProjects.length})
            </button>
            <button
              onClick={() => setProjectStatusFilter('ongoing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                projectStatusFilter === 'ongoing'
                  ? 'bg-[var(--theme-primary)] text-black shadow-xs font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Em Andamento ({(architectureProjects || []).filter((p) => p.status !== 'entregue' && p.status !== 'concluido').length})
            </button>
            <button
              onClick={() => setProjectStatusFilter('delivered')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                projectStatusFilter === 'delivered'
                  ? 'bg-emerald-500 text-white shadow-xs font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Concluídos & Entregues ({(architectureProjects || []).filter((p) => p.status === 'entregue' || p.status === 'concluido').length})
            </button>
          </div>

          {displayProjects.length === 0 ? (
            <div className="p-12 text-center bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)]">
              <Building2 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-40" />
              <h3 className="text-base font-serif font-bold text-[var(--text-main)]">Nenhum projeto encontrado</h3>
              <p className="text-xs text-[var(--text-muted)] mt-1 max-w-md mx-auto">
                Não foram encontrados projetos para o filtro selecionado. Alterne entre os filtros acima ou cadastre um novo projeto.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayProjects.map((project) => {
                const isProjectDelivered = project.status === 'entregue' || project.status === 'concluido';
                const projectInsts = allUnifiedInstallments.filter(
                  (i) => i.projectId === project.id || (i.projectTitle && project.title && i.projectTitle.trim().toLowerCase() === project.title.trim().toLowerCase())
                );
                const projectMs = allUnifiedMilestones.filter(
                  (m) => m.projectId === project.id || (m.projectTitle && project.title && m.projectTitle.trim().toLowerCase() === project.title.trim().toLowerCase())
                );

                const totalHonorarios = project.honorarios || 0;
                const paidAmount = isProjectDelivered
                  ? totalHonorarios || project.paidAmount || 0
                  : project.paidAmount || 0;
                const pendingAmount = Math.max(0, totalHonorarios - paidAmount);
                const progressPct = totalHonorarios > 0 ? Math.min(100, Math.round((paidAmount / totalHonorarios) * 100)) : (isProjectDelivered ? 100 : 0);
                const stageInfo = getStageBadge(project.status);

                return (
                  <div
                    key={project.id}
                    className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-xl hover:border-[var(--theme-primary)]/40 transition-all flex flex-col justify-between group"
                  >
                  <div>
                    {/* Project Top Bar */}
                    <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-card-secondary)]/60">
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
                          <h3 className="text-lg font-serif font-bold text-[var(--text-main)] mt-2 group-hover:text-[var(--theme-primary)] transition-colors">
                            {project.title}
                          </h3>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
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
                          <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-[var(--border-color)]">
                            <img
                              src={project.coverImage}
                              alt={project.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          </div>
                        )}
                      </div>

                      {/* Financial Progress Bar */}
                      <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-[var(--text-muted)]">Honorários do Projeto:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--text-main)]">{formatCurrency(totalHonorarios)}</span>
                            <span className="text-[11px] text-emerald-500 font-medium">({progressPct}% quitado)</span>
                          </div>
                        </div>
                        <div className="w-full bg-[var(--bg-body)] rounded-full h-2 overflow-hidden border border-[var(--border-color)]">
                          <div
                            className="bg-gradient-to-r from-[#c58a4b] to-emerald-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mt-1.5">
                          <span>Recebido: <strong className="text-emerald-500">{formatCurrency(paidAmount)}</strong></span>
                          <span>A Receber: <strong className="text-amber-500">{formatCurrency(pendingAmount)}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Section: Milestones & Installments Mini-list */}
                    <div className="p-5 space-y-4">
                      {/* Reports (if in 'obra' status or has reports) */}
                      {(project.status === 'obra' || (project.reports && project.reports.length > 0)) && (
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              Relatórios de Obra
                            </span>
                            <button
                              onClick={() => {
                                setSelectedProjectForReport(project);
                                setNewReportModalOpen(true);
                              }}
                              className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer bg-[var(--bg-card)] px-2 py-1 rounded-md border border-[var(--border-color)]"
                            >
                              <Plus className="w-3 h-3" /> Novo Relatório
                            </button>
                          </div>
                          {(!project.reports || project.reports.length === 0) ? (
                            <div className="text-xs text-[var(--text-muted)]/60 italic py-1">
                              Nenhum relatório de obra adicionado.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {project.reports.slice(0, 2).map((rep) => (
                                <div key={rep.id} className="p-2.5 rounded-xl border bg-[var(--bg-card-secondary)] border-[var(--border-color)] flex flex-col gap-1">
                                  <div className="flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                                    <span>{formatDate(rep.date)}</span>
                                    {rep.images && rep.images.length > 0 && <span>{rep.images.length} fotos</span>}
                                  </div>
                                  <p className="text-xs text-[var(--text-main)] line-clamp-2">{rep.text}</p>
                                </div>
                              ))}
                              {project.reports.length > 2 && (
                                <div className="text-[10px] text-center text-[var(--text-muted)] mt-1 cursor-pointer hover:text-[var(--text-main)]">
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
                            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Adicionar Prazo
                          </button>
                        </div>

                        {projectMs.length === 0 ? (
                          <div className="text-xs text-[var(--text-muted)]/60 italic py-1">
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
                                      ? 'bg-[var(--bg-card-secondary)]/40 border-[var(--border-color)]/40 opacity-70'
                                      : isOverdue
                                      ? 'bg-rose-500/10 border-rose-500/30'
                                      : 'bg-[var(--bg-card-secondary)] border-[var(--border-color)]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <input
                                      type="checkbox"
                                      checked={ms.completed}
                                      onChange={() => toggleProjectMilestone(ms.id)}
                                      className="w-4 h-4 rounded text-[#c58a4b] bg-[var(--bg-body)] border-[var(--border-color)] focus:ring-[#c58a4b] cursor-pointer"
                                    />
                                    <div>
                                      <span className={ms.completed ? 'line-through text-[var(--text-muted)]' : 'font-medium text-[var(--text-main)]'}>
                                        {ms.title}
                                      </span>
                                      <div className="text-[10px] text-[var(--text-muted)]">
                                        Data limite: {formatDate(ms.dueDate)}{' '}
                                        {isOverdue && <span className="text-rose-500 font-bold">(Atrasado {Math.abs(diff)}d)</span>}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    onClick={() => handleOpenNotifyMilestone(ms)}
                                    title="Avisar cliente no WhatsApp"
                                    className="p-1 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
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
                            className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" /> Nova Parcela
                          </button>
                        </div>

                        {projectInsts.length === 0 ? (
                          <div className="text-xs text-[var(--text-muted)]/60 italic py-1">
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
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-[var(--text-muted)]'
                                      : isOverdue
                                      ? 'bg-rose-500/10 border-rose-500/30'
                                      : 'bg-[var(--bg-card-secondary)] border-[var(--border-color)]'
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-[var(--text-main)]">
                                        {inst.installmentNumber}/{inst.totalInstallments} • {inst.description}
                                      </span>
                                      {isPaid ? (
                                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                          PAGO
                                        </span>
                                      ) : isOverdue ? (
                                        <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                                          VENCIDO
                                        </span>
                                      ) : (
                                        <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                                          Vence {formatDate(inst.dueDate)}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[11px] text-emerald-500 font-bold mt-0.5">
                                      {formatCurrency(inst.amount)}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    <button
                                      onClick={() => setInstallmentToEdit(inst)}
                                      className="p-1.5 text-[var(--text-muted)] hover:text-[var(--theme-primary)] hover:bg-[var(--bg-card)] rounded-lg transition-colors cursor-pointer"
                                      title="Editar Parcela"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </button>
                                    {!isPaid && (
                                      <button
                                        onClick={() => handleOpenReceiveModal(inst)}
                                        className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-500 rounded-lg text-[11px] font-bold border border-emerald-500/30 transition-colors cursor-pointer"
                                      >
                                        Dar Baixa
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleOpenBoletoModal(inst)}
                                      className="p-1.5 text-amber-500 hover:bg-amber-500/20 rounded-lg transition-colors cursor-pointer"
                                      title="Gerar e Enviar Boleto Bancário"
                                    >
                                      <Barcode className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleOpenNotifyInstallment(inst)}
                                      className="p-1.5 text-emerald-500 hover:bg-emerald-500/20 rounded-lg transition-colors cursor-pointer"
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
                  <div className="px-5 py-3.5 bg-[var(--bg-card-secondary)] border-t border-[var(--border-color)] flex items-center justify-between text-xs">
                    <div className="text-[var(--text-muted)]">
                      Cliente: <strong className="text-[var(--text-main)]">{project.clientName}</strong>
                    </div>
                    <div className="flex items-center gap-2">
                      {project.clientPhone && (
                        <a
                          href={`https://wa.me/55${project.clientPhone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-500 border border-emerald-500/30 transition-colors"
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
        )}
      </div>
    )}

      {/* VIEW 2: COBRANÇAS & PARCELAS */}
      {activeSubTab === 'installments' && (
        <div className="space-y-4">
          {/* Sub-Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filtrar:
              </span>
              <div className="flex items-center gap-1 bg-[var(--bg-card-secondary)] p-1 rounded-xl border border-[var(--border-color)]">
                <button
                  onClick={() => setInstallmentFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    installmentFilter === 'all'
                      ? 'bg-[var(--theme-primary)] text-black font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  Todas ({allUnifiedInstallments.length})
                </button>
                <button
                  onClick={() => setInstallmentFilter('due_soon')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    installmentFilter === 'due_soon'
                      ? 'bg-amber-500 text-black font-bold'
                      : 'text-amber-500 hover:text-amber-400 dark:text-amber-300 dark:hover:text-amber-200'
                  }`}
                >
                  A Vencer ({dueSoonInstallments.length})
                </button>
                <button
                  onClick={() => setInstallmentFilter('overdue')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    installmentFilter === 'overdue'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'text-rose-500 hover:text-rose-400 dark:text-rose-300 dark:hover:text-rose-200'
                  }`}
                >
                  Vencidas ({overdueInstallments.length})
                </button>
                <button
                  onClick={() => setInstallmentFilter('paid')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    installmentFilter === 'paid'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-emerald-500 hover:text-emerald-400 dark:text-emerald-300 dark:hover:text-emerald-200'
                  }`}
                >
                  Pagas ({allUnifiedInstallments.filter((i) => i.status === 'paid').length})
                </button>
              </div>
            </div>

            <button
              onClick={() => handleOpenNewInstallment()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--theme-primary)] text-black font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer hover:brightness-110"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Parcela</span>
            </button>
          </div>

          {/* Installments Table / Cards */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-xl">
            <div className="divide-y divide-[var(--border-color)]">
              {filteredInstallments.length === 0 ? (
                <div className="p-12 text-center text-[var(--text-muted)]">
                  <CreditCard className="w-12 h-12 text-[var(--border-color)] mx-auto mb-3" />
                  <p className="text-sm font-medium text-[var(--text-main)]">Nenhuma parcela encontrada</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
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
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--bg-card-secondary)]/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-serif font-bold text-base text-[var(--text-main)]">
                            {inst.projectTitle}
                          </span>
                          <span className="text-xs text-[var(--text-muted)]">
                            • Parcela {inst.installmentNumber} de {inst.totalInstallments}
                          </span>
                          {isPaid ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                              Recebido em {inst.paidDate ? formatDate(inst.paidDate) : ''}
                            </span>
                          ) : isOverdue ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 border border-rose-500/30">
                              Vencida há {Math.abs(diff)} dias
                            </span>
                          ) : diff <= 7 ? (
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-500 border border-amber-500/30">
                              Vence em {diff} dias
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--bg-card-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]">
                              Vence {formatDate(inst.dueDate)}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-[var(--text-muted)]">
                          Cliente: <strong className="text-[var(--theme-accent)]">{inst.clientName}</strong>
                          {inst.clientPhone && ` (${inst.clientPhone})`} • {inst.description}
                        </p>

                        {inst.notes && (
                          <p className="text-[11px] text-[var(--text-muted)]/80 italic">
                            Obs: {inst.notes}
                          </p>
                        )}

                        {inst.boletoBarcode && (
                          <div className="inline-flex items-center gap-1.5 text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 rounded-md mt-1">
                            <Barcode className="w-3 h-3" />
                            <span>Boleto Gerado • Linha: <span className="font-mono text-amber-600 dark:text-amber-200">{inst.boletoBarcode.substring(0, 16)}...</span></span>
                          </div>
                        )}
                      </div>

                      {/* Right side: Amount & Action Buttons */}
                      <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                        <div className="text-left sm:text-right">
                          <div className="text-lg font-bold text-emerald-500 font-serif">
                            {formatCurrency(inst.amount)}
                          </div>
                          <div className="text-[11px] text-[var(--text-muted)]">
                            Vencimento: {formatDate(inst.dueDate)}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setInstallmentToEdit(inst)}
                            title="Editar detalhes da parcela"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card-secondary)] text-[var(--text-main)] hover:text-[var(--theme-primary)] rounded-xl text-xs font-semibold border border-[var(--border-color)] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          {!isPaid ? (
                            <button
                              onClick={() => handleOpenReceiveModal(inst)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow transition-all cursor-pointer active:scale-95"
                            >
                              Dar Baixa
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-emerald-500 font-semibold px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <Check className="w-3.5 h-3.5" /> Pago
                            </span>
                          )}

                          {/* Botão Gerar / Ver Boleto */}
                          <button
                            onClick={() => handleOpenBoletoModal(inst)}
                            title="Gerar boleto e enviar para o cliente"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card-secondary)] text-amber-500 hover:text-amber-400 rounded-xl text-xs font-bold border border-amber-500/30 hover:border-amber-500/60 shadow-xs transition-all cursor-pointer active:scale-95"
                          >
                            <Barcode className="w-3.5 h-3.5" />
                            <span>Boleto</span>
                          </button>

                          <button
                            onClick={() => handleOpenNotifyInstallment(inst)}
                            title="Avisar cliente pelo WhatsApp"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card-secondary)] text-emerald-500 dark:text-emerald-400 rounded-xl text-xs font-semibold border border-[var(--border-color)] transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden md:inline">WhatsApp</span>
                          </button>

                          <button
                            onClick={() => deleteProjectInstallment(inst.id)}
                            title="Excluir parcela"
                            className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
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

      {/* VIEW: CONTRATOS & ASSINATURAS */}
      {activeSubTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filtrar Status:
              </span>
              <div className="flex flex-wrap items-center gap-1 bg-[var(--bg-card-secondary)] p-1 rounded-xl border border-[var(--border-color)]">
                <button
                  onClick={() => setContractFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    contractFilter === 'all'
                      ? 'bg-[var(--theme-accent)] text-black font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  Todos ({(workContracts || []).length})
                </button>
                <button
                  onClick={() => setContractFilter('signed')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    contractFilter === 'signed'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-emerald-500 dark:text-emerald-400'
                  }`}
                >
                  Assinados
                </button>
                <button
                  onClick={() => setContractFilter('awaiting_payment')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    contractFilter === 'awaiting_payment'
                      ? 'bg-purple-600 text-white font-bold'
                      : 'text-purple-500 dark:text-purple-400'
                  }`}
                >
                  Aguardando Pagamento
                </button>
                <button
                  onClick={() => setContractFilter('paid')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    contractFilter === 'paid'
                      ? 'bg-teal-600 text-white font-bold'
                      : 'text-teal-500 dark:text-teal-400'
                  }`}
                >
                  Em Execução
                </button>
                <button
                  onClick={() => setContractFilter('completed')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    contractFilter === 'completed'
                      ? 'bg-emerald-700 text-white font-bold'
                      : 'text-emerald-600 dark:text-emerald-300'
                  }`}
                >
                  Pago & Entregue
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsNewContractModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Novo Contrato</span>
            </button>
          </div>

          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-xl">
            <div className="divide-y divide-[var(--border-color)]">
              {filteredContracts.length === 0 ? (
                <div className="p-12 text-center text-[var(--text-muted)]">
                  <FileText className="w-12 h-12 text-[var(--border-color)] mx-auto mb-3" />
                  <p className="text-sm font-medium">Nenhum contrato encontrado para este filtro.</p>
                </div>
              ) : (
                filteredContracts.map((c) => {
                  const effStatus = getContractEffectiveStatus(c);
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedContractForModal(c);
                        setIsWorkContractModalOpen(true);
                      }}
                      className="p-4 hover:bg-[var(--bg-card-secondary)]/50 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-600 font-bold shrink-0 mt-0.5">
                          <FileSignature className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-serif font-bold text-sm text-[var(--text-main)]">
                              {c.title}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                effStatus === 'signed'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                  : effStatus === 'awaiting_payment'
                                  ? 'bg-purple-50 text-purple-700 border-purple-300'
                                  : effStatus === 'paid'
                                  ? 'bg-teal-50 text-teal-700 border-teal-300'
                                  : effStatus === 'completed'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-400'
                                  : 'bg-stone-100 text-stone-700 border-stone-300'
                              }`}
                            >
                              {effStatus === 'signed'
                                ? 'Assinado ✓'
                                : effStatus === 'awaiting_payment'
                                ? 'Aguardando Pagamento'
                                : effStatus === 'paid'
                                ? 'Pago & Em Execução'
                                : effStatus === 'completed'
                                ? 'Pago & Entregue ✓'
                                : 'Minuta'}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--text-muted)] mt-0.5">
                            Cliente: <strong className="text-[var(--text-main)]">{c.clientName}</strong> • Projeto:{' '}
                            <strong className="text-[var(--text-main)]">{c.projectTitle}</strong>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-[var(--text-muted)] block">Valor Total</span>
                          <span className="font-serif font-bold text-sm text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(c.totalAmount)}
                          </span>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedContractForModal(c);
                            setIsWorkContractModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-amber-600 text-white hover:bg-amber-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        >
                          Gerenciar Contrato
                        </button>
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
              <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filtrar:
              </span>
              <div className="flex items-center gap-1 bg-[var(--bg-card-secondary)] p-1 rounded-xl border border-[var(--border-color)]">
                <button
                  onClick={() => setMilestoneFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    milestoneFilter === 'all'
                      ? 'bg-[var(--theme-accent)] text-black font-bold'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  Todos ({allUnifiedMilestones.length})
                </button>
                <button
                  onClick={() => setMilestoneFilter('due_soon')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    milestoneFilter === 'due_soon'
                      ? 'bg-amber-500 text-black font-bold'
                      : 'text-amber-500 hover:text-amber-400 dark:text-amber-300 dark:hover:text-amber-200'
                  }`}
                >
                  Próximos 7 dias ({dueSoonMilestones.length})
                </button>
                <button
                  onClick={() => setMilestoneFilter('overdue')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    milestoneFilter === 'overdue'
                      ? 'bg-rose-500 text-white font-bold'
                      : 'text-rose-500 hover:text-rose-400 dark:text-rose-300 dark:hover:text-rose-200'
                  }`}
                >
                  Atrasados ({overdueMilestones.length})
                </button>
                <button
                  onClick={() => setMilestoneFilter('completed')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    milestoneFilter === 'completed'
                      ? 'bg-emerald-600 text-white font-bold'
                      : 'text-emerald-500 hover:text-emerald-400 dark:text-emerald-300 dark:hover:text-emerald-200'
                  }`}
                >
                  Concluídos ({allUnifiedMilestones.filter((m) => m.completed).length})
                </button>
              </div>
            </div>

            <button
              onClick={() => handleOpenNewMilestone()}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[var(--theme-accent)] text-black font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer hover:brightness-110"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar Prazo</span>
            </button>
          </div>

          {/* Milestones List */}
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-xl">
            <div className="divide-y divide-[var(--border-color)]">
              {filteredMilestones.length === 0 ? (
                <div className="p-12 text-center text-[var(--text-muted)]">
                  <Clock className="w-12 h-12 text-[var(--border-color)] mx-auto mb-3" />
                  <p className="text-sm font-medium text-[var(--text-main)]">Nenhum prazo encontrado</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
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
                      className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--bg-card-secondary)]/50 transition-colors"
                    >
                      <div className="flex items-start gap-3.5">
                        <input
                          type="checkbox"
                          checked={ms.completed}
                          onChange={() => toggleProjectMilestone(ms.id)}
                          className="w-5 h-5 rounded text-[#c58a4b] bg-[var(--bg-body)] border-[var(--border-color)] focus:ring-[#c58a4b] cursor-pointer shrink-0 mt-0.5"
                        />
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`font-semibold text-sm ${
                                ms.completed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)]'
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

                          <p className="text-xs text-[var(--text-muted)]">
                            Projeto: <strong className="text-[var(--text-main)]">{ms.projectTitle}</strong> • Cliente: {ms.clientName}
                          </p>

                          {ms.notes && (
                            <p className="text-[11px] text-[var(--text-muted)]/80 italic">
                              Checklist: {ms.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Right side: Due Date & WhatsApp Action */}
                      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                        <div className="text-left sm:text-right">
                          <div className="text-xs font-semibold text-[var(--text-main)]">
                            {formatDate(ms.dueDate)}
                          </div>
                          <div className="text-[11px]">
                            {ms.completed ? (
                              <span className="text-emerald-500 font-bold">Concluído</span>
                            ) : isOverdue ? (
                              <span className="text-rose-500 font-bold">Atrasado ({Math.abs(diff)} dias)</span>
                            ) : diff <= 7 ? (
                              <span className="text-amber-500 font-bold">Faltam {diff} dias</span>
                            ) : (
                              <span className="text-[var(--text-muted)]">Em andamento</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenNotifyMilestone(ms)}
                            title="Avisar cliente no WhatsApp"
                            className="flex items-center gap-1 px-3 py-1.5 bg-[var(--bg-card)] hover:bg-[var(--bg-card-secondary)] text-emerald-500 rounded-xl text-xs font-semibold border border-[var(--border-color)] transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Avisar</span>
                          </button>

                          <button
                            onClick={() => deleteProjectMilestone(ms.id)}
                            title="Excluir prazo"
                            className="p-1.5 text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
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
          <div className="p-6 bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-[var(--text-main)]">
                  Central de Comunicação & Notificações WhatsApp
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Mensagens automáticas e padronizadas para manter uma comunicação elegante, transparente e profissional com seus clientes.
                </p>
              </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Template Card 1: Próximo Vencimento */}
              <div className="p-4 bg-[var(--bg-card-secondary)] rounded-xl border border-[var(--border-color)] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[var(--theme-accent)] font-semibold text-xs mb-1">
                    <Clock className="w-3.5 h-3.5" /> Lembrete de Parcela a Vencer
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">Aviso de Vencimento Próximo</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
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
              <div className="p-4 bg-[var(--bg-card-secondary)] rounded-xl border border-[var(--border-color)] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirmação & Recibo
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">Agradecimento de Pagamento</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
                    Confirmação imediata do recebimento da parcela e reforço dos próximos passos do projeto.
                  </p>
                </div>
                <button
                  onClick={() => {
                    const firstPaid = projectInstallments.find((i) => i.status === 'paid') || projectInstallments[0];
                    if (firstPaid) handleOpenNotifyInstallment(firstPaid);
                  }}
                  className="w-full py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-secondary)] text-emerald-500 dark:text-emerald-400 rounded-lg text-xs font-bold border border-[var(--border-color)] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Gerar Recibo WhatsApp</span>
                </button>
              </div>

              {/* Template Card 3: Etapa Concluída */}
              <div className="p-4 bg-[var(--bg-card-secondary)] rounded-xl border border-[var(--border-color)] space-y-3 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-rose-500 font-semibold text-xs mb-1">
                    <Sparkles className="w-3.5 h-3.5" /> Entrega de Etapa
                  </div>
                  <h4 className="text-sm font-bold text-[var(--text-main)]">Aviso de Etapa Pronta</h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1 leading-relaxed">
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

      <BoletoModal
        isOpen={boletoModalOpen}
        onClose={() => {
          setBoletoModalOpen(false);
          setSelectedBoletoInstallment(null);
        }}
        installment={selectedBoletoInstallment}
        onUpdateInstallment={updateProjectInstallment}
      />

      <NewInstallmentModal
        isOpen={newInstallmentModalOpen || !!installmentToEdit}
        onClose={() => {
          setNewInstallmentModalOpen(false);
          setInstallmentToEdit(null);
        }}
        defaultProjectId={modalDefaultProjectId}
        installmentToEdit={installmentToEdit}
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

      <WorkContractModal
        isOpen={isWorkContractModalOpen}
        onClose={() => {
          setIsWorkContractModalOpen(false);
          setSelectedContractForModal(null);
        }}
        contract={selectedContractForModal}
      />

      <NewContractModal
        isOpen={isNewContractModalOpen}
        onClose={() => setIsNewContractModalOpen(false)}
      />
    </div>
  );
};
