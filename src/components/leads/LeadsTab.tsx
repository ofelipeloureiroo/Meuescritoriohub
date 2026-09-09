import React, { useState, useMemo } from 'react';
import {
  Plus,
  Users,
  TrendingUp,
  TrendingDown,
  Target,
  DollarSign,
  Kanban,
  List,
  Filter,
  Search,
  ChevronRight,
  X,
  AlertTriangle,
  Clock,
  Zap,
  Flame,
  Instagram,
  Globe,
  Share2,
  Phone,
  Mail,
  MapPin,
  Edit2,
  Trash2,
  BarChart3,
  CheckCircle2,
  XCircle,
  Building2,
  Sparkles,
  Info,
  ArrowUpDown,
  Bold,
  Italic,
  ListOrdered,
  Minus,
  ShieldCheck,
  Lightbulb,
  Calendar,
  GripVertical,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { Client } from '../../types';
import { LeadDetailsDrawer } from './LeadDetailsDrawer';
import { calculateLeadScore } from '../../utils/leadScoring';

export const LeadsTab: React.FC = () => {
  const { clients, addClient, updateClient, deleteClient, actions, officeSettings } = useFinance();
  const { teamMembers } = useTeamMembers();

  // Drawer state for Lead inspection
  const [drawerLead, setDrawerLead] = useState<Client | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // View state: 'pipeline' | 'analise'
  const [activeViewMode, setActiveViewMode] = useState<'pipeline' | 'analise'>('pipeline');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('30d');
  
  // Layout mode: 'kanban' | 'list'
  const [layoutMode, setLayoutMode] = useState<'kanban' | 'list'>('kanban');

  // Filter selection: 'todos' | 'vencida' | 'hoje' | 'sem_acao' | 'alta_prioridade'
  const [activeFilter, setActiveFilter] = useState<'todos' | 'vencida' | 'hoje' | 'sem_acao' | 'alta_prioridade'>('todos');

  // Drag and drop state
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Click-and-drag scroll for Kanban
  const kanbanScrollRef = React.useRef<HTMLDivElement>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('input') || (e.target as HTMLElement).closest('[draggable="true"]')) return;
    setIsMouseDown(true);
    setStartX(e.pageX - (kanbanScrollRef.current?.offsetLeft || 0));
    setScrollLeft(kanbanScrollRef.current?.scrollLeft || 0);
  };

  const handleMouseLeaveOrUp = () => {
    setIsMouseDown(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isMouseDown || !kanbanScrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - kanbanScrollRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    kanbanScrollRef.current.scrollLeft = scrollLeft - walk;
  };

  // Search & Score filter
  const [searchTerm, setSearchTerm] = useState('');
  const [scoreFilter, setScoreFilter] = useState<'todos' | 'frio' | 'morno' | 'quente'>('todos');
  const [isScoreFilterOpen, setIsScoreFilterOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Client | null>(null);

  // Modal Form State (Extended according to screenshot reference)
  const [formName, setFormName] = useState('');
  const [formCompany, setFormCompany] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formWhatsapp, setFormWhatsapp] = useState('');
  const [formInstagram, setFormInstagram] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formState, setFormState] = useState('SP');
  const [formCity, setFormCity] = useState('');
  const [formNeighborhood, setFormNeighborhood] = useState('');
  const [formProfession, setFormProfession] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formAcquisitionChannel, setFormAcquisitionChannel] = useState('');
  const [formDetailedOrigin, setFormDetailedOrigin] = useState('');

  // Project Info
  const [formProjectType, setFormProjectType] = useState('');
  const [formInternalCostEstimate, setFormInternalCostEstimate] = useState('');
  const [formUrgency, setFormUrgency] = useState('Média');
  const [formClientProfile, setFormClientProfile] = useState('Médio');
  const [formApproximateArea, setFormApproximateArea] = useState('');
  const [formDesiredStartDate, setFormDesiredStartDate] = useState('');
  const [formTalkedToOtherArchitect, setFormTalkedToOtherArchitect] = useState(false);

  // Proposals
  const [formProposalsList, setFormProposalsList] = useState<Array<{ id: string; title: string; value: number }>>([]);
  const [formProposalValue, setFormProposalValue] = useState('');
  const [showAddProposalInput, setShowAddProposalInput] = useState(false);
  const [newPropTitle, setNewPropTitle] = useState('');
  const [newPropVal, setNewPropVal] = useState('');

  // Pipeline
  const [formPipelineStage, setFormPipelineStage] = useState<'novo' | 'diagnostico' | 'proposta' | 'negociacao' | 'contratado' | 'perdido'>('novo');
  const [formSubStatus, setFormSubStatus] = useState('Nenhum');
  const [formEntryDate, setFormEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [formResponsibleName, setFormResponsibleName] = useState('');
  const [formNotes, setFormNotes] = useState('');

  // Follow-up
  const [formAutoFollowUp, setFormAutoFollowUp] = useState(false);

  // Extra Legacy/Scoring
  const [formLeadScore, setFormLeadScore] = useState<number>(50);
  const [formAutoScore, setFormAutoScore] = useState<boolean>(true);
  const [formBadgeText, setFormBadgeText] = useState<string>('');
  const [formIsHighPriority, setFormIsHighPriority] = useState<boolean>(false);

  // Live dynamic modal score calculation
  const liveModalScore = useMemo(() => {
    const parsedProposalVal = formProposalValue ? parseFloat(formProposalValue) : undefined;
    const parsedCostEstimate = formInternalCostEstimate ? parseFloat(formInternalCostEstimate) : undefined;
    return calculateLeadScore({
      serviceType: formProjectType || 'Projeto de Interiores',
      projectType: formProjectType || 'Projeto de Interiores',
      proposalValue: parsedProposalVal,
      internalCostEstimate: parsedCostEstimate,
      pipelineStage: formPipelineStage,
      urgency: formUrgency,
      clientProfile: formClientProfile,
      proposalsList: formProposalsList,
    });
  }, [
    formProjectType,
    formProposalValue,
    formInternalCostEstimate,
    formPipelineStage,
    formUrgency,
    formClientProfile,
    formProposalsList,
  ]);

  // Extract all leads from clients list (status === 'lead')
  const leadsList = useMemo(() => {
    return clients.filter((c) => c.status === 'lead');
  }, [clients]);

  // Today reference string
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const getStageLabel = (stageId?: string) => {
    if (!stageId) return 'Novo';
    const found = officeSettings?.leadStages?.find(s => s && s.id === stageId);
    if (found?.label) return found.label;
    switch (stageId.toLowerCase()) {
      case 'novo': return 'Novo';
      case 'diagnostico': return 'Diagnóstico';
      case 'proposta': return 'Proposta';
      case 'negociacao': return 'Negociação';
      case 'contratado': return 'Contratado';
      case 'perdido': return 'Perdido';
      default: return stageId.charAt(0).toUpperCase() + stageId.slice(1);
    }
  };

  // Strategic Priorities for the bottom section
  const strategicPriorities = useMemo(() => {
    const activeLeads = leadsList.filter(
      (l) => (l.pipelineStage || 'novo') !== 'perdido' && (l.pipelineStage || 'novo') !== 'contratado'
    );

    return [...activeLeads]
      .sort((a, b) => {
        if (a.isHighPriority && !b.isHighPriority) return -1;
        if (!a.isHighPriority && b.isHighPriority) return 1;
        const daysA = a.stoppedDays ?? 58;
        const daysB = b.stoppedDays ?? 58;
        if (daysB !== daysA) return daysB - daysA;
        return (b.leadScore ?? 50) - (a.leadScore ?? 50);
      })
      .slice(0, 8);
  }, [leadsList]);

  // Compute next action for each lead from actions context
  const getLeadNextActionStatus = (leadId: string) => {
    const leadActions = actions.filter(
      (a) => a.origin === 'Lead' && a.relatedId === leadId && a.status !== 'completed' && a.status !== 'cancelled'
    );
    if (leadActions.length === 0) return 'sem_acao';

    const hasOverdue = leadActions.some((a) => a.date < todayStr);
    if (hasOverdue) return 'vencida';

    const hasToday = leadActions.some((a) => a.date === todayStr);
    if (hasToday) return 'hoje';

    return 'futura';
  };

  // Filtered leads based on current filter, search & score
  const filteredLeads = useMemo(() => {
    return leadsList.filter((lead) => {
      // Search
      if (
        searchTerm.trim() &&
        !lead.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !lead.serviceType.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !(lead.company || '').toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      // Score filter
      const score = lead.leadScore || 50;
      if (scoreFilter === 'frio' && score >= 50) return false;
      if (scoreFilter === 'morno' && (score < 50 || score >= 70)) return false;
      if (scoreFilter === 'quente' && score < 70) return false;

      // Pill filter
      const actionStatus = getLeadNextActionStatus(lead.id);
      if (activeFilter === 'vencida' && actionStatus !== 'vencida') return false;
      if (activeFilter === 'hoje' && actionStatus !== 'hoje') return false;
      if (activeFilter === 'sem_acao' && actionStatus !== 'sem_acao') return false;
      if (activeFilter === 'alta_prioridade' && !lead.isHighPriority && (lead.leadScore || 0) < 60) return false;

      return true;
    });
  }, [leadsList, searchTerm, scoreFilter, activeFilter, actions, todayStr]);

  // Counts for Top Filters
  const counts = useMemo(() => {
    let overdue = 0;
    let today = 0;
    let semAcao = 0;
    let altaPrioridade = 0;

    leadsList.forEach((lead) => {
      const st = getLeadNextActionStatus(lead.id);
      if (st === 'vencida') overdue++;
      if (st === 'hoje') today++;
      if (st === 'sem_acao') semAcao++;
      if (lead.isHighPriority || (lead.leadScore || 0) >= 60) altaPrioridade++;
    });

    return {
      total: leadsList.length,
      overdue,
      today,
      semAcao,
      altaPrioridade,
    };
  }, [leadsList, actions, todayStr]);

  // Top Metrics calculation
  const metrics = useMemo(() => {
    const totalActive = leadsList.filter((l) => l.pipelineStage !== 'perdido').length;
    const totalContracted = leadsList.filter((l) => l.pipelineStage === 'contratado').length;
    const conversionRate = totalActive > 0 ? ((totalContracted / totalActive) * 100).toFixed(1) : '0.0';

    const totalPotentialValue = leadsList.reduce((acc, l) => {
      if (l.pipelineStage !== 'perdido') {
        return acc + (l.estimatedValue || 0);
      }
      return acc;
    }, 0);

    return {
      activeCount: totalActive,
      conversionRate: `${conversionRate}%`,
      potentialValue: totalPotentialValue,
    };
  }, [leadsList]);

  // Dynamic analytics calculations for Análise tab
  const analytics = useMemo(() => {
    const now = new Date();
    let daysToSubtract = 30;
    if (selectedPeriod === '60d') daysToSubtract = 60;
    if (selectedPeriod === '90d') daysToSubtract = 90;
    if (selectedPeriod === 'ano') daysToSubtract = 365;

    const cutoffTime = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);

    // Filter leads created in period
    const periodLeads = leadsList.filter((l) => {
      const leadDate = new Date(l.entryDate || l.createdAt || l.createdDate || todayStr);
      return leadDate >= cutoffTime;
    });

    const createdInPeriod = periodLeads.length;
    const proposalsSentInPeriod = periodLeads.filter(
      (l) => (l.proposals && l.proposals.length > 0) || l.pipelineStage === 'proposta' || l.pipelineStage === 'negociacao' || l.pipelineStage === 'contratado'
    ).length;
    const convertedInPeriod = periodLeads.filter((l) => l.pipelineStage === 'contratado').length;
    const lostInPeriod = periodLeads.filter((l) => l.pipelineStage === 'perdido').length;

    const conversionRatePeriod = createdInPeriod > 0 ? ((convertedInPeriod / createdInPeriod) * 100).toFixed(1) : '0.0';
    const lossRatePeriod = createdInPeriod > 0 ? ((lostInPeriod / createdInPeriod) * 100).toFixed(1) : '0.0';

    const closedWithValPeriod = periodLeads.filter((l) => l.pipelineStage === 'contratado' && (l.contractValue || l.estimatedValue || 0) > 0);
    const avgTicketPeriodVal = closedWithValPeriod.length > 0
      ? closedWithValPeriod.reduce((acc, l) => acc + (l.contractValue || l.estimatedValue || 0), 0) / closedWithValPeriod.length
      : 0;

    // Active leads in pipeline
    const activeLeads = leadsList.filter((l) => l.pipelineStage !== 'perdido' && l.pipelineStage !== 'contratado');
    const activeCount = activeLeads.length;
    const totalHistory = leadsList.length;

    const totalContractedOverall = leadsList.filter((l) => l.pipelineStage === 'contratado').length;
    const generalConversionRate = totalHistory > 0 ? ((totalContractedOverall / totalHistory) * 100).toFixed(1) : '0.0';

    const closedWithValOverall = leadsList.filter((l) => l.pipelineStage === 'contratado' && (l.contractValue || l.estimatedValue || 0) > 0);
    const avgTicketOverallVal = closedWithValOverall.length > 0
      ? closedWithValOverall.reduce((acc, l) => acc + (l.contractValue || l.estimatedValue || 0), 0) / closedWithValOverall.length
      : 0;

    // Potential Revenue across active leads
    const potentialRevenue = activeLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);

    // Average score across active leads
    const totalScore = activeLeads.reduce((acc, l) => acc + (l.leadScore || 50), 0);
    const avgScore = activeCount > 0 ? Math.round(totalScore / activeCount) : 0;

    // Commercial Alerts calculation
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // 1. Leads parados há mais de 3 dias
    const leadsStagnated = activeLeads.filter((l) => {
      const lastUpdate = new Date(l.updatedAt || l.entryDate || l.createdAt || todayStr);
      return lastUpdate < threeDaysAgo;
    });

    // 2. Propostas enviadas há mais de 5 dias sem retorno
    const proposalsStagnated = activeLeads.filter((l) => {
      if (l.pipelineStage !== 'proposta') return false;
      const lastUpdate = new Date(l.updatedAt || l.entryDate || l.createdAt || todayStr);
      return lastUpdate < fiveDaysAgo;
    });

    // 3. Negociações abertas há mais de 7 dias
    const negotiationsStagnated = activeLeads.filter((l) => {
      if (l.pipelineStage !== 'negociacao') return false;
      const lastUpdate = new Date(l.updatedAt || l.entryDate || l.createdAt || todayStr);
      return lastUpdate < sevenDaysAgo;
    });

    // Total alerts count
    const totalAlertsCount =
      (leadsStagnated.length > 0 ? 1 : 0) +
      (proposalsStagnated.length > 0 ? 1 : 0) +
      (negotiationsStagnated.length > 0 ? 1 : 0);

    // Stage counts
    const novoList = leadsList.filter((l) => l.pipelineStage === 'novo');
    const diagList = leadsList.filter((l) => l.pipelineStage === 'diagnostico');
    const propList = leadsList.filter((l) => l.pipelineStage === 'proposta');
    const negoList = leadsList.filter((l) => l.pipelineStage === 'negociacao');

    const diagStagnant = diagList.filter((l) => new Date(l.updatedAt || l.entryDate || l.createdAt || todayStr) < threeDaysAgo).length;
    const propStagnant = propList.filter((l) => new Date(l.updatedAt || l.entryDate || l.createdAt || todayStr) < threeDaysAgo).length;
    const negoStagnant = negoList.filter((l) => new Date(l.updatedAt || l.entryDate || l.createdAt || todayStr) < threeDaysAgo).length;

    // Stage Advancement Rates
    const totalNovo = novoList.length + diagList.length + propList.length + negoList.length + totalContractedOverall;
    const advNovoToDiag = totalNovo > 0 ? Math.min(100, Math.round(((totalNovo - novoList.length) / totalNovo) * 100)) : 0;

    const totalDiag = diagList.length + propList.length + negoList.length + totalContractedOverall;
    const advDiagToProp = totalDiag > 0 ? Math.min(100, Math.round(((totalDiag - diagList.length) / totalDiag) * 100)) : 0;

    const totalProp = propList.length + negoList.length + totalContractedOverall;
    const advPropToNego = totalProp > 0 ? Math.min(100, Math.round(((totalProp - propList.length) / totalProp) * 100)) : 0;

    const totalNego = negoList.length + totalContractedOverall;
    const advNegoToContr = totalNego > 0 ? Math.min(100, Math.round((totalContractedOverall / (totalNego || 1)) * 100)) : 0;

    // Healthy Pipeline Criteria
    const activeStagesCount = [novoList.length, diagList.length, propList.length, negoList.length].filter((c) => c > 0).length;
    const c1 = activeStagesCount >= 3;
    const c2 = propList.length > 0 || negoList.length > 0 || proposalsSentInPeriod > 0;
    const c3 = leadsStagnated.length === 0;
    const c4 = parseFloat(generalConversionRate) >= 20 || totalContractedOverall > 0;

    const healthCriteriaMet = [c1, c2, c3, c4].filter(Boolean).length;

    // Lost Reasons Map
    const lostLeads = periodLeads.filter((l) => l.pipelineStage === 'perdido');
    const lossReasonMap: Record<string, number> = {};
    lostLeads.forEach((l) => {
      const reason = l.lossReason || 'Sem motivo especificado';
      lossReasonMap[reason] = (lossReasonMap[reason] || 0) + 1;
    });

    // Date range string for badge
    const startDateStr = cutoffTime.toLocaleDateString('pt-BR');
    const endDateStr = now.toLocaleDateString('pt-BR');

    return {
      dateRangeLabel: `${startDateStr} – ${endDateStr}`,
      createdInPeriod,
      proposalsSentInPeriod,
      convertedInPeriod,
      lostInPeriod,
      conversionRatePeriod,
      lossRatePeriod,
      avgTicketPeriodVal,
      activeCount,
      totalHistory,
      generalConversionRate,
      avgTicketOverallVal,
      potentialRevenue,
      avgScore,
      leadsStagnated,
      proposalsStagnated,
      negotiationsStagnated,
      totalAlertsCount,
      stageCounts: {
        novo: novoList.length,
        diag: diagList.length,
        prop: propList.length,
        nego: negoList.length,
      },
      stageStagnant: {
        diag: diagStagnant,
        prop: propStagnant,
        nego: negoStagnant,
      },
      advancement: {
        novoToDiag: advNovoToDiag,
        diagToProp: advDiagToProp,
        propToNego: advPropToNego,
        negoToContr: advNegoToContr,
      },
      health: {
        metCount: healthCriteriaMet,
        c1,
        c2,
        c3,
        c4,
      },
      lostLeads,
      lossReasonMap,
    };
  }, [leadsList, selectedPeriod, todayStr]);

  // Stage columns definition
  const STAGES: Array<{ id: string; label: string; color?: string }> = useMemo(() => {
    if (officeSettings?.leadStages && Array.isArray(officeSettings.leadStages) && officeSettings.leadStages.length > 0) {
      return officeSettings.leadStages.map(stg => ({
        id: stg?.id || 'novo',
        label: (stg?.label || stg?.name || stg?.id || 'Novo').toUpperCase(),
        color: stg?.color,
      }));
    }
    return [
      { id: 'novo', label: 'NOVO' },
      { id: 'diagnostico', label: 'DIAGNÓSTICO' },
      { id: 'proposta', label: 'PROPOSTA' },
      { id: 'negociacao', label: 'NEGOCIAÇÃO' },
      { id: 'contratado', label: 'CONTRATADO' },
      { id: 'perdido', label: 'PERDIDO' },
    ];
  }, [officeSettings]);

  // Helper score color & label
  const getScoreInfo = (leadOrScore?: Client | number) => {
    if (leadOrScore && typeof leadOrScore === 'object') {
      const breakdown = calculateLeadScore(leadOrScore);
      return {
        score: breakdown.totalScore,
        label: `${breakdown.totalScore} ${breakdown.statusLabel.toUpperCase()}`,
        badgeClass: breakdown.badgeClass,
        status: breakdown.status,
        breakdown,
      };
    }
    const score = typeof leadOrScore === 'number' ? leadOrScore : 50;
    if (score >= 60) {
      return {
        score,
        label: `${score} LEAD QUENTE`,
        badgeClass: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
        status: 'quente',
      };
    }
    if (score >= 50) {
      return {
        score,
        label: `${score} LEAD MORNO`,
        badgeClass: 'bg-orange-500/10 text-orange-600 border-orange-500/30',
        status: 'morno',
      };
    }
    return {
      score,
      label: `${score} LEAD FRIO`,
      badgeClass: 'bg-zinc-100 text-zinc-600 border-zinc-200',
      status: 'frio',
    };
  };

  // Open drawer for lead details
  const handleOpenDrawer = (lead: Client) => {
    setDrawerLead(lead);
    setIsDrawerOpen(true);
  };

  // Convert lead directly from drawer
  const handleConvertFromDrawer = (lead: Client) => {
    updateClient(lead.id, {
      status: 'client',
      pipelineStage: 'contratado',
    });
    setIsDrawerOpen(false);
  };

  // Open modal to create lead
  const handleOpenCreate = () => {
    setEditingLead(null);
    setFormName('');
    setFormCompany('');
    setFormEmail('');
    setFormWhatsapp('');
    setFormInstagram('');
    setFormPhone('');
    setFormState('SP');
    setFormCity('');
    setFormNeighborhood('');
    setFormProfession('');
    setFormAddress('');
    setFormAcquisitionChannel('');
    setFormDetailedOrigin('');

    setFormProjectType('');
    setFormInternalCostEstimate('');
    setFormUrgency('Média');
    setFormClientProfile('Médio');
    setFormApproximateArea('');
    setFormDesiredStartDate('');
    setFormTalkedToOtherArchitect(false);

    setFormProposalsList([]);
    setFormProposalValue('');
    setShowAddProposalInput(false);
    setNewPropTitle('');
    setNewPropVal('');

    setFormPipelineStage('novo');
    setFormSubStatus('Nenhum');
    setFormEntryDate(new Date().toISOString().split('T')[0]);
    setFormResponsibleName('');
    setFormNotes('');

    setFormAutoFollowUp(false);
    setFormLeadScore(50);
    setFormAutoScore(true);
    setFormBadgeText('');
    setFormIsHighPriority(false);

    setIsModalOpen(true);
  };

  // Open modal to edit lead
  const handleOpenEdit = (lead: Client) => {
    setEditingLead(lead);
    setFormName(lead.name);
    setFormCompany(lead.company || '');
    setFormEmail(lead.email || '');
    setFormWhatsapp(lead.whatsapp || '');
    setFormInstagram(lead.instagram || '');
    setFormPhone(lead.phone || '');
    setFormState(lead.state || 'SP');
    setFormCity(lead.city || '');
    setFormNeighborhood(lead.neighborhood || '');
    setFormProfession(lead.profession || '');
    setFormAddress(lead.address || '');
    setFormAcquisitionChannel(lead.acquisitionChannel || lead.originChannel || '');
    setFormDetailedOrigin(lead.detailedOrigin || '');

    setFormProjectType(lead.projectType || lead.serviceType || '');
    setFormInternalCostEstimate(lead.internalCostEstimate ? lead.internalCostEstimate.toString() : '');
    setFormUrgency(lead.urgency || 'Média');
    setFormClientProfile(lead.clientProfile || 'Médio');
    setFormApproximateArea(lead.approximateArea ? lead.approximateArea.toString() : '');
    setFormDesiredStartDate(lead.desiredStartDate || '');
    setFormTalkedToOtherArchitect(lead.talkedToOtherArchitect || false);

    setFormProposalsList(lead.proposalsList || []);
    setFormProposalValue(lead.proposalValue ? lead.proposalValue.toString() : lead.estimatedValue ? lead.estimatedValue.toString() : '');
    setShowAddProposalInput(false);
    setNewPropTitle('');
    setNewPropVal('');

    setFormPipelineStage(lead.pipelineStage || 'novo');
    setFormSubStatus(lead.subStatus || 'Nenhum');
    setFormEntryDate(lead.entryDate || lead.createdAt || new Date().toISOString().split('T')[0]);
    setFormResponsibleName(lead.responsibleName || '');
    setFormNotes(lead.notes || '');

    setFormAutoFollowUp(lead.autoFollowUp || false);
    setFormLeadScore(lead.leadScore ?? calculateLeadScore(lead).totalScore);
    setFormAutoScore(true);
    setFormBadgeText(lead.badgeText || '');
    setFormIsHighPriority(lead.isHighPriority || false);

    setIsModalOpen(true);
  };

  // Add proposal helper
  const handleAddProposal = () => {
    if (!newPropTitle.trim()) return;
    const valNum = newPropVal ? parseFloat(newPropVal) : 0;
    const newProp = {
      id: Date.now().toString(),
      title: newPropTitle,
      value: valNum,
    };
    setFormProposalsList((prev) => [...prev, newProp]);
    setNewPropTitle('');
    setNewPropVal('');
    setShowAddProposalInput(false);
  };

  const handleRemoveProposal = (id: string) => {
    setFormProposalsList((prev) => prev.filter((p) => p.id !== id));
  };

  // Move lead stage
  const handleMoveStage = (leadId: string, newStage: Client['pipelineStage']) => {
    updateClient(leadId, { pipelineStage: newStage });
  };

  // Handle submit form
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const parsedProposalVal = formProposalValue ? parseFloat(formProposalValue) : undefined;
    const parsedCostEstimate = formInternalCostEstimate ? parseFloat(formInternalCostEstimate) : undefined;
    const parsedArea = formApproximateArea ? parseFloat(formApproximateArea) : undefined;

    const calculated = calculateLeadScore({
      serviceType: formProjectType || 'Projeto de Interiores',
      projectType: formProjectType || 'Projeto de Interiores',
      proposalValue: parsedProposalVal,
      internalCostEstimate: parsedCostEstimate,
      pipelineStage: formPipelineStage,
      urgency: formUrgency,
      clientProfile: formClientProfile,
      proposalsList: formProposalsList,
    });

    const finalLeadScore = formAutoScore ? calculated.totalScore : formLeadScore;

    const updatedData: Partial<Client> = {
      name: formName,
      company: formCompany || undefined,
      email: formEmail || undefined,
      whatsapp: formWhatsapp || undefined,
      instagram: formInstagram || undefined,
      phone: formPhone || undefined,
      state: formState,
      city: formCity,
      neighborhood: formNeighborhood || undefined,
      profession: formProfession || undefined,
      address: formAddress || undefined,
      acquisitionChannel: formAcquisitionChannel || undefined,
      originChannel: formAcquisitionChannel || 'Instagram',
      detailedOrigin: formDetailedOrigin || undefined,

      projectType: formProjectType || 'Projeto de Interiores',
      serviceType: formProjectType || 'Projeto de Interiores',
      internalCostEstimate: parsedCostEstimate,
      urgency: formUrgency,
      clientProfile: formClientProfile,
      approximateArea: parsedArea,
      desiredStartDate: formDesiredStartDate || undefined,
      talkedToOtherArchitect: formTalkedToOtherArchitect,

      proposalsList: formProposalsList,
      proposalValue: parsedProposalVal,
      estimatedValue: parsedProposalVal,

      pipelineStage: formPipelineStage,
      subStatus: formSubStatus,
      entryDate: formEntryDate,
      responsibleName: formResponsibleName || undefined,
      notes: formNotes || undefined,

      autoFollowUp: formAutoFollowUp,
      leadScore: finalLeadScore,
      badgeText: formBadgeText || undefined,
      isHighPriority: formIsHighPriority,
    };

    if (editingLead) {
      updateClient(editingLead.id, updatedData);
    } else {
      addClient({
        ...updatedData,
        name: formName,
        state: formState || 'SP',
        city: formCity || 'São Paulo',
        serviceType: formProjectType || 'Projeto de Interiores',
        totalBilled: 0,
        totalPaid: 0,
        pendingAmount: 0,
        status: 'lead',
        projectsCount: 0,
        createdAt: formEntryDate || new Date().toISOString().split('T')[0],
        stoppedDays: 0,
      } as Client);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6 pb-12 animate-fade-in text-zinc-900">
      {/* 1. Header & Primary View Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold font-serif tracking-tight text-[#fcf8f5]">
              Comercial
            </h1>
          </div>
          <p className="text-xs text-[#a89c93] mt-1">
            Pipeline com scoring estratégico de prioridade
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle: Pipeline | Análise */}
          <div className="p-1 rounded-2xl bg-[#1c1815] border border-[#3d342f] flex items-center gap-1">
            <button
              onClick={() => setActiveViewMode('pipeline')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeViewMode === 'pipeline'
                  ? 'bg-[#28221e] text-[#fcf8f5] shadow-sm'
                  : 'text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              Pipeline
            </button>
            <button
              onClick={() => setActiveViewMode('analise')}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeViewMode === 'analise'
                  ? 'bg-[#28221e] text-[#fcf8f5] shadow-sm'
                  : 'text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              Análise
            </button>
          </div>

          {/* New Lead Button */}
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-zinc-950 shadow-md transition-all cursor-pointer hover:brightness-110 active:scale-95"
            style={{
              backgroundColor: 'var(--theme-primary, #c8a97e)',
            }}
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Lead</span>
          </button>
        </div>
      </div>

      {/* 2. Metrics Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* LEADS ATIVOS */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              LEADS ATIVOS
            </span>
            <span className="text-3xl font-extrabold text-zinc-900 font-serif">
              {metrics.activeCount}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-500">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* CONVERSÃO */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              CONVERSÃO
            </span>
            <span className="text-3xl font-extrabold text-zinc-900 font-serif">
              {metrics.conversionRate}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* RECEITA POTENCIAL */}
        <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              RECEITA POTENCIAL
            </span>
            <span className="text-3xl font-extrabold text-zinc-900 font-serif">
              {metrics.potentialValue > 0
                ? `R$ ${metrics.potentialValue.toLocaleString('pt-BR')}`
                : 'R$ 0'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>
      </div>

      {activeViewMode === 'pipeline' ? (
        <>
          {/* 3. Filter Pills Row */}
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'todos', label: 'Todos', count: counts.total, icon: null },
              {
                id: 'vencida',
                label: 'Ação vencida',
                count: counts.overdue,
                icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />,
              },
              {
                id: 'hoje',
                label: 'Para hoje',
                count: counts.today,
                icon: <Clock className="w-3.5 h-3.5 text-amber-500" />,
              },
              {
                id: 'sem_acao',
                label: 'Sem próxima ação',
                count: counts.semAcao,
                icon: <Zap className="w-3.5 h-3.5 text-blue-500" />,
              },
              {
                id: 'alta_prioridade',
                label: 'Alta prioridade',
                count: counts.altaPrioridade,
                icon: <Flame className="w-3.5 h-3.5 text-orange-500" />,
              },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id as any)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap border transition-all cursor-pointer ${
                  activeFilter === f.id
                    ? 'bg-zinc-900 text-white border-zinc-900 shadow-sm'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300'
                }`}
              >
                {f.icon}
                <span>{f.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    activeFilter === f.id
                      ? 'bg-zinc-800 text-zinc-200'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* 4. Controls Bar: Kanban | Lista | Filtrar Score | Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Kanban vs Lista Toggle */}
              <div className="p-1 rounded-xl bg-white border border-zinc-200 flex items-center gap-1 shadow-xs">
                <button
                  onClick={() => setLayoutMode('kanban')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    layoutMode === 'kanban'
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <Kanban className="w-3.5 h-3.5" />
                  <span>Kanban</span>
                </button>
                <button
                  onClick={() => setLayoutMode('list')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    layoutMode === 'list'
                      ? 'bg-zinc-900 text-white shadow-xs'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Lista</span>
                </button>
              </div>

              {/* Filtrar Score Button */}
              <div className="relative">
                <button
                  onClick={() => setIsScoreFilterOpen(!isScoreFilterOpen)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white border transition-all cursor-pointer shadow-xs ${
                    scoreFilter !== 'todos'
                      ? 'border-amber-500 text-amber-700 bg-amber-50/50'
                      : 'border-zinc-200 text-zinc-700 hover:border-zinc-300'
                  }`}
                >
                  <Filter className="w-3.5 h-3.5" />
                  <span>
                    {scoreFilter === 'todos'
                      ? 'Filtrar Score'
                      : `Score: ${scoreFilter.toUpperCase()}`}
                  </span>
                </button>

                {isScoreFilterOpen && (
                  <div className="absolute left-0 mt-2 w-48 bg-white border border-zinc-200 rounded-2xl shadow-xl z-30 p-2 text-xs space-y-1">
                    {[
                      { id: 'todos', label: 'Todos os scores' },
                      { id: 'frio', label: '❄️ Lead Frio (< 50)' },
                      { id: 'morno', label: '🔥 Lead Morno (50 - 69)' },
                      { id: 'quente', label: '⚡ Lead Quente (70+)' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        onClick={() => {
                          setScoreFilter(opt.id as any);
                          setIsScoreFilterOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                          scoreFilter === opt.id
                            ? 'bg-zinc-900 text-white font-semibold'
                            : 'text-zinc-700 hover:bg-zinc-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar lead por nome ou serviço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-zinc-400 shadow-xs"
              />
            </div>
          </div>

          {/* 5. Kanban View Mode */}
          {layoutMode === 'kanban' ? (
            <div
              ref={kanbanScrollRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeaveOrUp}
              onMouseUp={handleMouseLeaveOrUp}
              onMouseMove={handleMouseMove}
              className="flex gap-3 overflow-x-auto pb-6 pt-2 items-start w-full no-scrollbar cursor-grab active:cursor-grabbing select-none"
            >
              {STAGES.map((stage) => {
                const columnLeads = filteredLeads.filter(
                  (l) => (l.pipelineStage || 'novo') === stage.id
                );
                const isOver = dragOverStageId === stage.id;

                return (
                  <div
                    key={stage.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverStageId !== stage.id) {
                        setDragOverStageId(stage.id);
                      }
                    }}
                    onDragEnter={(e) => {
                      e.preventDefault();
                      setDragOverStageId(stage.id);
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (dragOverStageId === stage.id) {
                        setDragOverStageId(null);
                      }
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const droppedLeadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
                      if (droppedLeadId) {
                        handleMoveStage(droppedLeadId, stage.id);
                      }
                      setDraggedLeadId(null);
                      setDragOverStageId(null);
                    }}
                    className={`rounded-2xl p-2.5 border flex flex-col min-h-[500px] min-w-[270px] w-[270px] shrink-0 transition-all duration-200 ${
                      isOver
                        ? 'bg-amber-500/10 border-amber-500 ring-2 ring-amber-500/30'
                        : 'bg-zinc-50/80 border-zinc-200/80 hover:border-zinc-300'
                    }`}
                  >
                    {/* Column Header */}
                    <div className="flex items-center justify-between px-2 py-1.5 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-zinc-700">
                          {stage.label}
                        </span>
                        <span className="text-[11px] font-bold text-zinc-400">
                          {columnLeads.length}
                        </span>
                        <button className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                          <Info className="w-3 h-3" />
                        </button>
                      </div>

                      <button className="text-zinc-400 hover:text-zinc-600 cursor-pointer">
                        <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Column Body / Cards List */}
                    <div className="space-y-3 flex-1 flex flex-col">
                      {columnLeads.length === 0 ? (
                        <div
                          className={`h-28 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-xs font-medium transition-all ${
                            isOver
                              ? 'border-amber-500 bg-amber-500/10 text-amber-700 scale-[1.02]'
                              : 'border-zinc-200 text-zinc-400'
                          }`}
                        >
                          {isOver ? (
                            <span>Soltar lead aqui</span>
                          ) : (
                            <span>Vazio</span>
                          )}
                        </div>
                      ) : (
                        <>
                          {columnLeads.map((lead) => {
                            const actionStatus = getLeadNextActionStatus(lead.id);
                            const scoreInfo = getScoreInfo(lead);
                            const isBeingDragged = draggedLeadId === lead.id;

                            return (
                              <div
                                key={lead.id}
                                draggable={true}
                                onDragStart={(e) => {
                                  e.stopPropagation();
                                  e.dataTransfer.setData('text/plain', lead.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                  setDraggedLeadId(lead.id);
                                }}
                                onDragEnd={() => {
                                  setDraggedLeadId(null);
                                  setDragOverStageId(null);
                                }}
                                onClick={() => {
                                  if (!draggedLeadId) {
                                    handleOpenDrawer(lead);
                                  }
                                }}
                                className={`bg-white rounded-2xl p-4 border shadow-xs transition-all space-y-3 relative group select-none cursor-grab active:cursor-grabbing ${
                                  isBeingDragged
                                    ? 'opacity-40 scale-95 border-amber-400 shadow-none ring-2 ring-amber-400/50'
                                    : 'border-zinc-200 hover:shadow-md hover:border-zinc-300'
                                }`}
                              >
                                {/* Top Action Badge & Grip */}
                                <div className="flex items-center justify-between gap-1">
                                  <div className="flex items-center gap-1">
                                    {actionStatus === 'sem_acao' && (
                                      <span className="text-[10px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md flex items-center gap-1">
                                        <Zap className="w-3 h-3 text-zinc-400" /> Sem próxima ação
                                      </span>
                                    )}
                                    {actionStatus === 'vencida' && (
                                      <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-rose-200">
                                        <AlertTriangle className="w-3 h-3 text-rose-500" /> Ação Vencida
                                      </span>
                                    )}
                                    {actionStatus === 'hoje' && (
                                      <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md flex items-center gap-1 border border-amber-200">
                                        <Clock className="w-3 h-3 text-amber-500" /> Ação Hoje
                                      </span>
                                    )}
                                  </div>

                                  <div
                                    className="text-zinc-300 group-hover:text-zinc-500 p-0.5 transition-colors"
                                    title="Segure e arraste para mover de coluna"
                                  >
                                    <GripVertical className="w-3.5 h-3.5" />
                                  </div>
                                </div>

                                {/* Title & Score */}
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <h4 className="text-sm font-bold text-zinc-900 leading-snug group-hover:text-amber-700 transition-colors">
                                      {lead.name}
                                    </h4>
                                    <p className="text-[11px] text-zinc-500 font-medium mt-0.5">
                                      {lead.serviceType || 'Projeto de Interiores'}
                                    </p>
                                  </div>

                                  {/* Score Pill */}
                                  <div
                                    className={`px-2 py-1 rounded-lg border text-[9px] font-bold text-center leading-tight whitespace-nowrap ${scoreInfo.badgeClass}`}
                                  >
                                    <div>{scoreInfo.score}</div>
                                    <div className="text-[8px] opacity-90">
                                      LEAD {scoreInfo.status.toUpperCase()}
                                    </div>
                                  </div>
                                </div>

                                {/* Value / Proposal */}
                                <div className="text-xs text-zinc-600">
                                  <span className="text-zinc-400 font-bold mr-1">R$</span>
                                  <span className="font-semibold text-zinc-800">
                                    {lead.proposalsText ? (
                                      lead.proposalsText
                                    ) : lead.estimatedValue ? (
                                      `R$ ${lead.estimatedValue.toLocaleString('pt-BR')}`
                                    ) : (
                                      <span className="text-zinc-400 italic">Orçamento não informado</span>
                                    )}
                                  </span>
                                </div>

                                {/* Substatus / Notes */}
                                {lead.subStatus && (
                                  <div className="text-[11px] text-zinc-600 flex items-center gap-1 font-medium">
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 inline-block" />
                                    <span>{lead.subStatus}</span>
                                  </div>
                                )}

                                {/* Days stopped indicator */}
                                <div className="text-[10px] font-semibold text-rose-500/90 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>Parado há {lead.stoppedDays || 58} dias</span>
                                </div>

                                {/* Extra Badge Button */}
                                {lead.badgeText && (
                                  <div>
                                    <span className={`inline-block text-[10px] font-semibold px-2.5 py-1 rounded-lg border ${
                                      lead.badgeText === 'Cliente pendente'
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-zinc-100 text-zinc-600 border-zinc-200'
                                    }`}>
                                      {lead.badgeText}
                                    </span>
                                  </div>
                                )}

                                {/* Bottom origin channel & trigger */}
                                <div className="pt-2 border-t border-zinc-100 flex items-center justify-between text-[11px] text-zinc-400">
                                  <span className="hover:text-zinc-600 transition-colors">
                                    {lead.originChannel || 'Instagram'}
                                  </span>
                                  <ChevronRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-600 transition-colors" />
                                </div>
                              </div>
                            );
                          })}

                          {/* Dropzone helper when hovering over a column with existing cards */}
                          {isOver && draggedLeadId && (
                            <div className="h-12 rounded-xl border-2 border-dashed border-amber-500/70 bg-amber-500/10 flex items-center justify-center text-[11px] font-semibold text-amber-700 transition-all">
                              Mover para {stage.label}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* 6. List View Mode */
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-zinc-700">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Lead</th>
                      <th className="px-4 py-3">Serviço</th>
                      <th className="px-4 py-3">Estágio</th>
                      <th className="px-4 py-3">Score</th>
                      <th className="px-4 py-3">Valor Estimado</th>
                      <th className="px-4 py-3">Origem</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                          Nenhum lead encontrado com os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead) => {
                        const scoreInfo = getScoreInfo(lead);
                        return (
                          <tr
                            key={lead.id}
                            className="hover:bg-zinc-50/80 transition-colors cursor-pointer"
                            onClick={() => handleOpenDrawer(lead)}
                          >
                            <td className="px-4 py-3 font-semibold text-zinc-900">
                              <div>{lead.name}</div>
                              {lead.company && (
                                <div className="text-[10px] text-zinc-400 font-normal">
                                  {lead.company}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 text-zinc-600">{lead.serviceType}</td>
                            <td className="px-4 py-3">
                              <span className="px-2 py-0.5 rounded-md bg-zinc-100 font-bold uppercase text-[10px] text-zinc-700">
                                {lead.pipelineStage || 'novo'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${scoreInfo.badgeClass}`}
                              >
                                {scoreInfo.score}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-zinc-800">
                              {lead.estimatedValue
                                ? `R$ ${lead.estimatedValue.toLocaleString('pt-BR')}`
                                : lead.proposalsText || 'Não informado'}
                            </td>
                            <td className="px-4 py-3 text-zinc-500">{lead.originChannel || 'Instagram'}</td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => handleOpenEdit(lead)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-100 mr-1"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => deleteClient(lead.id)}
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          {/* 7. Prioridades de Hoje — sugestão estratégica */}
          <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 shadow-xs mt-4">
            <div className="flex items-center gap-2 mb-3.5">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-zinc-700 bg-zinc-100 border border-zinc-200/80">
                <Target className="w-3.5 h-3.5 text-zinc-700" />
              </div>
              <h3 className="text-xs font-bold text-zinc-900 tracking-tight flex items-center gap-2">
                Prioridades de Hoje
                <span className="text-zinc-400 font-normal text-[11px]">
                  — sugestão estratégica
                </span>
              </h3>
            </div>

            {strategicPriorities.length === 0 ? (
              <div className="py-4 text-center text-xs text-zinc-400">
                Nenhum lead pendente de ação estratégica no momento.
              </div>
            ) : (
              <div className="flex items-stretch gap-3 overflow-x-auto pb-1.5 pt-0.5">
                {strategicPriorities.map((lead) => {
                  const daysStopped = lead.stoppedDays ?? 58;
                  return (
                    <div
                      key={lead.id}
                      onClick={() => handleOpenDrawer(lead)}
                      className="bg-white hover:bg-zinc-50/80 rounded-xl p-3.5 border border-zinc-200 shadow-2xs hover:shadow-xs hover:border-zinc-300 transition-all cursor-pointer min-w-[150px] sm:min-w-[170px] max-w-[210px] flex-1 flex flex-col justify-between group"
                    >
                      <div>
                        <h5 className="font-bold text-xs text-zinc-900 truncate group-hover:text-amber-700 transition-colors">
                          {lead.name}
                        </h5>
                        <div className="mt-1.5">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/80">
                            {daysStopped}d parado
                          </span>
                        </div>
                      </div>
                      <div className="mt-3 text-[11px] text-zinc-500 font-medium">
                        {getStageLabel(lead.pipelineStage)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      ) : (
        /* 7. Análise View Mode */
        <div className="space-y-8 animate-fade-in text-zinc-900">
          {/* Period Filter Row */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="appearance-none bg-white border border-zinc-200 rounded-xl px-4 py-2 pr-9 text-xs font-semibold text-zinc-800 shadow-xs hover:border-zinc-300 focus:outline-none cursor-pointer"
              >
                <option value="30d">📅 Últimos 30 dias</option>
                <option value="60d">📅 Últimos 60 dias</option>
                <option value="90d">📅 Últimos 90 dias</option>
                <option value="ano">📅 Este Ano</option>
              </select>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 absolute right-3 top-2.5 rotate-90 pointer-events-none" />
            </div>
            <span className="text-xs text-zinc-400 font-medium">
              {analytics.dateRangeLabel}
            </span>
          </div>

          {/* ================= SECTION 1: DESEMPENHO NO PERÍODO ================= */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                DESEMPENHO NO PERÍODO
              </h3>
            </div>

            {/* Row 1: Criados, Propostas Enviadas, Convertidos, Perdidos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* CRIADOS */}
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col justify-between h-32">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    CRIADOS
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">{analytics.createdInPeriod}</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">leads no período</p>
                </div>
              </div>

              {/* PROPOSTAS ENVIADAS */}
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col justify-between h-32">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Target className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    PROPOSTAS ENVIADAS
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">{analytics.proposalsSentInPeriod}</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">leads com proposta enviada</p>
                </div>
              </div>

              {/* CONVERTIDOS */}
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col justify-between h-32">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    CONVERTIDOS
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-emerald-600 tracking-tight">{analytics.convertedInPeriod}</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">leads convertidos no período</p>
                </div>
              </div>

              {/* PERDIDOS */}
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col justify-between h-32">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    PERDIDOS
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-rose-600 tracking-tight">{analytics.lostInPeriod}</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">no período</p>
                </div>
              </div>
            </div>

            {/* Row 2: Em Andamento, Taxa de Conversão, Taxa de Perda, Ticket Médio */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* EM ANDAMENTO */}
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col justify-between h-32">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    EM ANDAMENTO
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">{analytics.activeCount}</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">ativos no pipeline</p>
                </div>
              </div>

              {/* TAXA DE CONVERSÃO */}
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col justify-between h-32">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    TAXA DE CONVERSÃO
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">{analytics.conversionRatePeriod}%</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {analytics.createdInPeriod > 0 ? `${analytics.convertedInPeriod} de ${analytics.createdInPeriod} convertidos` : 'sem dados no período'}
                  </p>
                </div>
              </div>

              {/* TAXA DE PERDA */}
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col justify-between h-32">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                    <TrendingDown className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    TAXA DE PERDA
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">{analytics.lossRatePeriod}%</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {analytics.createdInPeriod > 0 ? `${analytics.lostInPeriod} de ${analytics.createdInPeriod} perdidos` : 'sem dados no período'}
                  </p>
                </div>
              </div>

              {/* TICKET MÉDIO */}
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col justify-between h-32">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    TICKET MÉDIO
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                    {analytics.avgTicketPeriodVal > 0 ? `R$${Math.round(analytics.avgTicketPeriodVal).toLocaleString('pt-BR')}` : '—'}
                  </span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {analytics.avgTicketPeriodVal > 0 ? 'média de conversões no período' : 'sem conversões no período'}
                  </p>
                </div>
              </div>
            </div>

            {/* Motivos de perda */}
            <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-6">
              <div>
                <h4 className="text-sm font-bold text-zinc-900">Motivos de perda</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  período selecionado · {analytics.lostInPeriod} leads perdidos
                </p>
              </div>

              {analytics.lostInPeriod === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-zinc-800">Nenhuma venda perdida neste período</p>
                  <p className="text-xs text-zinc-400">Continue assim!</p>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  {Object.entries(analytics.lossReasonMap).map(([reason, count]) => {
                    const cnt = count as number;
                    const pct = Math.round((cnt / (analytics.lostInPeriod || 1)) * 100);
                    return (
                      <div key={reason} className="space-y-1">
                        <div className="flex justify-between font-semibold text-zinc-800 text-[11px]">
                          <span>{reason}</span>
                          <span className="font-bold text-rose-600">{count} lead(s) ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className="h-full bg-rose-500 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ================= SECTION 2: SITUAÇÃO ATUAL DO PIPELINE ================= */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-zinc-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                SITUAÇÃO ATUAL DO PIPELINE
              </h3>
            </div>

            {/* Row 1: LEADS ATIVOS, CONVERSÃO GERAL, TICKET MÉDIO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* LEADS ATIVOS */}
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col justify-between h-32">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-500">
                    <Users className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    LEADS ATIVOS
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">{analytics.activeCount}</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">{analytics.totalHistory} total histórico</p>
                </div>
              </div>

              {/* CONVERSÃO GERAL */}
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col justify-between h-32">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    CONVERSÃO GERAL
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">{analytics.generalConversionRate}%</span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {leadsList.filter((l) => l.pipelineStage === 'contratado').length} de {analytics.totalHistory} fechados
                  </p>
                </div>
              </div>

              {/* TICKET MÉDIO */}
              <div className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col justify-between h-32">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    TICKET MÉDIO
                  </span>
                </div>
                <div>
                  <span className="text-3xl font-extrabold text-zinc-900 tracking-tight">
                    {analytics.avgTicketOverallVal > 0 ? `R$${Math.round(analytics.avgTicketOverallVal).toLocaleString('pt-BR')}` : '—'}
                  </span>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {analytics.avgTicketOverallVal > 0 ? 'histórico de fechamentos' : 'sem fechamentos'}
                  </p>
                </div>
              </div>
            </div>

            {/* Alertas Comerciais */}
            <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span>Alertas Comerciais</span>
                </h4>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  analytics.totalAlertsCount > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {analytics.totalAlertsCount}
                </span>
              </div>

              {analytics.totalAlertsCount === 0 ? (
                <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200/80 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-emerald-900">Seu pipeline está fluindo sem pendências!</p>
                    <p className="text-[11px] text-emerald-700">Não há alertas de estagnação ou atrasos no momento.</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Alert 1: Leads parados > 3 dias */}
                  {analytics.leadsStagnated.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#fffef0] border border-[#fef08a] space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-900 text-xs">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        <span>{analytics.leadsStagnated.length} lead(s) parado(s) há mais de 3 dias</span>
                      </div>
                      <p className="text-[11px] text-amber-900/80">
                        Leads sem movimentação recente perdem engajamento rapidamente.
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {analytics.leadsStagnated.map((lead) => (
                          <span
                            key={lead.id}
                            className="px-2.5 py-0.5 rounded-full bg-[#fee2e2] text-[#991b1b] text-[11px] font-semibold"
                          >
                            {lead.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alert 2: Propostas sem retorno > 5 dias */}
                  {analytics.proposalsStagnated.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#fef2f2] border border-[#fecdd3] space-y-2">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-900 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>{analytics.proposalsStagnated.length} proposta(s) enviada(s) há mais de 5 dias sem retorno</span>
                      </div>
                      <p className="text-[11px] text-rose-900/80">
                        Faça follow-up ativo para acelerar o fechamento.
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {analytics.proposalsStagnated.map((lead) => (
                          <span
                            key={lead.id}
                            className="px-2.5 py-0.5 rounded-full bg-[#fee2e2] text-[#991b1b] text-[11px] font-semibold"
                          >
                            {lead.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Alert 3: Negociações abertas > 7 dias */}
                  {analytics.negotiationsStagnated.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#fef2f2] border border-[#fecdd3] space-y-2 md:col-span-2">
                      <div className="flex items-center gap-1.5 font-bold text-zinc-900 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        <span>{analytics.negotiationsStagnated.length} negociação(ões) aberta(s) há mais de 7 dias</span>
                      </div>
                      <p className="text-[11px] text-rose-900/80">
                        Negociações sem avanço costumam ter objeções não mapeadas.
                      </p>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {analytics.negotiationsStagnated.map((lead) => (
                          <span
                            key={lead.id}
                            className="px-2.5 py-0.5 rounded-full bg-[#fee2e2] text-[#991b1b] text-[11px] font-semibold"
                          >
                            {lead.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Diagnóstico Comercial do Mês */}
            <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-6">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-zinc-600" />
                  <span>Diagnóstico Comercial</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">análise viva de pipeline</p>
              </div>

              {/* 4 Mini stats row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="p-3.5 rounded-xl bg-[#faf7f2] border border-[#f0e8dc]">
                  <span className="text-[11px] text-zinc-500 block">Leads Ativos</span>
                  <span className="text-xl font-bold text-zinc-900 block mt-0.5">{analytics.activeCount}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#faf7f2] border border-[#f0e8dc]">
                  <span className="text-[11px] text-zinc-500 block">Receita Potencial</span>
                  <span className="text-xl font-bold text-zinc-900 block mt-0.5">R${analytics.potentialRevenue.toLocaleString('pt-BR')}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#faf7f2] border border-[#f0e8dc]">
                  <span className="text-[11px] text-zinc-500 block">Tempo Médio</span>
                  <span className="text-xl font-bold text-zinc-900 block mt-0.5">
                    {analytics.activeCount > 0 ? '7d' : '—'}
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-[#faf7f2] border border-[#f0e8dc]">
                  <span className="text-[11px] text-zinc-500 block">Score Médio</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-bold text-zinc-900">{analytics.avgScore}</span>
                    <span className="text-[10px] text-zinc-400">apenas indicativo</span>
                  </div>
                </div>
              </div>

              {/* Taxa de avanço e Leads por etapa */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                {/* Left: TAXA DE AVANÇO POR ETAPA */}
                <div className="space-y-4">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    TAXA DE AVANÇO POR ETAPA
                  </h5>
                  <div className="space-y-3.5 text-xs">
                    {[
                      { stage: 'Novo → Diagnóstico', percent: analytics.advancement.novoToDiag },
                      { stage: 'Diagnóstico → Proposta', percent: analytics.advancement.diagToProp },
                      { stage: 'Proposta → Negociação', percent: analytics.advancement.propToNego },
                      { stage: 'Negociação → Contratado', percent: analytics.advancement.negoToContr },
                    ].map((item) => (
                      <div key={item.stage} className="space-y-1">
                        <div className="flex justify-between font-semibold text-zinc-800 text-[11px]">
                          <span>{item.stage}</span>
                          <span className="font-bold text-emerald-600">{item.percent}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${item.percent}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: LEADS POR ETAPA */}
                <div className="space-y-4">
                  <h5 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    LEADS POR ETAPA
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                        NOVO
                      </span>
                      <span className="text-2xl font-bold text-zinc-900 mt-1 block">{analytics.stageCounts.novo}</span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                        DIAGNÓSTICO
                      </span>
                      <span className="text-2xl font-bold text-zinc-900 mt-1 block">{analytics.stageCounts.diag}</span>
                      <p className="text-[10px] text-amber-700 font-medium mt-1">
                        <span className="font-bold">{analytics.stageStagnant.diag} estagnados</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                        PROPOSTA
                      </span>
                      <span className="text-2xl font-bold text-zinc-900 mt-1 block">{analytics.stageCounts.prop}</span>
                      <p className="text-[10px] text-amber-700 font-medium mt-1">
                        <span className="font-bold">{analytics.stageStagnant.prop} estagnados</span>
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                        NEGOCIAÇÃO
                      </span>
                      <span className="text-2xl font-bold text-zinc-900 mt-1 block">{analytics.stageCounts.nego}</span>
                      <p className="text-[10px] text-amber-700 font-medium mt-1">
                        <span className="font-bold">{analytics.stageStagnant.nego} estagnados</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pipeline Saudável */}
            <div className="bg-[#f0fdf4] rounded-2xl p-6 border border-[#bbf7d0] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Pipeline Saudável</span>
                  </h4>
                  <p className="text-xs text-emerald-800 font-medium mt-0.5">
                    {analytics.health.metCount} de 4 critérios atingidos
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${analytics.health.c1 ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${analytics.health.c2 ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${analytics.health.c3 ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                  <span className={`w-2.5 h-2.5 rounded-full inline-block ${analytics.health.c4 ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className={`p-3.5 rounded-xl bg-white border text-xs ${analytics.health.c1 ? 'border-[#bbf7d0]' : 'border-zinc-200'}`}>
                  <div className={`flex items-center gap-1.5 font-bold ${analytics.health.c1 ? 'text-emerald-700' : 'text-zinc-500'}`}>
                    {analytics.health.c1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                    <span>Leads em 3+ etapas</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Distribuição de etapas</p>
                </div>

                <div className={`p-3.5 rounded-xl bg-white border text-xs ${analytics.health.c2 ? 'border-[#bbf7d0]' : 'border-zinc-200'}`}>
                  <div className={`flex items-center gap-1.5 font-bold ${analytics.health.c2 ? 'text-emerald-700' : 'text-zinc-500'}`}>
                    {analytics.health.c2 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                    <span>Proposta enviada</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Presença de propostas ativas</p>
                </div>

                <div className={`p-3.5 rounded-xl bg-white border text-xs ${analytics.health.c3 ? 'border-[#bbf7d0]' : 'border-zinc-200'}`}>
                  <div className={`flex items-center gap-1.5 font-bold ${analytics.health.c3 ? 'text-emerald-700' : 'text-zinc-500'}`}>
                    {analytics.health.c3 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-rose-500" />}
                    <span>Tempo sem estagnação</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Leads sem paralisação</p>
                </div>

                <div className={`p-3.5 rounded-xl bg-white border text-xs ${analytics.health.c4 ? 'border-[#bbf7d0]' : 'border-zinc-200'}`}>
                  <div className={`flex items-center gap-1.5 font-bold ${analytics.health.c4 ? 'text-emerald-700' : 'text-zinc-500'}`}>
                    {analytics.health.c4 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5 text-zinc-500" />}
                    <span>Conversão &gt; 20%</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">Taxa atual: {analytics.generalConversionRate}%</p>
                </div>
              </div>
            </div>

            {/* Orientações Estratégicas */}
            <div className="bg-white rounded-2xl p-6 border border-zinc-200/80 shadow-xs space-y-4">
              <div>
                <h4 className="text-sm font-bold text-zinc-900 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  <span>Orientações Estratégicas</span>
                </h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  gerado automaticamente com base no seu pipeline
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-[#faf6f0] border border-[#f0e6d8] space-y-2">
                  <h5 className="font-bold text-xs text-zinc-900">
                    {analytics.proposalsStagnated.length > 0
                      ? `${analytics.proposalsStagnated.length} proposta(s) sem resposta há mais de 5 dias`
                      : 'Propostas com acompanhamento saudável'}
                  </h5>
                  <p className="text-[11px] text-zinc-600">
                    Propostas sem follow-up ativo perdem tração rapidamente.
                  </p>
                  <div className="pt-2 border-t border-[#eee2d0] text-[11px] text-zinc-800 font-medium flex items-start gap-1">
                    <span className="text-amber-700 font-bold">&gt;</span>
                    <span>
                      {analytics.proposalsStagnated.length > 0
                        ? 'Faça contato de acompanhamento direto. Pergunte quais pontos faltam para fechamento.'
                        : 'Mantenha o bom hábito de agendar o próximo passo no momento do envio da proposta.'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-[#faf6f0] border border-[#f0e6d8] space-y-2">
                  <h5 className="font-bold text-xs text-zinc-900">
                    {analytics.negotiationsStagnated.length > 0
                      ? `${analytics.negotiationsStagnated.length} negociação(ões) travada(s) há mais de 7 dias`
                      : 'Negociações em bom ritmo'}
                  </h5>
                  <p className="text-[11px] text-zinc-600">
                    {analytics.negotiationsStagnated.length > 0
                      ? `${analytics.negotiationsStagnated.length} lead(s) em negociação sem avanço recente.`
                      : 'Nenhuma negociação em atraso.'}
                  </p>
                  <div className="pt-2 border-t border-[#eee2d0] text-[11px] text-zinc-800 font-medium flex items-start gap-1">
                    <span className="text-amber-700 font-bold">&gt;</span>
                    <span>
                      Identifique a objeção principal (preço, prazo ou escopo) e ofereça opções claras de ajuste.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 8. Lead Modal (Create & Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white text-zinc-900 rounded-2xl shadow-2xl relative my-6 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="px-7 py-5 border-b border-zinc-200 flex items-center justify-between bg-white sticky top-0 z-10">
              <h3 className="text-xl font-bold text-zinc-900 tracking-tight">
                {editingLead ? 'Editar Lead' : 'Novo Lead'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-7 overflow-y-auto space-y-7 text-xs flex-1 text-zinc-800">
                {/* ---------------- SECTION 1: CONTATO ---------------- */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-zinc-900 tracking-tight border-b border-zinc-100 pb-2">
                    Contato
                  </h4>

                  {/* Nome */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Nome <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Nome do cliente/lead"
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                      required
                    />
                  </div>

                  {/* Email & Whatsapp */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="cliente@email.com"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        WhatsApp
                      </label>
                      <input
                        type="text"
                        value={formWhatsapp}
                        onChange={(e) => setFormWhatsapp(e.target.value)}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Instagram & Telefone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Instagram
                      </label>
                      <input
                        type="text"
                        value={formInstagram}
                        onChange={(e) => setFormInstagram(e.target.value)}
                        placeholder="@usuario"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Telefone
                      </label>
                      <input
                        type="text"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="(00) 0000-0000"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Cidade & Bairro */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Cidade
                      </label>
                      <input
                        type="text"
                        value={formCity}
                        onChange={(e) => setFormCity(e.target.value)}
                        placeholder="Ex: São Paulo"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Bairro
                      </label>
                      <input
                        type="text"
                        value={formNeighborhood}
                        onChange={(e) => setFormNeighborhood(e.target.value)}
                        placeholder="Ex: Jardins"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Profissão */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Profissão
                    </label>
                    <input
                      type="text"
                      value={formProfession}
                      onChange={(e) => setFormProfession(e.target.value)}
                      placeholder="Ex: Arquiteta, Médico..."
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                    />
                  </div>

                  {/* Endereço */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={formAddress}
                      onChange={(e) => setFormAddress(e.target.value)}
                      placeholder="Rua, número, complemento, bairro, cidade, CEP..."
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                    />
                  </div>

                  {/* Canal de Aquisição & Origem Detalhada */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Canal de Aquisição <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formAcquisitionChannel}
                        onChange={(e) => setFormAcquisitionChannel(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Indicação">Indicação</option>
                        <option value="Google Ads">Google Ads</option>
                        <option value="Site">Site</option>
                        <option value="WhatsApp">WhatsApp</option>
                        <option value="Evento">Evento</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Origem Detalhada
                      </label>
                      <input
                        type="text"
                        value={formDetailedOrigin}
                        onChange={(e) => setFormDetailedOrigin(e.target.value)}
                        placeholder="ex: Post específico, evento, amigo X"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* ---------------- SECTION 2: INFORMAÇÕES DO PROJETO ---------------- */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-sm font-bold text-zinc-900 tracking-tight border-b border-zinc-100 pb-2">
                    Informações do Projeto
                  </h4>

                  {/* Tipo de Projeto, Custo Interno, Urgência */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Tipo de Projeto
                      </label>
                      <select
                        value={formProjectType}
                        onChange={(e) => setFormProjectType(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs cursor-pointer"
                      >
                        <option value="">Selecione...</option>
                        <option value="Projeto de Interiores">Projeto de Interiores</option>
                        <option value="Arquitetônico">Arquitetônico</option>
                        <option value="Reforma">Reforma</option>
                        <option value="Consultoria">Consultoria</option>
                        <option value="Comercial">Comercial</option>
                        <option value="Paisagismo">Paisagismo</option>
                        <option value="Outro">Outro</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Valor Estimado de Custo Interno (R$)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formInternalCostEstimate}
                        onChange={(e) => setFormInternalCostEstimate(e.target.value)}
                        placeholder="0,00"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Urgência
                      </label>
                      <select
                        value={formUrgency}
                        onChange={(e) => setFormUrgency(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs cursor-pointer"
                      >
                        <option value="Baixa">Baixa</option>
                        <option value="Média">Média</option>
                        <option value="Alta">Alta</option>
                        <option value="Urgente">Urgente</option>
                      </select>
                    </div>
                  </div>

                  {/* Perfil, Metragem, Prazo */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Perfil do Cliente
                      </label>
                      <select
                        value={formClientProfile}
                        onChange={(e) => setFormClientProfile(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs cursor-pointer"
                      >
                        <option value="Econômico">Econômico</option>
                        <option value="Médio">Médio</option>
                        <option value="Alto Padrão">Alto Padrão</option>
                        <option value="Premium">Premium</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Metragem Aproximada (m²)
                      </label>
                      <input
                        type="number"
                        value={formApproximateArea}
                        onChange={(e) => setFormApproximateArea(e.target.value)}
                        placeholder="0"
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Prazo Desejado para Início
                      </label>
                      <input
                        type="date"
                        value={formDesiredStartDate}
                        onChange={(e) => setFormDesiredStartDate(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                      />
                    </div>
                  </div>

                  {/* Checkbox Conversou com outro arquiteto */}
                  <div className="pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-zinc-800 select-none">
                      <input
                        type="checkbox"
                        checked={formTalkedToOtherArchitect}
                        onChange={(e) => setFormTalkedToOtherArchitect(e.target.checked)}
                        className="w-4 h-4 rounded text-amber-700 border-zinc-300 focus:ring-amber-500 cursor-pointer"
                      />
                      <span>Já conversou com outro arquiteto</span>
                    </label>
                  </div>
                </div>

                {/* ---------------- SECTION 3: PROPOSTAS ---------------- */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <h4 className="text-sm font-bold text-zinc-900 tracking-tight">
                      Propostas
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowAddProposalInput(!showAddProposalInput)}
                      className="px-3 py-1 rounded-md text-xs font-semibold bg-[#faf5ee] border border-[#e5d8c8] text-[#8c7255] hover:bg-[#f3eae0] transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Adicionar</span>
                    </button>
                  </div>

                  {/* Inline Add Proposal Form */}
                  {showAddProposalInput && (
                    <div className="p-3 bg-[#faf7f2] border border-[#e8ded0] rounded-xl space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Título da proposta (ex: Opção A - Completa)"
                          value={newPropTitle}
                          onChange={(e) => setNewPropTitle(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs"
                        />
                        <input
                          type="number"
                          placeholder="Valor R$ (ex: 12000)"
                          value={newPropVal}
                          onChange={(e) => setNewPropVal(e.target.value)}
                          className="px-3 py-1.5 rounded-lg bg-white border border-zinc-300 text-xs"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddProposalInput(false)}
                          className="px-3 py-1 rounded-md text-xs text-zinc-600 bg-white border border-zinc-200"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleAddProposal}
                          className="px-3 py-1 rounded-md text-xs font-semibold text-white bg-[#c8a97e] hover:bg-[#b8986d]"
                        >
                          Salvar Proposta
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Propostas List or Empty Dashed Box */}
                  {formProposalsList.length === 0 ? (
                    <div className="border-2 border-dashed border-zinc-200 rounded-xl p-8 text-center bg-zinc-50/50">
                      <p className="text-sm font-semibold text-zinc-600">
                        Nenhuma proposta adicionada
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Clique em "Adicionar" para registrar propostas enviadas ao cliente
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {formProposalsList.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs"
                        >
                          <div>
                            <span className="font-semibold text-zinc-900 block">{p.title}</span>
                            <span className="text-zinc-500 font-medium">
                              R$ {p.value ? p.value.toLocaleString('pt-BR') : '0,00'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveProposal(p.id)}
                            className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Valor da Proposta input */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Valor da Proposta (R$) <span className="font-normal text-zinc-500">— ou use as propostas acima</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formProposalValue}
                      onChange={(e) => setFormProposalValue(e.target.value)}
                      placeholder="0,00"
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                    />
                  </div>
                </div>

                {/* ---------------- SECTION 3.5: SCORE AUTOMÁTICO INTELIGENTE ---------------- */}
                <div className="p-4 bg-[#faf7f2] border border-[#eee6dc] rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-white border border-[#e8ded0] flex items-center justify-center text-amber-600 shadow-2xs">
                        <Flame className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-zinc-900">Score Automático do Lead</h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200/80">
                            Dinâmico
                          </span>
                        </div>
                        <p className="text-[10px] text-zinc-500">
                          Calculado em tempo real por Tipo de Serviço ({formProjectType || 'Não selecionado'}) e Valor da Proposta
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <div className="text-right">
                        <div className="text-2xl font-black text-amber-800 leading-none">
                          {liveModalScore.totalScore}
                        </div>
                        <div className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">
                          de 100 pts
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${liveModalScore.badgeClass}`}>
                        {liveModalScore.statusLabel}
                      </span>
                    </div>
                  </div>

                  {/* Bars for Fechamento and Lucratividade */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-[#eee6dc]/80">
                    <div className="bg-white p-2.5 rounded-xl border border-zinc-200/80 shadow-2xs">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-zinc-700 mb-1">
                        <span>Probabilidade de Fechamento</span>
                        <span className="font-bold text-blue-600">{liveModalScore.fechamentoScore}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-300"
                          style={{ width: `${liveModalScore.fechamentoScore}%` }}
                        />
                      </div>
                    </div>

                    <div className="bg-white p-2.5 rounded-xl border border-zinc-200/80 shadow-2xs">
                      <div className="flex justify-between items-center text-[10px] font-semibold text-zinc-700 mb-1">
                        <span>Potencial de Lucratividade</span>
                        <span className="font-bold text-emerald-600">{liveModalScore.lucratividadeScore}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${liveModalScore.lucratividadeScore}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Factors Pill Breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded-lg bg-white/80 border border-zinc-200/60">
                      <span className="text-[10px] text-zinc-400 block font-medium">Tipo de Serviço</span>
                      <span className="font-bold text-amber-700">+{liveModalScore.factors.serviceType.points} pts</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/80 border border-zinc-200/60">
                      <span className="text-[10px] text-zinc-400 block font-medium">Valor Proposta</span>
                      <span className="font-bold text-emerald-700">+{liveModalScore.factors.proposalValue.points} pts</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/80 border border-zinc-200/60">
                      <span className="text-[10px] text-zinc-400 block font-medium">Etapa Pipeline</span>
                      <span className="font-bold text-blue-700">+{liveModalScore.factors.stage.points} pts</span>
                    </div>
                    <div className="p-2 rounded-lg bg-white/80 border border-zinc-200/60">
                      <span className="text-[10px] text-zinc-400 block font-medium">Perfil & Urgência</span>
                      <span className="font-bold text-purple-700">+{liveModalScore.factors.urgency.points + liveModalScore.factors.profile.points} pts</span>
                    </div>
                  </div>
                </div>

                {/* ---------------- SECTION 4: PIPELINE ---------------- */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-sm font-bold text-zinc-900 tracking-tight border-b border-zinc-100 pb-2">
                    Pipeline
                  </h4>

                  {/* Status, Substatus, Data de Entrada */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Status <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formPipelineStage}
                        onChange={(e) => setFormPipelineStage(e.target.value as any)}
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs cursor-pointer"
                      >
                        {STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Substatus
                      </label>
                      <select
                        value={formSubStatus}
                        onChange={(e) => setFormSubStatus(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs cursor-pointer"
                      >
                        <option value="Nenhum">Nenhum</option>
                        <option value="Diagnóstico agendado">Diagnóstico agendado</option>
                        <option value="Proposta em elaboração">Proposta em elaboração</option>
                        <option value="Aguardando retorno">Aguardando retorno</option>
                        <option value="Aguardando decisão">Aguardando decisão</option>
                        <option value="Em negociação">Em negociação</option>
                        <option value="Projeto iniciado">Projeto iniciado</option>
                        <option value="Contrato assinado">Contrato assinado</option>
                        <option value="Fechamento encaminhado">Fechamento encaminhado</option>
                        <option value="Perdido">Perdido</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 mb-1">
                        Data de Entrada <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formEntryDate}
                        onChange={(e) => setFormEntryDate(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs"
                        required
                      />
                    </div>
                  </div>

                  {/* Responsável */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Responsável
                    </label>
                    <select
                      value={formResponsibleName}
                      onChange={(e) => setFormResponsibleName(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-lg bg-white border border-zinc-300 text-zinc-800 text-xs focus:outline-none focus:border-zinc-500 shadow-xs cursor-pointer"
                    >
                      <option value="">Selecione...</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.name}>
                          {member.name}{member.roleTitle ? ` (${member.roleTitle})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Observações with Formatting Bar */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Observações
                    </label>

                    <div className="border border-zinc-300 rounded-lg overflow-hidden bg-white shadow-xs">
                      {/* Rich text formatting bar placeholder */}
                      <div className="flex items-center gap-1 p-1.5 border-b border-zinc-200 bg-zinc-50/80 text-zinc-600">
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-zinc-200 text-zinc-700 font-bold"
                          title="Negrito"
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-zinc-200 text-zinc-700 italic"
                          title="Itálico"
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-zinc-300 mx-1" />
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-zinc-200 text-zinc-700"
                          title="Lista com marcadores"
                        >
                          <List className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-zinc-200 text-zinc-700"
                          title="Lista numerada"
                        >
                          <ListOrdered className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-4 bg-zinc-300 mx-1" />
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-zinc-200 text-zinc-700"
                          title="Divisor"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="Preferências de contato, histórico, pontos de atenção..."
                        className="w-full p-3 text-xs text-zinc-800 focus:outline-none resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* ---------------- SECTION 5: FOLLOW-UP AUTOMÁTICO ---------------- */}
                <div className="space-y-3 pt-2">
                  <h4 className="text-sm font-bold text-zinc-900 tracking-tight border-b border-zinc-100 pb-2">
                    Follow-up Automático
                  </h4>

                  <div className="bg-[#faf7f2] border border-[#eee6dc] rounded-xl p-4 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-zinc-900 text-xs block">
                        Ativar follow-up recorrente
                      </span>
                      <span className="text-[11px] text-zinc-500 font-normal block mt-0.5">
                        Cria ações automáticas de acompanhamento no período definido
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormAutoFollowUp(!formAutoFollowUp)}
                      className={`w-11 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                        formAutoFollowUp ? 'bg-amber-600' : 'bg-zinc-300'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-xs transition-transform ${
                          formAutoFollowUp ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 px-7 border-t border-zinc-200 flex items-center justify-end gap-3 bg-white sticky bottom-0 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2 rounded-lg text-xs font-semibold text-zinc-700 bg-white border border-zinc-300 hover:bg-zinc-50 transition-all cursor-pointer shadow-xs"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="px-6 py-2 rounded-lg text-xs font-bold text-white shadow-sm transition-all cursor-pointer hover:brightness-110 active:scale-95 bg-[#c8a97e] hover:bg-[#b8986d]"
                >
                  {editingLead ? 'Salvar Lead' : 'Criar Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lead Details & Scoring Drawer */}
      <LeadDetailsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        lead={drawerLead}
        onEdit={(l) => {
          setIsDrawerOpen(false);
          handleOpenEdit(l);
        }}
        onConvert={handleConvertFromDrawer}
      />
    </div>
  );
};
