import React, { useState } from 'react';
import {
  Briefcase,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  DollarSign,
  Edit2,
  Eye,
  FileText,
  Filter,
  FolderPlus,
  Layers,
  MapPin,
  Percent,
  Plus,
  Search,
  Settings,
  TrendingUp,
  AlertCircle,
  CheckSquare,
  CreditCard,
  User,
  Users,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ArchitectureProject, ProjectInstallment, ProjectMilestone } from '../../types';
import { DEFAULT_PROJECT_STAGES } from '../../data/defaultProjectStages';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { NICHES } from '../../utils/theme';
import { AddProjectModal } from '../modals/AddProjectModal';
import { NewContractModal } from '../contracts/NewContractModal';
import { ProjectDetailModal } from '../modals/ProjectDetailModal';
import { ProjectWorkspaceView } from '../projects/ProjectWorkspaceView';

interface ProjectsManagementTabProps {
  onNavigateTab: (tab: string) => void;
}

export const ProjectsManagementTab: React.FC<ProjectsManagementTabProps> = ({
  onNavigateTab,
}) => {
  const {
    architectProfile,
    architectureProjects,
    projectInstallments,
    projectMilestones,
    addProjectMilestone,
    toggleProjectMilestone,
    deleteProjectMilestone,
    addProjectInstallment,
    receiveInstallmentPayment,
    deleteProjectInstallment,
    bankAccounts,
  } = useFinance();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isNewContractModalOpen, setIsNewContractModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ArchitectureProject | null>(null);
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<ArchitectureProject | null>(null);

  // Mini-form state for quick milestones inside cards
  const [activeAddingMilestoneProjectId, setActiveAddingMilestoneProjectId] = useState<string | null>(null);
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneStage, setNewMilestoneStage] = useState<'briefing' | 'estudo_preliminar' | 'anteprojeto' | 'executivo' | 'obra' | 'entregue'>('estudo_preliminar');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
  const [newMilestonePriority, setNewMilestonePriority] = useState<'baixa' | 'media' | 'alta' | 'urgente'>('media');

  // Mini-form state for quick installments inside cards
  const [activeAddingInstallmentProjectId, setActiveAddingInstallmentProjectId] = useState<string | null>(null);
  const [newInstallmentDesc, setNewInstallmentDesc] = useState('');
  const [newInstallmentAmount, setNewInstallmentAmount] = useState('');
  const [newInstallmentDueDate, setNewInstallmentDueDate] = useState('');

  const currentNiche = NICHES[architectProfile.niche || 'arquitetura'] || NICHES.outro;
  const statusOptions = currentNiche.statusOptions;
  const categoryOptions = currentNiche.categories.filter(c => c.id !== 'all' && c.id !== 'antes_depois');

  // Filter projects
  const filteredProjects = architectureProjects.filter((p) => {
    const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' ? true : p.category === categoryFilter;
    const query = searchQuery.toLowerCase();
    const titleMatch = (p.title || '').toLowerCase().includes(query);
    const clientMatch = (p.clientName || '').toLowerCase().includes(query);
    const locationMatch = (p.location || '').toLowerCase().includes(query);
    const matchesSearch = titleMatch || clientMatch || locationMatch;

    return matchesStatus && matchesCategory && matchesSearch;
  });

  // Financial Stats for Management
  const totalContractedAmount = architectureProjects.reduce((sum, p) => sum + (p.honorarios || 0), 0);
  const activeProjectsCount = architectureProjects.filter(p => p.status !== 'entregue').length;
  
  // Calculate paid & pending amounts
  const totalPaidAmount = projectInstallments
    .filter(inst => inst.status === 'paid')
    .reduce((sum, inst) => sum + (inst.paidAmount || inst.amount), 0);

  const totalPendingAmount = projectInstallments
    .filter(inst => inst.status === 'pending' || inst.status === 'overdue')
    .reduce((sum, inst) => sum + inst.amount, 0);

  const handleOpenAddProject = () => {
    setIsNewContractModalOpen(true);
  };

  const handleOpenEditProject = (project: ArchitectureProject, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setIsAddModalOpen(true);
  };

  const handleAddQuickMilestone = (projectId: string, clientName: string, clientPhone?: string) => {
    if (!newMilestoneTitle.trim() || !newMilestoneDueDate) return;
    const project = architectureProjects.find(p => p.id === projectId);
    if (!project) return;

    addProjectMilestone({
      projectId,
      projectTitle: project.title,
      clientName,
      clientPhone,
      title: newMilestoneTitle.trim(),
      stage: newMilestoneStage,
      dueDate: newMilestoneDueDate,
      completed: false,
      priority: newMilestonePriority,
    });

    setNewMilestoneTitle('');
    setNewMilestoneDueDate('');
    setActiveAddingMilestoneProjectId(null);
  };

  const handleAddQuickInstallment = (projectId: string, clientName: string, clientPhone?: string) => {
    const numAmount = parseFloat(newInstallmentAmount) || 0;
    if (!newInstallmentDesc.trim() || numAmount <= 0 || !newInstallmentDueDate) return;
    const project = architectureProjects.find(p => p.id === projectId);
    if (!project) return;

    // Determine current installment count
    const existing = projectInstallments.filter(i => i.projectId === projectId);
    const nextNumber = existing.length + 1;

    addProjectInstallment({
      projectId,
      projectTitle: project.title,
      clientName,
      clientPhone,
      installmentNumber: nextNumber,
      totalInstallments: nextNumber, // simplified
      description: newInstallmentDesc.trim(),
      amount: numAmount,
      dueDate: newInstallmentDueDate,
      status: 'pending',
    });

    setNewInstallmentDesc('');
    setNewInstallmentAmount('');
    setNewInstallmentDueDate('');
    setActiveAddingInstallmentProjectId(null);
  };

  const handleMarkInstallmentAsPaid = (installmentId: string) => {
    const defaultBankId = bankAccounts[0]?.id || 'bank-principal';
    const today = new Date().toISOString().split('T')[0];
    receiveInstallmentPayment(installmentId, defaultBankId, today);
  };

  // Dedicated Project Workspace View when a project is clicked
  const activeDetailProject = selectedProjectForDetail
    ? architectureProjects.find((p) => p.id === selectedProjectForDetail.id) || selectedProjectForDetail
    : null;

  if (activeDetailProject) {
    return (
      <div className="w-full">
        <ProjectWorkspaceView
          project={activeDetailProject}
          onBack={() => setSelectedProjectForDetail(null)}
          onEdit={(p) => {
            setEditingProject(p);
            setIsAddModalOpen(true);
          }}
        />

        <AddProjectModal
          isOpen={isAddModalOpen}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingProject(null);
          }}
          initialProject={editingProject}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Upper Dashboard Ribbon */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-[#fcf8f5]">Gestão Operacional de Projetos</h2>
          <p className="text-xs text-[#a89c93]">Acompanhamento de etapas físicas, marcos de entrega e recebimentos financeiros de cada contrato ativo.</p>
        </div>
        <button
          onClick={handleOpenAddProject}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-black bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] transition-all cursor-pointer shadow-md self-stretch sm:self-auto text-center justify-center active:scale-95"
        >
          <FolderPlus className="w-4 h-4" />
          <span>Cadastrar Novo Projeto</span>
        </button>
      </div>

      {/* Grid of operational stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1c1815] border border-[#3d342f] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/15">
            <Layers className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#a89c93] block">Projetos Ativos</span>
            <span className="text-xl font-serif font-bold text-[#fcf8f5]">{activeProjectsCount} contratos</span>
          </div>
        </div>

        <div className="bg-[#1c1815] border border-[#3d342f] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/15">
            <DollarSign className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#a89c93] block">Valor Contratado</span>
            <span className="text-xl font-serif font-bold text-amber-300">{formatCurrency(totalContractedAmount)}</span>
          </div>
        </div>

        <div className="bg-[#1c1815] border border-[#3d342f] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/15">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#a89c93] block">Total Recebido</span>
            <span className="text-xl font-serif font-bold text-emerald-400">{formatCurrency(totalPaidAmount)}</span>
          </div>
        </div>

        <div className="bg-[#1c1815] border border-[#3d342f] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/15">
            <TrendingUp className="w-5 h-5 text-rose-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#a89c93] block">A Receber / Saldo</span>
            <span className="text-xl font-serif font-bold text-rose-400">{formatCurrency(totalPendingAmount)}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1c1815] border border-[#3d342f] rounded-2xl p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#a89c93] w-4 h-4" />
          <input
            type="text"
            placeholder="Buscar por projeto, cliente ou UF..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3.5 py-2 rounded-xl bg-[#14110f] border border-[#3d342f] text-sm text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
          />
        </div>

        {/* Filters Selects */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-xs text-[#a89c93]">
            <Filter className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
            <span>Filtros:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#14110f] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none cursor-pointer"
          >
            <option value="all">Todas as Etapas</option>
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-[#14110f] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none cursor-pointer"
          >
            <option value="all">Categorias (Todas)</option>
            {categoryOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects Management Catalog */}
      {filteredProjects.length === 0 ? (
        <div className="bg-[#1c1815] border border-[#3d342f] rounded-2xl p-12 text-center space-y-4">
          <Layers className="w-12 h-12 text-[#a89c93] mx-auto opacity-35" />
          <div>
            <h3 className="font-serif font-bold text-lg text-[#fcf8f5]">Nenhum projeto encontrado</h3>
            <p className="text-xs text-[#a89c93] max-w-md mx-auto mt-1">Nenhum contrato ativo corresponde aos termos pesquisados ou aos filtros selecionados.</p>
          </div>
          <button
            onClick={() => {
              setSearchQuery('');
              setStatusFilter('all');
              setCategoryFilter('all');
            }}
            className="px-4 py-2 rounded-xl text-xs bg-[#241e1b] border border-[#3d342f] text-[#fcf8f5] hover:bg-[#3d342f]/40 transition-all cursor-pointer"
          >
            Limpar Filtros de Busca
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {filteredProjects.map((p) => {
            const projectMils = projectMilestones.filter(m => m.projectId === p.id);
            const projectInsts = projectInstallments.filter(i => i.projectId === p.id);
            
            // Calculate progress percentage based on schedule/cronograma tasks + milestones
            const pStages = (p.stages && p.stages.length > 0) ? p.stages : DEFAULT_PROJECT_STAGES;
            const stageTasks = pStages.flatMap(s => s.tasks || []);
            const stageTasksTotal = stageTasks.length;
            const stageTasksCompleted = stageTasks.filter(t => t.status === 'completed').length;

            const milsTotal = projectMils.length;
            const milsCompleted = projectMils.filter(m => m.completed).length;

            const totalItems = stageTasksTotal + milsTotal;
            const completedCount = stageTasksCompleted + milsCompleted;

            const progressPercent = totalItems > 0 
              ? Math.round((completedCount / totalItems) * 100) 
              : 0;

            const stageLabel = statusOptions.find(o => o.value === p.status)?.label || p.status;

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProjectForDetail(p)}
                className="bg-[#1c1815] border border-[#3d342f] hover:border-[var(--theme-primary)]/45 rounded-2xl p-5 shadow-sm transition-all cursor-pointer space-y-4 flex flex-col group"
              >
                {/* Card Top: Title, status, actions */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-primary)] px-2 py-0.5 rounded-full bg-[var(--theme-badge-bg)] border border-[var(--theme-badge-border)]">
                        {p.category.toUpperCase().replace('_', ' ')}
                      </span>
                      {p.areaM2 && (
                        <span className="text-[10px] font-medium text-[#a89c93]">
                          {p.areaM2} m²
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-serif font-bold text-[#fcf8f5] group-hover:text-[var(--theme-primary)] transition-colors mt-1.5 truncate">
                      {p.title}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-[#a89c93] mt-1">
                      <User className="w-3.5 h-3.5 text-[#d49454]" />
                      <span className="truncate">{p.clientName}</span>
                      {p.location && (
                        <>
                          <span className="mx-1">•</span>
                          <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                          <span className="truncate">{p.location}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 shrink-0" onClick={e => e.stopPropagation()}>
                    {/* Cover photo thumbnail */}
                    {p.coverImage ? (
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-[#3d342f] shadow-sm bg-[#12100e]">
                        <img
                          src={p.coverImage}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleOpenEditProject(p, e)}
                        className="w-16 h-16 rounded-xl border border-dashed border-[#3d342f] hover:border-[var(--theme-primary)] flex flex-col items-center justify-center text-[#a89c93] hover:text-[#fcf8f5] transition-colors bg-[#14110f]/40 group/img cursor-pointer"
                        title="Adicionar foto do projeto"
                      >
                        <Camera className="w-4 h-4 text-[#a89c93] group-hover/img:text-[var(--theme-primary)]" />
                        <span className="text-[9px] mt-0.5 font-medium">Foto</span>
                      </button>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={(e) => handleOpenEditProject(p, e)}
                        className="p-1.5 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#241e1b] border border-[#3d342f] transition-colors cursor-pointer"
                        title="Editar dados"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setSelectedProjectForDetail(p)}
                        className="p-1.5 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#241e1b] border border-[#3d342f] transition-colors cursor-pointer"
                        title="Visualizar Detalhes"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar and milestone stats */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a89c93] font-medium">Progresso das Entregas (Cronograma & Marcos)</span>
                    <span className="font-bold text-[#fcf8f5] flex items-center gap-1">
                      {progressPercent}% <span className="text-[10px] text-[#a89c93]">({completedCount}/{totalItems})</span>
                    </span>
                  </div>
                  <div className="w-full bg-[#14110f] h-2 rounded-full overflow-hidden border border-[#3d342f]">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-accent)] transition-all duration-500 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Status Timeline representation */}
                <div className="grid grid-cols-5 gap-1 pt-1">
                  {['briefing', 'estudo_preliminar', 'anteprojeto', 'executivo', 'obra'].map((stg) => {
                    const stagesOrder = ['briefing', 'estudo_preliminar', 'anteprojeto', 'executivo', 'obra', 'entregue'];
                    const currentIdx = stagesOrder.indexOf(p.status);
                    const cellIdx = stagesOrder.indexOf(stg);
                    const isCompleted = cellIdx < currentIdx;
                    const isActive = p.status === stg;
                    
                    return (
                      <div key={stg} className="text-center space-y-1">
                        <div
                          className={`h-1.5 rounded-full border transition-all ${
                            isCompleted 
                              ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' 
                              : isActive 
                              ? 'bg-[var(--theme-primary)]/20 border-[var(--theme-primary)]/40' 
                              : 'bg-[#14110f] border-[#3d342f]'
                          }`}
                        />
                        <span className={`text-[9px] uppercase tracking-wider font-bold block truncate ${isActive ? 'text-[var(--theme-primary)]' : 'text-[#a89c93]'}`}>
                          {stg.replace('_', ' ')}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Operational Details Grid: Sub-milestones & Installments */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-[#3d342f]/60">
                  
                  {/* Milestones / Deadlines section */}
                  <div className="space-y-2.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#fcf8f5] flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        Prazos & Entregas
                      </span>
                      <button
                        onClick={() => {
                          setActiveAddingMilestoneProjectId(activeAddingMilestoneProjectId === p.id ? null : p.id);
                          setNewMilestoneTitle('');
                        }}
                        className="text-[10px] font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        + Adicionar
                      </button>
                    </div>

                    {activeAddingMilestoneProjectId === p.id && (
                      <div className="bg-[#14110f] border border-[#3d342f] rounded-xl p-2.5 space-y-2">
                        <input
                          type="text"
                          placeholder="Nome do prazo (ex: Entrega 3D)"
                          value={newMilestoneTitle}
                          onChange={(e) => setNewMilestoneTitle(e.target.value)}
                          className="w-full bg-[#1c1815] border border-[#3d342f] rounded-lg px-2 py-1 text-xs text-[#fcf8f5] focus:outline-none"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="date"
                            value={newMilestoneDueDate}
                            onChange={(e) => setNewMilestoneDueDate(e.target.value)}
                            className="bg-[#1c1815] border border-[#3d342f] rounded-lg px-2 py-1 text-[10px] text-[#fcf8f5] focus:outline-none cursor-pointer"
                          />
                          <select
                            value={newMilestoneStage}
                            onChange={(e) => setNewMilestoneStage(e.target.value as any)}
                            className="bg-[#1c1815] border border-[#3d342f] rounded-lg px-1.5 py-1 text-[10px] text-[#fcf8f5] focus:outline-none cursor-pointer"
                          >
                            <option value="estudo_preliminar">Estudo Prel.</option>
                            <option value="anteprojeto">Anteprojeto</option>
                            <option value="executivo">Executivo</option>
                            <option value="obra">Obra / Acomp.</option>
                          </select>
                        </div>
                        <button
                          onClick={() => handleAddQuickMilestone(p.id, p.clientName, p.clientPhone)}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-1 rounded-lg text-[10px] transition-colors"
                        >
                          Confirmar Prazo
                        </button>
                      </div>
                    )}

                    {projectMils.length === 0 ? (
                      stageTasksCompleted > 0 ? (
                        <div className="flex items-center justify-between p-2 bg-[#14110f]/60 border border-emerald-500/20 rounded-xl text-[11px]">
                          <span className="text-emerald-400 font-medium flex items-center gap-1.5">
                            <CheckSquare className="w-3.5 h-3.5" />
                            Cronograma: {stageTasksCompleted}/{stageTasksTotal} tarefas concluídas
                          </span>
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#a89c93] italic">Nenhum prazo cadastrado.</p>
                      )
                    ) : (
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                        {projectMils.map((m) => (
                          <div key={m.id} className="flex items-center justify-between gap-2 p-1.5 bg-[#14110f]/40 border border-[#3d342f]/40 rounded-xl text-[11px]">
                            <button
                              onClick={() => toggleProjectMilestone(m.id)}
                              className="flex items-start gap-1.5 text-left flex-1"
                            >
                              <CheckSquare className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${m.completed ? 'text-emerald-400' : 'text-[#a89c93]'}`} />
                              <span className={m.completed ? 'line-through text-[#a89c93]' : 'text-[#fcf8f5] font-medium'}>
                                {m.title}
                              </span>
                            </button>
                            <span className="text-[10px] text-[#a89c93] whitespace-nowrap">
                              {formatDate(m.dueDate)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Installments & Finances section */}
                  <div className="space-y-2.5" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#fcf8f5] flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                        Finanças & Cobranças
                      </span>
                      <button
                        onClick={() => {
                          setActiveAddingInstallmentProjectId(activeAddingInstallmentProjectId === p.id ? null : p.id);
                          setNewInstallmentDesc('');
                          setNewInstallmentAmount('');
                        }}
                        className="text-[10px] font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-0.5 cursor-pointer"
                      >
                        + Adicionar
                      </button>
                    </div>

                    {activeAddingInstallmentProjectId === p.id && (
                      <div className="bg-[#14110f] border border-[#3d342f] rounded-xl p-2.5 space-y-2">
                        <input
                          type="text"
                          placeholder="Descrição (ex: Parcela 2)"
                          value={newInstallmentDesc}
                          onChange={(e) => setNewInstallmentDesc(e.target.value)}
                          className="w-full bg-[#1c1815] border border-[#3d342f] rounded-lg px-2 py-1 text-xs text-[#fcf8f5] focus:outline-none"
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="number"
                            placeholder="Valor (R$)"
                            value={newInstallmentAmount}
                            onChange={(e) => setNewInstallmentAmount(e.target.value)}
                            className="bg-[#1c1815] border border-[#3d342f] rounded-lg px-2 py-1 text-[10px] text-[#fcf8f5] focus:outline-none"
                          />
                          <input
                            type="date"
                            value={newInstallmentDueDate}
                            onChange={(e) => setNewInstallmentDueDate(e.target.value)}
                            className="bg-[#1c1815] border border-[#3d342f] rounded-lg px-2 py-1 text-[10px] text-[#fcf8f5] focus:outline-none cursor-pointer"
                          />
                        </div>
                        <button
                          onClick={() => handleAddQuickInstallment(p.id, p.clientName, p.clientPhone)}
                          className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-1 rounded-lg text-[10px] transition-colors"
                        >
                          Confirmar Cobrança
                        </button>
                      </div>
                    )}

                    {projectInsts.length === 0 ? (
                      <p className="text-[10px] text-[#a89c93] italic">Nenhuma cobrança cadastrada.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-[140px] overflow-y-auto no-scrollbar">
                        {projectInsts.map((i) => {
                          const isPaid = i.status === 'paid';
                          const isOverdue = i.status === 'overdue';
                          return (
                            <div key={i.id} className="flex items-center justify-between gap-2 p-1.5 bg-[#14110f]/40 border border-[#3d342f]/40 rounded-xl text-[11px]">
                              <div className="flex flex-col">
                                <span className="font-bold text-[#fcf8f5]">{formatCurrency(i.amount)}</span>
                                <span className="text-[9px] text-[#a89c93]">{i.description} • {formatDate(i.dueDate)}</span>
                              </div>
                              {isPaid ? (
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/15">
                                  Pago
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleMarkInstallmentAsPaid(i.id)}
                                  className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-all border cursor-pointer active:scale-95 ${
                                    isOverdue 
                                      ? 'bg-rose-500/15 text-rose-300 border-rose-500/25 hover:bg-rose-500/25' 
                                      : 'bg-[#241e1b] text-amber-300 border-[#3d342f] hover:text-[#fcf8f5] hover:bg-[#3d342f]'
                                  }`}
                                  title="Marcar como Pago"
                                >
                                  {isOverdue ? 'Atrasado • Receber' : 'Receber'}
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                </div>

                {/* Footer details: Budget vs honorarios */}
                <div className="flex items-center justify-between text-xs pt-3 border-t border-[#3d342f]/30 mt-auto">
                  <div className="flex items-center gap-1 text-[#a89c93]">
                    <Building2 className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                    <span>Honorários:</span>
                    <span className="font-bold text-[#fcf8f5]">{formatCurrency(p.honorarios || 0)}</span>
                  </div>
                  <div className="text-[10px] text-[#a89c93] font-medium italic">
                    Etapa Atual: <span className="text-[var(--theme-primary)] font-bold">{stageLabel}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Shared Modals */}
      <NewContractModal
        isOpen={isNewContractModalOpen}
        onClose={() => setIsNewContractModalOpen(false)}
      />

      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        initialProject={editingProject}
      />

      <ProjectDetailModal
        project={selectedProjectForDetail}
        isOpen={selectedProjectForDetail !== null}
        onClose={() => setSelectedProjectForDetail(null)}
        onEdit={(p) => {
          setSelectedProjectForDetail(null);
          setEditingProject(p);
          setIsAddModalOpen(true);
        }}
      />
    </div>
  );
};
