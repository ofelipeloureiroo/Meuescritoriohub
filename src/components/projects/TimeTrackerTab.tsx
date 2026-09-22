import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Play,
  Pause,
  Square,
  FolderOpen,
  CheckCircle2,
  Calendar,
  DollarSign,
  Trash2,
  Tag,
  ChevronDown,
  Building2,
  Sparkles,
  Plus,
  RefreshCw,
  Search,
  Check,
  User,
  BarChart3,
  CalendarDays,
  FileText,
  Timer
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { ArchitectureProject, ProjectWorkflowStage } from '../../types';

interface TimeEntry {
  id: string;
  projectId: string;
  projectTitle: string;
  clientName: string;
  stageName: string;
  taskName?: string;
  description: string;
  durationSeconds: number;
  date: string; // YYYY-MM-DD
  startTime: string;
  endTime: string;
  billable: boolean;
  hourlyRate: number;
  responsibleName: string;
}

export const TimeTrackerTab: React.FC = () => {
  const { ongoingArchitectureProjects, updateArchitectureProject, addAppAction } = useFinance();
  const { user, profile } = useAuth();

  const currentUserName = profile?.name || user?.email || 'Arquiteto(a) Responsável';

  // Active Timer state
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedStageName, setSelectedStageName] = useState<string>('');
  const [selectedTaskName, setSelectedTaskName] = useState<string>('');
  const [billable, setBillable] = useState(true);
  const [hourlyRate, setHourlyRate] = useState<number>(150);

  // Timer running state
  const [isRunning, setIsRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [startTimeString, setStartTimeString] = useState<string>('');

  // Sub-tab: 'entries' | 'report'
  const [activeSubTab, setActiveSubTab] = useState<'entries' | 'report'>('entries');
  const [reportDateFilter, setReportDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('week');

  // Saved Time Entries state
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => {
    try {
      const saved = localStorage.getItem('meu_escritorio_time_entries_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [
      {
        id: 'entry-1',
        projectId: 'proj-demo-1',
        projectTitle: 'Residência Alphaville',
        clientName: 'Dr. Roberto e Ana',
        stageName: '03. Estudo Preliminar & Zoneamento 3D',
        taskName: 'Estudo de Layout e Fluxos Funcionais',
        description: 'Desenho de layout da cozinha gourmet e integração com varanda',
        durationSeconds: 5400, // 1h 30m
        date: new Date().toISOString().split('T')[0],
        startTime: '14:00',
        endTime: '15:30',
        billable: true,
        hourlyRate: 150,
        responsibleName: currentUserName
      },
      {
        id: 'entry-2',
        projectId: 'proj-demo-2',
        projectTitle: 'Reforma Apartamento Jardins',
        clientName: 'Carla Mendes',
        stageName: '02. Levantamento Métrico & Fotográfico',
        taskName: 'Visita Técnica e Medição In Loco',
        description: 'Conferência de cotas de pilares e pontos hidráulicos',
        durationSeconds: 7200, // 2h
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        startTime: '10:00',
        endTime: '12:00',
        billable: true,
        hourlyRate: 180,
        responsibleName: currentUserName
      }
    ];
  });

  const [projectSearch, setProjectSearch] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);

  // Persist time entries
  useEffect(() => {
    try {
      localStorage.setItem('meu_escritorio_time_entries_v2', JSON.stringify(timeEntries));
    } catch {}
  }, [timeEntries]);

  // Live timer ticker
  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSecondsElapsed((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  // Selected project object
  const selectedProject = useMemo(() => {
    return ongoingArchitectureProjects.find((p) => p.id === selectedProjectId);
  }, [ongoingArchitectureProjects, selectedProjectId]);

  // Available stages from the selected project's cronograma
  const availableStages: ProjectWorkflowStage[] = useMemo(() => {
    if (!selectedProject || !selectedProject.stages) return [];
    return selectedProject.stages;
  }, [selectedProject]);

  // Available tasks inside the selected stage
  const availableTasks = useMemo(() => {
    if (!selectedStageName || !availableStages) return [];
    const stage = availableStages.find((s) => s.name === selectedStageName);
    return stage ? stage.tasks || [] : [];
  }, [availableStages, selectedStageName]);

  // Format seconds to HH:MM:SS
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStartTimer = () => {
    if (!selectedProjectId) {
      alert('Por favor, selecione um projeto do escritório antes de iniciar o cronômetro.');
      setIsProjectDropdownOpen(true);
      return;
    }
    if (!isRunning) {
      if (secondsElapsed === 0) {
        const now = new Date();
        setStartTimeString(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      }
      setIsRunning(true);
    }
  };

  const handlePauseTimer = () => {
    setIsRunning(false);
  };

  const handleStopAndSave = () => {
    if (secondsElapsed < 5) {
      alert('O tempo registrado é muito curto (< 5 segundos).');
      setIsRunning(false);
      setSecondsElapsed(0);
      return;
    }

    const now = new Date();
    const endTimeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const todayStr = now.toISOString().split('T')[0];

    const newEntry: TimeEntry = {
      id: `entry-${Date.now()}`,
      projectId: selectedProjectId || 'geral',
      projectTitle: selectedProject ? selectedProject.title : 'Projeto Geral do Escritório',
      clientName: selectedProject ? selectedProject.clientName : 'Escritório',
      stageName: selectedStageName || 'Geral / Sem Etapa',
      taskName: selectedTaskName || undefined,
      description: description.trim() || 'Trabalho no projeto',
      durationSeconds: secondsElapsed,
      date: todayStr,
      startTime: startTimeString || '09:00',
      endTime: endTimeString,
      billable,
      hourlyRate,
      responsibleName: currentUserName
    };

    setTimeEntries([newEntry, ...timeEntries]);

    // LINK TO SCHEDULE & TASKS (Bidirectional synchronization)
    if (selectedProjectId && selectedProject) {
      try {
        // 1. Add action to Central de Ações / Tasks
        addAppAction({
          title: `Apontamento: ${selectedProject.title} (${selectedStageName || 'Geral'})`,
          description: `${description.trim() || 'Trabalho no projeto'} • Duração: ${formatTime(secondsElapsed)} • Resp: ${currentUserName}`,
          category: 'Projeto',
          dueDate: todayStr,
          status: 'completed',
          priority: 'media',
          relatedId: selectedProjectId,
          origin: 'Projeto'
        });
      } catch (e) {
        console.warn("Error syncing time entry to action center:", e);
      }

      // 2. Update project schedule stage & tasks
      if (selectedProject.stages && selectedProject.stages.length > 0) {
        const updatedStages = selectedProject.stages.map((stage) => {
          if (stage.name === selectedStageName || (selectedStageName && stage.name.toLowerCase().includes(selectedStageName.toLowerCase()))) {
            return {
              ...stage,
              status: 'in_progress' as const,
              tasks: stage.tasks
                ? stage.tasks.map((t, idx) => (idx === 0 ? { ...t, status: 'completed' as const } : t))
                : []
            };
          }
          return stage;
        });

        updateArchitectureProject(selectedProjectId, {
          stages: updatedStages
        });
      }
    }

    setIsRunning(false);
    setSecondsElapsed(0);
    setDescription('');
    setSelectedStageName('');
    setSelectedTaskName('');
  };

  const handleDeleteEntry = (id: string) => {
    if (confirm('Deseja excluir este registro de tempo?')) {
      setTimeEntries(timeEntries.filter((e) => e.id !== id));
    }
  };

  // Calculations for Today
  const totalSecondsToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return timeEntries
      .filter((e) => e.date === today)
      .reduce((acc, curr) => acc + curr.durationSeconds, (isRunning ? secondsElapsed : 0));
  }, [timeEntries, isRunning, secondsElapsed]);

  const totalBillableToday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const loggedSum = timeEntries
      .filter((e) => e.date === today && e.billable)
      .reduce((acc, curr) => acc + (curr.durationSeconds / 3600) * curr.hourlyRate, 0);
    const activeSum = isRunning && billable ? (secondsElapsed / 3600) * hourlyRate : 0;
    return loggedSum + activeSum;
  }, [timeEntries, isRunning, secondsElapsed, billable, hourlyRate]);

  // Filtered entries for report
  const filteredReportEntries = useMemo(() => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString().split('T')[0];

    return timeEntries.filter((e) => {
      if (reportDateFilter === 'today') return e.date === todayStr;
      if (reportDateFilter === 'week') return e.date >= sevenDaysAgo;
      if (reportDateFilter === 'month') return e.date >= thirtyDaysAgo;
      return true;
    });
  }, [timeEntries, reportDateFilter]);

  const reportTotals = useMemo(() => {
    let totalSeconds = filteredReportEntries.reduce((acc, curr) => acc + curr.durationSeconds, 0);
    let billableSeconds = filteredReportEntries.filter((e) => e.billable).reduce((acc, curr) => acc + curr.durationSeconds, 0);
    let totalAmount = filteredReportEntries.filter((e) => e.billable).reduce((acc, curr) => acc + (curr.durationSeconds / 3600) * curr.hourlyRate, 0);

    const byProject: Record<string, { title: string; client: string; seconds: number; amount: number }> = {};
    filteredReportEntries.forEach((e) => {
      if (!byProject[e.projectId]) {
        byProject[e.projectId] = { title: e.projectTitle, client: e.clientName, seconds: 0, amount: 0 };
      }
      byProject[e.projectId].seconds += e.durationSeconds;
      if (e.billable) {
        byProject[e.projectId].amount += (e.durationSeconds / 3600) * e.hourlyRate;
      }
    });

    const byPerson: Record<string, { seconds: number; count: number }> = {};
    filteredReportEntries.forEach((e) => {
      const person = e.responsibleName || 'Arquiteto(a)';
      if (!byPerson[person]) {
        byPerson[person] = { seconds: 0, count: 0 };
      }
      byPerson[person].seconds += e.durationSeconds;
      byPerson[person].count += 1;
    });

    return { totalSeconds, billableSeconds, totalAmount, byProject: Object.values(byProject), byPerson: Object.entries(byPerson) };
  }, [filteredReportEntries]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#faf7f2] border border-[#e2d2bd] text-[#8c7456] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-[#8c7456]" />
              Produtividade & Cronograma Sincronizado
            </span>
            <span className="text-xs text-zinc-400 font-medium">• Responsável: <strong className="text-zinc-700">{currentUserName}</strong></span>
          </div>
          <h1 className="text-2xl font-serif font-extrabold text-zinc-900">Rastreador de Tempo & Tarefas</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Apontamentos iniciados aqui são sincronizados automaticamente com o cronograma, tarefas e central de ações do projeto.
          </p>
        </div>

        {/* Quick Stats Summary */}
        <div className="flex items-center gap-3">
          <div className="bg-[#faf7f2] border border-[#e2d2bd]/60 px-4 py-2.5 rounded-2xl text-right">
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 block">Tempo Hoje</span>
            <span className="text-sm font-extrabold text-zinc-900 font-mono">
              {formatTime(totalSecondsToday)}
            </span>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-2xl text-right">
            <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-700 block">Faturável Hoje</span>
            <span className="text-sm font-extrabold text-emerald-800 font-mono">
              R$ {totalBillableToday.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Toggl-Style Active Timer Bar */}
      <div className="bg-white rounded-2xl border-2 border-[#8c7456]/40 shadow-md p-4 lg:p-5 flex flex-col lg:flex-row items-stretch lg:items-center gap-4 transition-all">
        {/* Description Input */}
        <div className="flex-1 min-w-0 relative flex items-center gap-3 bg-zinc-50 px-4 py-3 rounded-xl border border-zinc-200 focus-within:border-[#8c7456] transition-all">
          <Clock className="w-5 h-5 text-zinc-400 shrink-0" />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Em que você está trabalhando agora? (ex: Detalhamento de Marcenaria...)"
            className="w-full bg-transparent text-xs sm:text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden"
          />
        </div>

        {/* Project Selector Dropdown */}
        <div className="relative min-w-[220px]">
          <button
            type="button"
            onClick={() => {
              setIsProjectDropdownOpen(!isProjectDropdownOpen);
              setIsStageDropdownOpen(false);
            }}
            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 font-medium flex items-center justify-between gap-2 hover:bg-zinc-100 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <FolderOpen className="w-4 h-4 text-[#8c7456] shrink-0" />
              <span className="truncate">
                {selectedProject ? `${selectedProject.clientName} — ${selectedProject.title}` : 'Selecionar Projeto...'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
          </button>

          {isProjectDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl border border-zinc-200 shadow-xl z-50 p-2 space-y-1.5 max-h-[350px] overflow-y-auto">
              <div className="p-2 border-b border-zinc-100">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Pesquisar projeto ou cliente..."
                    className="w-full pl-9 pr-3 py-1.5 bg-zinc-50 rounded-xl border border-zinc-200 text-xs focus:outline-hidden"
                  />
                </div>
              </div>
              <div className="space-y-1">
                {ongoingArchitectureProjects
                  .filter((p) =>
                    `${p.title} ${p.clientName} ${p.location}`.toLowerCase().includes(projectSearch.toLowerCase())
                  )
                  .map((proj) => (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectId(proj.id);
                        setSelectedStageName('');
                        setSelectedTaskName('');
                        setIsProjectDropdownOpen(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        selectedProjectId === proj.id ? 'bg-[#faf7f2] font-bold text-[#8c7456]' : 'hover:bg-zinc-50 text-zinc-700'
                      }`}
                    >
                      <div>
                        <span className="font-bold block text-zinc-900">{proj.title}</span>
                        <span className="text-[10px] text-zinc-500">{proj.clientName} • {proj.location}</span>
                      </div>
                      {selectedProjectId === proj.id && <Check className="w-4 h-4 text-[#8c7456]" />}
                    </button>
                  ))}
                {ongoingArchitectureProjects.length === 0 && (
                  <p className="text-center py-4 text-xs text-zinc-400">Nenhum projeto cadastrado no escritório.</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Stage Selector Dropdown (Cronograma Stages) */}
        <div className="relative min-w-[200px]">
          <button
            type="button"
            onClick={() => {
              if (!selectedProjectId) {
                alert('Selecione um projeto primeiro para escolher a etapa do cronograma.');
                return;
              }
              setIsStageDropdownOpen(!isStageDropdownOpen);
              setIsProjectDropdownOpen(false);
            }}
            className="w-full px-4 py-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-800 font-medium flex items-center justify-between gap-2 hover:bg-zinc-100 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <CheckCircle2 className="w-4 h-4 text-[#8c7456] shrink-0" />
              <span className="truncate">
                {selectedStageName ? selectedStageName : 'Selecionar Etapa do Cronograma...'}
              </span>
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
          </button>

          {isStageDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl border border-zinc-200 shadow-xl z-50 p-2 space-y-1 max-h-[300px] overflow-y-auto">
              {availableStages.map((stg) => (
                <button
                  key={stg.name}
                  type="button"
                  onClick={() => {
                    setSelectedStageName(stg.name);
                    setIsStageDropdownOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    selectedStageName === stg.name ? 'bg-[#faf7f2] font-bold text-[#8c7456]' : 'hover:bg-zinc-50 text-zinc-700'
                  }`}
                >
                  <span className="truncate">{stg.name}</span>
                  {selectedStageName === stg.name && <Check className="w-3.5 h-3.5 text-[#8c7456]" />}
                </button>
              ))}
              {availableStages.length === 0 && (
                <p className="text-center py-4 text-xs text-zinc-400">Este projeto não possui etapas cadastradas.</p>
              )}
            </div>
          )}
        </div>

        {/* Responsible Person badge */}
        <div className="hidden xl:flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-600">
          <User className="w-3.5 h-3.5 text-[#8c7456]" />
          <span className="font-medium truncate max-w-[130px]" title={currentUserName}>
            {currentUserName}
          </span>
        </div>

        {/* Billable toggle */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setBillable(!billable)}
            title={billable ? 'Marcado como Faturável' : 'Não Faturável'}
            className={`p-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
              billable ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-200 text-zinc-600'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>{billable ? 'R$ Faturável' : 'Gratuito'}</span>
          </button>
        </div>

        {/* Timer Counter & Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-xl sm:text-2xl font-mono font-extrabold text-zinc-900 min-w-[100px] text-right">
            {formatTime(secondsElapsed)}
          </div>

          {!isRunning ? (
            <button
              type="button"
              onClick={handleStartTimer}
              className="px-6 py-3 bg-[#00a8ff] hover:bg-[#0090e0] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>COMEÇAR</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePauseTimer}
                className="px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Pause className="w-4 h-4 fill-white" />
                <span>Pausar</span>
              </button>
              <button
                type="button"
                onClick={handleStopAndSave}
                className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Square className="w-4 h-4 fill-white" />
                <span>Salvar</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-zinc-200 gap-6">
        <button
          onClick={() => setActiveSubTab('entries')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
            activeSubTab === 'entries'
              ? 'border-[#8c7456] text-[#8c7456]'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Histórico de Registros ({timeEntries.length})</span>
        </button>
        <button
          onClick={() => setActiveSubTab('report')}
          className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
            activeSubTab === 'report'
              ? 'border-[#8c7456] text-[#8c7456]'
              : 'border-transparent text-zinc-500 hover:text-zinc-900'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Relatórios & Cronograma de Horas</span>
        </button>
      </div>

      {/* SUB-TAB 1: ENTRIES HISTORY */}
      {activeSubTab === 'entries' && (
        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
          <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
            <div>
              <h2 className="text-base font-serif font-bold text-zinc-900">Histórico Sincronizado de Tempo & Tarefas</h2>
              <p className="text-xs text-zinc-500">Apontamentos efetuados e vinculados automaticamente ao cronograma do escritório.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <Calendar className="w-4 h-4 text-[#8c7456]" />
              <span>Total de registros: {timeEntries.length}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#faf7f2] text-zinc-500 uppercase font-semibold border-b border-zinc-200">
                <tr>
                  <th className="py-3 px-4">Projeto & Cliente</th>
                  <th className="py-3 px-4">Etapa do Cronograma</th>
                  <th className="py-3 px-4">Responsável</th>
                  <th className="py-3 px-4">Descrição da Atividade</th>
                  <th className="py-3 px-4">Data & Horário</th>
                  <th className="py-3 px-4 text-center">Duração</th>
                  <th className="py-3 px-4 text-right">Valor Est.</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {timeEntries.map((entry) => {
                  const estValue = entry.billable ? (entry.durationSeconds / 3600) * entry.hourlyRate : 0;
                  return (
                    <tr key={entry.id} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-zinc-900">{entry.projectTitle}</div>
                        <div className="text-[10px] text-zinc-500">{entry.clientName}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-100 text-zinc-800 font-medium text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#8c7456]" />
                          {entry.stageName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#faf7f2] text-[#8c7456] font-semibold text-[11px]">
                          <User className="w-3 h-3" />
                          {entry.responsibleName || currentUserName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-zinc-700 max-w-xs truncate" title={entry.description}>
                        {entry.description}
                      </td>
                      <td className="py-3.5 px-4 text-zinc-500">
                        <div>{new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}</div>
                        <div className="text-[10px] text-zinc-400">{entry.startTime} - {entry.endTime}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-900">
                        {formatTime(entry.durationSeconds)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-extrabold text-emerald-700">
                        {entry.billable ? `R$ ${estValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry.id)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Excluir registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {timeEntries.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-zinc-400">
                      Nenhum registro de tempo efetuado ainda. Inicie o cronômetro acima para registrar suas horas!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: REPORT & SCHEDULE */}
      {activeSubTab === 'report' && (
        <div className="space-y-6">
          <div className="bg-white p-4 rounded-2xl border border-zinc-200 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
              <CalendarDays className="w-4 h-4 text-[#8c7456]" />
              <span>Período do Relatório:</span>
            </div>
            <div className="flex items-center gap-2">
              {[
                { id: 'today', label: 'Hoje' },
                { id: 'week', label: 'Últimos 7 dias' },
                { id: 'month', label: 'Últimos 30 dias' },
                { id: 'all', label: 'Todo o Período' }
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setReportDateFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reportDateFilter === f.id
                      ? 'bg-[#8c7456] text-white shadow-sm'
                      : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
              <span className="text-xs uppercase tracking-wider font-bold text-zinc-400 block mb-1">Total de Horas no Período</span>
              <div className="text-2xl font-serif font-extrabold text-zinc-900 font-mono">
                {(reportTotals.totalSeconds / 3600).toFixed(1)}h
              </div>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                {filteredReportEntries.length} apontamentos registrados
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
              <span className="text-xs uppercase tracking-wider font-bold text-emerald-600 block mb-1">Horas Faturáveis</span>
              <div className="text-2xl font-serif font-extrabold text-emerald-800 font-mono">
                {(reportTotals.billableSeconds / 3600).toFixed(1)}h
              </div>
              <span className="text-[11px] text-emerald-600 mt-1 block">
                {Math.round((reportTotals.billableSeconds / (reportTotals.totalSeconds || 1)) * 100)}% do total trabalhado
              </span>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-2xs">
              <span className="text-xs uppercase tracking-wider font-bold text-[#8c7456] block mb-1">Valor Estimado (Faturável)</span>
              <div className="text-2xl font-serif font-extrabold text-[#8c7456] font-mono">
                R$ {reportTotals.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[11px] text-zinc-500 mt-1 block">
                Baseado nos honorários por hora configurados
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-2xs space-y-4">
              <h3 className="text-base font-serif font-bold text-zinc-900 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#8c7456]" />
                <span>Distribuição por Projeto & Cronograma</span>
              </h3>
              <div className="space-y-3">
                {reportTotals.byProject.map((proj, idx) => {
                  const hours = (proj.seconds / 3600).toFixed(1);
                  const percent = reportTotals.totalSeconds ? Math.round((proj.seconds / reportTotals.totalSeconds) * 100) : 0;
                  return (
                    <div key={idx} className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-zinc-900 block">{proj.title}</span>
                          <span className="text-[10px] text-zinc-500">{proj.client}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-zinc-900">{hours}h</span>
                          <span className="text-[10px] text-emerald-700 block font-semibold">R$ {proj.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                      <div className="w-full bg-zinc-200 h-2 rounded-full overflow-hidden">
                        <div className="bg-[#8c7456] h-full rounded-full" style={{ width: `${Math.max(5, percent)}%` }} />
                      </div>
                    </div>
                  );
                })}
                {reportTotals.byProject.length === 0 && (
                  <p className="text-center py-6 text-xs text-zinc-400">Nenhum dado no período selecionado.</p>
                )}
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-2xs space-y-4">
              <h3 className="text-base font-serif font-bold text-zinc-900 flex items-center gap-2">
                <User className="w-4 h-4 text-[#8c7456]" />
                <span>Distribuição por Responsável (Equipe)</span>
              </h3>
              <div className="space-y-3">
                {reportTotals.byPerson.map(([person, data], idx) => {
                  const hours = (data.seconds / 3600).toFixed(1);
                  return (
                    <div key={idx} className="bg-zinc-50 p-4 rounded-xl border border-zinc-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#faf7f2] border border-[#e2d2bd] text-[#8c7456] flex items-center justify-center font-bold text-xs">
                          {person.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-zinc-900 text-xs block">{person}</span>
                          <span className="text-[11px] text-zinc-500">{data.count} apontamentos registrados</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-extrabold text-sm text-zinc-900">{hours}h</span>
                      </div>
                    </div>
                  );
                })}
                {reportTotals.byPerson.length === 0 && (
                  <p className="text-center py-6 text-xs text-zinc-400">Nenhum registro de equipe no período.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
