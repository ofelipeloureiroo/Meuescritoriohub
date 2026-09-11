import React, { useState, useMemo, useEffect } from 'react';
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Plus,
  Play,
  Check,
  Award,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  ClipboardList,
  Filter,
  Search,
  X,
  Edit2,
  Trash2,
  Copy,
  Bookmark,
  LayoutGrid,
  Building2,
  User,
  Info,
  ArrowUpRight,
  DollarSign,
  RefreshCw,
  CheckSquare,
  ListTodo,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { AppAction } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import {
  authenticateGoogleCalendar,
  disconnectGoogleCalendar,
  fetchGoogleEvents,
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  getGoogleAccessToken,
  restoreGoogleTokenFromCloud,
  getGoogleUserEmail,
  isGoogleCalendarEnabled,
  GoogleCalendarEvent,
  GoogleTaskItem,
  fetchGoogleTasks,
  createGoogleTask,
  updateGoogleTaskStatus,
  deleteGoogleTask,
} from '../../services/googleCalendarService';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const TodayTab: React.FC = () => {
  const {
    architectProfile,
    actions,
    addAppAction,
    updateAppAction,
    deleteAppAction,
    projectMilestones,
    projectInstallments,
    clients,
    architectureProjects,
  } = useFinance();

  const { user, profile } = useAuth();
  const { teamMembers } = useTeamMembers();

  const greetingName =
    architectProfile?.name?.trim() ||
    profile?.companyName?.trim() ||
    user?.displayName?.trim() ||
    'Carlos Felipe';

  // View modes: 'today' (Visão Diária) | 'calendar' (Calendário Mensal) | '7days' (Próximos 7 Dias)
  const [viewMode, setViewMode] = useState<'today' | 'calendar' | '7days'>('today');

  // Calendar Navigation Date
  const [currentDate, setCurrentDate] = useState(new Date());

  // Selected date for day preview (default to today in local timezone)
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayStr);

  // Filters for calendar
  const [selectedArea, setSelectedArea] = useState<string>('all'); // 'all' | 'Comercial' | 'Operação' | 'Financeiro'
  const [searchQuery, setSearchQuery] = useState('');

  // Notepad State (persists locally for convenience)
  const [dailyNote, setDailyNote] = useState(() => {
    return localStorage.getItem('today_scratchpad') || '';
  });

  // Google Calendar & Tasks Integration State
  const [isGoogleSynced, setIsGoogleSynced] = useState<boolean>(() => isGoogleCalendarEnabled());
  const [googleEmail, setGoogleEmail] = useState<string | null>(() => getGoogleUserEmail());
  const [googleEvents, setGoogleEvents] = useState<GoogleCalendarEvent[]>(() => {
    try {
      const cached = localStorage.getItem('office_cached_gcal_events');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [googleTasks, setGoogleTasks] = useState<GoogleTaskItem[]>(() => {
    try {
      const cached = localStorage.getItem('office_cached_gtasks');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [tokenExpired, setTokenExpired] = useState<boolean>(false);
  const [isSyncingCalendar, setIsSyncingCalendar] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handleConnectGoogleCalendar = async () => {
    setIsSyncingCalendar(true);
    setSyncMessage(null);
    try {
      const res = await authenticateGoogleCalendar();
      setIsGoogleSynced(true);
      setGoogleEmail(res.email);
      setTokenExpired(false);
      setSyncMessage(`Conectado à conta: ${res.email}`);
      
      try {
        const [events, tasks] = await Promise.all([
          fetchGoogleEvents(),
          fetchGoogleTasks().catch((err) => {
            console.warn("Initial tasks fetch warning:", err);
            return [];
          }),
        ]);
        setGoogleEvents(events);
        setGoogleTasks(tasks);
        setSyncMessage(`${events.length} evento(s) e ${tasks.length} tarefa(s) sincronizados com sucesso.`);
      } catch (e) {
        console.error("Initial sync fetch warning:", e);
      }
    } catch (err: any) {
      console.error(err);
      setSyncMessage(err.message || 'Erro ao conectar com o Google.');
    } finally {
      setIsSyncingCalendar(false);
      setTimeout(() => setSyncMessage(null), 6000);
    }
  };

  const handleDisconnectGoogleCalendar = () => {
    disconnectGoogleCalendar();
    setIsGoogleSynced(false);
    setGoogleEmail(null);
    setGoogleEvents([]);
    setGoogleTasks([]);
    setTokenExpired(false);
    setSyncMessage('Sincronização com o Google desativada.');
    setTimeout(() => setSyncMessage(null), 4000);
  };

  const handleRefreshGoogleEvents = async () => {
    if (!isGoogleSynced) {
      handleConnectGoogleCalendar();
      return;
    }
    setIsSyncingCalendar(true);
    setSyncMessage(null);
    try {
      let token = getGoogleAccessToken();
      if (!token) {
        token = await restoreGoogleTokenFromCloud();
      }
      const [events, tasks] = await Promise.all([
        fetchGoogleEvents(),
        fetchGoogleTasks().catch((err) => {
          console.warn("Tasks sync warning:", err);
          return [];
        }),
      ]);
      setGoogleEvents(events);
      setGoogleTasks(tasks);
      setTokenExpired(false);
      setSyncMessage(`Google sincronizado: ${events.length} evento(s) e ${tasks.length} tarefa(s) ativos.`);
    } catch (err: any) {
      console.warn('Refresh notice:', err);
    } finally {
      setIsSyncingCalendar(false);
      setTimeout(() => setSyncMessage(null), 4000);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const performSync = async () => {
      if (!isGoogleSynced) {
        if (isMounted) setIsSyncingCalendar(false);
        return;
      }

      let token = getGoogleAccessToken();
      if (!token) {
        token = await restoreGoogleTokenFromCloud();
      }

      try {
        const [events, tasks] = await Promise.all([
          fetchGoogleEvents(),
          fetchGoogleTasks().catch(() => []),
        ]);
        if (isMounted) {
          setGoogleEvents(events);
          setGoogleTasks(tasks);
          setTokenExpired(false);
        }
      } catch (err: any) {
        console.warn("Background auto sync notice:", err);
      } finally {
        if (isMounted) setIsSyncingCalendar(false);
      }
    };

    performSync();

    // Auto-refresh continuously in the background every 25 seconds, and on tab focus or visibility
    const onActive = () => {
      performSync();
    };

    window.addEventListener('focus', onActive);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performSync();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    const interval = setInterval(performSync, 25000);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', onActive);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearInterval(interval);
    };
  }, [isGoogleSynced]);

  useEffect(() => {
    localStorage.setItem('today_scratchpad', dailyNote);
  }, [dailyNote]);

  // Today long formatted string (Brazilian PT-BR style)
  const todayFormatted = useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    };
    return new Date().toLocaleDateString('pt-BR', options);
  }, []);

  // Map Google Calendar Events into the AppAction model schema for unified display
  const mappedGoogleEvents = useMemo(() => {
    if (!isGoogleSynced || googleEvents.length === 0) return [];
    
    return googleEvents.map((evt) => {
      let evtDateStr = '';
      let startTime: string | undefined = undefined;

      if (evt.start?.dateTime) {
        // Splitting by 'T' extracts the calendar date directly to avoid timezone day shifts
        const parts = evt.start.dateTime.split('T');
        if (parts[0] && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
          evtDateStr = parts[0];
        } else {
          const d = new Date(evt.start.dateTime);
          const yyyy = d.getFullYear();
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const dd = String(d.getDate()).padStart(2, '0');
          evtDateStr = `${yyyy}-${mm}-${dd}`;
        }

        if (parts[1]) {
          startTime = parts[1].slice(0, 5);
        } else {
          const d = new Date(evt.start.dateTime);
          startTime = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }
      } else if (evt.start?.date) {
        evtDateStr = evt.start.date.split('T')[0];
      }

      const summaryText = evt.summary && evt.summary.trim() ? evt.summary.trim() : 'Compromisso Google Agenda';

      const act: AppAction = {
        id: `gcal-${evt.id}`,
        type: 'Google Agenda',
        area: 'Operação',
        origin: 'Interna',
        description: summaryText,
        date: evtDateStr,
        time: startTime,
        status: 'pending',
        notes: evt.description || (evt.calendarTitle ? `Agenda: ${evt.calendarTitle}` : ''),
        createdAt: new Date().toISOString(),
        isAppointment: true,
        gcalEventId: evt.id,
      };
      return act;
    });
  }, [googleEvents, isGoogleSynced]);

  // Map Google Tasks into the AppAction model schema for unified display
  const mappedGoogleTasks = useMemo(() => {
    if (!isGoogleSynced || googleTasks.length === 0) return [];

    return googleTasks.map((task) => {
      let taskDateStr = todayStr;
      if (task.due) {
        const parts = task.due.split('T');
        if (parts[0] && /^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
          taskDateStr = parts[0];
        }
      }

      const summaryText = task.title && task.title.trim() ? task.title.trim() : 'Tarefa Google';

      const act: AppAction = {
        id: `gtask-${task.id}`,
        type: 'Google Tarefa',
        area: 'Operação',
        origin: 'Interna',
        description: summaryText,
        date: taskDateStr,
        status: task.status === 'completed' ? 'completed' : 'pending',
        notes: task.notes || (task.listTitle ? `Lista: ${task.listTitle}` : ''),
        createdAt: task.updated || new Date().toISOString(),
        completedAt: task.completed,
        isAppointment: false,
        gcalTaskId: task.id,
        gcalTaskListId: task.listId || '@default',
      };
      return act;
    });
  }, [googleTasks, isGoogleSynced, todayStr]);

  // Today's actions sorted by time (Combining local database events, Google Calendar events, and Google Tasks)
  const todayActions = useMemo(() => {
    const localToday = actions.filter((a) => {
      if (!a.date) return false;
      if (a.date === todayStr) return true;
      if (a.date.includes('/')) {
        const [d, m, y] = a.date.split('/');
        if (d && m && y) {
          return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` === todayStr;
        }
      }
      return false;
    });

    const googleToday = mappedGoogleEvents.filter((a) => a.date === todayStr);
    const googleTasksToday = mappedGoogleTasks.filter(
      (a) => a.date === todayStr || (!googleTasks.find((t) => `gtask-${t.id}` === a.id)?.due && a.status === 'pending')
    );

    return [...localToday, ...googleToday, ...googleTasksToday]
      .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
  }, [actions, mappedGoogleEvents, mappedGoogleTasks, googleTasks, todayStr]);

  // Completed today counter
  const completedToday = useMemo(() => {
    return todayActions.filter((a) => a.status === 'completed').length;
  }, [todayActions]);

  const completionPercent = useMemo(() => {
    if (todayActions.length === 0) return 0;
    return Math.round((completedToday / todayActions.length) * 100);
  }, [completedToday, todayActions]);

  // Milestones/deadlines due today
  const todayMilestones = useMemo(() => {
    return projectMilestones.filter((m) => m.dueDate === todayStr && !m.isCompleted);
  }, [projectMilestones, todayStr]);

  const todayInstallments = useMemo(() => {
    return projectInstallments.filter((i) => i.dueDate === todayStr && i.status !== 'paid');
  }, [projectInstallments, todayStr]);

  // Toggle completion of local actions or Google Tasks
  const handleToggleTaskStatus = (act: AppAction) => {
    const isCompleted = act.status === 'completed';
    const newStatus = isCompleted ? 'pending' : 'completed';

    if (act.gcalTaskId) {
      updateGoogleTaskStatus(act.gcalTaskId, newStatus === 'completed', act.gcalTaskListId);
      setGoogleTasks((prev) =>
        prev.map((t) =>
          t.id === act.gcalTaskId
            ? { ...t, status: newStatus === 'completed' ? 'completed' : 'needsAction' }
            : t
        )
      );
      return;
    }

    if (act.id.startsWith('gtask-')) {
      const cleanId = act.id.replace('gtask-', '');
      updateGoogleTaskStatus(cleanId, newStatus === 'completed', act.gcalTaskListId);
      setGoogleTasks((prev) =>
        prev.map((t) =>
          t.id === cleanId
            ? { ...t, status: newStatus === 'completed' ? 'completed' : 'needsAction' }
            : t
        )
      );
      return;
    }

    updateAppAction(act.id, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    });
  };

  // Quick Task input form
  const [quickTaskText, setQuickTaskText] = useState('');
  const [quickTaskFeedback, setQuickTaskFeedback] = useState<string | null>(null);

  const handleAddQuickTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = quickTaskText.trim();
    if (!text) {
      // If user clicked "+ Adicionar" without typing, open the full task modal for today
      handleOpenCreateAction(todayStr);
      return;
    }

    let gcalTaskId: string | undefined = undefined;
    let gcalEventId: string | undefined = undefined;
    const timeNow = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    if (isGoogleSynced && getGoogleAccessToken()) {
      try {
        const taskRes = await createGoogleTask(text, 'Criado via Meu Escritório Online', todayStr);
        if (taskRes) {
          gcalTaskId = taskRes.id;
          setGoogleTasks((prev) => [taskRes, ...prev]);
        }
      } catch (err) {
        console.warn("Erro ao criar tarefa rápida no Google Tasks:", err);
      }
    }

    addAppAction({
      type: 'Tarefa rápida',
      area: 'Operação',
      origin: 'Interna',
      description: text,
      date: todayStr,
      time: timeNow,
      status: 'pending',
      gcalTaskId,
      gcalEventId,
    });

    setQuickTaskText('');
    setQuickTaskFeedback(`"${text.length > 30 ? text.slice(0, 30) + '...' : text}" adicionada e sincronizada com sucesso!`);
    setTimeout(() => {
      setQuickTaskFeedback(null);
    }, 3500);
  };

  // Safe Deletion wrapper to handle local actions, Google Calendar events, and Google Tasks
  const handleDeleteActionWrapper = async (id: string) => {
    const act = actions.find((a) => a.id === id);
    if (act && act.gcalEventId && isGoogleSynced && getGoogleAccessToken()) {
      try {
        await deleteGoogleEvent(act.gcalEventId);
      } catch (err) {
        console.warn("Google Calendar deletion error:", err);
      }
    } else if (act && act.gcalTaskId && isGoogleSynced && getGoogleAccessToken()) {
      try {
        await deleteGoogleTask(act.gcalTaskId, act.gcalTaskListId);
        setGoogleTasks((prev) => prev.filter((t) => t.id !== act.gcalTaskId));
      } catch (err) {
        console.warn("Google Task deletion error:", err);
      }
    } else if (id.startsWith('gcal-')) {
      // It's a Google Calendar event from the live list
      const cleanId = id.replace('gcal-', '');
      if (isGoogleSynced && getGoogleAccessToken()) {
        try {
          await deleteGoogleEvent(cleanId);
          const events = await fetchGoogleEvents();
          setGoogleEvents(events);
          return;
        } catch (err) {
          console.warn("Google Calendar live event deletion error:", err);
        }
      }
    } else if (id.startsWith('gtask-')) {
      // It's a Google Task from the live list
      const cleanId = id.replace('gtask-', '');
      if (isGoogleSynced && getGoogleAccessToken()) {
        try {
          const found = googleTasks.find((t) => t.id === cleanId);
          await deleteGoogleTask(cleanId, found?.listId || '@default');
          setGoogleTasks((prev) => prev.filter((t) => t.id !== cleanId));
          return;
        } catch (err) {
          console.warn("Google Task live task deletion error:", err);
        }
      }
    }
    deleteAppAction(id);
  };

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

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

  // Filtered actions for calendar & 7days (Combines local database, Google Calendar events, and Google Tasks)
  const filteredActions = useMemo(() => {
    const localFiltered = actions.filter((action) => {
      if (selectedArea !== 'all' && action.area !== selectedArea) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = action.description?.toLowerCase().includes(q);
        const matchType = action.type?.toLowerCase().includes(q);
        const matchTitle = action.relatedTitle?.toLowerCase().includes(q);
        const matchResp = action.responsibleName?.toLowerCase().includes(q);
        if (!matchDesc && !matchType && !matchTitle && !matchResp) return false;
      }
      return true;
    });

    const googleFiltered = mappedGoogleEvents.filter((evt) => {
      // In office calendar view, Google commitments are relevant across all areas
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = evt.description?.toLowerCase().includes(q);
        const matchType = evt.type?.toLowerCase().includes(q);
        const matchNotes = evt.notes?.toLowerCase().includes(q);
        if (!matchDesc && !matchType && !matchNotes) return false;
      }
      return true;
    });

    const googleTasksFiltered = mappedGoogleTasks.filter((task) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = task.description?.toLowerCase().includes(q);
        const matchType = task.type?.toLowerCase().includes(q);
        const matchNotes = task.notes?.toLowerCase().includes(q);
        if (!matchDesc && !matchType && !matchNotes) return false;
      }
      return true;
    });

    return [...localFiltered, ...googleFiltered, ...googleTasksFiltered];
  }, [actions, mappedGoogleEvents, mappedGoogleTasks, selectedArea, searchQuery]);

  // Modal State for Creating / Editing Actions
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<AppAction | null>(null);

  // Form Fields
  const [formArea, setFormArea] = useState<'Comercial' | 'Operação' | 'Financeiro'>('Comercial');
  const [formOrigin, setFormOrigin] = useState<'Lead' | 'Cliente' | 'Projeto' | 'Interna'>('Interna');
  const [formType, setFormType] = useState('Reunião com cliente');
  const [formCustomType, setFormCustomType] = useState('');
  const [formRelatedId, setFormRelatedId] = useState('');
  const [formRelatedTitle, setFormRelatedTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formStartDate, setFormStartDate] = useState(todayStr);
  const [formEndDate, setFormEndDate] = useState(todayStr);
  const [formTime, setFormTime] = useState('');
  const [formResponsibleId, setFormResponsibleId] = useState('');
  const [formResponsibleName, setFormResponsibleName] = useState('');

  // Open modal to create a new action
  const handleOpenCreateAction = (defaultDate?: string) => {
    const targetDate = defaultDate || todayStr;
    setEditingAction(null);
    setFormArea('Operação');
    setFormOrigin('Interna');
    setFormType('Reunião com cliente');
    setFormCustomType('');
    setFormRelatedId('');
    setFormRelatedTitle('');
    setFormDescription('');
    setFormStartDate(targetDate);
    setFormEndDate(targetDate);
    setFormTime('');
    setFormResponsibleId('');
    setFormResponsibleName('');
    setIsActionModalOpen(true);
  };

  // Open modal to edit an action
  const handleOpenEditAction = (action: AppAction) => {
    setEditingAction(action);
    setFormArea(action.area || 'Operação');
    setFormOrigin(action.origin || 'Interna');
    setFormType(action.type || 'Reunião com cliente');
    setFormCustomType('');
    setFormRelatedId(action.relatedId || '');
    setFormRelatedTitle(action.relatedTitle || '');
    setFormDescription(action.description || '');
    setFormStartDate(action.startDate || action.date || todayStr);
    setFormEndDate(action.endDate || action.date || todayStr);
    setFormTime(action.time || '');
    setFormResponsibleId(action.responsibleId || '');
    setFormResponsibleName(action.responsibleName || '');
    setIsActionModalOpen(true);
  };

  // Duplicate an action
  const handleCloneAction = (action: AppAction) => {
    const { id, createdAt, ...rest } = action;
    addAppAction({
      ...rest,
      status: 'pending',
      date: todayStr,
    });
  };

  // Submit action modal
  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalType = formType === 'Personalizado' ? formCustomType.trim() : formType;
    if (!finalType) return;

    let relatedTitleFinal = formRelatedTitle;
    if (formOrigin === 'Cliente' && formRelatedId) {
      const c = clients.find((x) => x.id === formRelatedId);
      if (c) relatedTitleFinal = c.name;
    } else if (formOrigin === 'Projeto' && formRelatedId) {
      const p = architectureProjects.find((x) => x.id === formRelatedId);
      if (p) relatedTitleFinal = p.name;
    }

    let gcalEventId = editingAction?.gcalEventId;

    if (isGoogleSynced && getGoogleAccessToken()) {
      try {
        if (editingAction) {
          if (editingAction.gcalEventId) {
            await updateGoogleEvent(
              editingAction.gcalEventId,
              `Ação: ${finalType}`,
              formDescription,
              formEndDate || formStartDate,
              formTime || undefined
            );
          } else {
            const res = await createGoogleEvent(
              `Ação: ${finalType}`,
              formDescription,
              formEndDate || formStartDate,
              formTime || undefined
            );
            gcalEventId = res.id;
          }
        } else {
          const res = await createGoogleEvent(
            `Ação: ${finalType}`,
            formDescription,
            formEndDate || formStartDate,
            formTime || undefined
          );
          gcalEventId = res.id;
        }

        // Immediately refresh Google events in background
        fetchGoogleEvents().then(events => setGoogleEvents(events)).catch(e => console.warn(e));
      } catch (err) {
        console.warn("Erro ao salvar no Google Calendar:", err);
      }
    }

    if (editingAction) {
      updateAppAction(editingAction.id, {
        area: formArea,
        origin: formOrigin,
        type: finalType,
        relatedId: formRelatedId || undefined,
        relatedTitle: relatedTitleFinal || undefined,
        description: formDescription,
        date: formEndDate || formStartDate,
        startDate: formStartDate,
        endDate: formEndDate,
        time: formTime || undefined,
        responsibleId: formResponsibleId || undefined,
        responsibleName: formResponsibleName || undefined,
        gcalEventId,
      });
    } else {
      addAppAction({
        area: formArea,
        origin: formOrigin,
        type: finalType,
        relatedId: formRelatedId || undefined,
        relatedTitle: relatedTitleFinal || undefined,
        description: formDescription,
        date: formEndDate || formStartDate,
        startDate: formStartDate,
        endDate: formEndDate,
        time: formTime || undefined,
        responsibleId: formResponsibleId || undefined,
        responsibleName: formResponsibleName || undefined,
        status: 'pending',
        gcalEventId,
      });
    }

    setIsActionModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-serif text-[#fcf8f5] tracking-tight">
            Meu Dia & Agenda
          </h2>
          <p className="text-xs sm:text-sm text-[#a89c93] font-medium mt-0.5">
            Compromissos, rotina diária e calendário completo de atividades
          </p>
        </div>

        {/* View Mode Controls & New Action Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Google Sync Indicator in Header */}
          {isGoogleSynced && (
            <button
              onClick={handleRefreshGoogleEvents}
              disabled={isSyncingCalendar}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition-all cursor-pointer disabled:opacity-50"
              title="Sincronização contínua com Google Agenda & Tarefas ativa"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin text-emerald-400' : ''}`} />
              <span>{isSyncingCalendar ? 'Sincronizando...' : 'Google Ativo'}</span>
            </button>
          )}

          <div className="flex bg-[#181513] p-1 rounded-xl border border-[#3d342f] shadow-sm">
            <button
              onClick={() => setViewMode('today')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'today'
                  ? 'bg-[#2c241f] text-[#c58a4b] border border-[#c58a4b]/30 shadow-xs'
                  : 'text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> Meu Dia
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'calendar'
                  ? 'bg-[#2c241f] text-[#c58a4b] border border-[#c58a4b]/30 shadow-xs'
                  : 'text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Calendário Mensal
            </button>
            <button
              onClick={() => setViewMode('7days')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === '7days'
                  ? 'bg-[#2c241f] text-[#c58a4b] border border-[#c58a4b]/30 shadow-xs'
                  : 'text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> 7 Dias
            </button>
          </div>

          <button
            onClick={() => handleOpenCreateAction()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-md bg-[#c58a4b] text-[#12100e] hover:brightness-110"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Ação</span>
          </button>
        </div>
      </div>

      {/* 2. MODE: MEU DIA (Hoje) */}
      {viewMode === 'today' && (
        <div className="space-y-6">
          {/* Google Calendar & Tasks Integration Widget */}
          <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <CalendarDays className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-[#fcf8f5]">Sincronização com Google Agenda & Tarefas</h4>
                  {isGoogleSynced && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Sincronização Automática Ativa
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#a89c93] mt-0.5">
                  {isGoogleSynced
                    ? `Conectado como ${googleEmail || 'lfquadrosdecorativos@gmail.com'}. ${googleEvents.length} compromissos e ${googleTasks.length} tarefas sincronizados automaticamente em segundo plano.`
                    : 'Conecte sua conta Google para sincronizar automaticamente reuniões, compromissos e tarefas (Google Tasks & Agenda).'}
                </p>
                {syncMessage && (
                  <p className="text-[11px] text-amber-400 mt-1 font-medium">{syncMessage}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isGoogleSynced && (
                <>
                  <button
                    onClick={handleRefreshGoogleEvents}
                    disabled={isSyncingCalendar}
                    className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer bg-emerald-500 hover:bg-emerald-400 text-black shadow-md disabled:opacity-50"
                    title="Buscar novos eventos e tarefas no Google"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin' : ''}`} />
                    <span>{isSyncingCalendar ? 'Sincronizando...' : 'Atualizar Agora'}</span>
                  </button>

                  <button
                    onClick={handleDisconnectGoogleCalendar}
                    className="p-2.5 rounded-xl text-xs font-bold text-[#a89c93] hover:text-red-400 hover:bg-red-500/10 border border-[#3d342f] transition-all cursor-pointer"
                    title="Desconectar do Google"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </>
              )}

              {!isGoogleSynced && (
                <button
                  onClick={handleConnectGoogleCalendar}
                  disabled={isSyncingCalendar}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer bg-[var(--theme-primary)] hover:brightness-110 text-black shadow-md"
                >
                  <CalendarDays className="w-4 h-4" />
                  <span>Conectar Google Agenda & Tarefas</span>
                </button>
              )}
            </div>
          </div>

          {/* Welcome Banner */}
          <div className="relative p-6 rounded-2xl bg-gradient-to-br from-[#1c1815] via-[#161311] to-[#12100e] border border-[#3d342f] overflow-hidden shadow-md">
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-[#c58a4b]/10 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-6 -mb-6 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

            <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-[#c58a4b]">
                  <Sparkles className="w-4 h-4" />
                  <span className="text-[10px] uppercase font-bold tracking-wider">Painel pessoal de produtividade</span>
                </div>
                <h1 className="text-xl md:text-2xl font-serif font-bold text-[#fcf8f5] tracking-tight">
                  Olá, {greetingName}
                </h1>
                <p className="text-xs text-[#a89c93] capitalize">
                  {todayFormatted}
                </p>
              </div>

              {/* Today's Productivity Ring */}
              <div className="flex items-center gap-4 bg-[#221c18] p-3.5 rounded-xl border border-[#3d342f] shadow-xs">
                <div className="relative w-12 h-12 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="24" cy="24" r="20" className="stroke-[#3d342f]" strokeWidth="4" fill="transparent" />
                    <circle
                      cx="24"
                      cy="24"
                      r="20"
                      style={{
                        strokeDasharray: `${2 * Math.PI * 20}`,
                        strokeDashoffset: `${2 * Math.PI * 20 * (1 - completionPercent / 100)}`,
                        transition: 'stroke-dashoffset 0.5s ease-in-out',
                      }}
                      className="stroke-[#c58a4b]"
                      strokeWidth="4"
                      strokeLinecap="round"
                      fill="transparent"
                    />
                  </svg>
                  <span className="absolute text-[10px] font-bold text-[#fcf8f5]">{completionPercent}%</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#fcf8f5]">Progresso de Hoje</h4>
                  <p className="text-[10px] text-[#a89c93] mt-0.5">
                    {completedToday} de {todayActions.length} tarefas concluídas
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main Grid: Checklist & Scratchpad / Mini-Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left column: Checklist timeline (8 Columns) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Quick Task input form */}
              <div className="p-4 rounded-xl bg-[#1a1614] border border-[#2d2520]">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddQuickTask(e);
                  }}
                  className="flex flex-col sm:flex-row gap-2"
                >
                  <input
                    type="text"
                    value={quickTaskText}
                    onChange={(e) => setQuickTaskText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddQuickTask();
                      }
                    }}
                    placeholder="Adicionar tarefa rápida para fazer hoje..."
                    className="flex-1 bg-[#221c18] border border-[#3d342f] rounded-xl px-3.5 py-2 text-xs text-[#fcf8f5] placeholder-[#73655c] focus:outline-none focus:border-[#c58a4b]/70"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddQuickTask()}
                      className="px-4 py-2 rounded-xl bg-[#c58a4b] hover:bg-[#b0783d] active:scale-95 text-[#12100e] text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateAction(todayStr)}
                      title="Abrir formulário com mais opções (horário, responsável, área)"
                      className="px-3 py-2 rounded-xl bg-[#221c18] hover:bg-[#2c241f] border border-[#3d342f] hover:border-[#c58a4b]/50 text-[#a89c93] hover:text-[#fcf8f5] text-xs font-medium transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
                    >
                      <CalendarIcon className="w-3.5 h-3.5 text-[#c58a4b]" />
                      <span className="hidden sm:inline">Mais opções</span>
                    </button>
                  </div>
                </form>

                {/* Instant Feedback Toast */}
                {quickTaskFeedback && (
                  <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>{quickTaskFeedback}</span>
                  </div>
                )}
              </div>

              {/* Today's Schedule Card */}
              <div className="p-6 rounded-2xl bg-[#1a1614] border border-[#2d2520] space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#fcf8f5] flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-[#c58a4b]" />
                    Tarefas & Compromissos Agendados
                  </h3>
                  <button
                    onClick={() => setViewMode('calendar')}
                    className="text-xs text-[#c58a4b] hover:text-[#e6b37e] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    Ver no Calendário <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3">
                  {todayActions.length === 0 ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-2">
                      <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Award className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#fcf8f5]">Sua agenda está livre hoje!</h4>
                        <p className="text-[10px] text-[#a89c93] mt-0.5">Use as tarefas rápidas acima ou agende um compromisso no calendário.</p>
                      </div>
                    </div>
                  ) : (
                    todayActions.map((act) => {
                      const isGCal = act.id.startsWith('gcal-') || (!!act.gcalEventId && !act.gcalTaskId);
                      const isGTask = act.id.startsWith('gtask-') || !!act.gcalTaskId;
                      const isCompleted = act.status === 'completed';

                      return (
                        <div
                          key={act.id}
                          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                            isCompleted
                              ? 'bg-[#14110f]/60 border-emerald-500/20 opacity-70'
                              : isGTask
                              ? 'bg-[#181d19] border-emerald-500/20 hover:border-emerald-500/40'
                              : isGCal
                              ? 'bg-[#1c1815] border-amber-500/20 hover:border-amber-500/40'
                              : 'bg-[#221c18] border-[#3d342f] hover:border-[#c58a4b]/40'
                          }`}
                        >
                          <div className="flex gap-3">
                            {/* Checkbox trigger or Calendar badge */}
                            {isGCal ? (
                              <div className="w-5 h-5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mt-0.5 shrink-0" title="Evento do Google Agenda">
                                <CalendarDays className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <button
                                onClick={() => handleToggleTaskStatus(act)}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center mt-0.5 shrink-0 transition-colors cursor-pointer ${
                                  isCompleted
                                    ? 'bg-emerald-500 border-transparent text-white'
                                    : isGTask
                                    ? 'border-emerald-500/40 hover:border-emerald-400'
                                    : 'border-[#73655c] hover:border-[#c58a4b]'
                                }`}
                                title={isCompleted ? "Marcar como pendente" : "Concluir tarefa"}
                              >
                                {isCompleted && <Check className="w-3.5 h-3.5" />}
                              </button>
                            )}

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold text-[#fcf8f5] ${isCompleted ? 'line-through text-[#73655c]' : ''}`}>
                                  {act.type}
                                </span>
                                {act.time && (
                                  <span className="text-[9px] font-semibold text-[#c58a4b] flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {act.time}
                                  </span>
                                )}
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold uppercase ${
                                  isGTask
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : isGCal
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                    : 'bg-[#2c241f] text-[#c58a4b] border-[#3d342f]'
                                }`}>
                                  {isGTask ? 'Google Tarefa' : isGCal ? 'Google Agenda' : act.area}
                                </span>
                              </div>
                              <p className={`text-[11px] text-[#ded5cc] mt-1 ${isCompleted ? 'line-through text-[#73655c]' : ''}`}>
                                {act.description}
                              </p>
                              {act.relatedTitle && (
                                <span className="text-[9px] text-[#8c827a] mt-1.5 block font-medium">
                                  Ref: {act.relatedTitle}
                                </span>
                              )}
                              {act.notes && isGTask && (
                                <span className="text-[9px] text-emerald-400/80 mt-1 block font-medium">
                                  {act.notes}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Controls */}
                          <div className="flex items-center gap-2 self-end sm:self-center">
                            {isGCal ? (
                              <>
                                <a
                                  href={`https://calendar.google.com/calendar/r/eventedit/${act.gcalEventId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg text-[#8c827a] hover:text-[#fcf8f5] transition-colors"
                                  title="Abrir no Google Agenda"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
                                </a>
                                <button
                                  onClick={() => handleDeleteActionWrapper(act.id)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
                                  title="Excluir do Google Agenda"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : isGTask ? (
                              <>
                                <button
                                  onClick={() => handleToggleTaskStatus(act)}
                                  className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                                    isCompleted
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30'
                                  }`}
                                >
                                  <Check className="w-3 h-3" />
                                  {isCompleted ? 'Concluída' : 'Concluir'}
                                </button>
                                <button
                                  onClick={() => handleDeleteActionWrapper(act.id)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
                                  title="Excluir do Google Tasks"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            ) : (
                              <>
                                {act.status === 'pending' && (
                                  <button
                                    onClick={() => updateAppAction(act.id, { status: 'in_progress' })}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
                                  >
                                    <Play className="w-3 h-3" /> Começar
                                  </button>
                                )}
                                <button
                                  onClick={() => handleOpenEditAction(act)}
                                  className="p-1.5 rounded-lg text-[#8c827a] hover:text-[#fcf8f5] transition-colors cursor-pointer"
                                  title="Editar ação"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteActionWrapper(act.id)}
                                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-400 transition-colors cursor-pointer"
                                  title="Excluir ação"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Right column: Interactive Mini-Calendar, Scratchpad & Deadlines (4 Columns) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Interactive Mini-Calendar Widget */}
              <div className="p-5 rounded-2xl bg-[#1a1614] border border-[#2d2520] space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#fcf8f5] uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarIcon className="w-4 h-4 text-[#c58a4b]" />
                    {MONTH_NAMES[month]} {year}
                  </h3>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                      className="p-1 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#221c18] transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date())}
                      className="text-[10px] font-bold text-[#c58a4b] px-1.5 py-0.5 rounded hover:bg-[#221c18] cursor-pointer"
                    >
                      Hoje
                    </button>
                    <button
                      onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                      className="p-1 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#221c18] transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Weekdays */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#73655c] pb-1">
                  <span>D</span>
                  <span>S</span>
                  <span>T</span>
                  <span>Q</span>
                  <span>Q</span>
                  <span>S</span>
                  <span>S</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1 text-center">
                  {Array.from({ length: firstDayIndex }).map((_, i) => (
                    <div key={`blank-mini-${i}`} className="h-7" />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                    const formattedMonth = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
                    const checkDateStr = `${year}-${formattedMonth}-${formattedDay}`;

                    const dayHasGCal = mappedGoogleEvents.some((g) => g.date === checkDateStr);
                    const dayHasGTask = mappedGoogleTasks.some((t) => t.date === checkDateStr && t.status !== 'completed');
                    const dayHasActions = actions.some((a) => {
                      if (!a.date) return false;
                      if (a.date === checkDateStr) return true;
                      if (a.date.includes('/')) {
                        const [d, m, y] = a.date.split('/');
                        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` === checkDateStr;
                      }
                      return false;
                    });
                    const hasAnyEvent = dayHasActions || dayHasGCal || dayHasGTask;
                    const isToday = checkDateStr === todayStr;
                    const isSelected = checkDateStr === selectedCalendarDate;

                    return (
                      <button
                        key={`mini-day-${dayNum}`}
                        onClick={() => {
                          setSelectedCalendarDate(checkDateStr);
                          setViewMode('calendar');
                        }}
                        className={`h-7 rounded-lg text-xs font-semibold flex flex-col items-center justify-center relative transition-all cursor-pointer ${
                          isToday
                            ? 'bg-[#c58a4b] text-[#12100e] font-bold shadow-xs'
                            : 'text-[#ded5cc] hover:bg-[#241e1b] hover:text-[#fcf8f5]'
                        }`}
                        title={`${checkDateStr} - Clique para ver o calendário${dayHasGCal ? ' • Google Agenda' : ''}${dayHasGTask ? ' • Google Tarefa' : ''}${dayHasActions ? ' • Ação Escritório' : ''}`}
                      >
                        <span>{dayNum}</span>
                        {hasAnyEvent && !isToday && (
                          <div className="flex items-center gap-0.5 absolute bottom-0.5">
                            {dayHasGCal && <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />}
                            {dayHasGTask && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                            {dayHasActions && !dayHasGCal && !dayHasGTask && <span className="w-1.5 h-1.5 rounded-full bg-[#c58a4b]" />}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setViewMode('calendar')}
                  className="w-full mt-3 py-2 rounded-xl bg-[#221c18] hover:bg-[#2c241f] border border-[#3d342f] text-xs font-bold text-[#c58a4b] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <CalendarDays className="w-3.5 h-3.5" /> Acessar Calendário Completo
                </button>
              </div>

              {/* Quick daily Notepad scratchpad */}
              <div className="p-5 rounded-2xl bg-[#1a1614] border border-[#2d2520] space-y-3.5">
                <div>
                  <h3 className="text-xs font-bold text-[#fcf8f5] uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-[#c58a4b]" /> Bloco de Notas de Hoje
                  </h3>
                  <p className="text-[10px] text-[#a89c93] mt-0.5">Rascunhe ideias, telefones ou lembretes rápidos.</p>
                </div>

                <textarea
                  value={dailyNote}
                  onChange={(e) => setDailyNote(e.target.value)}
                  placeholder="Digite suas anotações livres aqui... (Salva automaticamente)"
                  rows={6}
                  className="w-full bg-[#221c18] border border-[#3d342f] rounded-xl p-3 text-xs text-[#fcf8f5] placeholder-[#73655c] focus:outline-none focus:border-[#c58a4b]/50 leading-relaxed resize-none"
                />
              </div>

              {/* Urgent deadlines due today */}
              {(todayMilestones.length > 0 || todayInstallments.length > 0) && (
                <div className="p-5 rounded-2xl bg-[#1a1614] border border-rose-500/30 space-y-4">
                  <h3 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" /> Vencimentos Cruciais de Hoje
                  </h3>

                  <div className="space-y-3">
                    {todayMilestones.map((milestone) => (
                      <div key={milestone.id} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                        <span className="font-semibold text-[#fcf8f5]">{milestone.title}</span>
                        <p className="text-[10px] text-zinc-400 mt-1">Prazo de entrega agendado para hoje.</p>
                      </div>
                    ))}

                    {todayInstallments.map((inst) => (
                      <div key={inst.id} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs flex justify-between items-center">
                        <div>
                          <span className="font-semibold text-[#fcf8f5]">{inst.description}</span>
                          <p className="text-[10px] text-rose-400 mt-0.5">Valor: {formatCurrency(inst.amount)}</p>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold">Cobrança</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. MODE: CALENDÁRIO MENSAL (O calendário de Ações) */}
      {viewMode === 'calendar' && (
        <div className="space-y-4">
          {/* Controls Bar: Month Nav + Filters */}
          <div className="p-4 rounded-2xl bg-[#1a1614] border border-[#2d2520] flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Month & Year Navigation */}
            <div className="flex items-center gap-3">
              <h3 className="text-lg sm:text-xl font-bold font-serif text-[#fcf8f5] flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-[#c58a4b]" />
                {MONTH_NAMES[month]} de {year}
              </h3>

              <div className="flex items-center gap-1 bg-[#221c18] p-1 rounded-xl border border-[#3d342f]">
                <button
                  onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                  className="p-1.5 text-[#a89c93] hover:text-[#fcf8f5] transition-colors cursor-pointer"
                  title="Mês anterior"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentDate(new Date())}
                  className="px-2.5 py-1 text-xs font-bold text-[#c58a4b] hover:text-[#e6b37e] transition-colors cursor-pointer"
                >
                  Hoje
                </button>
                <button
                  onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                  className="p-1.5 text-[#a89c93] hover:text-[#fcf8f5] transition-colors cursor-pointer"
                  title="Próximo mês"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Area Filter, Google Sync & Search */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1 bg-[#221c18] p-1 rounded-xl border border-[#3d342f] text-xs">
                {(['all', 'Comercial', 'Operação', 'Financeiro'] as const).map((area) => (
                  <button
                    key={area}
                    onClick={() => setSelectedArea(area)}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      selectedArea === area
                        ? 'bg-[#c58a4b] text-[#12100e]'
                        : 'text-[#a89c93] hover:text-[#fcf8f5]'
                    }`}
                  >
                    {area === 'all' ? 'Todas Áreas' : area}
                  </button>
                ))}
              </div>

              {/* Sync Google Calendar Button inside Calendar View */}
              <button
                onClick={handleRefreshGoogleEvents}
                disabled={isSyncingCalendar}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                  tokenExpired
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40'
                    : isGoogleSynced
                    ? 'bg-sky-950/30 border-sky-500/30 text-sky-300 hover:bg-sky-900/40 hover:border-sky-400/50'
                    : 'bg-[#221c18] border-[#3d342f] text-[#d8cec5] hover:text-[#fcf8f5] hover:border-[#c58a4b]'
                }`}
                title={isGoogleSynced ? "Clique para atualizar eventos do Google Agenda" : "Conectar Google Agenda"}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingCalendar ? 'animate-spin text-sky-400' : 'text-sky-400'}`} />
                <span>
                  {isSyncingCalendar
                    ? 'Sincronizando...'
                    : tokenExpired
                    ? 'Reautorizar Google'
                    : isGoogleSynced
                    ? 'Atualizar Google Agenda'
                    : 'Conectar Google'}
                </span>
              </button>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#73655c] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar ação..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#221c18] border border-[#3d342f] rounded-xl text-xs text-[#fcf8f5] placeholder-[#73655c] focus:outline-none focus:border-[#c58a4b]/50 w-36 sm:w-44"
                />
              </div>
            </div>
          </div>

          {/* Sync Message Alert if any */}
          {syncMessage && (
            <div className="px-4 py-2 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs flex items-center justify-between">
              <span>{syncMessage}</span>
              <button onClick={() => setSyncMessage(null)} className="text-sky-400 hover:text-white cursor-pointer ml-2">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Weekday Columns */}
          <div className="grid grid-cols-7 gap-1 text-center border-b border-[#2d2520] pb-2 text-[11px] font-bold text-[#8c827a] uppercase tracking-wider">
            <span>Dom</span>
            <span>Seg</span>
            <span>Ter</span>
            <span>Qua</span>
            <span>Qui</span>
            <span>Sex</span>
            <span>Sáb</span>
          </div>

          {/* Monthly Days Grid */}
          <div className="grid grid-cols-7 gap-2 min-h-[460px]">
            {Array.from({ length: firstDayIndex }).map((_, i) => (
              <div key={`blank-${i}`} className="p-2 min-h-[90px] rounded-xl bg-[#14110f]/30 border border-transparent" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const dayNum = i + 1;
              const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
              const formattedMonth = month + 1 < 10 ? `0${month + 1}` : `${month + 1}`;
              const checkDateStr = `${year}-${formattedMonth}-${formattedDay}`;

              const dayActions = filteredActions.filter((a) => a.date === checkDateStr);
              const dayMilestones = projectMilestones.filter((m) => m.dueDate === checkDateStr);
              const dayInstallments = projectInstallments.filter((inst) => inst.dueDate === checkDateStr);
              const isToday = checkDateStr === todayStr;

              return (
                <div
                  key={`calendar-day-${dayNum}`}
                  onClick={() => handleOpenCreateAction(checkDateStr)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between min-h-[105px] group ${
                    isToday
                      ? 'bg-[#27201b] border-[#c58a4b] shadow-sm'
                      : 'bg-[#1a1614] border-[#2d2520] hover:bg-[#221c18] hover:border-[#3d342f]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-xs font-bold ${
                        isToday
                          ? 'w-5 h-5 rounded-full bg-[#c58a4b] text-[#12100e] flex items-center justify-center font-black'
                          : 'text-[#ded5cc] group-hover:text-[#fcf8f5]'
                      }`}
                    >
                      {dayNum}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenCreateAction(checkDateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-md bg-[#2c241f] text-[#c58a4b] hover:bg-[#3d342f] transition-all cursor-pointer"
                      title="Adicionar ação neste dia"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Actions / Deadlines Chips */}
                  <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {/* Action chips */}
                    {dayActions.slice(0, 4).map((act) => {
                      const isCompleted = act.status === 'completed';
                      const isGoogleEvent = !!act.gcalEventId;
                      const isGoogleTask = !!act.gcalTaskId || act.id.startsWith('gtask-');
                      return (
                        <div
                          key={act.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditAction(act);
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded truncate font-medium flex items-center gap-1 border transition-all cursor-pointer ${
                            isCompleted
                              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 line-through opacity-70'
                              : act.status === 'in_progress'
                              ? 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300'
                              : isGoogleTask
                              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200 hover:border-emerald-400 hover:bg-emerald-900/50'
                              : isGoogleEvent
                              ? 'bg-sky-950/50 border-sky-500/40 text-sky-200 hover:border-sky-400 hover:bg-sky-900/50'
                              : 'bg-[#241e1b] border-[#3d342f] text-[#ded5cc] hover:border-[#c58a4b]'
                          }`}
                          title={`${act.time ? act.time + ' - ' : ''}${isGoogleTask ? '[Google Tarefa] ' : isGoogleEvent ? '[Google Agenda] ' : ''}${act.description || act.type}`}
                        >
                          {isGoogleEvent && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />}
                          {isGoogleTask && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                          {act.time && <span className={isGoogleEvent ? "text-sky-300 font-bold" : "text-[#c58a4b] font-bold"}>{act.time}</span>}
                          <span className="truncate font-semibold">{act.description || act.type}</span>
                        </div>
                      );
                    })}

                    {/* Milestones / Deadlines chips */}
                    {dayMilestones.slice(0, 1).map((m) => (
                      <div
                        key={m.id}
                        className="text-[9px] px-1.5 py-0.5 rounded truncate font-semibold bg-amber-950/40 border border-amber-500/30 text-amber-300 flex items-center gap-1"
                        title={`Entrega: ${m.title}`}
                      >
                        <Clock className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{m.title}</span>
                      </div>
                    ))}

                    {/* Installments chips */}
                    {dayInstallments.slice(0, 1).map((inst) => (
                      <div
                        key={inst.id}
                        className="text-[9px] px-1.5 py-0.5 rounded truncate font-semibold bg-rose-950/40 border border-rose-500/30 text-rose-300 flex items-center gap-1"
                        title={`Cobrança: ${inst.description} (${formatCurrency(inst.amount)})`}
                      >
                        <DollarSign className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{formatCurrency(inst.amount)}</span>
                      </div>
                    ))}

                    {/* More count */}
                    {dayActions.length > 4 && (
                      <span className="text-[8px] text-[#a89c93] font-bold text-center mt-0.5">
                        +{dayActions.length - 4} mais
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. MODE: PRÓXIMOS 7 DIAS */}
      {viewMode === '7days' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-2xl bg-[#1a1614] border border-[#2d2520]">
            <h3 className="text-sm font-bold text-[#fcf8f5] flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-[#c58a4b]" />
              Ações dos Próximos 7 Dias
            </h3>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  const prev = new Date(currentDate);
                  prev.setDate(prev.getDate() - 7);
                  setCurrentDate(prev);
                }}
                className="p-1.5 rounded-lg bg-[#221c18] border border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5] cursor-pointer"
                title="Semana anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2.5 py-1 rounded-lg bg-[#221c18] border border-[#3d342f] text-xs font-bold text-[#c58a4b] cursor-pointer"
              >
                Hoje
              </button>
              <button
                onClick={() => {
                  const next = new Date(currentDate);
                  next.setDate(next.getDate() + 7);
                  setCurrentDate(next);
                }}
                className="p-1.5 rounded-lg bg-[#221c18] border border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5] cursor-pointer"
                title="Próxima semana"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {next7Days.map((day) => {
              const dayActions = filteredActions.filter((a) => a.date === day.iso);
              const dayMilestones = projectMilestones.filter((m) => m.dueDate === day.iso);
              const isToday = day.iso === todayStr;

              return (
                <div
                  key={day.iso}
                  className={`p-3 rounded-xl border flex flex-col justify-between min-h-[220px] ${
                    isToday
                      ? 'bg-[#27201b] border-[#c58a4b]'
                      : 'bg-[#1a1614] border-[#2d2520]'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between border-b border-[#2d2520] pb-2 mb-2">
                      <span className={`text-xs font-bold capitalize ${isToday ? 'text-[#c58a4b]' : 'text-[#fcf8f5]'}`}>
                        {day.dayOfWeek}
                      </span>
                      <span className="text-[10px] text-[#a89c93] font-medium">
                        {day.dayNum}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      {dayActions.length === 0 && dayMilestones.length === 0 ? (
                        <span className="text-[10px] text-[#73655c] block italic py-6 text-center">
                          Livre
                        </span>
                      ) : (
                        <>
                          {dayActions.map((act) => {
                            const isGoogleEvent = !!act.gcalEventId;
                            const isGoogleTask = !!act.gcalTaskId || act.id.startsWith('gtask-');
                            return (
                              <div
                                key={act.id}
                                onClick={() => handleOpenEditAction(act)}
                                className={`p-2 rounded-lg border hover:border-[#c58a4b]/50 cursor-pointer transition-all text-left ${
                                  isGoogleTask
                                    ? 'bg-emerald-950/30 border-emerald-500/30 hover:bg-emerald-900/40'
                                    : isGoogleEvent
                                    ? 'bg-sky-950/30 border-sky-500/30 hover:bg-sky-900/40'
                                    : 'bg-[#221c18] border-[#3d342f]'
                                }`}
                              >
                                <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#fcf8f5] truncate">
                                  {isGoogleEvent && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />}
                                  {isGoogleTask && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />}
                                  {act.time && <span className={isGoogleEvent ? "text-sky-300" : "text-[#c58a4b]"}>{act.time}</span>}
                                  <span className={`truncate ${act.status === 'completed' ? 'line-through text-[#73655c]' : ''}`}>
                                    {act.description || act.type}
                                  </span>
                                </div>
                                {isGoogleTask ? (
                                  <div className="text-[9px] text-emerald-400/90 font-medium truncate mt-0.5">
                                    {act.notes || 'Google Tarefa'}
                                  </div>
                                ) : isGoogleEvent ? (
                                  <div className="text-[9px] text-sky-400/90 font-medium truncate mt-0.5">
                                    {act.notes || 'Google Agenda'}
                                  </div>
                                ) : (
                                  <div className="text-[9px] text-[#a89c93] truncate mt-0.5">
                                    {act.description}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {dayMilestones.map((m) => (
                            <div
                              key={m.id}
                              className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/30 text-left text-amber-300"
                            >
                              <div className="text-[10px] font-bold truncate">Entrega: {m.title}</div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenCreateAction(day.iso)}
                    className="mt-3 w-full py-1.5 rounded-lg bg-[#221c18] hover:bg-[#2c241f] border border-[#3d342f] text-[10px] font-bold text-[#c58a4b] transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Adicionar
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Action Creation & Editing Modal */}
      {isActionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-[#1c1815] text-[#ded5cc] border border-[#3d342f] rounded-3xl shadow-2xl relative my-6 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-[#2d2520] flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold font-serif text-[#fcf8f5] tracking-tight">
                  {editingAction ? 'Editar ação / compromisso' : 'Nova ação / agendamento'}
                </h3>
                <p className="text-xs text-[#a89c93] mt-1">
                  Registre uma ação vinculada a um lead, cliente, projeto ou rotina interna
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActionModalOpen(false)}
                className="p-1.5 rounded-full text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#2c241f] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveAction} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
                {/* 1. ÁREA */}
                <div>
                  <label className="block text-[11px] font-bold text-[#c58a4b] uppercase tracking-wider mb-1.5">
                    Área Operacional
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Comercial', 'Operação', 'Financeiro'] as const).map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => setFormArea(area)}
                        className={`py-2 px-3 rounded-xl font-medium border text-center transition-all cursor-pointer ${
                          formArea === area
                            ? 'bg-[#c58a4b] text-[#12100e] border-[#c58a4b] font-bold shadow-xs'
                            : 'bg-[#221c18] text-[#a89c93] border-[#3d342f] hover:border-[#73655c]'
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. ORIGEM DA AÇÃO */}
                <div>
                  <label className="block text-[11px] font-bold text-[#c58a4b] uppercase tracking-wider mb-1.5">
                    Origem da Ação
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'Lead', label: 'Lead' },
                      { id: 'Cliente', label: 'Cliente' },
                      { id: 'Projeto', label: 'Projeto' },
                      { id: 'Interna', label: 'Interna' },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setFormOrigin(item.id as any);
                          setFormRelatedId('');
                          setFormRelatedTitle('');
                        }}
                        className={`py-2 px-2 rounded-xl font-medium border text-center transition-all cursor-pointer ${
                          formOrigin === item.id
                            ? 'bg-[#2c241f] text-[#c58a4b] border-[#c58a4b] font-bold shadow-xs'
                            : 'bg-[#221c18] text-[#a89c93] border-[#3d342f] hover:border-[#73655c]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. VÍNCULO (SE CLIENTE OU PROJETO) */}
                {formOrigin === 'Interna' && (
                  <div className="p-3.5 rounded-xl border border-[#3d342f] bg-[#1a1614] shadow-sm flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-[#8c827a] shrink-0 mt-0.5" />
                    <div>
                      <span className="block text-sm font-bold text-[#fcf8f5]">Ação interna da empresa</span>
                      <span className="block text-xs text-[#a89c93] mt-0.5 leading-relaxed">
                        Não vinculada a lead, cliente ou projeto. Aparece normalmente em todos os calendários e dashboards.
                      </span>
                    </div>
                  </div>
                )}

                {formOrigin === 'Cliente' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#a89c93] uppercase tracking-wider mb-1.5">
                      Vincular a Cliente
                    </label>
                    <select
                      value={formRelatedId}
                      onChange={(e) => {
                        setFormRelatedId(e.target.value);
                        const c = clients.find((x) => x.id === e.target.value);
                        if (c) setFormRelatedTitle(c.name);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#221c18] border border-[#3d342f] text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]/50 cursor-pointer"
                    >
                      <option value="">Selecione o cliente...</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formOrigin === 'Projeto' && (
                  <div>
                    <label className="block text-[11px] font-bold text-[#a89c93] uppercase tracking-wider mb-1.5">
                      Vincular a Projeto
                    </label>
                    <select
                      value={formRelatedId}
                      onChange={(e) => {
                        setFormRelatedId(e.target.value);
                        const p = architectureProjects.find((x) => x.id === e.target.value);
                        if (p) setFormRelatedTitle(p.name);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#221c18] border border-[#3d342f] text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]/50 cursor-pointer"
                    >
                      <option value="">Selecione o projeto...</option>
                      {architectureProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.clientName})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 4. TIPO DA AÇÃO */}
                <div>
                  <label className="block text-[11px] font-bold text-[#c58a4b] uppercase tracking-wider mb-1.5">
                    Tipo de Ação / Atividade
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#221c18] border border-[#3d342f] text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]/50 cursor-pointer"
                  >
                    <option value="Reunião com cliente">Reunião com cliente</option>
                    <option value="Visita à obra">Visita à obra</option>
                    <option value="Apresentação de projeto">Apresentação de projeto</option>
                    <option value="Medição no local">Medição no local</option>
                    <option value="Enviar proposta / orçamento">Enviar proposta / orçamento</option>
                    <option value="Alinhamento com equipe / fornecedor">Alinhamento com equipe / fornecedor</option>
                    <option value="Modelagem 3D / Render">Modelagem 3D / Render</option>
                    <option value="Detalhamento executivo">Detalhamento executivo</option>
                    <option value="Personalizado">Outro (personalizado)...</option>
                  </select>

                  {formType === 'Personalizado' && (
                    <input
                      type="text"
                      value={formCustomType}
                      onChange={(e) => setFormCustomType(e.target.value)}
                      placeholder="Nome do tipo personalizado..."
                      className="w-full mt-2 px-3 py-2 rounded-xl bg-[#221c18] border border-[#3d342f] text-[#fcf8f5] placeholder-[#73655c] focus:outline-none focus:border-[#c58a4b]/50"
                    />
                  )}
                </div>

                {/* 5. DESCRIÇÃO */}
                <div>
                  <label className="block text-[11px] font-bold text-[#c58a4b] uppercase tracking-wider mb-1.5">
                    Descrição do que será feito <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Descreva detalhes, objetivos e links necessários..."
                    rows={3}
                    required
                    className="w-full px-3 py-2 rounded-xl bg-[#221c18] border border-[#3d342f] text-[#fcf8f5] placeholder-[#73655c] focus:outline-none focus:border-[#c58a4b]/50 leading-relaxed resize-none"
                  />
                </div>

                {/* 6. DATA E HORÁRIO */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#a89c93] uppercase tracking-wider mb-1.5">
                      Data Agendada <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formEndDate}
                      onChange={(e) => {
                        setFormEndDate(e.target.value);
                        setFormStartDate(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#221c18] border border-[#3d342f] text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]/50"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#a89c93] uppercase tracking-wider mb-1.5">
                      Horário Específico (Opcional)
                    </label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#221c18] border border-[#3d342f] text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]/50"
                    />
                  </div>
                </div>

                {/* 7. RESPONSÁVEL */}
                <div>
                  <label className="block text-[11px] font-bold text-[#a89c93] uppercase tracking-wider mb-1.5">
                    Responsável
                  </label>
                  <div className="relative">
                    <select
                      value={formResponsibleId}
                      onChange={(e) => {
                        const selId = e.target.value;
                        setFormResponsibleId(selId);
                        const member = teamMembers.find((m) => m.id === selId);
                        if (member) setFormResponsibleName(member.name);
                        else setFormResponsibleName('');
                      }}
                      className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#221c18] border border-[#3d342f] text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]/50 cursor-pointer"
                    >
                      <option value="">Selecione o responsável...</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} {member.roleTitle ? `(${member.roleTitle})` : ''}
                        </option>
                      ))}
                    </select>
                    <User className="w-4 h-4 text-[#73655c] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 px-6 border-t border-[#2d2520] flex items-center justify-between bg-[#161311]">
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-[#ded5cc] bg-[#221c18] border border-[#3d342f] hover:bg-[#2c241f] transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl text-xs font-bold text-[#12100e] bg-[#c58a4b] hover:bg-[#b0783d] transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingAction ? 'Salvar Alterações' : 'Agendar Ação'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
