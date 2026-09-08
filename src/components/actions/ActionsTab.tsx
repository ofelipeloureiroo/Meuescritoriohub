import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  List,
  Search,
  Filter,
  Plus,
  Clock,
  Play,
  Check,
  Edit2,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  CalendarDays,
  XCircle,
  LayoutGrid,
  X,
  Building2,
  Info,
  User,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { AppAction } from '../../types';

export const ActionsTab: React.FC = () => {
  const {
    actions,
    addAppAction,
    updateAppAction,
    deleteAppAction,
    clients,
    architectureProjects,
  } = useFinance();

  const { user, profile } = useAuth();
  const { teamMembers } = useTeamMembers();

  // Active view mode: 'list' | '7days' | 'calendar'
  const [viewMode, setViewMode] = useState<'list' | '7days' | 'calendar'>('list');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all'); // 'all' | 'Comercial' | 'Operação' | 'Financeiro'
  const [selectedOrigin, setSelectedOrigin] = useState<string>('all'); // 'all' | 'Lead' | 'Cliente' | 'Projeto' | 'Interna'
  const [activeTabFilter, setActiveTabFilter] = useState<
    'pending' | 'in_progress' | 'overdue' | 'today' | 'upcoming' | 'completed' | 'cancelled'
  >('pending');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<AppAction | null>(null);

  // Form Fields
  const [formArea, setFormArea] = useState<'Comercial' | 'Operação' | 'Financeiro'>('Comercial');
  const [formOrigin, setFormOrigin] = useState<'Lead' | 'Cliente' | 'Projeto' | 'Interna'>('Interna');
  const [formType, setFormType] = useState('Enviar mensagem');
  const [formCustomType, setFormCustomType] = useState('');
  const [formRelatedId, setFormRelatedId] = useState('');
  const [formRelatedTitle, setFormRelatedTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState('');
  const [formEffortHours, setFormEffortHours] = useState('0');
  const [formEffortMinutes, setFormEffortMinutes] = useState('0');
  const [formResponsibleId, setFormResponsibleId] = useState('');
  const [formResponsibleName, setFormResponsibleName] = useState('');

  // Calendar / 7 Days Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());

  // Today reference string (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Top Metrics calculation
  const metrics = useMemo(() => {
    const overdue = actions.filter((a) => a.status !== 'completed' && a.status !== 'cancelled' && a.date < todayStr).length;
    const today = actions.filter((a) => a.status !== 'completed' && a.status !== 'cancelled' && a.date === todayStr).length;
    const upcoming = actions.filter((a) => a.status !== 'completed' && a.status !== 'cancelled' && a.date > todayStr).length;
    const completedToday = actions.filter((a) => {
      if (a.status !== 'completed') return false;
      if (a.completedAt) return a.completedAt.startsWith(todayStr);
      return a.date === todayStr;
    }).length;

    return { overdue, today, upcoming, completedToday };
  }, [actions, todayStr]);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      pending: actions.filter((a) => a.status === 'pending').length,
      in_progress: actions.filter((a) => a.status === 'in_progress').length,
      overdue: actions.filter((a) => a.status !== 'completed' && a.status !== 'cancelled' && a.date < todayStr).length,
      today: actions.filter((a) => a.status !== 'completed' && a.status !== 'cancelled' && a.date === todayStr).length,
      upcoming: actions.filter((a) => a.status !== 'completed' && a.status !== 'cancelled' && a.date > todayStr).length,
      completed: actions.filter((a) => a.status === 'completed').length,
      cancelled: actions.filter((a) => a.status === 'cancelled').length,
    };
  }, [actions, todayStr]);

  // Filtered actions list
  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      // Search
      const matchSearch =
        searchQuery === '' ||
        a.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.notes || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.relatedTitle || '').toLowerCase().includes(searchQuery.toLowerCase());

      // Area filter
      const matchArea = selectedArea === 'all' || a.area === selectedArea;

      // Origin filter
      const matchOrigin = selectedOrigin === 'all' || a.origin === selectedOrigin;

      // Tab filter
      let matchTab = true;
      if (activeTabFilter === 'pending') matchTab = a.status === 'pending';
      else if (activeTabFilter === 'in_progress') matchTab = a.status === 'in_progress';
      else if (activeTabFilter === 'overdue') matchTab = a.status !== 'completed' && a.status !== 'cancelled' && a.date < todayStr;
      else if (activeTabFilter === 'today') matchTab = a.status !== 'completed' && a.status !== 'cancelled' && a.date === todayStr;
      else if (activeTabFilter === 'upcoming') matchTab = a.status !== 'completed' && a.status !== 'cancelled' && a.date > todayStr;
      else if (activeTabFilter === 'completed') matchTab = a.status === 'completed';
      else if (activeTabFilter === 'cancelled') matchTab = a.status === 'cancelled';

      return matchSearch && matchArea && matchOrigin && matchTab;
    });
  }, [actions, searchQuery, selectedArea, selectedOrigin, activeTabFilter, todayStr]);

  // Dropdown lists
  const leadsList = useMemo(() => clients.filter((c) => c.status === 'lead'), [clients]);
  const activeClientsList = useMemo(() => clients.filter((c) => c.status === 'active' || c.status === 'completed'), [clients]);

  // Open modal for new item
  const handleOpenCreate = (initialDate?: string) => {
    const d = initialDate || new Date().toISOString().split('T')[0];
    setEditingAction(null);
    setFormArea('Comercial');
    setFormOrigin('Interna');
    setFormType('Enviar mensagem');
    setFormCustomType('');
    setFormRelatedId('');
    setFormRelatedTitle('');
    setFormDescription('');
    setFormStartDate(d);
    setFormEndDate(d);
    setFormTime('');
    setFormEffortHours('0');
    setFormEffortMinutes('0');
    setFormResponsibleId(user?.uid || '');
    setFormResponsibleName(user?.displayName || user?.email?.split('@')[0] || '');
    setIsModalOpen(true);
  };

  // Open modal for edit
  const handleOpenEdit = (action: AppAction) => {
    setEditingAction(action);
    setFormArea(action.area);
    setFormOrigin(action.origin);
    const presets = [
      'Enviar mensagem',
      'Ligar',
      'Agendar reunião',
      'Realizar reunião',
      'Follow-up',
      'Enviar proposta',
      'Negociar',
      'Fechar negócio',
      'Acompanhar pendência',
      'Cobrar retorno',
    ];
    if (presets.includes(action.type)) {
      setFormType(action.type);
      setFormCustomType('');
    } else {
      setFormType('Outro');
      setFormCustomType(action.type);
    }
    setFormRelatedId(action.relatedId || '');
    setFormRelatedTitle(action.relatedTitle || '');
    setFormDescription(action.description);
    setFormStartDate(action.startDate || action.date);
    setFormEndDate(action.date);
    setFormTime(action.time || '');
    setFormEffortHours(action.effortHours?.toString() || '0');
    setFormEffortMinutes(action.effortMinutes?.toString() || '0');
    setFormResponsibleId(action.responsibleId || user?.uid || '');
    setFormResponsibleName(action.responsibleName || user?.displayName || user?.email?.split('@')[0] || '');
    setIsModalOpen(true);
  };

  // Form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formDescription.trim()) return;

    const finalType = formType === 'Outro' ? (formCustomType.trim() || 'Ação') : formType;

    let finalTitle = formRelatedTitle;
    if (formOrigin === 'Lead' && formRelatedId) {
      finalTitle = leadsList.find((l) => l.id === formRelatedId)?.name || '';
    } else if (formOrigin === 'Cliente' && formRelatedId) {
      finalTitle = activeClientsList.find((c) => c.id === formRelatedId)?.name || '';
    } else if (formOrigin === 'Projeto' && formRelatedId) {
      finalTitle = architectureProjects.find((p) => p.id === formRelatedId)?.title || '';
    }

    const selectedResp = teamMembers.find((m) => m.id === formResponsibleId);

    const payload: Omit<AppAction, 'id' | 'createdAt'> = {
      type: finalType,
      area: formArea,
      origin: formOrigin,
      relatedId: formRelatedId || undefined,
      relatedTitle: finalTitle || undefined,
      description: formDescription,
      date: formEndDate || formStartDate,
      startDate: formStartDate,
      time: formTime || undefined,
      effortHours: parseInt(formEffortHours) || 0,
      effortMinutes: parseInt(formEffortMinutes) || 0,
      status: editingAction ? editingAction.status : 'pending',
      responsibleId: formResponsibleId || user?.uid,
      responsibleName: selectedResp?.name || formResponsibleName || user?.displayName || user?.email?.split('@')[0],
    };

    if (editingAction) {
      updateAppAction(editingAction.id, payload);
    } else {
      addAppAction(payload);
    }

    setIsModalOpen(false);
  };

  // Clone action
  const handleCloneAction = (action: AppAction) => {
    const { id, createdAt, ...rest } = action;
    const clone: Omit<AppAction, 'id' | 'createdAt'> = {
      ...rest,
      status: 'pending',
      date: todayStr,
    };
    addAppAction(clone);
  };

  // 7 Days view dates generator
  const next7Days = useMemo(() => {
    const days = [];
    const base = new Date(currentDate);
    for (let i = 0; i < 7; i++) {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = d.toISOString().split('T')[0];
      const dayOfWeek = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      const dayNum = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      days.push({ iso, dayOfWeek, dayNum, fullDate: d });
    }
    return days;
  }, [currentDate]);

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Helper for empty state title
  const getEmptyStateTitle = (tab: typeof activeTabFilter) => {
    switch (tab) {
      case 'pending': return 'Nenhuma ação pendente';
      case 'in_progress': return 'Nenhuma ação em andamento';
      case 'overdue': return 'Nenhuma ação vencida';
      case 'today': return 'Nenhuma ação agendada para hoje';
      case 'upcoming': return 'Nenhuma ação próxima agendada';
      case 'completed': return 'Nenhuma ação concluída ainda';
      case 'cancelled': return 'Nenhuma ação cancelada';
      default: return 'Nenhuma ação encontrada';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#fafafa] tracking-tight">
            Ações
          </h2>
          <p className="text-xs sm:text-sm text-[#a1a1aa] font-medium mt-0.5">
            Central de execução operacional
          </p>
        </div>

        {/* View Mode Controls & New Action Button */}
        <div className="flex flex-wrap items-center gap-3">
          {/* View Toggles */}
          <div className="flex bg-[#18181b] p-1 rounded-xl border border-[#27272a] shadow-sm">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-[#27272a] text-[#fafafa] shadow'
                  : 'text-[#a1a1aa] hover:text-[#fafafa]'
              }`}
            >
              <List className="w-3.5 h-3.5" /> Lista
            </button>
            <button
              onClick={() => setViewMode('7days')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === '7days'
                  ? 'bg-[#27272a] text-[#fafafa] shadow'
                  : 'text-[#a1a1aa] hover:text-[#fafafa]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> 7 dias
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-[#27272a] text-[#fafafa] shadow'
                  : 'text-[#a1a1aa] hover:text-[#fafafa]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Calendário
            </button>
          </div>

          {/* + Nova Ação Button */}
          <button
            onClick={() => handleOpenCreate()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-md hover:brightness-110"
            style={{
              backgroundColor: 'var(--theme-primary, #c8a97e)',
              color: '#12100e',
            }}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Nova ação</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards (4 Cards Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: Vencidas */}
        <div className="p-4 rounded-2xl bg-[#18181b] border border-red-500/30 bg-red-500/5 hover:border-red-500/50 transition-all flex flex-col justify-between">
          <div className="text-2xl sm:text-3xl font-bold text-red-500 tracking-tight">
            {metrics.overdue}
          </div>
          <div className="text-xs font-semibold text-red-400 mt-1">
            Vencidas
          </div>
        </div>

        {/* Card 2: Hoje */}
        <div className="p-4 rounded-2xl bg-[#18181b] border border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 transition-all flex flex-col justify-between">
          <div className="text-2xl sm:text-3xl font-bold text-amber-500 tracking-tight">
            {metrics.today}
          </div>
          <div className="text-xs font-semibold text-amber-400 mt-1">
            Hoje
          </div>
        </div>

        {/* Card 3: Próximas */}
        <div className="p-4 rounded-2xl bg-[#18181b] border border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50 transition-all flex flex-col justify-between">
          <div className="text-2xl sm:text-3xl font-bold text-blue-500 tracking-tight">
            {metrics.upcoming}
          </div>
          <div className="text-xs font-semibold text-blue-400 mt-1">
            Próximas
          </div>
        </div>

        {/* Card 4: Concluídas hoje */}
        <div className="p-4 rounded-2xl bg-[#18181b] border border-emerald-500/30 bg-emerald-500/5 hover:border-emerald-500/50 transition-all flex flex-col justify-between">
          <div className="text-2xl sm:text-3xl font-bold text-emerald-500 tracking-tight">
            {metrics.completedToday}
          </div>
          <div className="text-xs font-semibold text-emerald-400 mt-1">
            Concluídas hoje
          </div>
        </div>
      </div>

      {/* 3. Main Content Container */}
      <div className="p-5 md:p-6 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-6">
        {/* Top Filters Row (Área & Origem & Search) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* AREA Filter Pills */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#a1a1aa] uppercase tracking-wider">
                ÁREA
              </span>
              <div className="flex gap-1.5">
                {['Comercial', 'Operação', 'Financeiro'].map((area) => (
                  <button
                    key={area}
                    onClick={() => setSelectedArea((prev) => (prev === area ? 'all' : area))}
                    className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      selectedArea === area
                        ? 'bg-[#27272a] text-[#fafafa] border-[#3f3f46] font-semibold'
                        : 'bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:text-[#fafafa]'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            {/* ORIGEM Filter Pills */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-[#a1a1aa] uppercase tracking-wider">
                ORIGEM
              </span>
              <div className="flex gap-1.5">
                {['Lead', 'Cliente', 'Projeto', 'Interna'].map((orig) => (
                  <button
                    key={orig}
                    onClick={() => setSelectedOrigin((prev) => (prev === orig ? 'all' : orig))}
                    className={`px-3 py-1 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                      selectedOrigin === orig
                        ? 'bg-[#27272a] text-[#fafafa] border-[#3f3f46] font-semibold'
                        : 'bg-[#18181b] text-[#a1a1aa] border-[#27272a] hover:text-[#fafafa]'
                    }`}
                  >
                    {orig}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Search Input & Filtros Button */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-[#a1a1aa]">
                <Search className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por tipo, lead, responsável..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#27272a]/40 border border-[#27272a] text-xs text-[#fafafa] placeholder-[#a1a1aa] focus:outline-none focus:border-[#3f3f46]"
              />
            </div>

            <button
              onClick={() => {
                setSelectedArea('all');
                setSelectedOrigin('all');
                setSearchQuery('');
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#27272a]/40 border border-[#27272a] text-xs font-medium text-[#a1a1aa] hover:text-[#fafafa] transition-all cursor-pointer"
              title="Limpar filtros"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros</span>
            </button>
          </div>
        </div>

        {/* Tab Filter Bar (Underlined) */}
        <div className="border-b border-[#27272a] flex items-center gap-6 overflow-x-auto no-scrollbar">
          {[
            { id: 'pending', label: 'Pendentes', count: tabCounts.pending },
            { id: 'in_progress', label: 'Em andamento', count: tabCounts.in_progress },
            { id: 'overdue', label: 'Vencidas', count: tabCounts.overdue },
            { id: 'today', label: 'Hoje', count: tabCounts.today },
            { id: 'upcoming', label: 'Próximas', count: tabCounts.upcoming },
            { id: 'completed', label: 'Concluídas', count: tabCounts.completed },
            { id: 'cancelled', label: 'Canceladas', count: tabCounts.cancelled },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTabFilter(tab.id as any)}
              className={`flex items-center gap-1.5 text-xs pb-3 whitespace-nowrap transition-all cursor-pointer border-b-2 font-medium ${
                activeTabFilter === tab.id
                  ? 'border-emerald-500 text-[#fafafa] font-bold'
                  : 'border-transparent text-[#a1a1aa] hover:text-[#fafafa]'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTabFilter === tab.id ? 'bg-emerald-500/20 text-emerald-400' : 'bg-[#27272a] text-[#a1a1aa]'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Views Rendering */}
        {viewMode === 'list' && (
          <div>
            {filteredActions.length === 0 ? (
              /* Empty State matching the reference image */
              <div className="py-20 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg">
                  <Check className="w-6 h-6 stroke-[2.5]" />
                </div>
                <h3 className="text-base font-bold text-[#fafafa] tracking-tight">
                  {getEmptyStateTitle(activeTabFilter)}
                </h3>
                <p className="text-xs text-[#a1a1aa] max-w-sm">
                  Ótimo trabalho! Todas as ações estão em dia.
                </p>
              </div>
            ) : (
              /* Action Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {filteredActions.map((action) => {
                  const isOverdue = action.status !== 'completed' && action.status !== 'cancelled' && action.date < todayStr;
                  const isToday = action.date === todayStr;

                  return (
                    <div
                      key={action.id}
                      className={`p-4 rounded-xl bg-[#18181b] border transition-all flex flex-col justify-between ${
                        action.status === 'completed'
                          ? 'border-emerald-500/20 opacity-75'
                          : action.status === 'cancelled'
                          ? 'border-zinc-700/50 opacity-60'
                          : isOverdue
                          ? 'border-rose-500/30 bg-rose-500/5'
                          : isToday
                          ? 'border-amber-500/30 bg-amber-500/5'
                          : 'border-[#27272a]'
                      }`}
                    >
                      <div>
                        {/* Area & Origin Header Badges */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              action.area === 'Comercial'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : action.area === 'Operação'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {action.area}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-[#27272a] text-[#a1a1aa] font-semibold border border-[#3f3f46]">
                              {action.origin}
                            </span>
                          </div>

                          {/* Status Badge */}
                          <span className={`text-[10px] font-bold ${
                            action.status === 'completed'
                              ? 'text-emerald-400'
                              : action.status === 'in_progress'
                              ? 'text-indigo-400'
                              : action.status === 'cancelled'
                              ? 'text-zinc-500'
                              : isOverdue
                              ? 'text-rose-400'
                              : 'text-amber-400'
                          }`}>
                            {action.status === 'completed' && 'Concluída'}
                            {action.status === 'in_progress' && 'Em andamento'}
                            {action.status === 'cancelled' && 'Cancelada'}
                            {action.status === 'pending' && !isOverdue && 'Pendente'}
                            {action.status === 'pending' && isOverdue && 'Vencida'}
                          </span>
                        </div>

                        {/* Title & Description */}
                        <div className="mt-3">
                          <h4 className={`text-xs font-bold text-[#fafafa] ${action.status === 'completed' ? 'line-through text-zinc-500' : ''}`}>
                            {action.type}
                          </h4>
                          <p className="text-[11px] text-[#a1a1aa] mt-1 leading-relaxed">
                            {action.description}
                          </p>
                        </div>

                        {/* Associated Title */}
                        {action.relatedTitle && (
                          <div className="mt-2.5 flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
                            <Bookmark className="w-3 h-3 text-zinc-500" />
                            <span className="truncate max-w-[200px]">{action.relatedTitle}</span>
                          </div>
                        )}

                        {/* Timing Footer */}
                        <div className="mt-4 flex items-center justify-between text-[10px] text-[#a1a1aa] border-t border-[#27272a] pt-2.5">
                          <div className="flex items-center gap-1 font-semibold">
                            <Clock className={`w-3.5 h-3.5 ${isOverdue ? 'text-rose-400' : isToday ? 'text-amber-400' : 'text-zinc-500'}`} />
                            <span className={isOverdue ? 'text-rose-400' : isToday ? 'text-amber-400' : ''}>
                              {isToday ? 'Hoje' : action.date} {action.time && `às ${action.time}`}
                            </span>
                          </div>

                          {action.responsibleName && (
                            <span className="text-[10px] text-zinc-500 truncate max-w-[100px]">
                              {action.responsibleName}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Controls Footer */}
                      <div className="mt-3 flex items-center justify-between border-t border-[#27272a]/50 pt-2.5">
                        <div className="flex items-center gap-1.5">
                          {action.status !== 'completed' && action.status !== 'cancelled' && (
                            <>
                              {action.status === 'pending' && (
                                <button
                                  onClick={() => updateAppAction(action.id, { status: 'in_progress' })}
                                  title="Iniciar tarefa"
                                  className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors cursor-pointer"
                                >
                                  <Play className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => updateAppAction(action.id, { status: 'completed', completedAt: new Date().toISOString() })}
                                title="Marcar como concluída"
                                className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition-colors cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                          {action.status === 'completed' && (
                            <button
                              onClick={() => updateAppAction(action.id, { status: 'pending', completedAt: undefined })}
                              className="text-[10px] text-zinc-500 hover:text-zinc-300 underline cursor-pointer"
                            >
                              Reabrir
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleCloneAction(action)}
                            title="Duplicar"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(action)}
                            title="Editar"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteAppAction(action.id)}
                            title="Excluir"
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 7 Days View */}
        {viewMode === '7days' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#fafafa] flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-amber-400" />
                Ações dos Próximos 7 Dias
              </h3>
              <div className="flex gap-1">
                <button
                  onClick={() => {
                    const prev = new Date(currentDate);
                    prev.setDate(prev.getDate() - 7);
                    setCurrentDate(prev);
                  }}
                  className="p-1.5 rounded-lg bg-[#27272a]/50 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-2.5 py-1 rounded-lg bg-[#27272a]/50 text-xs font-bold text-zinc-300 cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  onClick={() => {
                    const next = new Date(currentDate);
                    next.setDate(next.getDate() + 7);
                    setCurrentDate(next);
                  }}
                  className="p-1.5 rounded-lg bg-[#27272a]/50 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {next7Days.map((day) => {
                const dayActions = actions.filter((a) => a.date === day.iso);
                const isToday = day.iso === todayStr;

                return (
                  <div
                    key={day.iso}
                    className={`p-3 rounded-xl border flex flex-col justify-between min-h-[180px] ${
                      isToday
                        ? 'bg-amber-500/5 border-amber-500/30'
                        : 'bg-[#27272a]/20 border-[#27272a]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-[#27272a] pb-2 mb-2">
                        <span className={`text-xs font-bold capitalize ${isToday ? 'text-amber-400' : 'text-[#fafafa]'}`}>
                          {day.dayOfWeek}
                        </span>
                        <span className="text-[10px] text-[#a1a1aa] font-medium">
                          {day.dayNum}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {dayActions.length === 0 ? (
                          <span className="text-[10px] text-zinc-600 block italic py-4 text-center">
                            Livre
                          </span>
                        ) : (
                          dayActions.map((act) => (
                            <div
                              key={act.id}
                              onClick={() => handleOpenEdit(act)}
                              className="p-2 rounded-lg bg-[#18181b] border border-[#27272a] hover:border-zinc-500/40 cursor-pointer transition-all text-left"
                            >
                              <div className="text-[10px] font-bold text-[#fafafa] truncate">
                                {act.time && `${act.time} - `}{act.type}
                              </div>
                              <div className="text-[9px] text-[#a1a1aa] truncate mt-0.5">
                                {act.description}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleOpenCreate(day.iso)}
                      className="mt-3 w-full py-1 rounded bg-[#27272a]/40 hover:bg-[#27272a] text-[10px] font-bold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Adicionar
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Monthly Calendar View */}
        {viewMode === 'calendar' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#fafafa] flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-amber-400" />
                {monthNames[month]} {year}
              </h3>

              <div className="flex items-center gap-1 bg-[#27272a]/30 p-0.5 rounded-xl border border-[#27272a]">
                <button
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-3 py-1 text-[11px] font-bold text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="p-1.5 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center border-b border-[#27272a] pb-2 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            <div className="grid grid-cols-7 gap-2 min-h-[300px]">
              {Array.from({ length: firstDayIndex }).map((_, i) => (
                <div key={`blank-${i}`} className="p-2 min-h-[50px]" />
              ))}

              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                const formattedMonth = (month + 1) < 10 ? `0${month + 1}` : `${month + 1}`;
                const checkDateStr = `${year}-${formattedMonth}-${formattedDay}`;

                const dayActions = actions.filter((a) => a.date === checkDateStr);
                const isToday = checkDateStr === todayStr;

                return (
                  <div
                    key={`day-${dayNum}`}
                    onClick={() => handleOpenCreate(checkDateStr)}
                    className={`p-2 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[70px] ${
                      isToday
                        ? 'bg-amber-500/5 border-amber-500/40 text-amber-400'
                        : 'bg-[#27272a]/20 border-[#27272a] hover:bg-[#27272a]/40 hover:border-zinc-500/30'
                    }`}
                  >
                    <span className={`text-xs font-bold ${isToday ? 'text-amber-400 font-black' : 'text-[#fafafa]'}`}>
                      {dayNum}
                    </span>

                    <div className="flex flex-col gap-1 mt-1">
                      {dayActions.slice(0, 2).map((act) => (
                        <div
                          key={act.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEdit(act);
                          }}
                          className="text-[9px] px-1.5 py-0.5 rounded truncate font-medium bg-[#18181b] border border-[#27272a] text-[#fafafa]"
                        >
                          {act.time && `${act.time} `}{act.type}
                        </div>
                      ))}
                      {dayActions.length > 2 && (
                        <span className="text-[8px] text-zinc-500 font-bold text-center">
                          +{dayActions.length - 2} mais
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Action Creation & Editing Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white text-zinc-900 rounded-3xl shadow-2xl relative my-6 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-zinc-100 flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
                  {editingAction ? 'Editar ação' : 'Nova ação'}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Registre uma ação vinculada a um lead, cliente, projeto ou interna da empresa
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
                {/* 1. ORIGEM DA AÇÃO */}
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                      ORIGEM DA AÇÃO
                    </label>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                      <Info className="w-3 h-3 text-zinc-400" /> Alguns vínculos dependem da área escolhida
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'Lead', label: 'Lead' },
                      { id: 'Cliente', label: 'Cliente' },
                      { id: 'Projeto', label: 'Projeto' },
                      { id: 'Interna', label: 'Interna', icon: <Building2 className="w-3.5 h-3.5 inline mr-1" /> },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setFormOrigin(item.id as any);
                          setFormRelatedId('');
                        }}
                        className={`py-2 px-3 rounded-xl font-medium border text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                          formOrigin === item.id
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm font-semibold'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:text-zinc-900'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. VÍNCULO VINCULADO */}
                {formOrigin === 'Interna' ? (
                  <div className="p-4 rounded-xl border border-zinc-200 bg-white shadow-sm flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-sm font-bold text-zinc-900">Ação interna da empresa</span>
                      <span className="block text-xs text-zinc-500 mt-1 leading-relaxed">
                        Não vinculada a lead, cliente ou projeto. Aparece normalmente em todos os calendários e dashboards.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                      VÍNCULO VINCULADO
                    </label>
                    {formOrigin === 'Lead' ? (
                      <select
                        value={formRelatedId}
                        onChange={(e) => setFormRelatedId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-800 focus:outline-none focus:border-zinc-400 cursor-pointer shadow-sm"
                      >
                        <option value="">Selecione um vínculo primeiro...</option>
                        {leadsList.map((l) => (
                          <option key={l.id} value={l.id}>{l.name}</option>
                        ))}
                      </select>
                    ) : formOrigin === 'Cliente' ? (
                      <select
                        value={formRelatedId}
                        onChange={(e) => setFormRelatedId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-800 focus:outline-none focus:border-zinc-400 cursor-pointer shadow-sm"
                      >
                        <option value="">Selecione um vínculo primeiro...</option>
                        {activeClientsList.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : formOrigin === 'Projeto' ? (
                      <select
                        value={formRelatedId}
                        onChange={(e) => setFormRelatedId(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-800 focus:outline-none focus:border-zinc-400 cursor-pointer shadow-sm"
                      >
                        <option value="">Selecione um vínculo primeiro...</option>
                        {architectureProjects.map((p) => (
                          <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                )}

                {/* 3. ÁREA */}
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                    ÁREA
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Comercial', 'Operação', 'Financeiro'].map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => setFormArea(area as any)}
                        className={`py-2.5 px-3 rounded-xl font-medium border text-center transition-all cursor-pointer ${
                          formArea === area
                            ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm font-semibold'
                            : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300 hover:text-zinc-900'
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 4. DEFINIÇÃO DA AÇÃO */}
                <div className="space-y-4 pt-2 border-t border-zinc-100">
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    DEFINIÇÃO DA AÇÃO
                  </span>

                  {/* TIPO DE AÇÃO chips */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2">
                      TIPO DE AÇÃO
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        'Enviar mensagem',
                        'Ligar',
                        'Agendar reunião',
                        'Realizar reunião',
                        'Follow-up',
                        'Enviar proposta',
                        'Negociar',
                        'Fechar negócio',
                        'Acompanhar pendência',
                        'Cobrar retorno',
                        'Outro',
                      ].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormType(type)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${
                            formType === type
                              ? 'bg-zinc-900 text-white border-zinc-900 font-semibold shadow-xs'
                              : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-300'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    {formType === 'Outro' && (
                      <input
                        type="text"
                        placeholder="Digite o tipo da ação personalizado..."
                        value={formCustomType}
                        onChange={(e) => setFormCustomType(e.target.value)}
                        className="mt-2.5 w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-800 focus:outline-none focus:border-zinc-400 shadow-sm"
                      />
                    )}
                  </div>

                  {/* DESCRIÇÃO DA AÇÃO */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                      DESCRIÇÃO DA AÇÃO
                    </label>
                    <textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Ex:"
                      rows={3}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-800 focus:outline-none focus:border-zinc-400 shadow-sm leading-relaxed"
                      required
                    />
                  </div>
                </div>

                {/* 5. PLANEJAMENTO */}
                <div className="space-y-4 pt-2 border-t border-zinc-100">
                  <span className="block text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                    PLANEJAMENTO
                  </span>

                  {/* INÍCIO PREVISTO & TÉRMINO PREVISTO */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                        INÍCIO PREVISTO
                      </label>
                      <input
                        type="date"
                        value={formStartDate}
                        onChange={(e) => setFormStartDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-800 focus:outline-none focus:border-zinc-400 shadow-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                        TÉRMINO PREVISTO <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formEndDate}
                        onChange={(e) => setFormEndDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-800 focus:outline-none focus:border-zinc-400 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* ESFORÇO PREVISTO */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                      ESFORÇO PREVISTO
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          value={formEffortHours}
                          onChange={(e) => setFormEffortHours(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-center text-zinc-800 focus:outline-none focus:border-zinc-400 shadow-sm"
                        />
                        <span className="text-zinc-500 font-medium">h</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={formEffortMinutes}
                          onChange={(e) => setFormEffortMinutes(e.target.value)}
                          className="w-full px-3.5 py-2 rounded-xl bg-white border border-zinc-200 text-center text-zinc-800 focus:outline-none focus:border-zinc-400 shadow-sm"
                        />
                        <span className="text-zinc-500 font-medium">min</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 mt-1">
                      Tempo estimado de trabalho dedicado a esta ação.
                    </p>
                  </div>

                  {/* HORÁRIO ESPECÍFICO */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                      HORÁRIO ESPECÍFICO
                    </label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-800 focus:outline-none focus:border-zinc-400 shadow-sm"
                    />
                  </div>

                  {/* RESPONSÁVEL */}
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                      RESPONSÁVEL
                    </label>
                    <div className="relative">
                      <select
                        value={formResponsibleId}
                        onChange={(e) => {
                          const selId = e.target.value;
                          setFormResponsibleId(selId);
                          const teamMember = teamMembers.find((m) => m.id === selId);
                          if (teamMember) {
                            setFormResponsibleName(teamMember.name);
                          }
                        }}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-800 focus:outline-none focus:border-zinc-400 shadow-sm cursor-pointer"
                      >
                        <option value="">Selecione o responsável</option>
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                      <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 px-6 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-100 transition-all cursor-pointer shadow-xs"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-zinc-900 shadow-md transition-all cursor-pointer hover:brightness-110 active:scale-95 flex items-center gap-1.5"
                  style={{
                    backgroundColor: 'var(--theme-primary, #c8a97e)',
                  }}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>{editingAction ? 'Salvar alterações' : 'Criar ação'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
