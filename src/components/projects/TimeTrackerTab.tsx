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
  Check
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
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
}

export const TimeTrackerTab: React.FC = () => {
  const { ongoingArchitectureProjects } = useFinance();

  // Active Timer state
  const [description, setDescription] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedStageName, setSelectedStageName] = useState<string>('');
  const [selectedTaskName, setSelectedTaskName] = useState<string>('');
  const [billable, setBillable] = useState(true);
  const [hourlyRate, setHourlyRate] = useState<number>(150); // default hourly rate in R$

  // Timer running state
  const [isRunning, setIsRunning] = useState(false);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [startTimeString, setStartTimeString] = useState<string>('');

  // Saved Time Entries state
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>(() => {
    try {
      const saved = localStorage.getItem('meu_escritorio_time_entries_v1');
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
        hourlyRate: 150
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
        hourlyRate: 180
      }
    ];
  });

  const [projectSearch, setProjectSearch] = useState('');
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [isStageDropdownOpen, setIsStageDropdownOpen] = useState(false);

  // Persist time entries
  useEffect(() => {
    try {
      localStorage.setItem('meu_escritorio_time_entries_v1', JSON.stringify(timeEntries));
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

  const formatHoursShort = (totalSeconds: number) => {
    const hours = (totalSeconds / 3600).toFixed(1);
    return `${hours}h`;
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
      hourlyRate
    };

    setTimeEntries([newEntry, ...timeEntries]);
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

  // Calculations
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-[#faf7f2] border border-[#e2d2bd] text-[#8c7456] text-xs font-bold uppercase tracking-wider">
              Produtividade & Faturamento
            </span>
            <span className="text-xs text-zinc-400 font-medium">• Tempo Real</span>
          </div>
          <h1 className="text-2xl font-serif font-extrabold text-zinc-900">Rastreador de Tempo</h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Registre as horas trabalhadas em cada projeto e escolha diretamente as etapas do cronograma do escritório.
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
            disabled={!selectedProjectId}
            onClick={() => {
              if (selectedProjectId) {
                setIsStageDropdownOpen(!isStageDropdownOpen);
                setIsProjectDropdownOpen(false);
              }
            }}
            className={`w-full px-4 py-3 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 transition-all ${
              selectedProjectId
                ? 'bg-zinc-50 border-zinc-200 text-zinc-800 hover:bg-zinc-100 cursor-pointer'
                : 'bg-zinc-100 border-zinc-200 text-zinc-400 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">{selectedStageName || (selectedProjectId ? 'Selecionar Etapa do Cronograma' : 'Selecione o Projeto')}</span>
            </div>
            <ChevronDown className="w-4 h-4 text-zinc-400 shrink-0" />
          </button>

          {isStageDropdownOpen && availableStages.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-2xl border border-zinc-200 shadow-xl z-50 p-2 space-y-1 max-h-[300px] overflow-y-auto">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 py-1 block">
                Etapas do Cronograma
              </span>
              {availableStages.map((stage) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => {
                    setSelectedStageName(stage.name);
                    setSelectedTaskName('');
                    setIsStageDropdownOpen(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl text-xs transition-all flex items-center justify-between gap-2 cursor-pointer ${
                    selectedStageName === stage.name ? 'bg-[#faf7f2] font-bold text-[#8c7456]' : 'hover:bg-zinc-50 text-zinc-700'
                  }`}
                >
                  <span className="truncate">{stage.name}</span>
                  {selectedStageName === stage.name && <Check className="w-4 h-4 text-[#8c7456]" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Billable & Hourly Rate Toggle */}
        <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl">
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

      {/* Time Entries History Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-zinc-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-serif font-bold text-zinc-900">Histórico de Tempo Registrado</h2>
            <p className="text-xs text-zinc-500">Todas as horas apontadas em projetos e etapas do escritório.</p>
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
                  <td colSpan={7} className="text-center py-12 text-zinc-400">
                    Nenhum registro de tempo efetuado ainda. Inicie o cronômetro acima para registrar suas horas!
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
