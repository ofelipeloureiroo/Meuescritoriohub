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
import { db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

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
  team_efficiency: true,
  projects: true,
  week_calendar: true,
  construction: true,
  crm_followup: true,
};

interface BusinessDashboardTabProps {
  onNavigateTab?: (tab: string) => void;
}

interface PieChartItem {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

interface SimplePieChartProps {
  data: PieChartItem[];
  metricLabel: string;
}

const SimplePieChart: React.FC<SimplePieChartProps> = ({ data, metricLabel }) => {
  const activeData = data.filter((d) => d.value > 0);

  if (activeData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-[var(--text-muted)] bg-[var(--bg-input)] rounded-2xl border border-dashed border-[var(--border-color)]">
        <Clock className="w-6 h-6 text-[var(--text-muted)] opacity-50 mb-2 animate-pulse" />
        <p className="text-xs font-semibold">Sem dados para exibir</p>
        <p className="text-[10px] text-[var(--text-muted)] mt-0.5">Registre horas trabalhadas nos projetos</p>
      </div>
    );
  }

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 p-4">
      {/* SVG Donut/Pie Chart */}
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 200 200" className="w-full h-full -rotate-90">
          {activeData.map((slice, idx) => {
            const startAngle = accumulatedPercent * 360;
            accumulatedPercent += slice.percentage / 100;
            const endAngle = accumulatedPercent * 360;

            const radius = 90;
            const center = 100;
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = (endAngle * Math.PI) / 180;

            const x1 = center + radius * Math.cos(startRad);
            const y1 = center + radius * Math.sin(startRad);
            const x2 = center + radius * Math.cos(endRad);
            const y2 = center + radius * Math.sin(endRad);

            const largeArcFlag = slice.percentage > 50 ? 1 : 0;

            // If a single slice is 100% or very close, render a simple circle to avoid path math issues
            if (slice.percentage >= 99.9) {
              return (
                <circle
                  key={idx}
                  cx="100"
                  cy="100"
                  r="90"
                  fill={slice.color}
                  className="transition-all duration-300 hover:scale-[1.02] origin-center"
                  style={{ transformOrigin: '100px 100px' }}
                />
              );
            }

            const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;

            return (
              <path
                key={idx}
                d={pathData}
                fill={slice.color}
                className="transition-all duration-300 hover:scale-[1.03] hover:opacity-95 origin-center cursor-pointer"
                style={{ transformOrigin: '100px 100px' }}
              />
            );
          })}
          {/* Inner cutout to make it a elegant Donut chart */}
          <circle cx="100" cy="100" r="48" fill="var(--bg-card)" />
        </svg>

        {/* Center Text inside Donut */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider leading-none">
            {metricLabel}
          </span>
          <span className="text-base font-bold text-[var(--text-main)] font-mono tracking-tight mt-1">
            {data.reduce((acc, curr) => acc + curr.value, 0).toFixed(0)}
          </span>
        </div>
      </div>

      {/* Legend Column */}
      <div className="flex-1 space-y-2 w-full">
        {data.map((item, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between text-xs py-1 border-b border-[var(--border-subtle)]/30 last:border-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="font-bold text-[var(--text-main)] truncate" title={item.name}>
                {item.name}
              </span>
            </div>
            <span className="font-mono text-[var(--text-muted)] font-semibold shrink-0 ml-2">
              {item.value.toFixed(0)} <span className="text-[10px] text-zinc-400">({item.percentage.toFixed(0)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

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
    timeEntries,
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

  // 2. Team Members & Project Allocations (Strictly real office team members)
  const [realMembers, setRealMembers] = useState<TeamMember[]>([]);
  const [allocationsMap, setAllocationsMap] = useState<Record<string, Partial<TeamProjectAllocation>>>(() => {
    try {
      const saved = localStorage.getItem('meu_escritorio_team_alloc_map_v1');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync real office team members
  useEffect(() => {
    const ownerMember: TeamMember = {
      id: user?.uid || 'member_owner',
      name: architectProfile?.name || profile?.companyName || user?.displayName || 'Administrador',
      email: user?.email || '',
      role: 'admin',
      roleTitle: architectProfile?.title || 'Arquiteto Titular / Gestor',
      initials: (architectProfile?.name || user?.displayName || user?.email || 'ME')
        .substring(0, 2)
        .toUpperCase(),
      color: '#c58a4b',
      isCurrentUser: true,
      status: 'active',
      accessibleModulesCount: 12,
      permissions: {
        today: true,
        actions: true,
        leads: true,
        projects: true,
        suppliers: true,
        team: true,
        clients: true,
        deadlines: true,
        finance: true,
        health: true,
        goals: true,
        budget: true,
      },
      joinedAt: new Date().toISOString().split('T')[0],
    };

    const currentList: TeamMember[] = [ownerMember];

    // Add collaborators from profile.collaborators if present
    if (profile?.collaborators && Array.isArray(profile.collaborators)) {
      profile.collaborators.forEach((collab) => {
        if (!collab.email) return;
        const exists = currentList.some(
          (m) => m.id === collab.uid || (m.email && m.email.toLowerCase() === collab.email.toLowerCase())
        );
        if (!exists) {
          currentList.push({
            id: collab.uid || `collab_${collab.email}`,
            name: collab.name || collab.email.split('@')[0],
            email: collab.email,
            roleTitle: collab.roleTitle || 'Membro Colaborador',
            role: 'member',
            initials: (collab.name || collab.email).substring(0, 2).toUpperCase(),
            color: '#8c7456',
            isCurrentUser: collab.uid === user?.uid,
            status: 'active',
            accessibleModulesCount: Object.values(collab.permissions || {}).filter(Boolean).length,
            permissions: {
              today: true,
              actions: true,
              leads: true,
              projects: true,
              suppliers: true,
              team: true,
              clients: true,
              deadlines: true,
              finance: false,
              health: false,
              goals: true,
              budget: false,
              ...(collab.permissions || {}),
            },
            joinedAt: collab.joinedAt || new Date().toISOString().split('T')[0],
          });
        }
      });
    }

    setRealMembers(currentList);

    // Also listen to users collection where joinedOwnerUid equals owner
    const ownerUid = user?.uid;
    if (!ownerUid) return;

    try {
      const q = query(collection(db, 'users'), where('joinedOwnerUid', '==', ownerUid));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setRealMembers((prev) => {
            const list = [...prev];
            snapshot.docs.forEach((docSnap) => {
              const uData = docSnap.data();
              const email = uData.email;
              if (!email) return;

              const existingIdx = list.findIndex(
                (m) => m.id === docSnap.id || (m.email && m.email.toLowerCase() === email.toLowerCase())
              );

              if (existingIdx >= 0) {
                list[existingIdx] = {
                  ...list[existingIdx],
                  id: docSnap.id,
                  email: email,
                  name: uData.name || email.split('@')[0],
                };
              } else {
                list.push({
                  id: docSnap.id,
                  name: uData.name || email.split('@')[0],
                  email: email,
                  roleTitle: uData.roleTitle || 'Membro Colaborador',
                  role: 'member',
                  initials: (uData.name || email).substring(0, 2).toUpperCase(),
                  color: '#4f7a61',
                  isCurrentUser: false,
                  status: 'active',
                  accessibleModulesCount: 8,
                  permissions: {
                    today: true,
                    actions: true,
                    leads: true,
                    projects: true,
                    suppliers: true,
                    team: true,
                    clients: true,
                    deadlines: true,
                    finance: false,
                    health: false,
                    goals: true,
                    budget: false,
                  },
                  joinedAt: uData.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
                });
              }
            });
            return list;
          });
        },
        (err) => {
          console.warn('Could not query team users from Firestore', err);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn('Firestore subscription error', e);
    }
  }, [user, profile, architectProfile]);

  // Derived team allocations based on real members
  const teamAllocations: TeamProjectAllocation[] = useMemo(() => {
    return realMembers.map((member) => {
      const saved = allocationsMap[member.id];
      const assignedProj = architectureProjects.find((p) => p.id === saved?.assignedProjectId);

      const firstActiveProj = architectureProjects.find((p) => p.status !== 'entregue');

      return {
        memberId: member.id,
        memberName: member.name,
        roleTitle: member.roleTitle || (member.role === 'admin' ? 'Administrador' : 'Colaborador'),
        initials: member.initials || member.name.substring(0, 2).toUpperCase(),
        color: member.color || '#c58a4b',
        assignedProjectId: saved?.assignedProjectId || assignedProj?.id,
        currentProjectTitle:
          saved?.currentProjectTitle ||
          assignedProj?.title ||
          (firstActiveProj ? firstActiveProj.title : 'Nenhum projeto vinculado'),
        currentStage:
          saved?.currentStage ||
          assignedProj?.currentStage ||
          assignedProj?.status ||
          'Em Desenvolvimento',
        taskDetail:
          saved?.taskDetail ||
          (assignedProj
            ? `Atuando no desenvolvimento de ${assignedProj.title}`
            : 'Clique em "Alterar Projeto" para vincular um projeto a este colaborador.'),
        deadline: saved?.deadline || assignedProj?.deliveryDate,
        lastUpdated: saved?.lastUpdated,
      };
    });
  }, [realMembers, allocationsMap, architectureProjects]);

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

    const newMap = {
      ...allocationsMap,
      [editingAllocation.memberId]: {
        assignedProjectId: selectedProjectId || undefined,
        currentProjectTitle: projectTitle || 'Geral do Escritório',
        currentStage: stage,
        taskDetail: customTaskDetail.trim() || 'Desenvolvimento de projetos do escritório',
        lastUpdated: new Date().toISOString(),
      },
    };

    setAllocationsMap(newMap);
    try {
      localStorage.setItem('meu_escritorio_team_alloc_map_v1', JSON.stringify(newMap));
    } catch (e) {
      console.warn('Could not save allocations map', e);
    }

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

  const [pieChartMetric, setPieChartMetric] = useState<'hours' | 'tasks'>('hours');

  // Calculate office-wide team efficiency analytics
  const teamEfficiencyAnalytics = useMemo(() => {
    let totalEstimated = 0;
    let totalRealized = 0;
    let totalTasksCount = 0;
    let completedTasksCount = 0;
    let onTimeTasksCount = 0;

    const memberStats: Record<string, {
      name: string;
      roleTitle: string;
      email: string;
      estimated: number;
      realized: number;
      completed: number;
      total: number;
      onTime: number;
      color: string;
    }> = {};

    const todayStr = new Date().toISOString().split('T')[0];

    // Helper to get or create member stats using EMAIL as primary key
    const getMemberStats = (email: string, fallbackName?: string) => {
      const emailLower = email.toLowerCase().trim();
      if (!memberStats[emailLower]) {
        const matchedMember = realMembers.find(m => (m.email || '').toLowerCase().trim() === emailLower);
        memberStats[emailLower] = {
          name: matchedMember?.name || fallbackName || email.split('@')[0] || 'Colaborador',
          email: emailLower,
          roleTitle: matchedMember?.roleTitle || 'Colaborador',
          estimated: 0,
          realized: 0,
          completed: 0,
          total: 0,
          onTime: 0,
          color: matchedMember?.color || '#a1a1aa',
        };
      }
      return memberStats[emailLower];
    };

    // Initialize with active real members only if they are the current user or have real email
    realMembers.forEach((m) => {
      if (!m.email) return;
      const mEmailClean = m.email.toLowerCase().trim();
      const isMasterEmail = mEmailClean.includes('master_escritorio') || mEmailClean === 'lfquadrosdecorativos@gmail.com';
      const currentUserEmail = (user?.email || '').toLowerCase().trim();
      
      if (isMasterEmail && currentUserEmail !== mEmailClean) {
        return;
      }
      // Only auto-initialize if it's the current user or they have an email that doesn't look like a placeholder
      if (mEmailClean.includes('@') && !mEmailClean.includes('contato@escritorio.com')) {
        getMemberStats(m.email, m.name);
      }
    });

    // 1. Accumulate Estimates and Task Counts from Projects
    architectureProjects.forEach((project) => {
      if (project.deletedAt) return;

      project.stages?.forEach((stage) => {
        stage.tasks?.forEach((task) => {
          const est = task.estimatedHours || 0;
          totalEstimated += est;
          totalTasksCount += 1;

          if (task.status === 'completed') {
            completedTasksCount += 1;
            if (!task.endDatePlanned || task.endDatePlanned >= todayStr) {
              onTimeTasksCount += 1;
            }
          }

          // Try to find responsible by email first
          const respName = (task.responsible || '').trim();
          const matchedMember = realMembers.find(m => m.name === respName);
          const respEmail = matchedMember?.email || (respName.includes('@') ? respName : 'equipe@geral.com');
          
          const stats = getMemberStats(respEmail, respName);
          
          stats.estimated += est;
          stats.total += 1;
          if (task.status === 'completed') {
            stats.completed += 1;
            if (!task.endDatePlanned || task.endDatePlanned >= todayStr) {
              stats.onTime += 1;
            }
          }
        });
      });
    });

    // 2. Accumulate Realized Hours from Time Tracker (THIS IS THE NEW CORE LOGIC)
    (timeEntries || []).forEach((entry) => {
      const hours = (entry.durationSeconds || 0) / 3600;
      totalRealized += hours;

      const respEmail = (entry.responsibleEmail || entry.responsibleName || 'equipe@geral.com').toLowerCase().trim();
      const stats = getMemberStats(respEmail, entry.responsibleName);
      stats.realized += hours;
    });

    const membersList = Object.values(memberStats)
      .filter(stats => {
        // Only show members who actually have assignments or logged time
        // OR the current user
        const isCurrentUser = stats.email === (user?.email || '').toLowerCase().trim();
        const hasData = stats.estimated > 0 || stats.realized > 0 || stats.total > 0;
        const isPlaceholder = stats.name.includes('---') || stats.email.includes('contato@escritorio.com');
        return (isCurrentUser || hasData) && !isPlaceholder;
      })
      .map((stats) => {
        // Efficiency fix: if realized is very low (e.g. seconds), don't show exploding percentages
        let efficiency = 0;
        if (stats.realized > 0.1) { // Only calculate if more than 6 minutes logged
          efficiency = Math.round((stats.estimated / stats.realized) * 100);
        } else if (stats.completed > 0) {
          efficiency = 100;
        }

        const onTimeRate = stats.completed > 0
          ? Math.round((stats.onTime / stats.completed) * 100)
          : 100;

        return {
          ...stats,
          efficiency,
          onTimeRate,
          balance: stats.estimated - stats.realized,
        };
      });

    // Overall efficiency fix
    let overallEfficiency = 0;
    if (totalRealized > 0.1) {
      overallEfficiency = Math.round((totalEstimated / totalRealized) * 100);
    } else if (completedTasksCount > 0) {
      overallEfficiency = 100;
    }

    const overallOnTimeRate = completedTasksCount > 0
      ? Math.round((onTimeTasksCount / completedTasksCount) * 100)
      : 100;

    return {
      totalEstimated: Math.round(totalEstimated),
      totalRealized: Math.round(totalRealized),
      totalTasksCount,
      completedTasksCount,
      overallEfficiency,
      overallOnTimeRate,
      members: membersList,
    };
  }, [architectureProjects, realMembers, user, timeEntries]);

  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300 font-sans">
      {/* ========================================================================= */}
      {/* HEADER: PAINEL DO ESCRITÓRIO */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[var(--bg-card)] p-5 sm:p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--theme-primary)]/15 border border-[var(--theme-primary)]/30 text-[var(--theme-primary)] flex items-center justify-center font-bold shadow-2xs">
              <LayoutDashboard className="w-4 h-4" />
            </div>
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[var(--text-main)] tracking-tight">
              Painel do Escritório
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-muted)] mt-1 flex items-center gap-2">
            <span>Visão Integrada de Projetos, Agenda, Equipe e Financeiro</span>
            <span className="inline-block w-1 h-1 rounded-full bg-[var(--text-muted)]" />
            <span className="text-[var(--theme-primary)] font-medium">Administração</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowCustomizeModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-secondary)] text-[var(--text-main)] border border-[var(--border-color)] text-xs font-semibold transition-all cursor-pointer shadow-2xs"
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
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card-secondary)]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">Financeiro de Hoje & Mês</h2>
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
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] cursor-pointer"
                title="Minimizar / Expandir"
              >
                {collapsedSections.finance ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!collapsedSections.finance && (
            <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: A Receber */}
              <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-emerald-900/30 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">↙ A receber hoje / mês</span>
                  <div className="w-6 h-6 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-emerald-400">
                    {formatCurrency(receivablesToday.total)}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {receivablesToday.installments.length} parcela(s) pendente(s)
                  </p>
                </div>
              </div>

              {/* Card 2: A Pagar */}
              <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-rose-900/30 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">↗ A pagar hoje / mês</span>
                  <div className="w-6 h-6 rounded-full bg-rose-500/15 flex items-center justify-center text-rose-400">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>
                <div>
                  <div className="text-xl font-bold text-rose-400">
                    {formatCurrency(payablesToday.total)}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                    {payablesToday.transactions.length} despesa(s) agendada(s)
                  </p>
                </div>
              </div>

              {/* Card 3: Receitas do Mês */}
              <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Receita Total do Mês</span>
                  <span className="text-[10px] font-bold text-[var(--theme-primary)] bg-[var(--theme-primary)]/10 px-2 py-0.5 rounded">
                    {selectedMonth}
                  </span>
                </div>
                <div>
                  <div className="text-xl font-bold text-[var(--text-main)]">
                    {formatCurrency(monthlyTotalIncome)}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Entradas confirmadas</p>
                </div>
              </div>

              {/* Card 4: Saldo Operacional */}
              <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Saldo do Mês</span>
                  <TrendingUp className="w-4 h-4 text-[var(--theme-primary)]" />
                </div>
                <div>
                  <div className={`text-xl font-bold ${monthlyBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatCurrency(monthlyBalance)}
                  </div>
                  <p className="text-[11px] text-[var(--text-muted)] mt-0.5">Despesas: {formatCurrency(monthlyTotalExpense)}</p>
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
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card-secondary)]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">Tarefas de Hoje (DO DIA)</h2>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-card-hover)] px-2.5 py-1 rounded-lg border border-[var(--border-color)]">
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
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] cursor-pointer"
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
                  className="flex-1 px-4 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--theme-primary)]"
                />
                <select
                  value={quickTaskCategory}
                  onChange={(e) => setQuickTaskCategory(e.target.value as any)}
                  className="px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none"
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
                  className="px-3 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none"
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
                <div className="divide-y divide-[var(--border-subtle)] border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-input)]">
                  {todayTasks.map((task) => {
                    const isDone = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        className="p-3 sm:p-3.5 flex items-center justify-between gap-3 hover:bg-[var(--bg-card-hover)] transition-colors"
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
                            className="cursor-pointer text-[var(--text-muted)] hover:text-[var(--theme-primary)] shrink-0"
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-400/20" />
                            ) : (
                              <Circle className="w-5 h-5" />
                            )}
                          </button>
                          <span
                            className={`text-xs sm:text-sm truncate ${
                              isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-main)] font-medium'
                            }`}
                          >
                            {task.description}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {task.type && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-card-hover)] text-[var(--text-muted)] border border-[var(--border-color)]">
                              {task.type}
                            </span>
                          )}
                          {task.area && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-card)] text-[var(--theme-primary)] border border-[var(--border-color)]">
                              {task.area}
                            </span>
                          )}
                          <button
                            onClick={() => deleteAppAction(task.id)}
                            className="p-1 text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
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
                <div className="py-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--border-color)] rounded-xl">
                  <CheckCircle2 className="w-6 h-6 opacity-40" />
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
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card-secondary)]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[var(--theme-primary)] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                  <span>Equipe & Projetos do Escritório</span>
                </h2>
                <p className="text-[11px] text-[var(--text-muted)]">Qual projeto cada integrante está desenvolvendo</p>
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
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] cursor-pointer"
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
                      className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] hover:border-[var(--theme-primary)]/40 transition-all flex flex-col justify-between space-y-3.5 group"
                    >
                      {/* Top: Member Info & Actions */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold text-black shrink-0 relative shadow-xs"
                            style={{ backgroundColor: member.color || '#c58a4b' }}
                          >
                            {member.initials}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-[var(--text-main)] truncate">{member.memberName}</h4>
                            <p className="text-xs text-[var(--text-muted)] truncate">{member.roleTitle}</p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleOpenEditAllocation(member)}
                          className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-secondary)] border border-[var(--border-color)] text-[11px] font-semibold text-[var(--theme-primary)] flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                          title="Alterar projeto deste integrante"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>Alterar Projeto</span>
                        </button>
                      </div>

                      {/* Project Details Box */}
                      <div className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider min-w-0">
                            <Layers className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{member.currentProjectTitle}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--theme-primary)]/15 text-[var(--theme-primary)] border border-[var(--theme-primary)]/30 shrink-0">
                            {member.currentStage}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-main)] font-medium leading-relaxed">{member.taskDetail}</p>
                        {linkedArchProj && (
                          <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                            <span>Cliente: <strong className="text-[var(--text-main)]">{linkedArchProj.clientName}</strong></span>
                            {linkedArchProj.deliveryDate && (
                              <span>Entrega: {formatDate(linkedArchProj.deliveryDate)}</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer: Quick Project Link */}
                      <div className="flex items-center justify-between text-xs pt-1 border-t border-[var(--border-subtle)]">
                        <span className="text-[var(--text-muted)] text-[11px]">
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

                {/* If there's only the owner or few members, provide a quick invite card */}
                {teamAllocations.length === 1 && (
                  <div className="p-5 rounded-2xl bg-[var(--bg-input)] border border-dashed border-[var(--border-color)] flex flex-col justify-between items-center text-center space-y-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 flex items-center justify-center">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[var(--text-main)]">Adicionar Membro à Equipe</h4>
                      <p className="text-xs text-[var(--text-muted)] mt-1 max-w-xs">
                        Convide estagiários, arquitetos parceiros ou coordenadores para gerenciar projetos juntos.
                      </p>
                    </div>
                    <button
                      onClick={() => handleNav('team')}
                      className="px-4 py-2 rounded-xl bg-[var(--theme-primary)] hover:opacity-90 text-black text-xs font-bold flex items-center gap-2 cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Convidar na Gestão de Equipe</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTOR: EFICIÊNCIA & PRODUTIVIDADE DA EQUIPE (PIE CHART) */}
      {/* ========================================================================= */}
      {sectorsConfig.team_efficiency && (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card-secondary)]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 text-[var(--theme-primary)] flex items-center justify-center">
                <Timer className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">Eficiência & Desempenho da Equipe</h2>
                <p className="text-[11px] text-[var(--text-muted)]">Indicadores de produtividade, saldo de horas e entregas no prazo</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleNav('team')}
                className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Gestão da Equipe</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => toggleSectionCollapse('team_efficiency')}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] cursor-pointer"
                title="Minimizar / Expandir"
              >
                {collapsedSections.team_efficiency ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {!collapsedSections.team_efficiency && (
            <div className="p-4 sm:p-6 space-y-6">
              {/* Core metrics overview cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)]">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Eficiência Média</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl sm:text-2xl font-bold text-[var(--text-main)] font-mono">
                      {teamEfficiencyAnalytics.overallEfficiency}%
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Horas estimadas vs trabalhadas</p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)]">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">Entregas no Prazo</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
                      {teamEfficiencyAnalytics.overallOnTimeRate}%
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Pontualidade nas tarefas concluídas</p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)]">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block font-sans">Tempo Trabalhado</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl sm:text-2xl font-bold text-[var(--text-main)] font-mono">
                      {teamEfficiencyAnalytics.totalRealized}h
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">/ {teamEfficiencyAnalytics.totalEstimated}h est.</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Soma de horas gastas em tarefas</p>
                </div>

                <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)]">
                  <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block font-sans">Tarefas Concluídas</span>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl sm:text-2xl font-bold text-[var(--text-main)] font-mono">
                      {teamEfficiencyAnalytics.completedTasksCount}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">/ {teamEfficiencyAnalytics.totalTasksCount} total</span>
                  </div>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">Fluxo de entrega da equipe</p>
                </div>
              </div>

              {/* Main content split: Pie Chart on Left, Leaderboard on Right */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                {/* Pie Chart Panel (5 cols) */}
                <div className="lg:col-span-5 p-5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                      {pieChartMetric === 'hours' ? 'Horas Trabalhadas' : 'Tarefas Concluídas'}
                    </h4>
                    
                    {/* Toggle Metric Button */}
                    <div className="flex items-center gap-1 bg-[var(--bg-card)] p-1 rounded-lg border border-[var(--border-color)]">
                      <button
                        onClick={() => setPieChartMetric('hours')}
                        className={`px-2 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                          pieChartMetric === 'hours'
                            ? 'bg-[var(--theme-primary)] text-black shadow-xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        Horas
                      </button>
                      <button
                        onClick={() => setPieChartMetric('tasks')}
                        className={`px-2 py-1 text-[10px] font-bold rounded transition-all cursor-pointer ${
                          pieChartMetric === 'tasks'
                            ? 'bg-[var(--theme-primary)] text-black shadow-xs'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        Tarefas
                      </button>
                    </div>
                  </div>

                  {/* Render SimplePieChart component */}
                  <SimplePieChart
                    data={teamEfficiencyAnalytics.members.map((m) => {
                      const totalValue = pieChartMetric === 'hours'
                        ? teamEfficiencyAnalytics.totalRealized
                        : teamEfficiencyAnalytics.completedTasksCount;

                      const val = pieChartMetric === 'hours' ? m.realized : m.completed;
                      const percentage = totalValue > 0 ? (val / totalValue) * 100 : 0;

                      return {
                        name: m.name,
                        value: val,
                        color: m.color,
                        percentage,
                      };
                    })}
                    metricLabel={pieChartMetric === 'hours' ? 'Horas' : 'Tarefas'}
                  />
                </div>

                {/* Leaderboard/Table Panel (7 cols) */}
                <div className="lg:col-span-7 p-5 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-color)] flex flex-col justify-between">
                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-[var(--text-main)] uppercase tracking-wider">
                      Desempenho Individual de Cada Integrante
                    </h4>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] font-semibold uppercase tracking-wider text-[10px] pb-2">
                            <th className="py-2 pr-2 col-span-2">Integrante</th>
                            <th className="py-2 px-2 text-center">Horas Realizadas</th>
                            <th className="py-2 px-2 text-center">Eficiência</th>
                            <th className="py-2 pl-2 text-center">Pontualidade</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-subtle)]/30">
                          {teamEfficiencyAnalytics.members.map((m, idx) => {
                            const isHighEfficiency = m.efficiency >= 100;
                            return (
                              <tr key={idx} className="hover:bg-[var(--bg-card-hover)]/30 transition-all">
                                <td className="py-3 pr-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-black shrink-0 shadow-xs"
                                      style={{ backgroundColor: m.color }}
                                    >
                                      {m.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div className="min-w-0">
                                      <p className="font-bold text-[var(--text-main)] truncate text-xs">{m.name}</p>
                                      <p className="text-[10px] text-[var(--text-muted)] truncate">{m.roleTitle}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3 px-2 text-center font-mono font-semibold text-[var(--text-main)]">
                                  {m.realized.toFixed(0)}h <span className="text-[10px] text-[var(--text-muted)]">/ {m.estimated.toFixed(0)}h</span>
                                </td>
                                <td className="py-3 px-2 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      isHighEfficiency
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                    }`}
                                  >
                                    {m.efficiency > 0 ? `${m.efficiency}%` : 'Apurando'}
                                  </span>
                                </td>
                                <td className="py-3 pl-2 text-center font-mono font-semibold text-emerald-400">
                                  {m.onTimeRate}%
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTOR 4: PROJETOS POR CATEGORIA DE PRAZO & STATUS */}
      {/* ========================================================================= */}
      {sectorsConfig.projects && (
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card-secondary)]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 text-[var(--theme-primary)] flex items-center justify-center">
                <FolderOpen className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">Projetos do Escritório</h2>
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
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] cursor-pointer"
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
                        : 'bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-secondary)] text-[var(--text-muted)] hover:text-[var(--text-main)] border border-[var(--border-color)]'
                    }`}
                  >
                    <span>{pill.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-md text-[10px] ${
                        projectFilter === pill.id ? 'bg-black/20 text-black font-bold' : 'bg-[var(--bg-card)] text-[var(--text-muted)]'
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
                      className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] hover:border-[var(--theme-primary)]/50 transition-all flex flex-col justify-between space-y-3 cursor-pointer group"
                    >
                      {/* Top */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate group-hover:text-[var(--theme-primary)] transition-colors">
                            {project.title}
                          </h4>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">{project.clientName || 'Cliente'}</p>
                        </div>

                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--theme-primary)]/15 text-[var(--theme-primary)] border border-[var(--theme-primary)]/30 shrink-0">
                          {project.status || 'Ativo'}
                        </span>
                      </div>

                      {/* Location & Honorários */}
                      <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                          <span className="truncate">{project.location || project.state || 'Brasil'}</span>
                        </span>
                        {project.honorarios ? (
                          <span className="font-semibold text-[var(--text-main)]">{formatCurrency(project.honorarios)}</span>
                        ) : null}
                      </div>

                      {/* Footer */}
                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                        <span>Prazo: {project.deliveryDate ? formatDate(project.deliveryDate) : 'A definir'}</span>
                        <span className="text-[var(--theme-primary)] font-semibold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          Ver projeto →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--border-color)] rounded-xl">
                  <FolderOpen className="w-6 h-6 opacity-40" />
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
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card-secondary)]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">Agenda da Semana (7 Dias)</h2>
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
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] cursor-pointer"
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
                          ? 'bg-[var(--theme-primary)]/15 border-[var(--theme-primary)] text-[var(--text-main)] shadow-xs'
                          : day.isToday
                          ? 'bg-[var(--bg-card-hover)] border-[var(--theme-primary)]/50 text-[var(--text-main)]'
                          : 'bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-color)]'
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

                      <div className="text-base font-bold text-[var(--text-main)]">{day.dayNum}</div>

                      <div className="text-[10px] text-[var(--text-muted)]">
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
              <div className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
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
                        className="p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400">
                            {act.time || '14:00'}
                          </span>
                          <span className="font-semibold text-[var(--text-main)]">{act.description}</span>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)]">{act.area || 'Operação'}</span>
                      </div>
                    ))}

                    {selectedDayItems.dayMilestones.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl bg-[var(--bg-card)] border border-amber-500/30 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400">
                            Entrega
                          </span>
                          <span className="font-semibold text-[var(--text-main)]">{m.title}</span>
                        </div>
                        <span className="text-[11px] text-[var(--text-muted)]">{m.projectTitle}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-6 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-1.5">
                    <Calendar className="w-5 h-5 opacity-40" />
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
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card-secondary)]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-600/10 border border-amber-600/20 text-amber-500 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">Obras em Andamento</h2>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs text-[var(--text-muted)]">{ongoingConstructions.length} em andamento</span>
              <button
                onClick={() => toggleSectionCollapse('construction')}
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] cursor-pointer"
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
                      className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] hover:border-amber-500/40 transition-all cursor-pointer space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs sm:text-sm font-bold text-[var(--text-main)] truncate">{obra.title}</h4>
                          <p className="text-[11px] text-[var(--text-muted)] truncate">{obra.clientName || 'Cliente'}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                          Em Obra
                        </span>
                      </div>

                      {obra.description && (
                        <p className="text-xs text-[var(--text-muted)] line-clamp-2">{obra.description}</p>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] pt-1 border-t border-[var(--border-subtle)]">
                        <span>Prazo: {obra.deliveryDate ? formatDate(obra.deliveryDate) : 'Acompanhamento'}</span>
                        <span className="text-amber-400 font-semibold">Ver detalhes →</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--border-color)] rounded-xl">
                  <Building2 className="w-6 h-6 opacity-40" />
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
        <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-card-secondary)]/50">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-teal-500/10 border border-teal-500/20 text-teal-400 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-main)]">CRM — Leads & Oportunidades</h2>
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
                className="p-1 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card-hover)] cursor-pointer"
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
                        className="p-4 rounded-2xl bg-[var(--bg-input)] border border-[var(--border-subtle)] hover:border-teal-500/40 transition-all flex flex-col justify-between space-y-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-xs sm:text-sm font-bold text-[var(--text-main)]">{lead.name}</h4>
                            <p className="text-[11px] text-[var(--text-muted)]">{lead.serviceType || lead.projectType || 'Projeto de Arquitetura'}</p>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-500/15 text-teal-400 border border-teal-500/30">
                            {lead.pipelineStage || 'Em Contato'}
                          </span>
                        </div>

                        {lead.estimatedValue ? (
                          <div className="text-xs text-[var(--text-main)]">
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
                <div className="py-8 text-center text-xs text-[var(--text-muted)] flex flex-col items-center justify-center gap-2 border border-dashed border-[var(--border-color)] rounded-xl">
                  <Users className="w-6 h-6 opacity-40" />
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
          <div className="bg-[var(--bg-card)] text-[var(--text-main)] w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl border border-[var(--border-color)] flex flex-col">
            <div className="p-5 bg-[var(--bg-card-secondary)] border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sliders className="w-5 h-5 text-[var(--theme-primary)]" />
                <h3 className="text-base font-bold text-[var(--text-main)]">Personalizar Setores do Painel</h3>
              </div>
              <button
                onClick={() => setShowCustomizeModal(false)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3">
              <p className="text-xs text-[var(--text-muted)] mb-4">
                Selecione os blocos e setores que deseja visualizar no Painel do Escritório:
              </p>

              {[
                { key: 'finance', label: 'Financeiro de Hoje (A receber / A pagar)', icon: DollarSign },
                { key: 'tasks', label: 'Tarefas de Hoje (DO DIA)', icon: CheckCircle2 },
                { key: 'team_activity', label: 'Equipe & Projetos do Escritório', icon: Users },
                { key: 'team_efficiency', label: 'Eficiência & Produtividade da Equipe', icon: Timer },
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
                        ? 'bg-[var(--bg-card-hover)] border-[var(--theme-primary)]/50 text-[var(--text-main)]'
                        : 'bg-[var(--bg-input)] border-[var(--border-subtle)] text-[var(--text-muted)]'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <ItemIcon className={`w-4 h-4 ${isChecked ? 'text-[var(--theme-primary)]' : 'text-[var(--text-muted)]'}`} />
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

            <div className="p-4 bg-[var(--bg-card-secondary)] border-t border-[var(--border-color)] flex justify-end">
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
          <div className="bg-[var(--bg-card)] text-[var(--text-main)] w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-[var(--border-color)] flex flex-col">
            <div className="p-5 bg-[var(--bg-card-secondary)] border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-black"
                  style={{ backgroundColor: editingAllocation.color || '#c58a4b' }}
                >
                  {editingAllocation.initials}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-main)]">{editingAllocation.memberName}</h3>
                  <p className="text-[10px] text-[var(--text-muted)]">{editingAllocation.roleTitle}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingAllocation(null)}
                className="p-1 text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Select from existing office projects */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)]">Selecionar Projeto do Escritório</label>
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
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)]"
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
                <label className="text-xs font-bold text-[var(--text-muted)]">Nome do Projeto</label>
                <input
                  type="text"
                  value={customProjectTitle}
                  onChange={(e) => setCustomProjectTitle(e.target.value)}
                  placeholder="Ex: Residência Alphaville - Suíte Master"
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)]">Etapa / Fase Atual</label>
                <input
                  type="text"
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value)}
                  placeholder="Ex: Projeto Executivo, Modelagem 3D, Detalhamento..."
                  className="w-full px-3.5 py-2.5 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-muted)]">Atividade / Tarefa Específica</label>
                <textarea
                  rows={3}
                  value={customTaskDetail}
                  onChange={(e) => setCustomTaskDetail(e.target.value)}
                  placeholder="Ex: Modelagem 3D da cozinha e detalhamento de marcenaria"
                  className="w-full p-3 bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl text-xs text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)]"
                />
              </div>
            </div>

            <div className="p-4 bg-[var(--bg-card-secondary)] border-t border-[var(--border-color)] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingAllocation(null)}
                className="px-4 py-2 border border-[var(--border-color)] bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs font-bold rounded-xl cursor-pointer"
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
