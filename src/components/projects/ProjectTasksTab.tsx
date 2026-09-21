import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Clock,
  Play,
  Pause,
  Square,
  CheckSquare,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  User,
  Users,
  BarChart3,
  TrendingUp,
  Layers,
  Calendar,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Link2,
  Unlink,
  History,
  Sparkles,
  Timer,
  Check,
  X,
  ExternalLink,
  Award,
  Zap,
  RotateCcw,
} from 'lucide-react';
import {
  ArchitectureProject,
  ProjectWorkflowStage,
  ProjectTaskItem,
  TaskChecklistItem,
  TaskEditLog,
} from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { formatDate } from '../../utils/formatters';

interface ProjectTasksTabProps {
  project: ArchitectureProject;
  stages: ProjectWorkflowStage[];
  onUpdateStages: (newStages: ProjectWorkflowStage[]) => void;
}

export const ProjectTasksTab: React.FC<ProjectTasksTabProps> = ({
  project,
  stages,
  onUpdateStages,
}) => {
  const { user } = useAuth();
  const { teamMembers, fullTeamMembers } = useTeamMembers();

  // Current sub-view: 'lista' | 'timeline' | 'eficiencia'
  const [subView, setSubView] = useState<'lista' | 'timeline' | 'eficiencia'>('lista');

  // Search & Filter tag
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'todas' | 'em_risco' | 'fora_etapa' | 'com_acao' | 'criticas' | 'sem_cronograma' | 'minhas'
  >('todas');
  const [selectedResponsibleFilter, setSelectedResponsibleFilter] = useState<string>('all');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('all');

  // Task Edit / Create Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingStageId, setEditingStageId] = useState<string>('');
  const [editingTask, setEditingTask] = useState<ProjectTaskItem | null>(null);

  // Form Fields for Editing Task (Image 3)
  const [formTitle, setFormTitle] = useState('');
  const [formStageId, setFormStageId] = useState('');
  const [formResponsible, setFormResponsible] = useState('');
  const [formEstimatedHours, setFormEstimatedHours] = useState('03:00');
  const [formRealizedHours, setFormRealizedHours] = useState('00:00');
  const [formStartDate, setFormStartDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndDate, setFormEndDate] = useState('');
  const [formEndTime, setFormEndTime] = useState('18:00');
  const [formStatus, setFormStatus] = useState<'pending' | 'in_progress' | 'completed'>('pending');
  const [formLinkedTaskId, setFormLinkedTaskId] = useState('');
  const [formChecklist, setFormChecklist] = useState<TaskChecklistItem[]>([]);
  const [newChecklistText, setNewChecklistText] = useState('');
  const [activeModalTab, setActiveModalTab] = useState<'detalhes' | 'checklist' | 'historico'>('detalhes');

  // Interactive Stopwatch / Timer State (Image 6)
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [activeTimerStageId, setActiveTimerStageId] = useState<string | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isTimerMinimized, setIsTimerMinimized] = useState(false);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Timer Tick
  useEffect(() => {
    if (isTimerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [isTimerRunning]);

  // Format seconds to HH:MM:SS
  const formatTimerDisplay = (totalSec: number) => {
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Convert decimal hours (e.g. 2.5) to "02:30" string
  const decimalToHoursStr = (decimalVal?: number): string => {
    if (!decimalVal || isNaN(decimalVal)) return '00:00';
    const hrs = Math.floor(decimalVal);
    const mins = Math.round((decimalVal - hrs) * 60);
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
  };

  // Convert "02:30" string to decimal hours (2.5)
  const hoursStrToDecimal = (str: string): number => {
    if (!str) return 0;
    if (str.includes(':')) {
      const [h, m] = str.split(':').map(Number);
      return (h || 0) + (m || 0) / 60;
    }
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Flatten all tasks with stage metadata for easy listing and calculations
  const allTasks = useMemo(() => {
    const list: Array<{
      stageId: string;
      stageName: string;
      task: ProjectTaskItem;
    }> = [];
    stages.forEach((stg) => {
      stg.tasks.forEach((tsk) => {
        list.push({
          stageId: stg.id,
          stageName: stg.name,
          task: tsk,
        });
      });
    });
    return list;
  }, [stages]);

  // Filtered task list
  const filteredTasks = useMemo(() => {
    return allTasks.filter(({ stageId, stageName, task }) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = task.name.toLowerCase().includes(q);
        const matchStage = stageName.toLowerCase().includes(q);
        const matchResp = (task.responsible || '').toLowerCase().includes(q);
        if (!matchTitle && !matchStage && !matchResp) return false;
      }

      // Stage Filter
      if (selectedStageFilter !== 'all' && stageId !== selectedStageFilter) {
        return false;
      }

      // Responsible Filter
      if (selectedResponsibleFilter !== 'all') {
        if ((task.responsible || '') !== selectedResponsibleFilter) return false;
      }

      // Tag Filter
      const today = new Date().toISOString().split('T')[0];
      if (statusFilter === 'em_risco') {
        if (task.status !== 'completed' && task.endDatePlanned && task.endDatePlanned < today) {
          return true;
        }
        return task.hasAlert;
      }
      if (statusFilter === 'criticas') {
        return task.hasAlert || (task.status === 'in_progress' && task.endDatePlanned && task.endDatePlanned <= today);
      }
      if (statusFilter === 'sem_cronograma') {
        return !task.startDatePlanned && !task.endDatePlanned;
      }
      if (statusFilter === 'com_acao') {
        return !!task.actionId || !!task.isPromoted;
      }
      if (statusFilter === 'minhas') {
        const myName = (user?.displayName || '').toLowerCase();
        return (task.responsible || '').toLowerCase().includes(myName);
      }

      return true;
    });
  }, [allTasks, searchQuery, selectedStageFilter, selectedResponsibleFilter, statusFilter, user]);

  // Efficiency and Hours Analytics (Image 5)
  const efficiencyAnalytics = useMemo(() => {
    let totalEstimated = 0;
    let totalRealized = 0;

    // Per-stage metrics
    const stageMap: { [key: string]: { name: string; estimated: number; realized: number } } = {};

    // Per-user metrics
    const userMap: {
      [key: string]: {
        name: string;
        roleTitle?: string;
        estimated: number;
        realized: number;
        completedCount: number;
        totalCount: number;
        onTimeCount: number;
      };
    } = {};

    stages.forEach((stg) => {
      stageMap[stg.id] = { name: stg.name, estimated: 0, realized: 0 };
    });

    const today = new Date().toISOString().split('T')[0];

    allTasks.forEach(({ stageId, task }) => {
      const est = task.estimatedHours || 3;
      const real = task.realizedHours || 0;
      totalEstimated += est;
      totalRealized += real;

      if (stageMap[stageId]) {
        stageMap[stageId].estimated += est;
        stageMap[stageId].realized += real;
      }

      const resp = task.responsible || 'Equipe Geral';
      if (!userMap[resp]) {
        const found = fullTeamMembers.find((m) => m.name.toLowerCase() === resp.toLowerCase());
        userMap[resp] = {
          name: resp,
          roleTitle: found?.roleTitle || 'Colaborador',
          estimated: 0,
          realized: 0,
          completedCount: 0,
          totalCount: 0,
          onTimeCount: 0,
        };
      }

      userMap[resp].estimated += est;
      userMap[resp].realized += real;
      userMap[resp].totalCount += 1;
      if (task.status === 'completed') {
        userMap[resp].completedCount += 1;
        if (!task.endDatePlanned || task.endDatePlanned >= today) {
          userMap[resp].onTimeCount += 1;
        }
      }
    });

    const remaining = Math.max(0, totalEstimated - totalRealized);
    const percentDone = totalEstimated > 0 ? (totalRealized / totalEstimated) * 100 : 0;

    const userList = Object.values(userMap).map((u) => {
      // Efficiency ratio: if they estimated 10h and delivered in 8h, efficiency is 125%
      const efficiency =
        u.realized > 0
          ? Math.round((u.estimated / u.realized) * 100)
          : u.completedCount > 0
          ? 100
          : 0;
      const onTimeRate =
        u.completedCount > 0 ? Math.round((u.onTimeCount / u.completedCount) * 100) : 100;
      return {
        ...u,
        efficiency,
        onTimeRate,
        balance: u.estimated - u.realized,
      };
    });

    return {
      totalEstimated: Math.round(totalEstimated),
      totalRealized: Math.round(totalRealized),
      remaining: Math.round(remaining),
      percentDone: percentDone.toFixed(1),
      stages: Object.values(stageMap),
      users: userList,
    };
  }, [allTasks, stages, fullTeamMembers]);

  // Open Edit Modal
  const handleOpenEditModal = (stageId: string, task: ProjectTaskItem) => {
    setEditingStageId(stageId);
    setFormStageId(stageId);
    setEditingTask(task);
    setFormTitle(task.name);
    setFormResponsible(task.responsible || '');
    setFormEstimatedHours(decimalToHoursStr(task.estimatedHours || 3));
    setFormRealizedHours(decimalToHoursStr(task.realizedHours || 0));
    setFormStartDate(task.startDatePlanned || '');
    setFormStartTime(task.startTime || '09:00');
    setFormEndDate(task.endDatePlanned || '');
    setFormEndTime(task.endTime || '18:00');
    setFormStatus(task.status || 'pending');
    setFormLinkedTaskId(task.linkedTaskId || task.predecessor || '');
    setFormChecklist(task.checklist ? [...task.checklist] : []);
    setNewChecklistText('');
    setActiveModalTab('detalhes');
    setIsEditModalOpen(true);
  };

  // Open Create Task Modal
  const handleOpenCreateModal = (defaultStageId?: string) => {
    const targetStageId = defaultStageId || stages[0]?.id || '';
    setEditingStageId(targetStageId);
    setFormStageId(targetStageId);
    setEditingTask(null);
    setFormTitle('');
    setFormResponsible(user?.displayName || 'Arquiteto');
    setFormEstimatedHours('03:00');
    setFormRealizedHours('00:00');
    const today = new Date().toISOString().split('T')[0];
    setFormStartDate(today);
    setFormStartTime('09:00');
    setFormEndDate(today);
    setFormEndTime('18:00');
    setFormStatus('pending');
    setFormLinkedTaskId('');
    setFormChecklist([
      { id: 'chk_1', text: 'Download e análise inicial dos arquivos', completed: false },
      { id: 'chk_2', text: 'Desenvolvimento da modelagem / documentação', completed: false },
    ]);
    setNewChecklistText('');
    setActiveModalTab('detalhes');
    setIsEditModalOpen(true);
  };

  // Save Task with Automation & Audit Log (Images 1, 3)
  const handleSaveTask = () => {
    if (!formTitle.trim()) return;

    const currentUserName = user?.displayName || user?.email || 'Arquiteto Titular';
    const now = Date.now();

    const estDec = hoursStrToDecimal(formEstimatedHours);
    const realDec = hoursStrToDecimal(formRealizedHours);

    // Build or update task
    const isNew = !editingTask;
    const taskId = editingTask ? editingTask.id : `tsk_${Date.now()}`;

    // Create Audit Log Entry
    const newLog: TaskEditLog = {
      id: `log_${now}_${Math.random().toString(36).substring(2, 6)}`,
      userName: currentUserName,
      timestamp: now,
      action: isNew ? 'created' : 'edited',
      description: isNew
        ? `Criou a tarefa "${formTitle.trim()}" com ${estDec}h estimadas`
        : `Atualizou dados: status "${formStatus}", prazo até ${formEndDate || 'sem data'}`,
    };

    const existingLogs = editingTask?.editHistory || [];
    const updatedLogs = [newLog, ...existingLogs];

    const updatedTaskItem: ProjectTaskItem = {
      id: taskId,
      name: formTitle.trim(),
      status: formStatus,
      estimatedHours: estDec,
      realizedHours: realDec,
      startDatePlanned: formStartDate,
      startTime: formStartTime,
      endDatePlanned: formEndDate,
      endTime: formEndTime,
      responsible: formResponsible,
      linkedTaskId: formLinkedTaskId,
      predecessor: formLinkedTaskId,
      checklist: formChecklist,
      editHistory: updatedLogs,
      hasAlert: editingTask?.hasAlert || false,
      isPromoted: editingTask?.isPromoted || false,
      actionId: editingTask?.actionId,
    };

    // Automated Cascade for Linked Tasks (Image 1):
    // If this task has an end date, any other task that is linked to this task
    // can have its start date automatically shifted to the next day!
    let updatedStages = stages.map((stg) => {
      // Remove from old stage if moved
      if (!isNew && editingStageId !== formStageId && stg.id === editingStageId) {
        return {
          ...stg,
          tasks: stg.tasks.filter((t) => t.id !== taskId),
        };
      }

      // Add or update in target stage
      if (stg.id === formStageId) {
        const taskExists = stg.tasks.some((t) => t.id === taskId);
        if (taskExists) {
          return {
            ...stg,
            tasks: stg.tasks.map((t) => (t.id === taskId ? updatedTaskItem : t)),
          };
        } else {
          return {
            ...stg,
            tasks: [...stg.tasks, updatedTaskItem],
          };
        }
      }

      return stg;
    });

    // Cascading automation: If this task has an end date, update tasks that link to it
    if (formEndDate) {
      const nextDayDate = new Date(formEndDate);
      nextDayDate.setDate(nextDayDate.getDate() + 1);
      const nextDayStr = nextDayDate.toISOString().split('T')[0];

      updatedStages = updatedStages.map((stg) => ({
        ...stg,
        tasks: stg.tasks.map((t) => {
          if (t.linkedTaskId === taskId || t.predecessor === taskId) {
            // Calculate duration to shift end date accordingly
            let newEnd = t.endDatePlanned;
            if (t.startDatePlanned && t.endDatePlanned) {
              const start = new Date(t.startDatePlanned).getTime();
              const end = new Date(t.endDatePlanned).getTime();
              const diffDays = Math.max(1, Math.round((end - start) / (1000 * 3600 * 24)));
              const shiftedEnd = new Date(nextDayStr);
              shiftedEnd.setDate(shiftedEnd.getDate() + diffDays);
              newEnd = shiftedEnd.toISOString().split('T')[0];
            }
            return {
              ...t,
              startDatePlanned: nextDayStr,
              endDatePlanned: newEnd || nextDayStr,
              editHistory: [
                {
                  id: `log_${Date.now()}_auto`,
                  userName: 'Automação de Vínculo',
                  timestamp: Date.now(),
                  action: 'edited',
                  description: `Prazo recalculado automaticamente pelo término da tarefa vinculada "${formTitle}"`,
                },
                ...(t.editHistory || []),
              ],
            };
          }
          return t;
        }),
      }));
    }

    onUpdateStages(updatedStages);
    setIsEditModalOpen(false);
    setEditingTask(null);
  };

  // Delete task with confirmation
  const handleDeleteTask = (stageId: string, taskId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta tarefa?')) return;
    const updatedStages = stages.map((stg) => {
      if (stg.id === stageId) {
        return {
          ...stg,
          tasks: stg.tasks.filter((t) => t.id !== taskId),
        };
      }
      return stg;
    });
    onUpdateStages(updatedStages);
  };

  // Fast Status Change from Table
  const handleQuickStatusChange = (
    stageId: string,
    task: ProjectTaskItem,
    newStatus: 'pending' | 'in_progress' | 'completed'
  ) => {
    const currentUserName = user?.displayName || 'Arquiteto';
    const updatedStages = stages.map((stg) => {
      if (stg.id === stageId) {
        return {
          ...stg,
          tasks: stg.tasks.map((t) => {
            if (t.id === task.id) {
              return {
                ...t,
                status: newStatus,
                editHistory: [
                  {
                    id: `log_${Date.now()}`,
                    userName: currentUserName,
                    timestamp: Date.now(),
                    action: 'status_changed',
                    description: `Alterou status para "${newStatus === 'completed' ? 'Concluído' : newStatus === 'in_progress' ? 'Em andamento' : 'Planejado'}"`,
                  },
                  ...(t.editHistory || []),
                ],
              };
            }
            return t;
          }),
        };
      }
      return stg;
    });
    onUpdateStages(updatedStages);
  };

  // Stopwatch Handler: Start / Switch
  const handleStartTimer = (stageId: string, task: ProjectTaskItem) => {
    if (activeTimerTaskId === task.id) {
      setIsTimerRunning(!isTimerRunning);
      return;
    }
    setActiveTimerStageId(stageId);
    setActiveTimerTaskId(task.id);
    setTimerSeconds(0);
    setIsTimerRunning(true);
    setIsTimerMinimized(false);
  };

  // Stopwatch Handler: Stop and Commit Hours
  const handleSaveTimerResult = () => {
    if (!activeTimerTaskId || !activeTimerStageId || timerSeconds === 0) {
      setIsTimerRunning(false);
      setActiveTimerTaskId(null);
      return;
    }

    const durationMinutes = Math.max(1, Math.round(timerSeconds / 60));
    const hoursAdded = durationMinutes / 60;
    const currentUserName = user?.displayName || user?.email || 'Arquiteto Titular';

    const updatedStages = stages.map((stg) => {
      if (stg.id === activeTimerStageId) {
        return {
          ...stg,
          tasks: stg.tasks.map((t) => {
            if (t.id === activeTimerTaskId) {
              const currentRealized = t.realizedHours || 0;
              const newRealized = parseFloat((currentRealized + hoursAdded).toFixed(2));
              return {
                ...t,
                realizedHours: newRealized,
                status: t.status === 'pending' ? 'in_progress' : t.status,
                editHistory: [
                  {
                    id: `log_timer_${Date.now()}`,
                    userName: currentUserName,
                    timestamp: Date.now(),
                    action: 'timer_added',
                    description: `Cronometrou ${durationMinutes} min de execução no cronômetro`,
                    durationMinutes,
                  },
                  ...(t.editHistory || []),
                ],
              };
            }
            return t;
          }),
        };
      }
      return stg;
    });

    onUpdateStages(updatedStages);
    setIsTimerRunning(false);
    setTimerSeconds(0);
    setActiveTimerTaskId(null);
    setActiveTimerStageId(null);
  };

  // Find active timer task details
  const activeTimerTask = useMemo(() => {
    if (!activeTimerTaskId) return null;
    const found = allTasks.find((item) => item.task.id === activeTimerTaskId);
    return found ? found.task : null;
  }, [allTasks, activeTimerTaskId]);

  return (
    <div className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden p-4 sm:p-6 space-y-6">
      {/* 1. Header Toolbar (Image 2) */}
      <div className="flex flex-col gap-4 pb-4 border-b border-zinc-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Sub-view Switcher */}
          <div className="inline-flex p-1 bg-zinc-100 rounded-xl">
            <button
              onClick={() => setSubView('lista')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                subView === 'lista'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Lista de Tarefas</span>
            </button>
            <button
              onClick={() => setSubView('timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                subView === 'timeline'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <Link2 className="w-3.5 h-3.5" />
              <span>Tarefas Vinculadas (Timeline)</span>
            </button>
            <button
              onClick={() => setSubView('eficiencia')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                subView === 'eficiencia'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Eficiência da Equipe & Horas</span>
            </button>
          </div>

          {/* New Task & Quick Timer Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#8c7456] hover:bg-[#786348] text-white shadow-sm flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Tarefa</span>
            </button>
          </div>
        </div>

        {/* Search & Filter Controls (Image 2) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar etapa, tarefa ou responsável..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#8c7456]/20 focus:border-[#8c7456]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Filter Tag Pills (Image 2) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {(
              [
                { id: 'todas', label: 'Todas' },
                { id: 'em_risco', label: 'Em risco' },
                { id: 'criticas', label: 'Críticas' },
                { id: 'com_acao', label: 'Com ação' },
                { id: 'sem_cronograma', label: 'Sem cronograma' },
                { id: 'minhas', label: 'Minhas tarefas' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-zinc-800 text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. SUB-VIEW: LISTA DE TAREFAS (Image 4) */}
      {subView === 'lista' && (
        <div className="space-y-4">
          {/* Table Container */}
          <div className="overflow-x-auto border border-zinc-200 rounded-2xl bg-white shadow-xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Tarefa</th>
                  <th className="py-3 px-4">Projeto</th>
                  <th className="py-3 px-4">Etapa do projeto</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4">Horas (Est. / Real.)</th>
                  <th className="py-3 px-4">Prazo</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-zinc-400">
                      <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-medium text-sm">Nenhuma tarefa encontrada com os filtros atuais.</p>
                      <button
                        onClick={() => handleOpenCreateModal()}
                        className="mt-3 text-xs text-[#8c7456] hover:underline font-bold"
                      >
                        + Criar primeira tarefa
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map(({ stageId, stageName, task }) => {
                    const est = task.estimatedHours || 3;
                    const real = task.realizedHours || 0;
                    const checklistTotal = task.checklist?.length || 0;
                    const checklistDone = task.checklist?.filter((c) => c.completed).length || 0;
                    const isTimerActiveForThis = activeTimerTaskId === task.id;

                    return (
                      <tr
                        key={task.id}
                        className={`hover:bg-zinc-50/70 transition-colors group ${
                          isTimerActiveForThis ? 'bg-amber-50/50' : ''
                        }`}
                      >
                        {/* Tarefa */}
                        <td className="py-3.5 px-4 font-semibold text-zinc-900 max-w-xs">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                handleQuickStatusChange(
                                  stageId,
                                  task,
                                  task.status === 'completed' ? 'pending' : 'completed'
                                )
                              }
                              className={`shrink-0 w-4 h-4 rounded border transition-colors flex items-center justify-center cursor-pointer ${
                                task.status === 'completed'
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-zinc-300 hover:border-zinc-500 bg-white'
                              }`}
                            >
                              {task.status === 'completed' && <Check className="w-3 h-3" />}
                            </button>
                            <span
                              className={`truncate cursor-pointer hover:text-[#8c7456] ${
                                task.status === 'completed' ? 'line-through text-zinc-400' : ''
                              }`}
                              onClick={() => handleOpenEditModal(stageId, task)}
                              title={task.name}
                            >
                              {task.name}
                            </span>
                          </div>

                          {/* Extra badges: Linked task or checklist items */}
                          <div className="flex items-center gap-2 mt-1 pl-6 text-[10px] text-zinc-400">
                            {checklistTotal > 0 && (
                              <span className="flex items-center gap-1 font-mono text-zinc-500">
                                <CheckSquare className="w-2.5 h-2.5" />
                                {checklistDone}/{checklistTotal}
                              </span>
                            )}
                            {task.linkedTaskId && (
                              <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                                <Link2 className="w-2.5 h-2.5" />
                                Vinculada
                              </span>
                            )}
                            {task.editHistory && task.editHistory.length > 0 && (
                              <span
                                className="flex items-center gap-0.5 text-zinc-400 cursor-pointer hover:text-zinc-600"
                                onClick={() => {
                                  handleOpenEditModal(stageId, task);
                                  setActiveModalTab('historico');
                                }}
                                title="Ver histórico de edições"
                              >
                                <History className="w-2.5 h-2.5" />
                                {task.editHistory.length}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Projeto */}
                        <td className="py-3.5 px-4 text-zinc-600 whitespace-nowrap">
                          {project.title}
                        </td>

                        {/* Etapa */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-zinc-100 text-zinc-700 rounded-lg text-[11px] font-medium border border-zinc-200/60">
                            {stageName}
                          </span>
                        </td>

                        {/* Responsável (Image 4) */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#8c7456]/15 text-[#8c7456] flex items-center justify-center font-bold text-[10px] border border-[#8c7456]/20">
                              {(task.responsible || 'U').substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-zinc-700 font-medium text-[11px]">
                              {task.responsible || 'Não atribuído'}
                            </span>
                          </div>
                        </td>

                        {/* Horas */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-zinc-700 font-bold">{real.toFixed(1)}h</span>
                            <span className="text-zinc-400">/</span>
                            <span className="text-zinc-500">{est.toFixed(1)}h</span>
                          </div>
                          {est > 0 && (
                            <div className="w-16 h-1.5 bg-zinc-100 rounded-full mt-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  real > est ? 'bg-amber-500' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, (real / est) * 100)}%` }}
                              />
                            </div>
                          )}
                        </td>

                        {/* Prazo */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-zinc-600 text-[11px]">
                          {task.endDatePlanned ? formatDate(task.endDatePlanned) : '—'}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <button
                            onClick={() =>
                              handleQuickStatusChange(
                                stageId,
                                task,
                                task.status === 'completed'
                                  ? 'pending'
                                  : task.status === 'pending'
                                  ? 'in_progress'
                                  : 'completed'
                              )
                            }
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider cursor-pointer transition-all border ${
                              task.status === 'completed'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                : task.status === 'in_progress'
                                ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                : 'bg-zinc-100 text-zinc-600 border-zinc-200 hover:bg-zinc-200'
                            }`}
                          >
                            {task.status === 'completed'
                              ? 'Concluído'
                              : task.status === 'in_progress'
                              ? 'Em andamento'
                              : 'Planejado'}
                          </button>
                        </td>

                        {/* Ações */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Cronômetro rápido (Image 6) */}
                            <button
                              onClick={() => handleStartTimer(stageId, task)}
                              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                isTimerActiveForThis && isTimerRunning
                                  ? 'bg-amber-500 text-white animate-pulse'
                                  : 'text-zinc-400 hover:text-amber-600 hover:bg-amber-50'
                              }`}
                              title={
                                isTimerActiveForThis && isTimerRunning
                                  ? 'Pausar cronômetro'
                                  : 'Iniciar cronômetro para esta tarefa'
                              }
                            >
                              {isTimerActiveForThis && isTimerRunning ? (
                                <Pause className="w-3.5 h-3.5" />
                              ) : (
                                <Play className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Editar */}
                            <button
                              onClick={() => handleOpenEditModal(stageId, task)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-all cursor-pointer"
                              title="Editar tarefa e checklists"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Excluir */}
                            <button
                              onClick={() => handleDeleteTask(stageId, task.id)}
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all cursor-pointer"
                              title="Excluir tarefa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SUB-VIEW: TIMELINE & TAREFAS VINCULADAS (Image 1) */}
      {subView === 'timeline' && (
        <div className="space-y-6">
          {/* Informative Guidance Banner matching Image 1 */}
          <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <Link2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  Tarefas Vinculadas & Automatizadas
                </span>
                <h4 className="text-sm font-bold text-zinc-900">
                  Economize tempo com tarefas vinculadas
                </h4>
                <p className="text-xs text-zinc-600 mt-0.5 leading-relaxed">
                  Crie tarefas com vínculos: assim, você não precisará alterar manualmente as datas
                  de execução toda vez que alterar um prazo de projeto ou obra. Ao adiar uma tarefa
                  predecessora, as tarefas dependentes são remarcadas em cascata automaticamente.
                </p>
              </div>
            </div>
            <button
              onClick={() => handleOpenCreateModal()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-sm cursor-pointer"
            >
              + Vincular Nova Tarefa
            </button>
          </div>

          {/* Interactive Gantt / Timeline Canvas */}
          <div className="border border-zinc-200 rounded-2xl bg-white p-5 overflow-x-auto shadow-xs">
            <div className="min-w-[700px] space-y-4">
              {stages.map((stg) => {
                return (
                  <div key={stg.id} className="space-y-2">
                    <div className="flex items-center justify-between pb-1 border-b border-zinc-100">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#8c7456]" />
                        <span className="font-bold text-xs text-zinc-800">{stg.name}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          ({stg.tasks.length} tarefas)
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pl-4">
                      {stg.tasks.length === 0 ? (
                        <p className="text-xs text-zinc-400 italic py-1">Nenhuma tarefa nesta etapa.</p>
                      ) : (
                        stg.tasks.map((tsk) => {
                          const linkedTaskName = tsk.linkedTaskId
                            ? allTasks.find((item) => item.task.id === tsk.linkedTaskId)?.task.name
                            : null;

                          return (
                            <div
                              key={tsk.id}
                              className="p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50 hover:bg-zinc-50 transition-all flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={() =>
                                    handleQuickStatusChange(
                                      stg.id,
                                      tsk,
                                      tsk.status === 'completed' ? 'pending' : 'completed'
                                    )
                                  }
                                  className={`w-4 h-4 rounded border flex items-center justify-center cursor-pointer ${
                                    tsk.status === 'completed'
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : 'border-zinc-300 bg-white'
                                  }`}
                                >
                                  {tsk.status === 'completed' && <Check className="w-3 h-3" />}
                                </button>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`text-xs font-bold cursor-pointer hover:text-[#8c7456] ${
                                        tsk.status === 'completed' ? 'line-through text-zinc-400' : 'text-zinc-800'
                                      }`}
                                      onClick={() => handleOpenEditModal(stg.id, tsk)}
                                    >
                                      {tsk.name}
                                    </span>
                                    {linkedTaskName && (
                                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full flex items-center gap-1 font-medium">
                                        <ArrowRight className="w-2.5 h-2.5" />
                                        Depende de: {linkedTaskName}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 mt-1">
                                    <span>
                                      Período: {tsk.startDatePlanned ? formatDate(tsk.startDatePlanned) : '—'} até{' '}
                                      {tsk.endDatePlanned ? formatDate(tsk.endDatePlanned) : '—'}
                                    </span>
                                    <span>•</span>
                                    <span>Resp: {tsk.responsible || 'Equipe'}</span>
                                    <span>•</span>
                                    <span>
                                      Horas: {tsk.realizedHours || 0}h / {tsk.estimatedHours || 3}h
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => handleOpenEditModal(stg.id, tsk)}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-zinc-700 bg-white hover:bg-zinc-100 border border-zinc-200 rounded-lg cursor-pointer"
                                >
                                  Vincular / Editar
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 4. SUB-VIEW: EFICIÊNCIA DA EQUIPE & GESTÃO DE HORAS (Image 5) */}
      {subView === 'eficiencia' && (
        <div className="space-y-6">
          {/* 4 Cards de Métricas Principais (Image 5) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <span className="text-xs text-zinc-500 font-medium">Horas estimadas</span>
              <div className="text-2xl font-serif font-bold text-blue-600 mt-1">
                {efficiencyAnalytics.totalEstimated}h
              </div>
              <span className="text-[11px] text-zinc-400">Total planejado no projeto</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <span className="text-xs text-zinc-500 font-medium">Horas realizadas</span>
              <div className="text-2xl font-serif font-bold text-emerald-600 mt-1">
                {efficiencyAnalytics.totalRealized}h
              </div>
              <span className="text-[11px] text-zinc-400">Tempo efetivo trabalhado</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <span className="text-xs text-zinc-500 font-medium">Horas restantes</span>
              <div className="text-2xl font-serif font-bold text-amber-600 mt-1">
                {efficiencyAnalytics.remaining}h
              </div>
              <span className="text-[11px] text-zinc-400">Saldo de horas disponível</span>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <span className="text-xs text-zinc-500 font-medium">Percentual realizado</span>
              <div className="text-2xl font-serif font-bold text-zinc-900 mt-1">
                {efficiencyAnalytics.percentDone}%
              </div>
              <span className="text-[11px] text-zinc-400">Progresso de horas</span>
            </div>
          </div>

          {/* Gráfico de Barras: Horas Realizadas vs Estimadas por Etapa (Image 5) */}
          <div className="p-5 rounded-2xl border border-zinc-200 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-zinc-900">
                  Comparativo de Horas Realizadas por Etapa
                </h4>
                <p className="text-xs text-zinc-500">
                  Compare as horas trabalhadas pela equipe com as planejadas em cada fase
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5 text-zinc-600">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" />
                  Horas realizadas
                </span>
                <span className="flex items-center gap-1.5 text-zinc-600">
                  <span className="w-3 h-3 rounded-sm bg-zinc-200 inline-block" />
                  Horas estimadas
                </span>
              </div>
            </div>

            {/* Custom Responsive SVG / HTML Bar Chart */}
            <div className="pt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 items-end min-h-[180px]">
              {efficiencyAnalytics.stages.map((stg, idx) => {
                const maxVal = Math.max(
                  ...efficiencyAnalytics.stages.map((s) => Math.max(s.estimated, s.realized)),
                  10
                );
                const heightPercent = Math.min(100, Math.round((stg.realized / maxVal) * 100));

                return (
                  <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
                    <span className="text-xs font-bold text-emerald-700">{stg.realized}h</span>
                    <div className="w-full max-w-[48px] bg-zinc-100 rounded-t-lg relative h-32 flex items-end overflow-hidden border border-zinc-200">
                      <div
                        className="w-full bg-emerald-500 rounded-t-lg transition-all duration-500"
                        style={{ height: `${Math.max(8, heightPercent)}%` }}
                        title={`${stg.name}: ${stg.realized}h realizadas de ${stg.estimated}h estimadas`}
                      />
                    </div>
                    <span
                      className="text-[11px] font-medium text-zinc-700 text-center truncate max-w-[90px]"
                      title={stg.name}
                    >
                      {stg.name}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabela de Eficiência de Cada Usuário do Escritório (Image 5 & Prompt) */}
          <div className="border border-zinc-200 rounded-2xl bg-white overflow-hidden shadow-xs space-y-3 p-5">
            <div>
              <h4 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#8c7456]" />
                <span>Eficiência Individual de Cada Usuário do Escritório</span>
              </h4>
              <p className="text-xs text-zinc-500">
                Acompanhe o desempenho, tempo gasto vs estimado e pontualidade de cada colaborador
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-3">Colaborador</th>
                    <th className="py-2.5 px-3">Cargo / Função</th>
                    <th className="py-2.5 px-3">Tarefas (Feitas/Total)</th>
                    <th className="py-2.5 px-3">Horas Estimadas</th>
                    <th className="py-2.5 px-3">Horas Realizadas</th>
                    <th className="py-2.5 px-3">Saldo (Economia)</th>
                    <th className="py-2.5 px-3">Índice de Eficiência</th>
                    <th className="py-2.5 px-3">Pontualidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {efficiencyAnalytics.users.map((u, i) => {
                    const isHighEfficiency = u.efficiency >= 100;

                    return (
                      <tr key={i} className="hover:bg-zinc-50/70">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-[#8c7456]/15 text-[#8c7456] flex items-center justify-center font-bold text-xs border border-[#8c7456]/20">
                              {u.name.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="font-bold text-zinc-900">{u.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-zinc-600">{u.roleTitle || 'Colaborador'}</td>
                        <td className="py-3 px-3 font-mono">
                          <span className="font-bold text-zinc-900">{u.completedCount}</span>
                          <span className="text-zinc-400"> / </span>
                          <span className="text-zinc-600">{u.totalCount}</span>
                        </td>
                        <td className="py-3 px-3 font-mono text-zinc-700">{u.estimated.toFixed(1)}h</td>
                        <td className="py-3 px-3 font-mono font-bold text-zinc-900">
                          {u.realized.toFixed(1)}h
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span
                            className={`font-bold ${
                              u.balance >= 0 ? 'text-emerald-600' : 'text-amber-600'
                            }`}
                          >
                            {u.balance >= 0 ? `+${u.balance.toFixed(1)}h` : `${u.balance.toFixed(1)}h`}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isHighEfficiency
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {u.efficiency > 0 ? `${u.efficiency}%` : 'Em apuração'}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span className="text-zinc-700 font-semibold">{u.onTimeRate}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL: EDITAR / CRIAR TAREFA COM CHECKLIST E AUDITORIA (Image 3) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div
            className="w-full max-w-xl bg-white border border-zinc-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
                </h3>
                <p className="text-xs text-zinc-500">
                  Gerencie prazos, responsáveis, checklists e auditoria de execução
                </p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs: Detalhes, Checklist, Histórico */}
            <div className="flex border-b border-zinc-200 bg-zinc-50/50 px-5 text-xs font-semibold">
              <button
                onClick={() => setActiveModalTab('detalhes')}
                className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer ${
                  activeModalTab === 'detalhes'
                    ? 'border-[#8c7456] text-zinc-900 font-bold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Detalhes & Prazos
              </button>
              <button
                onClick={() => setActiveModalTab('checklist')}
                className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeModalTab === 'checklist'
                    ? 'border-[#8c7456] text-zinc-900 font-bold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>Checklist ({formChecklist.length})</span>
              </button>
              <button
                onClick={() => setActiveModalTab('historico')}
                className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeModalTab === 'historico'
                    ? 'border-[#8c7456] text-zinc-900 font-bold'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Histórico de Edições ({editingTask?.editHistory?.length || 0})</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {activeModalTab === 'detalhes' && (
                <>
                  {/* Título da tarefa */}
                  <div>
                    <label className="block text-zinc-700 font-bold mb-1">Título da tarefa</label>
                    <input
                      type="text"
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ex: Levantamento métrico e fotográfico"
                      className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#8c7456]/20 focus:border-[#8c7456]"
                    />
                  </div>

                  {/* Etapa & Responsável */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">Etapa do Projeto</label>
                      <select
                        value={formStageId}
                        onChange={(e) => setFormStageId(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#8c7456]/20 focus:border-[#8c7456]"
                      >
                        {stages.map((stg) => (
                          <option key={stg.id} value={stg.id}>
                            {stg.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">Responsável</label>
                      <select
                        value={formResponsible}
                        onChange={(e) => setFormResponsible(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#8c7456]/20 focus:border-[#8c7456]"
                      >
                        <option value="">Selecionar responsável...</option>
                        {fullTeamMembers.map((m) => (
                          <option key={m.id} value={m.name}>
                            {m.name} ({m.roleTitle || 'Colaborador'})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Horas Estimadas & Realizadas (Image 3) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">Horas estimadas</label>
                      <input
                        type="text"
                        value={formEstimatedHours}
                        onChange={(e) => setFormEstimatedHours(e.target.value)}
                        placeholder="03:00"
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#8c7456]/20 focus:border-[#8c7456]"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">Horas realizadas</label>
                      <input
                        type="text"
                        value={formRealizedHours}
                        onChange={(e) => setFormRealizedHours(e.target.value)}
                        placeholder="00:00"
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#8c7456]/20 focus:border-[#8c7456]"
                      />
                    </div>
                  </div>

                  {/* Datas e Horários de Início e Fim (Image 3) */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">Data de início</label>
                      <input
                        type="date"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#8c7456]/20 focus:border-[#8c7456]"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">Hora de início</label>
                      <input
                        type="time"
                        value={formStartTime}
                        onChange={(e) => setFormStartTime(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#8c7456]/20 focus:border-[#8c7456]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">Data de fim</label>
                      <input
                        type="date"
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#8c7456]/20 focus:border-[#8c7456]"
                      />
                    </div>
                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">Hora de fim</label>
                      <input
                        type="time"
                        value={formEndTime}
                        onChange={(e) => setFormEndTime(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#8c7456]/20 focus:border-[#8c7456]"
                      />
                    </div>
                  </div>

                  {/* Status & Vincular Tarefa (Image 3) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">Status</label>
                      <select
                        value={formStatus}
                        onChange={(e) =>
                          setFormStatus(e.target.value as 'pending' | 'in_progress' | 'completed')
                        }
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#8c7456]/20 focus:border-[#8c7456]"
                      >
                        <option value="pending">Planejado</option>
                        <option value="in_progress">Em andamento</option>
                        <option value="completed">Concluído</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-zinc-700 font-bold mb-1">Vincular tarefa</label>
                      <select
                        value={formLinkedTaskId}
                        onChange={(e) => setFormLinkedTaskId(e.target.value)}
                        className="w-full px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#8c7456]/20 focus:border-[#8c7456]"
                      >
                        <option value="">Nenhum vínculo (Independente)</option>
                        {allTasks
                          .filter((item) => !editingTask || item.task.id !== editingTask.id)
                          .map((item) => (
                            <option key={item.task.id} value={item.task.id}>
                              {item.stageName} ➔ {item.task.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>
                </>
              )}

              {/* Checklist Tab (Image 3) */}
              {activeModalTab === 'checklist' && (
                <div className="space-y-4">
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600">
                    Automatize processos criando checklists facilmente. Marque o que precisa ser feito
                    para concluir a tarefa.
                  </div>

                  {/* Checklist Items */}
                  <div className="space-y-2">
                    {formChecklist.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-xl border border-zinc-200"
                      >
                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setFormChecklist((prev) =>
                                prev.map((c) => (c.id === item.id ? { ...c, completed: checked } : c))
                              );
                            }}
                            className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          />
                          <span
                            className={`text-xs ${
                              item.completed ? 'line-through text-zinc-400' : 'text-zinc-800'
                            }`}
                          >
                            {item.text}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setFormChecklist((prev) => prev.filter((c) => c.id !== item.id));
                          }}
                          className="text-zinc-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add Checklist Item */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Adicionar novo item de checklist..."
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (newChecklistText.trim()) {
                            setFormChecklist((prev) => [
                              ...prev,
                              {
                                id: `chk_${Date.now()}`,
                                text: newChecklistText.trim(),
                                completed: false,
                              },
                            ]);
                            setNewChecklistText('');
                          }
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-zinc-300 rounded-xl text-xs focus:ring-2 focus:ring-[#8c7456]/20 focus:border-[#8c7456]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newChecklistText.trim()) {
                          setFormChecklist((prev) => [
                            ...prev,
                            {
                              id: `chk_${Date.now()}`,
                              text: newChecklistText.trim(),
                              completed: false,
                            },
                          ]);
                          setNewChecklistText('');
                        }
                      }}
                      className="px-3 py-2 bg-zinc-800 text-white rounded-xl text-xs font-bold hover:bg-zinc-700 transition-colors"
                    >
                      + Adicionar
                    </button>
                  </div>
                </div>
              )}

              {/* Histórico & Auditoria ("quem editou e quanto tempo demorou") */}
              {activeModalTab === 'historico' && (
                <div className="space-y-3">
                  <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-600">
                    Registro de auditoria completo com rastreabilidade de quem editou, quando alterou
                    e quanto tempo demorou.
                  </div>

                  {(!editingTask?.editHistory || editingTask.editHistory.length === 0) ? (
                    <div className="py-8 text-center text-zinc-400">
                      <History className="w-6 h-6 mx-auto mb-1 opacity-40" />
                      <p>Nenhum registro anterior gravado para esta tarefa.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {editingTask.editHistory.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 rounded-xl border border-zinc-200 bg-zinc-50/60 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-[#8c7456]/15 text-[#8c7456] flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                              {log.userName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-zinc-900">{log.userName}</span>
                                <span className="text-[10px] text-zinc-400">
                                  {new Date(log.timestamp).toLocaleString('pt-BR')}
                                </span>
                              </div>
                              <p className="text-zinc-600 mt-0.5 leading-relaxed">
                                {log.description}
                              </p>
                              {log.durationMinutes && (
                                <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                                  Tempo registrado: {log.durationMinutes} minutos
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-zinc-600 hover:text-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveTask}
                className="px-5 py-2 text-xs font-bold text-white bg-[#8c7456] hover:bg-[#786348] rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. FLUTUANTE: CRONÔMETRO DE TAREFAS (Image 6) */}
      {activeTimerTaskId && activeTimerTask && (
        <div
          className={`fixed bottom-6 right-6 z-50 bg-white border border-zinc-200 rounded-2xl shadow-2xl p-4 transition-all ${
            isTimerMinimized ? 'w-64' : 'w-80'
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isTimerRunning ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                }`}
              />
              <span className="text-xs font-bold text-zinc-800">Cronômetro de Tarefas</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsTimerMinimized(!isTimerMinimized)}
                className="p-1 text-zinc-400 hover:text-zinc-600 text-xs"
                title={isTimerMinimized ? 'Expandir' : 'Minimizar'}
              >
                {isTimerMinimized ? '▲' : '▼'}
              </button>
              <button
                onClick={() => {
                  if (timerSeconds > 0) {
                    if (window.confirm('Deseja salvar o tempo cronometrado antes de fechar?')) {
                      handleSaveTimerResult();
                      return;
                    }
                  }
                  setIsTimerRunning(false);
                  setActiveTimerTaskId(null);
                }}
                className="p-1 text-zinc-400 hover:text-zinc-600 text-xs"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="pt-3 space-y-3">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold">Tarefa em andamento</span>
              <p className="text-xs font-bold text-zinc-900 truncate" title={activeTimerTask.name}>
                {activeTimerTask.name}
              </p>
            </div>

            {/* Big Digital Display */}
            <div className="py-2 px-3 bg-zinc-50 border border-zinc-200 rounded-xl text-center">
              <span className="font-mono text-2xl font-bold text-zinc-900 tracking-wider">
                {formatTimerDisplay(timerSeconds)}
              </span>
            </div>

            {/* Timer Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isTimerRunning
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {isTimerRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" />
                    <span>{timerSeconds > 0 ? 'Continuar' : 'Iniciar'}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleSaveTimerResult}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-[#8c7456] hover:bg-[#786348] text-white flex items-center gap-1 transition-all cursor-pointer"
                title="Salvar horas na tarefa e no histórico"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Salvar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
