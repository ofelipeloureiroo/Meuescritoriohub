import React, { useState } from 'react';
import {
  Bell,
  Briefcase,
  Building,
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Edit3,
  ExternalLink,
  Eye,
  FileText,
  Filter,
  Flame,
  FolderPlus,
  Heart,
  ImagePlus,
  Instagram,
  Layers,
  MapPin,
  Maximize2,
  MessageCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  Users,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { ArchitectureProject } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { NICHES } from '../../utils/theme';
import { buildInstagramUrl, cleanInstagramHandle } from '../../utils/instagram';
import { compressImage } from '../../utils/imageCompressor';
import { AddProjectModal } from '../modals/AddProjectModal';
import { EditProfileModal } from '../modals/EditProfileModal';
import { ProjectDetailModal } from '../modals/ProjectDetailModal';
import { ProjectWorkspaceView } from '../projects/ProjectWorkspaceView';

interface HomeProjectsTabProps {
  onNavigateTab: (tab: string) => void;
  onOpenNewTxModal?: (initialType?: 'income' | 'expense') => void;
}

export const HomeProjectsTab: React.FC<HomeProjectsTabProps> = ({
  onNavigateTab,
  onOpenNewTxModal,
}) => {
  const { user, profile } = useAuth();
  const {
    architectProfile,
    architectureProjects,
    clients,
    monthlyIncomeFreelance,
    totalNetWorth,
    addPhotoToProject,
    deleteArchitectureProject,
    dueSoonInstallments,
    overdueInstallments,
    dueSoonMilestones,
    overdueMilestones,
    pendingMilestones,
    ongoingArchitectureProjects,
    workContracts,
    projectInstallments,
    projectMilestones,
    updateArchitectProfile,
    loadDemoData,
  } = useFinance();

  // Permission calculations
  const isWorkspaceOwner = !profile?.joinedOwnerUid;
  const collaboratorObj = profile?.joinedOwnerUid
    ? profile?.collaborators?.find((c) => c.uid === user?.uid)
    : null;
  const permissions = collaboratorObj?.permissions;

  const canManageProfile = isWorkspaceOwner;
  const canManageProjects = isWorkspaceOwner || (permissions ? permissions.projects !== false : true);
  const canViewFinance = isWorkspaceOwner || (permissions ? permissions.finance === true : false);
  const canViewDeadlines = isWorkspaceOwner || (permissions ? permissions.deadlines === true : false);

  const currentNiche = NICHES[architectProfile.niche || 'arquitetura'] || NICHES.arquitetura;
  const categories = currentNiche.categories;
  const shouldShowPortfolio =
    architectProfile.showPortfolio !== undefined
      ? architectProfile.showPortfolio
      : (currentNiche.hasPortfolio ?? false);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ArchitectureProject | null>(null);
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<ArchitectureProject | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<ArchitectureProject | null>(null);

  // Quick photo upload from card
  const handleQuickAddPhoto = (projectId: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files) return;
      const fileList = Array.from(files);
      for (const file of fileList) {
        const compressed = await compressImage(file, 1200, 1200, 0.82);
        if (compressed) {
          addPhotoToProject(projectId, compressed);
        }
      }
    };
    input.click();
  };

  // Filter projects
  const filteredProjects = architectureProjects.filter((p) => {
    const matchesCategory =
      selectedCategory === 'all'
        ? true
        : selectedCategory === 'antes_depois'
        ? Boolean(p.beforeImage && p.afterImage)
        : p.category === selectedCategory;

    const matchesStatus = statusFilter === 'all' ? true : p.status === statusFilter;

    const query = searchQuery.toLowerCase();
    const titleMatch = (p.title || '').toLowerCase().includes(query);
    const clientMatch = (p.clientName || '').toLowerCase().includes(query);
    const locationMatch = (p.location || '').toLowerCase().includes(query);
    const tagMatch = Boolean(p.tags && p.tags.some((t) => (t || '').toLowerCase().includes(query)));

    const matchesSearch = titleMatch || clientMatch || locationMatch || tagMatch;

    return matchesCategory && matchesStatus && matchesSearch;
  });

  // Totals & Studio Stats
  const totalM2 = architectureProjects.reduce((acc, p) => acc + (p.areaM2 || 0), 0);
  const totalHonorarios = architectureProjects.reduce((acc, p) => acc + (p.honorarios || 0), 0);
  const inProgressProjectsCount = architectureProjects.filter(
    (p) => p.status === 'obra' || p.status === 'anteprojeto' || p.status === 'executivo'
  ).length;
  const deliveredProjectsCount = architectureProjects.filter((p) => p.status === 'entregue').length;

  const getStatusBadge = (status: ArchitectureProject['status']) => {
    const option = currentNiche.statusOptions.find((o) => o.value === status);
    const label = option ? option.label : status;
    switch (status) {
      case 'estudo_preliminar':
        return { label, style: { backgroundColor: 'rgba(var(--theme-accent-rgb), 0.2)', color: 'var(--theme-accent)', borderColor: 'rgba(var(--theme-accent-rgb), 0.35)' } };
      case 'anteprojeto':
        return { label, style: { backgroundColor: 'var(--theme-badge-bg)', color: 'var(--theme-badge-text)', borderColor: 'var(--theme-badge-border)' } };
      case 'executivo':
        return { label, style: { backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', borderColor: 'rgba(245, 158, 11, 0.35)' } };
      case 'obra':
        return { label, style: { backgroundColor: 'rgba(217, 119, 6, 0.2)', color: '#f59e0b', borderColor: 'rgba(217, 119, 6, 0.35)' } };
      case 'entregue':
        return { label, style: { backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.35)' } };
      default:
        return { label, style: { backgroundColor: '#27272a', color: '#d4d4d8', borderColor: '#3f3f46' } };
    }
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
            setSelectedProjectForDetail(null);
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
    <div className="space-y-8 pb-16">
      {/* 1. Hero / Bio Presentation Card */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#241e1b] via-[#1c1815] to-[#14110f] border border-[#3d342f] p-6 sm:p-8 shadow-2xl">
        {/* Subtle Decorative Background Accents */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ backgroundColor: 'var(--theme-accent)' }}
        />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          {/* Bio & Photo */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
            {/* Avatar / Photo Frame with Click-to-Edit & Hover Badge */}
            <div className="relative group">
              {canManageProfile ? (
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(true)}
                  className="relative block w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 shadow-xl hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer focus:outline-none"
                  style={{
                    background: 'linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-to))',
                  }}
                  title="Clique para trocar a foto de perfil"
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#1a1614] border-2 border-[#12100e] relative">
                    <img
                      src={
                        architectProfile.photoUrl ||
                        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'
                      }
                      alt={`${architectProfile.name} - ${architectProfile.title}`}
                      className="w-full h-full object-cover object-top group-hover:brightness-75 transition-all"
                    />
                    {/* Hover Overlay with Camera */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200">
                      <Camera className="w-6 h-6 mb-1 drop-shadow" style={{ color: 'var(--theme-primary)' }} />
                      <span className="text-[11px] font-bold text-[#fcf8f5] tracking-wide uppercase">
                        Trocar Foto
                      </span>
                    </div>
                  </div>
                </button>
              ) : (
                <div
                  className="relative block w-28 h-28 sm:w-32 sm:h-32 rounded-full p-1 shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, var(--theme-gradient-from), var(--theme-gradient-to))',
                  }}
                >
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#1a1614] border-2 border-[#12100e]">
                    <img
                      src={
                        architectProfile.photoUrl ||
                        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80'
                      }
                      alt={`${architectProfile.name} - ${architectProfile.title}`}
                      className="w-full h-full object-cover object-top"
                    />
                  </div>
                </div>
              )}

              {/* Floating Camera Button on Avatar Edge (Only for Profile Manager) */}
              {canManageProfile && (
                <button
                  type="button"
                  onClick={() => setIsEditProfileModalOpen(true)}
                  className="absolute -bottom-1 -right-1 p-2 rounded-full text-[#12100e] border-2 border-[#12100e] shadow-lg hover:scale-110 active:scale-90 transition-transform cursor-pointer"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                  }}
                  title="Alterar foto de perfil"
                >
                  <Camera className="w-3.5 h-3.5 stroke-[2.5]" />
                </button>
              )}
            </div>

            {/* Bio Info */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-[#fcf8f5] font-serif tracking-tight">
                  {architectProfile.name}
                </h1>
                <span
                  className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: 'var(--theme-badge-bg)',
                    color: 'var(--theme-badge-text)',
                    border: '1px solid var(--theme-badge-border)',
                  }}
                >
                  {architectProfile.title}
                </span>
                {/* Quick Edit Profile Button */}
                {canManageProfile && (
                  <button
                    type="button"
                    onClick={() => setIsEditProfileModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#28221e] hover:bg-[#342c27] text-xs font-medium border border-[#3d342f] transition-all cursor-pointer"
                    style={{ color: 'var(--theme-primary)' }}
                    title="Alterar foto e informações do perfil"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Mudar Foto / Perfil</span>
                  </button>
                )}
              </div>

              <p className="text-sm font-medium text-[#e8ded7] flex items-center justify-center sm:justify-start gap-1.5">
                <MapPin className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} /> {architectProfile.location}
              </p>

              <p className="text-xs text-[#a89c93] max-w-xl leading-relaxed">
                <span className="mr-1.5">{currentNiche.icon}</span><strong className="text-[#fcf8f5]">{architectProfile.specialty}</strong>
                <br />
                <span className="mr-1.5">✨</span><em>{architectProfile.tagline}</em> {architectProfile.description}
              </p>

              {/* Instagram & Bio link */}
              {(() => {
                const targetUrl = buildInstagramUrl(architectProfile.instagramHandle, architectProfile.instagramUrl);
                const displayHandle = cleanInstagramHandle(architectProfile.instagramHandle || architectProfile.instagramUrl) || '@instagram';
                return (
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#28221e] hover:bg-[#342c27] text-xs font-medium text-[#fcf8f5] border border-[#3d342f] transition-colors"
                    >
                      <Instagram className="w-3.5 h-3.5" style={{ color: 'var(--theme-accent)' }} />
                      {displayHandle}
                      <ExternalLink className="w-3 h-3 text-[#a89c93]" />
                    </a>

                    <span className="text-xs text-[#a89c93] flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /> {architectProfile.rating.toFixed(1)}
                      {architectProfile.followersCount && ` • ${architectProfile.followersCount}`}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Quick Actions Buttons */}
          <div className="flex flex-row sm:flex-col gap-3 w-full lg:w-auto justify-center sm:justify-end">
            {canManageProjects && (
              shouldShowPortfolio ? (
                <button
                  onClick={() => {
                    setEditingProject(null);
                    setIsAddModalOpen(true);
                  }}
                  className="flex-1 sm:flex-initial px-5 py-3 rounded-xl text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer hover:brightness-110"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                  }}
                >
                  <FolderPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Novo(a) {currentNiche.formConfig.itemLabel}</span>
                </button>
              ) : (
                <button
                  onClick={() => onNavigateTab('freelance')}
                  className="flex-1 sm:flex-initial px-5 py-3 rounded-xl text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer hover:brightness-110"
                  style={{
                    backgroundColor: 'var(--theme-primary)',
                  }}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>+ Novo Contrato / Cliente</span>
                </button>
              )
            )}

            {canViewDeadlines && (
              <button
                onClick={() => onNavigateTab('deadlines')}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#28221e] hover:bg-[#342c27] text-[#e8ded7] font-semibold text-xs flex items-center justify-center gap-2 border border-[#3d342f] hover:border-[var(--theme-primary)]/50 transition-all cursor-pointer"
              >
                <Clock className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
                <span>Prazos & Cobranças</span>
                {(dueSoonInstallments.length > 0 || overdueInstallments.length > 0) && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                    {dueSoonInstallments.length + overdueInstallments.length}
                  </span>
                )}
              </button>
            )}

            {canViewFinance && (
              <button
                onClick={() => onNavigateTab('overview')}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#28221e] hover:bg-[#342c27] text-[#e8ded7] font-semibold text-xs flex items-center justify-center gap-2 border border-[#3d342f] transition-colors cursor-pointer"
              >
                <TrendingUp className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                <span>Painel Financeiro Geral</span>
              </button>
            )}

            {!canManageProjects && !canViewDeadlines && !canViewFinance && (
              <a
                href={buildInstagramUrl(architectProfile.instagramHandle, architectProfile.instagramUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial px-5 py-3 rounded-xl text-black font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95 cursor-pointer hover:brightness-110"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                }}
              >
                <Instagram className="w-4 h-4" />
                <span>Entrar em Contato</span>
              </a>
            )}
          </div>
        </div>

        {/* Highlight Badges */}
        <div className="mt-6 pt-6 border-t border-[#3d342f]/80 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-2xl bg-[#14110f]/80 border border-[#3d342f] flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-serif font-bold text-sm"
              style={{
                backgroundColor: 'rgba(var(--theme-accent-rgb), 0.2)',
                color: 'var(--theme-accent)',
                border: '1px solid rgba(var(--theme-accent-rgb), 0.4)',
              }}
            >
              R$
            </div>
            <div>
              <span className="text-xs font-bold text-[#fcf8f5] block font-serif">Propostas Claras</span>
              <span className="text-[11px] text-[#a89c93]">Orçamentos transparentes e condições alinhadas</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#14110f]/80 border border-[#3d342f] flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-badge-text)',
                border: '1px solid var(--theme-badge-border)',
              }}
            >
              ★
            </div>
            <div>
              <span className="text-xs font-bold text-[#fcf8f5] block font-serif">Qualidade Comprovada</span>
              <span className="text-[11px] text-[#a89c93]">Avaliações reais e compromisso com o resultado</span>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#14110f]/80 border border-[#3d342f] flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#48322c] border border-[#6b4941] flex items-center justify-center text-[#e8ded7] font-bold text-sm">
              📋
            </div>
            <div>
              <span className="text-xs font-bold text-[#fcf8f5] block font-serif">Contratos & Prazos</span>
              <span className="text-[11px] text-[#a89c93]">Entregas pontuais com segurança jurídica</span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Alerts Callout Bar */}
      {(dueSoonInstallments.length > 0 || overdueInstallments.length > 0 || dueSoonMilestones.length > 0) && (
        <section
          onClick={() => onNavigateTab('deadlines')}
          className="p-4 rounded-2xl bg-gradient-to-r from-[#241e1b] via-[#2a201c] to-[#1c1815] border border-amber-500/40 hover:border-[var(--theme-primary)] transition-all cursor-pointer shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  Alertas de Prazos & Cobranças
                </span>
                <span className="text-[11px] text-[#a89c93]">
                  • {dueSoonInstallments.length + overdueInstallments.length} parcelas para atenção
                </span>
              </div>
              <p className="text-xs text-[#fcf8f5] mt-0.5">
                {overdueInstallments.length > 0 ? (
                  <strong className="text-rose-400 font-semibold">{overdueInstallments.length} parcela(s) vencida(s)</strong>
                ) : null}
                {overdueInstallments.length > 0 && dueSoonInstallments.length > 0 ? ' e ' : null}
                {dueSoonInstallments.length > 0 ? (
                  <strong className="text-amber-300 font-semibold">{dueSoonInstallments.length} parcela(s) a vencer nos próximos 7 dias</strong>
                ) : null}
                {'. Clique para abrir e avisar clientes pelo WhatsApp com 1 clique.'}
              </p>
            </div>
          </div>

          <div
            className="flex items-center gap-1.5 text-xs font-bold shrink-0"
            style={{ color: 'var(--theme-primary)' }}
          >
            <span>Acessar Cobranças</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </section>
      )}

      {/* 2. Studio Metrics Bar */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-[#1a1614] border border-[#3d342f] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#a89c93]">
            <span>
              {shouldShowPortfolio
                ? `Total de ${currentNiche.formConfig.itemLabel}s`
                : 'Contratos Cadastrados'}
            </span>
            <Building className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
          </div>
          <p className="text-2xl font-bold text-[#fcf8f5] font-serif">
            {shouldShowPortfolio ? architectureProjects.length : workContracts.length}
          </p>
          <span className="text-[11px]" style={{ color: 'var(--theme-accent)' }}>
            {shouldShowPortfolio
              ? `${deliveredProjectsCount} entregues • ${inProgressProjectsCount} em andamento`
              : `${workContracts.filter((c) => c.signatureStatus === 'signed').length} assinados`}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#1a1614] border border-[#3d342f] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#a89c93]">
            <span>
              {architectProfile.niche === 'arquitetura'
                ? 'Área Total Projetada'
                : shouldShowPortfolio
                ? 'Itens Cadastrados'
                : 'Prazos & Entregas'}
            </span>
            <Layers className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
          </div>
          {architectProfile.niche === 'arquitetura' ? (
            <p className="text-2xl font-bold text-[#fcf8f5] font-serif">
              {totalM2} <span className="text-sm font-sans font-normal text-[#a89c93]">m²</span>
            </p>
          ) : shouldShowPortfolio ? (
            <p className="text-2xl font-bold text-[#fcf8f5] font-serif">
              {architectureProjects.length}{' '}
              <span className="text-sm font-sans font-normal text-[#a89c93]">itens</span>
            </p>
          ) : (
            <p className="text-2xl font-bold text-[#fcf8f5] font-serif">
              {pendingMilestones.length}{' '}
              <span className="text-sm font-sans font-normal text-[#a89c93]">etapas</span>
            </p>
          )}
          <span className="text-[11px] text-[#a89c93]">
            {architectProfile.niche === 'arquitetura'
              ? 'Área total dos projetos'
              : currentNiche.label}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#1a1614] border border-[#3d342f] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#a89c93]">
            <span>Faturamento & Honorários</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 font-serif">
            {formatCurrency(totalHonorarios || monthlyIncomeFreelance)}
          </p>
          <span className="text-[11px] text-[#a89c93]">Valor total contratado</span>
        </div>

        <div className="p-4 rounded-2xl bg-[#1a1614] border border-[#3d342f] space-y-1">
          <div className="flex items-center justify-between text-xs text-[#a89c93]">
            <span>Clientes Atendidos</span>
            <Users className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
          </div>
          <p className="text-2xl font-bold text-[#fcf8f5] font-serif">{clients.length}</p>
          <button
            onClick={() => onNavigateTab('freelance')}
            className="text-[11px] hover:underline flex items-center gap-0.5"
            style={{ color: 'var(--theme-primary)' }}
          >
            Ver cadastro de clientes →
          </button>
        </div>
      </section>

      {/* 3. Operational Hub (When Portfolio is Disabled) OR Project Gallery (When Portfolio is Enabled) */}
      {!shouldShowPortfolio ? (
        <section className="space-y-6">
          {/* Header of Operational Hub */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#1a1614] border border-[#3d342f]">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-[var(--theme-primary)]" />
                <h2 className="text-xl font-bold text-[#fcf8f5] font-serif">
                  {currentNiche.projectSectionTitle}
                </h2>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#241e1b] text-[var(--theme-accent)] border border-[#3d342f]">
                  Modo Gestão Ativo
                </span>
              </div>
              <p className="text-xs text-[#a89c93]">
                {currentNiche.projectSectionSubtitle} (galeria de fotos desativada para manter o foco em contratos e finanças)
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <button
                onClick={() => onNavigateTab('freelance')}
                className="flex-1 md:flex-initial px-4 py-2.5 rounded-xl font-bold text-xs text-black flex items-center justify-center gap-2 shadow-md transition-all active:scale-95 cursor-pointer hover:brightness-110"
                style={{ backgroundColor: 'var(--theme-primary)' }}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>+ Novo Contrato / Atendimento</span>
              </button>

              <button
                type="button"
                onClick={() => updateArchitectProfile({ ...architectProfile, showPortfolio: true })}
                className="px-3.5 py-2.5 rounded-xl bg-[#28221e] hover:bg-[#342c27] text-[#a89c93] hover:text-[#fcf8f5] text-xs font-medium border border-[#3d342f] transition-colors cursor-pointer flex items-center gap-1.5"
                title="Habilitar galeria visual de fotos"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Ativar Fotos</span>
              </button>
            </div>
          </div>

          {/* Active Work Contracts */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#fcf8f5] font-serif flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[var(--theme-primary)]" />
                <span>Contratos & Atendimentos em Andamento</span>
              </h3>
              <button
                onClick={() => onNavigateTab('freelance')}
                className="text-xs hover:underline flex items-center gap-1 font-semibold"
                style={{ color: 'var(--theme-primary)' }}
              >
                Ver todos os contratos ({workContracts.length}) →
              </button>
            </div>

            {workContracts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workContracts.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-2xl bg-[#1a1614] border border-[#3d342f] hover:border-[var(--theme-primary)]/50 transition-all space-y-3 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--theme-accent)]">
                          {c.contractNumber || 'CONTRATO'}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            c.signatureStatus === 'signed'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {c.signatureStatus === 'signed' ? 'Assinado' : 'Pendente de Assinatura'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-[#fcf8f5] line-clamp-1">
                        {c.title}
                      </h4>
                      <p className="text-xs text-[#a89c93] flex items-center gap-1 mt-1">
                        <Users className="w-3.5 h-3.5 text-[#8a7c73]" />
                        <span>{c.clientName}</span>
                      </p>
                    </div>

                    <div className="pt-3 border-t border-[#2d2621] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#8a7c73] block">Valor Contratado</span>
                        <span className="text-sm font-bold text-emerald-400 font-serif">
                          {formatCurrency(c.totalValue)}
                        </span>
                      </div>
                      <button
                        onClick={() => onNavigateTab('freelance')}
                        className="px-3 py-1.5 rounded-lg bg-[#28221e] hover:bg-[#342c27] text-xs font-semibold text-[#e8ded7] border border-[#3d342f] transition-colors cursor-pointer"
                      >
                        Abrir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-[#1a1614] border border-[#3d342f] text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#28221e] flex items-center justify-center mx-auto text-[#a89c93]">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#fcf8f5]">
                  Nenhum contrato cadastrado ainda
                </h4>
                <p className="text-xs text-[#a89c93] max-w-md mx-auto">
                  Cadastre clientes e emita contratos com assinatura digital, cobranças Pix e controle de pagamentos.
                </p>
                <button
                  onClick={() => onNavigateTab('freelance')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-black cursor-pointer shadow-md"
                  style={{ backgroundColor: 'var(--theme-primary)' }}
                >
                  + Criar Primeiro Contrato
                </button>
              </div>
            )}
          </div>

          {/* Pending Installments & Milestones Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
            {/* Next Receivables */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#fcf8f5] font-serif flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Próximos Recebimentos & Parcelas</span>
                </h3>
                <button
                  onClick={() => onNavigateTab('deadlines')}
                  className="text-xs hover:underline"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  Ver cobranças →
                </button>
              </div>

              {projectInstallments.filter((i) => i.status !== 'paid').length > 0 ? (
                <div className="space-y-2">
                  {projectInstallments
                    .filter((i) => i.status !== 'paid')
                    .slice(0, 4)
                    .map((inst) => (
                      <div
                        key={inst.id}
                        className="p-3.5 rounded-xl bg-[#1a1614] border border-[#3d342f] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#fcf8f5] truncate">
                            {inst.projectTitle}
                          </p>
                          <p className="text-[11px] text-[#a89c93] truncate">
                            {inst.clientName} • Vencimento: {formatDate(inst.dueDate)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-emerald-400 font-serif block">
                            {formatCurrency(inst.amount)}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              inst.status === 'overdue'
                                ? 'text-rose-400 bg-rose-500/10'
                                : 'text-amber-300 bg-amber-500/10'
                            }`}
                          >
                            {inst.status === 'overdue' ? 'Vencida' : 'A Vencer'}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-[#1a1614] border border-[#3d342f] text-center text-xs text-[#a89c93]">
                  Todas as parcelas e cobranças estão em dia.
                </div>
              )}
            </div>

            {/* Upcoming Milestones */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#fcf8f5] font-serif flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
                  <span>Entregas & Prazos Agendados</span>
                </h3>
                <button
                  onClick={() => onNavigateTab('deadlines')}
                  className="text-xs hover:underline"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  Ver cronograma →
                </button>
              </div>

              {projectMilestones.filter((m) => !m.completed).length > 0 ? (
                <div className="space-y-2">
                  {projectMilestones
                    .filter((m) => !m.completed)
                    .slice(0, 4)
                    .map((ms) => (
                      <div
                        key={ms.id}
                        className="p-3.5 rounded-xl bg-[#1a1614] border border-[#3d342f] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-[#fcf8f5] truncate">
                            {ms.title}
                          </p>
                          <p className="text-[11px] text-[#a89c93] truncate">
                            {ms.projectTitle} • Prazo: {formatDate(ms.dueDate)}
                          </p>
                        </div>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                          {ms.priority || 'Normal'}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-[#1a1614] border border-[#3d342f] text-center text-xs text-[#a89c93]">
                  Nenhum prazo pendente no momento.
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        /* Visual Project Gallery & Photo Showcase */
        <section className="space-y-5">
          {/* Controls Bar: Search & Category Pills */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-[#fcf8f5] font-serif flex items-center gap-2">
                <Camera className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
                <span>{currentNiche.projectSectionTitle}</span>
              </h2>
              <p className="text-xs text-[#a89c93]">
                {currentNiche.projectSectionSubtitle}
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {/* Search Input */}
              <div className="relative flex-1 sm:w-64">
                <Search className="w-4 h-4 text-[#a89c93] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por projeto, cliente ou material..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#1a1614] border border-[#3d342f] text-xs text-[#fcf8f5] placeholder-[#a89c93] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#1a1614] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              >
                <option value="all">Todos os Status</option>
                {currentNiche.statusOptions.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>

              {/* Hide Portfolio button */}
              <button
                type="button"
                onClick={() => updateArchitectProfile({ ...architectProfile, showPortfolio: false })}
                className="px-2.5 py-2 rounded-xl bg-[#28221e] hover:bg-[#342c27] text-xs text-[#a89c93] hover:text-[#fcf8f5] border border-[#3d342f] transition-colors whitespace-nowrap cursor-pointer"
                title="Ocultar fotos e ativar modo gestão"
              >
                Ocultar Fotos
              </button>
            </div>
          </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  isSelected
                    ? 'text-black font-bold shadow-md'
                    : 'bg-[#1a1614] text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#28221e] border border-[#3d342f]'
                }`}
                style={
                  isSelected
                    ? {
                        backgroundColor: 'var(--theme-primary)',
                      }
                    : undefined
                }
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Projects Cards Grid */}
        {filteredProjects.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[#1a1614] border border-dashed border-[#3d342f] rounded-2xl">
            <Camera className="w-10 h-10 text-[var(--theme-primary)] mx-auto mb-3 opacity-70" />
            <h3 className="text-base font-bold text-[#fcf8f5] font-serif mb-1">
              {architectureProjects.length === 0
                ? `Seu espaço de ${currentNiche.label} está pronto para cadastros!`
                : `Nenhum(a) ${currentNiche.formConfig.itemLabel.toLowerCase()} encontrado(a) para este filtro`}
            </h3>
            <p className="text-xs text-[#a89c93] max-w-md mx-auto mb-5">
              {architectureProjects.length === 0
                ? `Cadastre seu primeiro item (${currentNiche.formConfig.itemLabel.toLowerCase()}), envie fotos e acompanhe ${currentNiche.formConfig.valueFieldLabel.toLowerCase().replace(' (r$)', '')}, ou explore o sistema.`
                : 'Tente alterar os termos de busca ou remover os filtros de categoria/status.'}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => {
                  setEditingProject(null);
                  setIsAddModalOpen(true);
                }}
                className="px-5 py-2.5 rounded-xl text-black font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                }}
              >
                + Cadastrar {currentNiche.formConfig.itemLabel}
              </button>
              {architectureProjects.length === 0 && (
                <button
                  onClick={() => loadDemoData()}
                  className="px-4 py-2.5 rounded-xl bg-[#28221e] hover:bg-[#342c27] text-[#fcf8f5] font-semibold text-xs border border-[#3d342f] transition-all cursor-pointer"
                >
                  Carregar Demonstração
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((proj) => {
              const statusBadge = getStatusBadge(proj.status);
              const totalPhotos = (proj.images || []).length || 1;
              const hasBeforeAfter = Boolean(proj.beforeImage && proj.afterImage);

              return (
                <div
                  key={proj.id}
                  className="group relative flex flex-col bg-[#1a1614] border border-[#3d342f] hover:border-[var(--theme-primary)]/60 rounded-2xl overflow-hidden shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Project Image & Overlay */}
                  <div
                    className="relative aspect-video sm:h-56 w-full overflow-hidden bg-[#12100e] cursor-pointer"
                    onClick={() => setSelectedProjectForDetail(proj)}
                  >
                    <img
                      src={proj.coverImage || proj.images?.[0] || 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'}
                      alt={proj.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#14110f] via-transparent to-black/40 opacity-80 group-hover:opacity-90 transition-opacity" />

                    {/* Status badge */}
                    <div className="absolute top-3 left-3 flex items-center gap-1.5">
                      <span
                        className="px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide border shadow backdrop-blur-md"
                        style={statusBadge.style}
                      >
                        {statusBadge.label}
                      </span>
                      {hasBeforeAfter && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-bold text-black border shadow"
                          style={{
                            backgroundColor: 'var(--theme-accent)',
                            borderColor: 'var(--theme-accent)',
                          }}
                        >
                          Antes & Depois
                        </span>
                      )}
                    </div>

                    {/* Photos count badge */}
                    <div className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] font-medium backdrop-blur-md flex items-center gap-1">
                      <Camera className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} />
                      <span>{totalPhotos} foto(s)</span>
                    </div>

                    {/* Quick Expand hover icon */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <div className="px-4 py-2 rounded-xl bg-black/80 text-[#fcf8f5] text-xs font-bold flex items-center gap-1.5 border border-[#3d342f] shadow-2xl backdrop-blur-md">
                        <Eye className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} /> Ver Galeria Completa
                      </div>
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className="text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: 'var(--theme-accent)' }}
                        >
                          {proj.category.replace('_', ' ')}
                        </span>
                        {proj.areaM2 && (
                          <span className="text-xs text-[#a89c93] flex items-center gap-1">
                            <Layers className="w-3 h-3" style={{ color: 'var(--theme-primary)' }} />{' '}
                            {currentNiche.id === 'arquitetura' || currentNiche.id === 'engenharia' || currentNiche.id === 'imobiliario'
                              ? `${proj.areaM2} m²`
                              : `${proj.areaM2}`}
                          </span>
                        )}
                      </div>

                      <h3
                        onClick={() => setSelectedProjectForDetail(proj)}
                        className="text-lg font-bold text-[#fcf8f5] font-serif leading-snug hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
                      >
                        {proj.title}
                      </h3>

                      <div className="flex items-center justify-between text-xs text-[#a89c93] pt-1">
                        <span className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5" style={{ color: 'var(--theme-primary)' }} /> {proj.clientName}
                        </span>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5" style={{ color: 'var(--theme-accent)' }} /> {proj.location}
                        </span>
                      </div>

                      {proj.description && (
                        <p className="text-xs text-[#a89c93] line-clamp-2 pt-1 font-sans">
                          {proj.description}
                        </p>
                      )}
                    </div>

                    {/* Tags preview */}
                    {proj.tags && proj.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {proj.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-[#241e1b] text-[10px] text-[#e8ded7] border border-[#3d342f]"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Bottom Actions Bar */}
                    <div className="pt-3 border-t border-[#2d2622] flex items-center justify-between gap-2">
                      {proj.honorarios ? (
                        <div>
                          <span className="text-[10px] text-[#a89c93] block">
                            {currentNiche.formConfig.valueFieldLabel.split(' ')[0] || 'Honorários'}
                          </span>
                          <span className="text-xs font-bold text-emerald-400">
                            {formatCurrency(proj.honorarios)}
                          </span>
                        </div>
                      ) : (
                        <div />
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleQuickAddPhoto(proj.id)}
                          className="p-2 rounded-lg bg-[#28221e] hover:bg-[#3d342f] border border-[#3d342f] transition-colors"
                          style={{ color: 'var(--theme-accent)' }}
                          title="Adicionar fotos a este projeto"
                        >
                          <Camera className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingProject(proj);
                            setIsAddModalOpen(true);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-[#28221e] hover:bg-[#3d342f] text-xs font-medium text-[#fcf8f5] border border-[#3d342f] transition-colors"
                          title="Editar projeto"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => setSelectedProjectForDetail(proj)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
                          style={{
                            backgroundColor: 'var(--theme-badge-bg)',
                            color: 'var(--theme-badge-text)',
                            border: '1px solid var(--theme-badge-border)',
                          }}
                          title="Ver galeria completa"
                        >
                          Ver Fotos
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setProjectToDelete(proj);
                          }}
                          className="p-2 rounded-lg bg-[#28221e] hover:bg-rose-950/70 text-rose-400 hover:text-rose-300 border border-[#3d342f] hover:border-rose-800/60 transition-colors cursor-pointer"
                          title="Excluir projeto do portfólio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
      )}

      {/* Custom Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#1a1614] border border-rose-900/50 rounded-2xl p-6 shadow-2xl space-y-4 animate-scaleUp">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-rose-950/70 border border-rose-900/60 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-serif text-[#fcf8f5]">Excluir Projeto</h3>
                <p className="text-xs text-[#a89c93]">Esta ação removerá o projeto do portfólio</p>
              </div>
            </div>

            <div className="bg-[#12100e] border border-[#3d342f] rounded-xl p-3.5 text-xs text-[#e8ded7] space-y-1">
              <p className="font-bold text-[#fcf8f5] text-sm truncate">{projectToDelete.title}</p>
              <p className="text-[#a89c93] flex items-center gap-1.5">
                <span>{projectToDelete.clientName || 'Cliente sem nome'}</span> • <span>{projectToDelete.location || 'Local não informado'}</span>
              </p>
            </div>

            <p className="text-xs text-[#a89c93] leading-relaxed">
              Deseja realmente remover este projeto? Todas as fotos e registros vinculados serão excluídos permanentemente.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3d342f]">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2.5 rounded-xl bg-[#28221e] hover:bg-[#342d28] text-xs font-semibold text-[#e8ded7] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteArchitectureProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/40 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Modals */}
      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingProject(null);
        }}
        initialProject={editingProject}
      />

      <ProjectDetailModal
        project={selectedProjectForDetail}
        isOpen={Boolean(selectedProjectForDetail)}
        onClose={() => setSelectedProjectForDetail(null)}
        onEdit={(proj) => {
          setSelectedProjectForDetail(null);
          setEditingProject(proj);
          setIsAddModalOpen(true);
        }}
      />

      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
      />
    </div>
  );
};

