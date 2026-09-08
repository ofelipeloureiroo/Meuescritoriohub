import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  User,
  Plus,
  Trash2,
  AlertCircle,
  TrendingUp,
  Clock,
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ChevronsUpDown,
  ChevronsDownUp,
  Search,
  CheckCircle2,
  Circle,
  Edit2,
  FileText,
  Calendar,
  DollarSign,
  Info,
  Check,
  Target,
  Share2,
  ExternalLink,
  ChevronUp,
  X,
  AlertTriangle,
  CreditCard,
  CheckSquare,
  Star,
  Layers,
  Lock,
  MoreHorizontal,
  Users,
  ArrowRight,
} from 'lucide-react';
import {
  ArchitectureProject,
  ProjectWorkflowStage,
  ProjectTaskItem,
  AppAction,
  ProjectLinkedClient,
} from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { DEFAULT_PROJECT_STAGES } from '../../data/defaultProjectStages';

interface ProjectWorkspaceViewProps {
  project: ArchitectureProject;
  onBack: () => void;
  onEdit?: (project: ArchitectureProject) => void;
}

export const ProjectWorkspaceView: React.FC<ProjectWorkspaceViewProps> = ({
  project,
  onBack,
  onEdit,
}) => {
  const { updateArchitectureProject, deleteArchitectureProject, addAppAction, actions } = useFinance();
  const { teamMembers } = useTeamMembers();

  // Active top-level tab
  const [activeTab, setActiveTab] = useState<'cronograma' | 'board' | 'acoes' | 'financeiro' | 'detalhes'>('cronograma');

  // Delete project confirmation modal state
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Cronograma view mode: 'lista' | 'timeline'
  const [cronogramaView, setCronogramaView] = useState<'lista' | 'timeline'>('lista');

  // Search & Filters in Cronograma
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todas' | 'em_risco' | 'fora_etapa' | 'com_acao' | 'criticas' | 'sem_cronograma'>('todas');

  // Initialize or maintain local stages
  const [stages, setStages] = useState<ProjectWorkflowStage[]>(() => {
    if (project.stages && project.stages.length > 0) {
      return project.stages;
    }
    return DEFAULT_PROJECT_STAGES;
  });

  // Board tab states
  const [expandedBoardStageId, setExpandedBoardStageId] = useState<string>(() => {
    if (project.stages && project.stages.length > 0) {
      return project.stages[0].id;
    }
    return DEFAULT_PROJECT_STAGES[0].id;
  });
  const [activeBoardTaskId, setActiveBoardTaskId] = useState<string>('');
  const [isExecutionMode, setIsExecutionMode] = useState(false);

  // Linked Clients state (Detalhes Tab)
  const [linkedClients, setLinkedClients] = useState<ProjectLinkedClient[]>(() => {
    if (project.linkedClients && project.linkedClients.length > 0) {
      return project.linkedClients;
    }
    return [
      {
        id: 'c1',
        name: project.clientName || 'Brícia Papa Alcântara',
        role: 'Principal',
        isStarred: true,
      },
      {
        id: 'c2',
        name: 'Felipe',
        role: 'Cônjuge',
        isStarred: false,
      },
    ];
  });
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientRole, setNewClientRole] = useState('Principal');

  // Modal for New Action (Image 5)
  const [isNewActionModalOpen, setIsNewActionModalOpen] = useState(false);
  const [actionArea, setActionArea] = useState<'Operação' | 'Financeiro'>('Operação');
  const [actionType, setActionType] = useState('Solicitar informação');
  const [actionDesc, setActionDesc] = useState('');
  const [actionStartDate, setActionStartDate] = useState(
    project.startDate || '2026-06-08'
  );
  const [actionEndDate, setActionEndDate] = useState(
    project.startDate || '2026-06-08'
  );
  const [actionEffortHours, setActionEffortHours] = useState(0);
  const [actionEffortMinutes, setActionEffortMinutes] = useState(0);
  const [actionTime, setActionTime] = useState('');
  const [actionResponsible, setActionResponsible] = useState('');
  const [actionNotes, setActionNotes] = useState('');
  const [isNotesOpen, setIsNotesOpen] = useState(false);

  // Promote Task to Action Modal (matching user's reference)
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [promoteStageId, setPromoteStageId] = useState<string>('');
  const [promoteTask, setPromoteTask] = useState<ProjectTaskItem | null>(null);
  const [promoteDesc, setPromoteDesc] = useState('');
  const [promoteType, setPromoteType] = useState('');
  const [promoteResponsible, setPromoteResponsible] = useState('');
  const [promotePeriodMode, setPromotePeriodMode] = useState<'sync' | 'manual'>('manual');
  const [promoteStartDate, setPromoteStartDate] = useState('2026-09-03');
  const [promoteEndDate, setPromoteEndDate] = useState('2026-09-03');

  const handleOpenPromoteModal = (stageId: string, task: ProjectTaskItem) => {
    setPromoteStageId(stageId);
    setPromoteTask(task);
    setPromoteDesc(task.name);
    setPromoteType('');
    setPromoteResponsible(task.responsible || '');

    const hasDates = !!(task.startDatePlanned || task.endDatePlanned);
    if (hasDates) {
      setPromotePeriodMode('sync');
      setPromoteStartDate(task.startDatePlanned || '2026-09-03');
      setPromoteEndDate(task.endDatePlanned || task.startDatePlanned || '2026-09-03');
    } else {
      setPromotePeriodMode('manual');
      setPromoteStartDate('2026-09-03');
      setPromoteEndDate('2026-09-03');
    }
    setIsPromoteModalOpen(true);
  };

  const handleConfirmPromote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!promoteDesc.trim()) return;

    const newActionId = `act_${Date.now()}`;
    addAppAction({
      area: 'Operação',
      type: promoteType || 'Acompanhar pendência',
      origin: 'Projeto',
      relatedId: project.id,
      relatedTitle: project.title,
      description: promoteDesc.trim(),
      startDate: promoteStartDate,
      endDate: promoteEndDate,
      date: promoteStartDate,
      responsibleName: promoteResponsible || 'Arquiteto Titular',
      status: 'pending',
      notes: `Promovida da tarefa: ${promoteTask?.name || ''} • Modo: ${promotePeriodMode === 'sync' ? 'Sincronizada' : 'Manual'}`,
    });

    if (promoteStageId && promoteTask) {
      const updatedStages = stages.map((stg) => {
        if (stg.id === promoteStageId) {
          return {
            ...stg,
            tasks: stg.tasks.map((t) => {
              if (t.id === promoteTask.id) {
                return {
                  ...t,
                  isPromoted: true,
                  actionId: newActionId,
                  responsible: promoteResponsible || t.responsible,
                };
              }
              return t;
            }),
          };
        }
        return stg;
      });
      handleUpdateStages(updatedStages);
    }

    setIsPromoteModalOpen(false);
    setPromoteTask(null);
  };

  // Save changes to project in context
  const handleUpdateStages = (newStages: ProjectWorkflowStage[]) => {
    setStages(newStages);
    updateArchitectureProject(project.id, {
      stages: newStages,
    });
  };

  // Toggle stage expansion
  const toggleStageExpand = (stageId: string) => {
    const updated = stages.map((stg) =>
      stg.id === stageId ? { ...stg, isExpanded: !stg.isExpanded } : stg
    );
    handleUpdateStages(updated);
  };

  // Expand all / Collapse all
  const expandAllStages = () => {
    const updated = stages.map((stg) => ({ ...stg, isExpanded: true }));
    handleUpdateStages(updated);
  };

  const collapseAllStages = () => {
    const updated = stages.map((stg) => ({ ...stg, isExpanded: false }));
    handleUpdateStages(updated);
  };

  // Toggle task completion
  const toggleTaskCompletion = (stageId: string, taskId: string) => {
    const updated = stages.map((stg) => {
      if (stg.id !== stageId) return stg;

      const updatedTasks = stg.tasks.map((tsk) => {
        if (tsk.id !== taskId) return tsk;
        const nextStatus: 'pending' | 'completed' =
          tsk.status === 'completed' ? 'pending' : 'completed';
        return { ...tsk, status: nextStatus };
      });

      // Update stage status automatically
      const allCompleted = updatedTasks.every((t) => t.status === 'completed');
      const anyInProgress = updatedTasks.some((t) => t.status === 'completed');

      const stageStatus = allCompleted
        ? ('completed' as const)
        : anyInProgress
        ? ('in_progress' as const)
        : ('not_started' as const);

      return {
        ...stg,
        status: stageStatus,
        tasks: updatedTasks,
      };
    });

    handleUpdateStages(updated);
  };

  // Filtered stages for display
  const filteredStages = useMemo(() => {
    return stages
      .map((stg) => {
        const matchesQuery =
          stg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stg.tasks.some((t) =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase())
          );

        if (!matchesQuery) return null;

        // Apply task-level filter if needed
        let filteredTasks = stg.tasks;
        if (searchQuery.trim()) {
          filteredTasks = stg.tasks.filter((t) =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase())
          );
        }

        if (activeFilter === 'em_risco') {
          filteredTasks = filteredTasks.filter((t) => t.hasAlert);
        } else if (activeFilter === 'criticas') {
          filteredTasks = filteredTasks.filter((t) => t.status !== 'completed');
        }

        return {
          ...stg,
          tasks: filteredTasks,
        };
      })
      .filter(Boolean) as ProjectWorkflowStage[];
  }, [stages, searchQuery, activeFilter]);

  // Project Actions
  const projectActions = useMemo(() => {
    return actions.filter(
      (a) =>
        a.relatedId === project.id ||
        (a.relatedTitle && a.relatedTitle.toLowerCase().includes(project.title.toLowerCase()))
    );
  }, [actions, project.id, project.title]);

  // Board Header & Banner Stats
  const totalTasksCount = useMemo(() => {
    return stages.reduce((acc, stg) => acc + stg.tasks.length, 0);
  }, [stages]);

  const completedTasksCount = useMemo(() => {
    return stages.reduce(
      (acc, stg) => acc + stg.tasks.filter((t) => t.status === 'completed').length,
      0
    );
  }, [stages]);

  const completedStagesCount = useMemo(() => {
    return stages.filter((stg) => stg.status === 'completed').length;
  }, [stages]);

  // Find next pending task for the banner
  const nextPendingTask = useMemo(() => {
    for (const stage of stages) {
      const pendingTask = stage.tasks.find((t) => t.status !== 'completed');
      if (pendingTask) {
        return { task: pendingTask, stage };
      }
    }
    return null;
  }, [stages]);

  // Calculations for ribbon
  const totalContract = project.honorarios || 14000;
  const costEstimate = project.costEstimate || 0;
  const marginPercentage =
    totalContract > 0
      ? (((totalContract - costEstimate) / totalContract) * 100).toFixed(1)
      : '100.0';

  // Format date helper matching exact display ("08 de jun. de 2026")
  const formatDisplayDate = (dateStr?: string, defaultFallback = '08 de jun. de 2026') => {
    if (!dateStr) return defaultFallback;
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0]);
        const monthIndex = parseInt(parts[1]) - 1;
        const day = parts[2].padStart(2, '0');
        const monthNames = [
          'jan.',
          'fev.',
          'mar.',
          'abr.',
          'mai.',
          'jun.',
          'jul.',
          'ago.',
          'set.',
          'out.',
          'nov.',
          'dez.',
        ];
        const monthStr = monthNames[monthIndex] || 'jun.';
        return `${day} de ${monthStr} de ${year}`;
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  // Linked Clients Handlers
  const handleToggleStarClient = (id: string) => {
    const updated = linkedClients.map((c) =>
      c.id === id ? { ...c, isStarred: !c.isStarred } : c
    );
    setLinkedClients(updated);
    updateArchitectureProject(project.id, { linkedClients: updated });
  };

  const handleChangeClientRole = (id: string, role: string) => {
    const updated = linkedClients.map((c) =>
      c.id === id ? { ...c, role } : c
    );
    setLinkedClients(updated);
    updateArchitectureProject(project.id, { linkedClients: updated });
  };

  const handleRemoveLinkedClient = (id: string) => {
    const updated = linkedClients.filter((c) => c.id !== id);
    setLinkedClients(updated);
    updateArchitectureProject(project.id, { linkedClients: updated });
  };

  const handleAddLinkedClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    const newClient: ProjectLinkedClient = {
      id: `client_${Date.now()}`,
      name: newClientName.trim(),
      role: newClientRole,
      isStarred: false,
    };
    const updated = [...linkedClients, newClient];
    setLinkedClients(updated);
    updateArchitectureProject(project.id, { linkedClients: updated });
    setNewClientName('');
    setIsAddClientModalOpen(false);
  };

  // Create Action Handler (Image 5)
  const handleCreateAction = (e: React.FormEvent) => {
    e.preventDefault();

    addAppAction({
      area: actionArea,
      origin: 'Projeto',
      type: actionType,
      relatedId: project.id,
      relatedTitle: project.title,
      description: actionDesc ? `${actionType}: ${actionDesc}` : actionType,
      startDate: actionStartDate,
      endDate: actionEndDate,
      time: actionTime,
      responsibleName: actionResponsible || 'Arquiteto Titular',
      estimatedHours: actionEffortHours + actionEffortMinutes / 60,
      notes: actionNotes,
      status: 'pending',
    });

    setIsNewActionModalOpen(false);
    setActionDesc('');
    setActionNotes('');
  };

  const handleDelete = () => {
    setIsConfirmingDelete(true);
  };

  const handleConfirmDeleteProject = () => {
    deleteArchitectureProject(project.id);
    setIsConfirmingDelete(false);
    onBack();
  };

  return (
    <div className="w-full space-y-5 pb-16 animate-in fade-in duration-150">
      {/* 1. Breadcrumb navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-zinc-400 hover:text-white font-medium text-sm transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          <span>Projetos</span>
          <span className="text-zinc-600">/</span>
          <span className="font-bold text-zinc-200">{project.title}</span>
        </button>
      </div>

      {/* 2. Top Project Header Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200 shadow-sm transition-all">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            {/* Color accent pill */}
            <div
              className="w-2.5 h-12 rounded-full shrink-0 mt-0.5 sm:mt-0"
              style={{ backgroundColor: project.color || '#2563eb' }}
            />

            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight leading-tight">
                {project.title}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {/* Client pill */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border border-zinc-200 bg-zinc-50 text-xs font-semibold text-zinc-700">
                  <User className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{project.clientName || 'Brícia Papa Alcântara'}</span>
                </div>

                {/* Status badge */}
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/60 text-xs font-bold">
                  {project.status === 'entregue'
                    ? 'Entregue'
                    : project.status === 'obra'
                    ? 'Em Obra'
                    : 'Em Andamento'}
                </span>

                {/* Subtitle / category */}
                <span className="text-xs text-zinc-500 font-medium">
                  {project.projectType ||
                    (project.category === 'interiores'
                      ? 'Projeto de Interiores'
                      : project.category === 'residencial'
                      ? 'Projeto Residencial'
                      : 'Projeto Arquitetônico')}
                </span>
              </div>
            </div>
          </div>

          {/* Action buttons on the right matching Image 1 */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={() => setIsNewActionModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-900 bg-[#f4ece1] hover:bg-[#ebdcc8] transition-colors border border-[#e2d2bd] shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova ação</span>
            </button>

            <button
              onClick={() => setActiveTab('financeiro')}
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
              title="Financeiro do projeto"
            >
              <CreditCard className="w-4 h-4" />
            </button>

            {onEdit && (
              <button
                onClick={() => onEdit(project)}
                className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors cursor-pointer"
                title="Editar dados do projeto"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleDelete}
              className="p-2 rounded-xl border border-zinc-200 hover:bg-red-50 text-red-500 hover:text-red-700 transition-colors cursor-pointer"
              title="Excluir projeto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Four Key Metrics Ribbon */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: PENDÊNCIAS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-zinc-400 block">
              PENDÊNCIAS
            </span>
            <span className="text-xl sm:text-2xl font-bold text-zinc-900">
              {projectActions.filter((a) => a.status === 'pending').length}
            </span>
          </div>
        </div>

        {/* Card 2: CONTRATO */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-zinc-400 block">
              CONTRATO
            </span>
            <span className="text-xl sm:text-2xl font-bold text-zinc-900">
              R$ {totalContract.toLocaleString('pt-BR')}
            </span>
          </div>
        </div>

        {/* Card 3: MARGEM */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-zinc-400 block">
              MARGEM
            </span>
            <span className="text-xl sm:text-2xl font-bold text-emerald-600">
              {marginPercentage}%
            </span>
          </div>
        </div>

        {/* Card 4: INÍCIO */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] sm:text-[11px] uppercase tracking-wider font-bold text-zinc-400 block">
              INÍCIO
            </span>
            <span className="text-sm sm:text-base font-bold text-zinc-900 leading-tight">
              {formatDisplayDate(project.startDate || project.createdAt)}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation Bar matching Images 1, 2, 3, 4 */}
      <div className="flex items-center justify-between border-b border-zinc-200 bg-white rounded-2xl px-5 pt-3 pb-0 shadow-xs">
        <div className="flex items-center gap-5 sm:gap-7 overflow-x-auto">
          <button
            onClick={() => setActiveTab('cronograma')}
            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              activeTab === 'cronograma'
                ? 'border-[#8c7456] text-zinc-900 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 font-medium'
            }`}
          >
            <Clock className="w-4 h-4 text-zinc-500" />
            <span>Cronograma</span>
          </button>

          <button
            onClick={() => setActiveTab('board')}
            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              activeTab === 'board'
                ? 'border-[#8c7456] text-zinc-900 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 font-medium'
            }`}
          >
            <LayoutGrid className="w-4 h-4 text-zinc-500" />
            <span>Board</span>
          </button>

          <button
            onClick={() => setActiveTab('acoes')}
            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              activeTab === 'acoes'
                ? 'border-[#8c7456] text-zinc-900 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 font-medium'
            }`}
          >
            <span>Ações</span>
          </button>

          <button
            onClick={() => setActiveTab('financeiro')}
            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              activeTab === 'financeiro'
                ? 'border-[#8c7456] text-zinc-900 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 font-medium'
            }`}
          >
            <span>Financeiro</span>
          </button>

          <button
            onClick={() => setActiveTab('detalhes')}
            className={`flex items-center gap-2 pb-3 text-xs sm:text-sm transition-all cursor-pointer whitespace-nowrap border-b-2 ${
              activeTab === 'detalhes'
                ? 'border-[#8c7456] text-zinc-900 font-bold'
                : 'border-transparent text-zinc-500 hover:text-zinc-800 font-medium'
            }`}
          >
            <span>Detalhes</span>
          </button>
        </div>

        {/* Right side of tab bar */}
        {activeTab === 'acoes' ? (
          <span className="text-xs text-zinc-400 font-medium pb-2 pr-1">
            {projectActions.length} total
          </span>
        ) : (
          <div className="flex items-center gap-0.5 text-zinc-400 pb-2 pr-1">
            <div className="flex flex-col items-center justify-center p-1 bg-zinc-100/80 rounded-md text-zinc-600">
              <ChevronUp className="w-3 h-3 -mb-1" />
              <ChevronDown className="w-3 h-3" />
            </div>
          </div>
        )}
      </div>

      {/* 5. TAB CONTENT: CRONOGRAMA */}
      {activeTab === 'cronograma' && (
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden p-4 sm:p-6 space-y-5">
          {/* Sub-toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-zinc-100">
            {/* View switcher & Search */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Switcher: Lista vs Linha do tempo */}
              <div className="inline-flex p-1 bg-zinc-100 rounded-xl">
                <button
                  onClick={() => setCronogramaView('lista')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    cronogramaView === 'lista'
                      ? 'bg-[#2d2520] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <span>☰ Lista</span>
                </button>
                <button
                  onClick={() => setCronogramaView('timeline')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    cronogramaView === 'timeline'
                      ? 'bg-[#2d2520] text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <span>☵ Linha do tempo</span>
                </button>
              </div>

              {/* Search box */}
              <div className="relative min-w-[220px]">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar etapa ou tarefa.."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-zinc-400 bg-white"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setActiveFilter('todas')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'todas'
                      ? 'bg-[#4a4038] text-white'
                      : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setActiveFilter('em_risco')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'em_risco'
                      ? 'bg-[#4a4038] text-white'
                      : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  Em risco
                </button>
                <button
                  onClick={() => setActiveFilter('fora_etapa')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'fora_etapa'
                      ? 'bg-[#4a4038] text-white'
                      : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  Fora da etapa
                </button>
                <button
                  onClick={() => setActiveFilter('com_acao')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'com_acao'
                      ? 'bg-[#4a4038] text-white'
                      : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  Com ação
                </button>
                <button
                  onClick={() => setActiveFilter('criticas')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'criticas'
                      ? 'bg-[#4a4038] text-white'
                      : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  Críticas
                </button>
                <button
                  onClick={() => setActiveFilter('sem_cronograma')}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    activeFilter === 'sem_cronograma'
                      ? 'bg-[#4a4038] text-white'
                      : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  Sem cronograma
                </button>
              </div>
            </div>

            {/* Expand / Collapse Actions */}
            <div className="flex items-center gap-2 self-start lg:self-center">
              <button
                onClick={expandAllStages}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronsUpDown className="w-3.5 h-3.5" />
                <span>Expandir</span>
              </button>
              <button
                onClick={collapseAllStages}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
              >
                <ChevronsDownUp className="w-3.5 h-3.5" />
                <span>Recolher</span>
              </button>

              <span className="px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-medium">
                Todas
              </span>

              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-700 text-xs font-medium">
                <Clock className="w-3.5 h-3.5 text-zinc-500" />
                <span>Execução</span>
              </span>
            </div>
          </div>

          {/* CRONOGRAMA: LISTA VIEW */}
          {cronogramaView === 'lista' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[900px]">
                <thead>
                  <tr className="border-b border-zinc-200 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <th className="py-2.5 px-3 w-[340px]">
                      NOME <span className="text-zinc-300 font-normal">ⓘ</span>
                    </th>
                    <th className="py-2.5 px-3">STATUS</th>
                    <th className="py-2.5 px-3">DURAÇÃO</th>
                    <th className="py-2.5 px-3">INÍCIO PLAN.</th>
                    <th className="py-2.5 px-3">FIM PLAN.</th>
                    <th className="py-2.5 px-3">RESPONSÁVEL</th>
                    <th className="py-2.5 px-3">PREDECESSORA</th>
                    <th className="py-2.5 px-3 text-right">ALERTAS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 text-xs text-zinc-800">
                  {filteredStages.map((stg) => {
                    const completedTasks = stg.tasks.filter((t) => t.status === 'completed').length;
                    const totalTasks = stg.tasks.length;

                    return (
                      <React.Fragment key={stg.id}>
                        {/* Stage Header Row */}
                        <tr
                          onClick={() => toggleStageExpand(stg.id)}
                          className="bg-zinc-50/70 hover:bg-zinc-100/80 transition-colors cursor-pointer font-bold select-none group"
                        >
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-400 group-hover:text-zinc-700 transition-colors">
                                {stg.isExpanded ? (
                                  <ChevronDown className="w-4 h-4" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </span>
                              <span className="text-zinc-900 font-bold text-sm">
                                {stg.name}
                              </span>
                              <span className="text-xs font-semibold text-zinc-500 ml-1">
                                {completedTasks}/{totalTasks}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-zinc-200/80 text-zinc-700 text-[11px] font-semibold">
                              {stg.status === 'completed'
                                ? 'Concluído'
                                : stg.status === 'in_progress'
                                ? 'Em andamento'
                                : 'Não iniciado'}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-zinc-400 font-medium">
                            {stg.duration || '—'}
                          </td>

                          <td className="py-3 px-3 text-zinc-400 font-medium">
                            {stg.startDatePlanned || '(auto)'}
                          </td>

                          <td className="py-3 px-3 text-zinc-400 font-medium">
                            {stg.endDatePlanned || '—'}
                          </td>

                          <td className="py-3 px-3 text-zinc-400 font-medium">
                            {stg.responsible || '—'}
                          </td>

                          <td className="py-3 px-3 text-zinc-600 font-medium">
                            {stg.predecessor ? (
                              <div className="inline-flex items-center gap-1 text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded-md text-[11px]">
                                <span>{stg.predecessor}</span>
                                <ChevronDown className="w-3 h-3 text-zinc-400" />
                              </div>
                            ) : (
                              <span className="text-zinc-400">—</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right">
                            {stg.tasks.some((t) => t.hasAlert) && (
                              <AlertTriangle className="w-4 h-4 text-amber-500 inline-block" />
                            )}
                          </td>
                        </tr>

                        {/* Stage Tasks List (Sub-rows) */}
                        {stg.isExpanded &&
                          stg.tasks.map((task) => {
                            const isCompleted = task.status === 'completed';

                            return (
                              <tr
                                key={task.id}
                                className={`hover:bg-zinc-50/60 transition-colors ${
                                  isCompleted ? 'bg-emerald-50/20' : ''
                                }`}
                              >
                                <td className="py-2.5 px-3 pl-8">
                                  <div className="flex items-center gap-2.5">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTaskCompletion(stg.id, task.id);
                                      }}
                                      className="text-zinc-300 hover:text-zinc-700 transition-colors cursor-pointer shrink-0"
                                      title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluída'}
                                    >
                                      {isCompleted ? (
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                      ) : (
                                        <Circle className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
                                      )}
                                    </button>

                                    <span
                                      className={`text-xs ${
                                        isCompleted
                                          ? 'line-through text-zinc-400 font-normal'
                                          : 'text-zinc-800 font-medium'
                                      }`}
                                    >
                                      {task.name}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-2.5 px-3">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                                      isCompleted
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : 'bg-zinc-100 text-zinc-600'
                                    }`}
                                  >
                                    {isCompleted ? 'Concluído' : 'Pendente'}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 text-zinc-400">
                                  {task.duration || '—'}
                                </td>

                                <td className="py-2.5 px-3 text-zinc-400">
                                  {task.startDatePlanned || '—'}
                                </td>

                                <td className="py-2.5 px-3 text-zinc-400">
                                  {task.endDatePlanned || '—'}
                                </td>

                                <td className="py-2.5 px-3 text-zinc-400">
                                  {task.responsible || '—'}
                                </td>

                                <td className="py-2.5 px-3">
                                  <button className="text-[11px] text-zinc-500 hover:text-zinc-900 border border-dashed border-zinc-200 hover:border-zinc-400 px-2 py-0.5 rounded-md transition-colors cursor-pointer">
                                    + predecessora
                                  </button>
                                </td>

                                <td className="py-2.5 px-3 text-right">
                                  <button
                                    onClick={() => handleOpenPromoteModal(stg.id, task)}
                                    className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                                      task.isPromoted
                                        ? 'border border-[#8c7456] bg-[#faedd9] text-[#8c581e] font-semibold hover:bg-[#f6e2c8]'
                                        : 'border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-800'
                                    }`}
                                    title={task.isPromoted ? 'Tarefa vinculada a uma ação (clique para editar)' : 'Promover tarefa para ação'}
                                  >
                                    <Target className={`w-3 h-3 ${task.isPromoted ? 'text-[#8c7456]' : 'text-zinc-400'}`} />
                                    <span>{task.isPromoted ? 'Promovida' : 'Promover'}</span>
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>

              {/* Bottom information note */}
              <div className="p-3 bg-zinc-50 border-t border-zinc-100 text-xs text-zinc-500 flex items-center gap-2 mt-4 rounded-xl">
                <Info className="w-4 h-4 text-zinc-400 shrink-0" />
                <span>
                  Configure início e duração das etapas para montar o cronograma. Você pode clicar nas caixas circulares para marcar tarefas como concluídas.
                </span>
              </div>
            </div>
          ) : (
            /* CRONOGRAMA: TIMELINE / GANTT VIEW */
            <div className="space-y-4 py-2">
              <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200 text-zinc-700 text-xs space-y-1">
                <h4 className="font-bold text-sm text-zinc-900">Linha do Tempo Visual das Etapas</h4>
                <p className="text-zinc-500">
                  Visualização da cadeia progressiva de entregas do projeto de arquitetura e interiores.
                </p>
              </div>

              <div className="space-y-3">
                {filteredStages.map((stg, idx) => {
                  const completed = stg.tasks.filter((t) => t.status === 'completed').length;
                  const total = stg.tasks.length;
                  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <div
                      key={stg.id}
                      className="p-3 bg-zinc-50 hover:bg-zinc-100/80 rounded-2xl border border-zinc-200 transition-all"
                    >
                      <div className="flex items-center justify-between text-xs mb-2">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-zinc-200 text-zinc-700 font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span className="font-bold text-zinc-900">{stg.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-zinc-500 font-medium">{pct}% concluído</span>
                          <span className="text-zinc-400 font-medium">({completed}/{total})</span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full h-2.5 bg-zinc-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. TAB CONTENT: BOARD (Image 2) */}
      {activeTab === 'board' && (
        <div className="space-y-5">
          {/* Top Banner: Next Task & Execution Mode (Image 2) */}
          <div className="bg-[#fcfaf7] rounded-3xl p-5 sm:p-6 border border-[#eedfc9] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#faedd9] border border-[#e6d0b3] text-[#8c581e] text-[11px] font-bold uppercase tracking-wider">
                  <Clock className="w-3 h-3" />
                  Próxima tarefa
                </span>
                <span className="text-xs text-zinc-500 font-medium">
                  {completedTasksCount} de {totalTasksCount} concluídas ({totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0}%)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-zinc-900 tracking-tight">
                {nextPendingTask ? nextPendingTask.task.name : 'Todas as tarefas concluídas!'}
              </h2>
              <p className="text-xs text-zinc-600 flex items-center gap-2">
                <span>{nextPendingTask ? nextPendingTask.stage.name : 'Projeto em fase final'}</span>
                {nextPendingTask?.task.daysDuration && (
                  <>
                    <span className="text-zinc-300">•</span>
                    <span>Prazo previsto: {nextPendingTask.task.daysDuration} dias</span>
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 self-start md:self-center">
              <button
                onClick={() => setIsNewActionModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-zinc-900 bg-[#f4ece1] hover:bg-[#ebdcc8] border border-[#e2d2bd] transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nova ação</span>
              </button>

              <button
                onClick={() => setIsExecutionMode(!isExecutionMode)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  isExecutionMode
                    ? 'bg-zinc-900 text-white border border-zinc-900'
                    : 'bg-white text-zinc-700 hover:text-zinc-900 border border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <Target className="w-3.5 h-3.5 text-[#8c7456]" />
                <span>{isExecutionMode ? 'Sair do Modo Execução' : 'Modo execução'}</span>
              </button>
            </div>
          </div>

          {/* Board Main: Split view with stages on left, active task details on right */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left Column: Stages & Task checklist (Image 2 style) */}
            <div className="lg:col-span-7 space-y-3">
              {stages.map((stage, stageIdx) => {
                const isExpanded = expandedBoardStageId === stage.id;
                const completedInStage = stage.tasks.filter((t) => t.status === 'completed').length;
                const stagePercent = stage.tasks.length > 0 ? Math.round((completedInStage / stage.tasks.length) * 100) : 0;

                return (
                  <div
                    key={stage.id}
                    className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden transition-all"
                  >
                    {/* Stage Card Header */}
                    <div
                      onClick={() => setExpandedBoardStageId(isExpanded ? '' : stage.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-zinc-50 transition-colors select-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-700">
                          {stageIdx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-zinc-900 leading-tight">
                              {stage.name}
                            </h4>
                            {stage.status === 'completed' && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                                Concluída
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 mt-0.5">
                            {completedInStage} de {stage.tasks.length} tarefas concluídas ({stagePercent}%)
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Mini progress pill */}
                        <div className="w-16 sm:w-24 h-2 bg-zinc-100 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className={`h-full transition-all duration-300 ${
                              stagePercent === 100 ? 'bg-emerald-500' : 'bg-[#8c7456]'
                            }`}
                            style={{ width: `${stagePercent}%` }}
                          />
                        </div>
                        <button className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Stage Tasks List */}
                    {isExpanded && (
                      <div className="border-t border-zinc-100 bg-zinc-50/50 p-3 space-y-2">
                        {stage.tasks.map((task) => {
                          const isSelected = activeBoardTaskId === task.id;
                          return (
                            <div
                              key={task.id}
                              onClick={() => setActiveBoardTaskId(task.id)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                                isSelected
                                  ? 'bg-white border-[#8c7456] shadow-xs'
                                  : 'bg-white border-zinc-200 hover:border-zinc-300'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleTaskCompletion(stage.id, task.id);
                                  }}
                                  className="shrink-0 text-zinc-400 hover:text-emerald-600 transition-colors"
                                >
                                  {task.status === 'completed' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600 fill-emerald-50" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-zinc-400 hover:text-zinc-600" />
                                  )}
                                </button>
                                <span
                                  className={`text-xs font-semibold truncate ${
                                    task.status === 'completed'
                                      ? 'line-through text-zinc-400'
                                      : 'text-zinc-800'
                                  }`}
                                >
                                  {task.name}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {task.hasAlert && (
                                  <span className="w-2 h-2 rounded-full bg-amber-500" title="Alerta de prazo" />
                                )}
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-medium">
                                  {task.daysDuration ? `${task.daysDuration}d` : '3d'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right Column: Task detail / Focus card */}
            <div className="lg:col-span-5">
              <div className="sticky top-4 bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200 shadow-xs space-y-5">
                {(() => {
                  const currentSelectedTask = stages
                    .flatMap((s) => s.tasks.map((t) => ({ ...t, stageName: s.name, stageId: s.id })))
                    .find((t) => t.id === activeBoardTaskId) ||
                    (nextPendingTask
                      ? { ...nextPendingTask.task, stageName: nextPendingTask.stage.name, stageId: nextPendingTask.stage.id }
                      : stages[0]?.tasks[0]
                      ? { ...stages[0].tasks[0], stageName: stages[0].name, stageId: stages[0].id }
                      : null);

                  if (!currentSelectedTask) {
                    return (
                      <div className="text-center py-16 text-zinc-400">
                        <CheckSquare className="w-10 h-10 mx-auto text-zinc-300 mb-2" />
                        <p className="text-sm font-semibold">Nenhuma tarefa selecionada</p>
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
                        <span className="text-[11px] uppercase font-bold text-[#8c7456] tracking-wider">
                          {currentSelectedTask.stageName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            currentSelectedTask.status === 'completed'
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {currentSelectedTask.status === 'completed' ? 'Concluída' : 'Em Execução'}
                        </span>
                      </div>

                      <div>
                        <h3 className="text-base font-extrabold text-zinc-900 leading-snug">
                          {currentSelectedTask.name}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">
                          Responsável: Arquiteto Titular • Prazo estimado: {currentSelectedTask.daysDuration || 4} dias
                        </p>
                      </div>

                      {/* Checklist items within selected task */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-zinc-700 block">Checklist da Tarefa</span>
                        <div className="space-y-1.5">
                          <label className="flex items-center gap-2 p-2 bg-zinc-50 rounded-xl text-xs text-zinc-700 cursor-pointer hover:bg-zinc-100 transition-colors">
                            <input type="checkbox" className="rounded-sm border-zinc-300 text-[#8c7456]" defaultChecked />
                            <span>Levantamento de referências e necessidades</span>
                          </label>
                          <label className="flex items-center gap-2 p-2 bg-zinc-50 rounded-xl text-xs text-zinc-700 cursor-pointer hover:bg-zinc-100 transition-colors">
                            <input type="checkbox" className="rounded-sm border-zinc-300 text-[#8c7456]" />
                            <span>Modelagem volumétrica inicial</span>
                          </label>
                          <label className="flex items-center gap-2 p-2 bg-zinc-50 rounded-xl text-xs text-zinc-700 cursor-pointer hover:bg-zinc-100 transition-colors">
                            <input type="checkbox" className="rounded-sm border-zinc-300 text-[#8c7456]" />
                            <span>Aprovação do conceito com cliente</span>
                          </label>
                        </div>
                      </div>

                      {/* Associated Actions */}
                      <div className="space-y-2 pt-2 border-t border-zinc-100">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-zinc-700">Ações Vinculadas</span>
                          <button
                            onClick={() => {
                              handleOpenPromoteModal(currentSelectedTask.stageId, currentSelectedTask);
                            }}
                            className="text-xs text-[#8c7456] hover:underline font-semibold cursor-pointer"
                          >
                            + Promover / Nova ação
                          </button>
                        </div>

                        <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200/80 text-xs text-zinc-600 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#8c7456]" />
                            <span>Alinhar decisões da prancha</span>
                          </div>
                          <span className="text-[10px] text-zinc-400">08 jun</span>
                        </div>
                      </div>

                      {/* Action toggle button */}
                      <button
                        onClick={() => toggleTaskCompletion(currentSelectedTask.stageId, currentSelectedTask.id)}
                        className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center justify-center gap-2 ${
                          currentSelectedTask.status === 'completed'
                            ? 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>
                          {currentSelectedTask.status === 'completed'
                            ? 'Marcar como Não Concluída'
                            : 'Concluir Tarefa'}
                        </span>
                      </button>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 7. TAB CONTENT: AÇÕES (Image 3) */}
      {activeTab === 'acoes' && (
        <div className="space-y-4">
          {/* Top Filter and Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-zinc-200 shadow-xs">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar ação..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:border-zinc-400 bg-white w-48 sm:w-60"
                />
              </div>

              <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl text-xs">
                <button
                  onClick={() => setActiveFilter('todas')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    activeFilter === 'todas' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Todas
                </button>
                <button
                  onClick={() => setActiveFilter('em_risco')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    activeFilter === 'em_risco' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Pendentes
                </button>
                <button
                  onClick={() => setActiveFilter('criticas')}
                  className={`px-3 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                    activeFilter === 'criticas' ? 'bg-white text-zinc-900 shadow-xs' : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  Concluídas
                </button>
              </div>
            </div>

            <button
              onClick={() => setIsNewActionModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-zinc-900 bg-[#f4ece1] hover:bg-[#ebdcc8] border border-[#e2d2bd] transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova ação</span>
            </button>
          </div>

          {/* Actions List (Image 3) */}
          <div className="bg-white rounded-3xl border border-zinc-200 shadow-xs overflow-hidden">
            {projectActions.length > 0 ? (
              <div className="divide-y divide-zinc-100">
                {projectActions.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-zinc-50/60 transition-colors group"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-[#8c7456] mt-1.5 shrink-0" />
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-700 text-[10px] font-bold">
                            {act.area}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/50 text-[10px] font-bold">
                            {act.type}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-900">
                            {act.description || act.type}
                          </h4>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-[11px] text-zinc-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-zinc-400" />
                            {formatDisplayDate(act.startDate)}
                          </span>
                          {act.responsibleName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3 text-zinc-400" />
                              {act.responsibleName}
                            </span>
                          )}
                          {act.estimatedHours ? (
                            <span className="px-1.5 py-0.2 rounded-md bg-zinc-100 text-zinc-600 font-semibold text-[10px]">
                              {act.estimatedHours}h
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          act.status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        }`}
                      >
                        {act.status === 'completed' ? 'Concluída' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 text-zinc-400 space-y-3">
                <AlertCircle className="w-10 h-10 mx-auto text-zinc-300" />
                <div>
                  <p className="text-sm font-bold text-zinc-800">Nenhuma ação vinculada</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Tarefas imediatas, ligações, revisões e pendências ficam salvas aqui.
                  </p>
                </div>
                <button
                  onClick={() => setIsNewActionModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-zinc-900 bg-[#f4ece1] hover:bg-[#ebdcc8] border border-[#e2d2bd] transition-colors cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Criar primeira ação</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 8. TAB CONTENT: FINANCEIRO */}
      {activeTab === 'financeiro' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div>
              <h3 className="font-extrabold text-lg text-zinc-900 tracking-tight">Financeiro do Projeto</h3>
              <p className="text-xs text-zinc-500">
                Acompanhamento de contrato, faturamento previsto e margem de contribuição.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-xs font-bold">
              Contrato Ativo
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                VALOR DO CONTRATO
              </span>
              <span className="text-2xl font-extrabold text-zinc-900 block mt-1">
                R$ {totalContract.toLocaleString('pt-BR')}
              </span>
              <span className="text-[11px] text-zinc-500 mt-1 block">Honorários totais acordados</span>
            </div>

            <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-200">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                CUSTOS DIRETOS PREVISTOS
              </span>
              <span className="text-2xl font-extrabold text-zinc-900 block mt-1">
                R$ {costEstimate.toLocaleString('pt-BR')}
              </span>
              <span className="text-[11px] text-zinc-500 mt-1 block">Horas técnicas + deslocamentos</span>
            </div>

            <div className="p-4 bg-emerald-50/40 rounded-2xl border border-emerald-100">
              <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                MARGEM ESTIMADA
              </span>
              <span className="text-2xl font-extrabold text-emerald-600 block mt-1">
                {marginPercentage}%
              </span>
              <span className="text-[11px] text-emerald-700/80 mt-1 block">
                Lucro bruto: R$ {(totalContract - costEstimate).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 9. TAB CONTENT: DETALHES (Image 4) */}
      {activeTab === 'detalhes' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Card: Clientes Vinculados (Image 4) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-extrabold text-base text-zinc-900 tracking-tight">
                Clientes vinculados
              </h3>
              <button
                onClick={() => setIsAddClientModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-900 bg-[#f4ece1] hover:bg-[#ebdcc8] border border-[#e2d2bd] transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3 h-3" />
                <span>Vincular cliente</span>
              </button>
            </div>

            {/* List of linked clients */}
            <div className="space-y-2">
              {linkedClients.map((cl) => (
                <div
                  key={cl.id}
                  className="p-3 bg-zinc-50/80 hover:bg-zinc-50 border border-zinc-200 rounded-2xl flex items-center justify-between gap-3 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleToggleStarClient(cl.id)}
                      className="text-zinc-300 hover:text-amber-400 transition-colors cursor-pointer"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          cl.isStarred ? 'text-amber-400 fill-amber-400' : 'text-zinc-300'
                        }`}
                      />
                    </button>
                    <div>
                      <span className="font-bold text-xs sm:text-sm text-zinc-900 block leading-tight">
                        {cl.name}
                      </span>
                      <span className="text-[11px] text-zinc-500">{cl.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={cl.role}
                      onChange={(e) => handleChangeClientRole(cl.id, e.target.value)}
                      className="text-xs bg-white border border-zinc-200 rounded-lg px-2 py-1 text-zinc-700 font-medium focus:outline-hidden"
                    >
                      <option value="Principal">Principal</option>
                      <option value="Cônjuge">Cônjuge</option>
                      <option value="Sócio">Sócio</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="Decisor">Decisor</option>
                    </select>

                    <button
                      onClick={() => handleRemoveLinkedClient(cl.id)}
                      className="p-1 text-zinc-400 hover:text-red-600 transition-colors cursor-pointer"
                      title="Desvincular cliente"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Card: Dados Gerais do Projeto (Image 4) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-5 sm:p-6 border border-zinc-200 shadow-xs space-y-5">
            <div className="border-b border-zinc-100 pb-3">
              <h3 className="font-extrabold text-base text-zinc-900 tracking-tight">
                Dados gerais do projeto
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1">
                <span className="font-bold text-zinc-400 uppercase tracking-wider block text-[10px]">
                  TÍTULO DO PROJETO
                </span>
                <p className="font-bold text-zinc-900 text-sm">{project.title}</p>
              </div>

              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1">
                <span className="font-bold text-zinc-400 uppercase tracking-wider block text-[10px]">
                  CATEGORIA / TIPOLOGIA
                </span>
                <p className="font-bold text-zinc-900 text-sm">
                  {project.projectType ||
                    (project.category === 'interiores'
                      ? 'Projeto de Interiores'
                      : project.category === 'residencial'
                      ? 'Projeto Residencial'
                      : 'Projeto Arquitetônico')}
                </p>
              </div>

              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1">
                <span className="font-bold text-zinc-400 uppercase tracking-wider block text-[10px]">
                  LOCALIZAÇÃO
                </span>
                <p className="font-bold text-zinc-900 text-sm">{project.location || 'Não informada'}</p>
              </div>

              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1">
                <span className="font-bold text-zinc-400 uppercase tracking-wider block text-[10px]">
                  METRAGEM (ÁREA)
                </span>
                <p className="font-bold text-zinc-900 text-sm">
                  {project.areaM2 ? `${project.areaM2} m²` : 'Não informada'}
                </p>
              </div>

              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1">
                <span className="font-bold text-zinc-400 uppercase tracking-wider block text-[10px]">
                  DATA DE INÍCIO
                </span>
                <p className="font-bold text-zinc-900 text-sm">
                  {formatDisplayDate(project.startDate || project.createdAt)}
                </p>
              </div>

              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1">
                <span className="font-bold text-zinc-400 uppercase tracking-wider block text-[10px]">
                  STATUS ATUAL
                </span>
                <p className="font-bold text-zinc-900 text-sm capitalize">
                  {project.status === 'entregue'
                    ? 'Entregue'
                    : project.status === 'obra'
                    ? 'Em Obra'
                    : 'Em Andamento'}
                </p>
              </div>
            </div>

            {project.description && (
              <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 space-y-1">
                <span className="font-bold text-zinc-400 uppercase tracking-wider block text-[10px]">
                  ESCOPO E OBSERVAÇÕES
                </span>
                <p className="text-xs text-zinc-700 leading-relaxed">{project.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal: Nova Ação (Image 5) */}
      {isNewActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h3 className="font-extrabold text-base text-zinc-900">
                Nova ação
              </h3>
              <button
                onClick={() => setIsNewActionModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAction} className="p-6 space-y-4">
              {/* Area buttons: Operação / Financeiro */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActionArea('Operação')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    actionArea === 'Operação'
                      ? 'bg-[#8c7456] text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Operação
                </button>
                <button
                  type="button"
                  onClick={() => setActionArea('Financeiro')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    actionArea === 'Financeiro'
                      ? 'bg-[#8c7456] text-white shadow-xs'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  Financeiro
                </button>
              </div>

              {/* Tipo de ação dropdown */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Tipo de ação
                </label>
                <select
                  value={actionType}
                  onChange={(e) => setActionType(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden font-medium"
                >
                  <option value="Solicitar informação">Solicitar informação</option>
                  <option value="Enviar pranchas">Enviar pranchas</option>
                  <option value="Reunião de alinhamento">Reunião de alinhamento</option>
                  <option value="Cobrança de parcela">Cobrança de parcela</option>
                  <option value="Acompanhamento de obra">Acompanhamento de obra</option>
                  <option value="Acompanhar pendência">Acompanhar pendência</option>
                </select>
              </div>

              {/* Descrição da ação */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Descrição da ação
                </label>
                <input
                  type="text"
                  value={actionDesc}
                  onChange={(e) => setActionDesc(e.target.value)}
                  placeholder="Ex: Alinhar com cliente pranchas executivas..."
                  className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-hidden bg-white"
                />
              </div>

              {/* Datas: Início & Fim */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">
                    Início
                  </label>
                  <input
                    type="date"
                    value={actionStartDate}
                    onChange={(e) => setActionStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-700 block mb-1">
                    Fim
                  </label>
                  <input
                    type="date"
                    value={actionEndDate}
                    onChange={(e) => setActionEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Estimativa de esforço */}
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Estimativa de esforço
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      value={actionEffortHours}
                      onChange={(e) => setActionEffortHours(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden pr-14"
                    />
                    <span className="text-[11px] text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      horas
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={actionEffortMinutes}
                      onChange={(e) => setActionEffortMinutes(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden pr-14"
                    />
                    <span className="text-[11px] text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      minutos
                    </span>
                  </div>
                </div>
              </div>

              {/* Anotações toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsNotesOpen(!isNotesOpen)}
                  className="text-xs font-bold text-[#8c7456] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Anotações</span>
                </button>

                {isNotesOpen && (
                  <textarea
                    rows={2}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    placeholder="Adicione anotações internas para esta ação..."
                    className="w-full mt-2 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden resize-none"
                  />
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsNewActionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#8c7456] hover:bg-[#786044] transition-colors cursor-pointer shadow-xs"
                >
                  Criar ação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Vincular Cliente (Detalhes Tab) */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <h3 className="font-extrabold text-base text-zinc-900">
                Vincular cliente
              </h3>
              <button
                onClick={() => setIsAddClientModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLinkedClient} className="p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex: Felipe Alcântara"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-hidden bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Papel / Vínculo
                </label>
                <select
                  value={newClientRole}
                  onChange={(e) => setNewClientRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden"
                >
                  <option value="Principal">Principal</option>
                  <option value="Cônjuge">Cônjuge</option>
                  <option value="Sócio">Sócio</option>
                  <option value="Financeiro">Financeiro</option>
                  <option value="Decisor">Decisor</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#8c7456] hover:bg-[#786044] transition-colors cursor-pointer shadow-xs"
                >
                  Vincular
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Promover a ação (matching reference screenshot) */}
      {isPromoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-[360px] shadow-2xl border border-zinc-200 p-5 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3">
              <h3 className="font-bold text-sm text-zinc-900">
                Promover a ação
              </h3>
              <button
                type="button"
                onClick={() => setIsPromoteModalOpen(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmPromote} className="space-y-3.5 text-xs">
              {/* DESCRIÇÃO */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  DESCRIÇÃO <span className="text-[#8c7456]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={promoteDesc}
                  onChange={(e) => setPromoteDesc(e.target.value)}
                  placeholder="Descrição da ação"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-hidden focus:border-[#8c7456] bg-white font-medium"
                />
              </div>

              {/* TIPO */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  TIPO <span className="text-[#8c7456]">*</span>
                </label>
                <div className="relative">
                  <select
                    value={promoteType}
                    onChange={(e) => setPromoteType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-700 bg-white appearance-none focus:outline-hidden focus:border-[#8c7456] cursor-pointer pr-8"
                  >
                    <option value="">Selecione...</option>
                    <option value="Solicitar informação">Solicitar informação</option>
                    <option value="Criar grupo de comunicação">Criar grupo de comunicação</option>
                    <option value="Enviar pranchas">Enviar pranchas</option>
                    <option value="Reunião de alinhamento">Reunião de alinhamento</option>
                    <option value="Acompanhar pendência">Acompanhar pendência</option>
                    <option value="Aprovação de etapa">Aprovação de etapa</option>
                    <option value="Visita técnica / Obra">Visita técnica / Obra</option>
                    <option value="Cobrança de parcela">Cobrança de parcela</option>
                    <option value="Outro">Outro</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* RESPONSÁVEL */}
              <div>
                <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                  RESPONSÁVEL <span className="text-[#8c7456]">*</span>
                </label>
                <div className="relative">
                  <select
                    value={promoteResponsible}
                    onChange={(e) => setPromoteResponsible(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-700 bg-white appearance-none focus:outline-hidden focus:border-[#8c7456] cursor-pointer pr-8"
                  >
                    <option value="">Selecione...</option>
                    {teamMembers.map((member) => (
                      <option key={member.id} value={member.name}>
                        {member.name}{member.roleTitle ? ` (${member.roleTitle})` : ''}
                      </option>
                    ))}
                    <option value="Cliente">Cliente</option>
                    <option value="Fornecedor / Parceiro">Fornecedor / Parceiro</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* PERÍODO */}
              <div>
                <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  PERÍODO
                </span>

                <div className="space-y-2">
                  {/* Option 1: Sincronizar com o cronograma */}
                  <div
                    onClick={() => {
                      setPromotePeriodMode('sync');
                      if (promoteTask?.startDatePlanned) setPromoteStartDate(promoteTask.startDatePlanned);
                      if (promoteTask?.endDatePlanned) setPromoteEndDate(promoteTask.endDatePlanned);
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      promotePeriodMode === 'sync'
                        ? 'border-[#a89279] bg-[#faf7f2]'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            promotePeriodMode === 'sync'
                              ? 'border-[#8c7456]'
                              : 'border-zinc-300'
                          }`}
                        >
                          {promotePeriodMode === 'sync' && (
                            <div className="w-2 h-2 rounded-full bg-[#8c7456]" />
                          )}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-zinc-800 block leading-tight">
                          Sincronizar com o cronograma
                        </span>
                        <p
                          className={`text-[10px] leading-tight ${
                            promoteTask?.startDatePlanned || promoteTask?.endDatePlanned
                              ? 'text-zinc-500'
                              : 'text-[#c27a29]'
                          }`}
                        >
                          {promoteTask?.startDatePlanned || promoteTask?.endDatePlanned
                            ? 'A ação seguirá as datas planejadas para esta tarefa.'
                            : 'Tarefa sem cronograma — defina início e duração primeiro.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Option 2: Período manual */}
                  <div
                    onClick={() => setPromotePeriodMode('manual')}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                      promotePeriodMode === 'manual'
                        ? 'border-[#a89279] bg-[#faf7f2]'
                        : 'border-zinc-200 bg-white hover:border-zinc-300'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            promotePeriodMode === 'manual'
                              ? 'border-[#8c7456]'
                              : 'border-zinc-300'
                          }`}
                        >
                          {promotePeriodMode === 'manual' && (
                            <div className="w-2 h-2 rounded-full bg-[#8c7456]" />
                          )}
                        </div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-semibold text-zinc-800 block leading-tight">
                          Período manual
                        </span>
                        <p className="text-[10px] text-zinc-500 leading-tight">
                          A ação continua vinculada à tarefa, mas suas datas não serão atualizadas automaticamente se o cronograma mudar.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* INÍCIO and PRAZO */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    INÍCIO <span className="text-[#8c7456]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={promoteStartDate}
                    onChange={(e) => setPromoteStartDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">
                    PRAZO <span className="text-[#8c7456]">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={promoteEndDate}
                    onChange={(e) => setPromoteEndDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 bg-white focus:outline-hidden focus:border-[#8c7456]"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-[#b8a38b] hover:bg-[#a89178] transition-colors cursor-pointer shadow-xs text-center"
                >
                  Criar ação
                </button>
                <button
                  type="button"
                  onClick={() => setIsPromoteModalOpen(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-zinc-600 border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#1a1614] rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-900/40 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-base text-[#fcf8f5]">Excluir Projeto</h3>
                <p className="text-xs text-[#a89c93]">Esta ação é permanente e irreversível.</p>
              </div>
            </div>

            <div className="bg-[#12100e] rounded-2xl p-4 border border-[#2b2420] space-y-1.5 text-xs">
              <p className="font-bold text-[#fcf8f5] text-sm">{project.title}</p>
              <p className="text-[#a89c93]">
                Cliente: <strong className="text-[#fcf8f5]">{project.clientName || 'Não especificado'}</strong>
              </p>
              {project.location && (
                <p className="text-[#a89c93]">
                  Local: <strong className="text-[#fcf8f5]">{project.location}</strong>
                </p>
              )}
              {project.honorarios ? (
                <p className="text-[#a89c93]">
                  Honorários: <strong className="text-[#fcf8f5]">R$ {project.honorarios.toLocaleString('pt-BR')}</strong>
                </p>
              ) : null}
            </div>

            <p className="text-[11px] text-rose-400/90">
              Ao confirmar, o projeto e todas as etapas de cronograma associadas serão excluídos.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#2b2420]">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2.5 rounded-xl border border-[#3d342f] text-xs font-semibold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#241e1b] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProject}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
