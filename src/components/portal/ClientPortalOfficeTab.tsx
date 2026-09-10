import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  KeyRound,
  ShieldCheck,
  Plus,
  Search,
  ExternalLink,
  Copy,
  Check,
  Share2,
  FileText,
  Clock,
  MessageSquare,
  AlertCircle,
  Eye,
  Settings2,
  Power,
  Trash2,
  Users,
  FolderOpen,
  Sparkles,
  CheckCircle2,
  Lock,
  Phone,
  Mail,
  Building2,
  Link2,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { ClientPortalAccess, ArchitectureProject, Client } from '../../types';
import { 
  subscribeToOfficePortals, 
  setPortalStatus, 
  deleteClientPortalAccess,
  buildClientPortalAccess,
  syncPortalWithOfficeRegistry,
  SAMPLE_CLIENT_PORTAL 
} from '../../services/clientPortalService';
import { OfficeClientPortalManagerModal } from './OfficeClientPortalManagerModal';

interface ClientPortalOfficeTabProps {
  onNavigateTab?: (tab: string) => void;
}

export const ClientPortalOfficeTab: React.FC<ClientPortalOfficeTabProps> = ({
  onNavigateTab
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { architectureProjects, clients, architectProfile } = useFinance();

  const [portals, setPortals] = useState<ClientPortalAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal state
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [selectedPortalForEdit, setSelectedPortalForEdit] = useState<ClientPortalAccess | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  // Real-time subscribe to all portals created by this office
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToOfficePortals(user.uid, (list) => {
      setPortals(list);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Combine real office clients with real-time projects and any cloud saved portals
  const displayPortals = useMemo(() => {
    if (clients && clients.length > 0) {
      return clients.map((client) => {
        const cloudMatch = portals.find(
          (p) =>
            p.clientId === client.id ||
            (p.clientEmail && client.email && p.clientEmail.trim().toLowerCase() === client.email.trim().toLowerCase()) ||
            p.clientName.trim().toLowerCase() === client.name.trim().toLowerCase()
        );
        return buildClientPortalAccess(client, architectureProjects, architectProfile, cloudMatch);
      });
    }

    if (portals.length > 0) {
      return portals.map((p) => syncPortalWithOfficeRegistry(p, clients, architectureProjects, architectProfile));
    }

    return [syncPortalWithOfficeRegistry(SAMPLE_CLIENT_PORTAL, clients, architectureProjects, architectProfile)];
  }, [clients, portals, architectureProjects, architectProfile]);

  const filteredPortals = displayPortals.filter((p) => {
    const matchSearch =
      p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.clientEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projects?.some((proj) => proj.title.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchStatus =
      statusFilter === 'all' ? true : p.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const handleCopyLink = (p: ClientPortalAccess) => {
    const origin = window.location.origin;
    const directUrl = `${origin}/cliente/login?email=${encodeURIComponent(p.clientEmail)}&code=${encodeURIComponent(p.accessCode)}`;
    navigator.clipboard.writeText(directUrl);
    setCopiedId(p.id + '-link');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyCredentials = (p: ClientPortalAccess) => {
    const origin = window.location.origin;
    const directUrl = `${origin}/cliente/login?email=${encodeURIComponent(p.clientEmail)}&code=${encodeURIComponent(p.accessCode)}`;
    const text = `*Radar da Cliente - ${p.officeName || 'Meu Escritório'}*\n\nOlá, ${p.clientName}!\nVocê pode acompanhar todas as etapas, prazos, arquivos e falar com a equipe pelo seu portal exclusivo:\n\n🔗 *Acesso Direto:* ${directUrl}\n📧 *E-mail:* ${p.clientEmail}\n🔑 *Senha/Código de Acesso:* ${p.accessCode}\n\nQualquer dúvida, estamos à disposição!`;
    navigator.clipboard.writeText(text);
    setCopiedId(p.id + '-text');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenWhatsApp = (p: ClientPortalAccess) => {
    const origin = window.location.origin;
    const directUrl = `${origin}/cliente/login?email=${encodeURIComponent(p.clientEmail)}&code=${encodeURIComponent(p.accessCode)}`;
    const text = `Olá, ${p.clientName}! Aqui está o seu link de acesso ao Radar da Cliente para acompanhar o projeto em tempo real:\n\n${directUrl}\n\nE-mail: ${p.clientEmail}\nCódigo de Acesso: ${p.accessCode}`;
    const rawPhone = (p.clientPhone || '').replace(/\D/g, '');
    const phoneWithDDI = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
    window.open(`https://wa.me/${phoneWithDDI}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleOpenClientPortal = (p: ClientPortalAccess) => {
    const freshPortal = syncPortalWithOfficeRegistry(p, clients, architectureProjects, architectProfile);
    sessionStorage.setItem('client_portal_session', JSON.stringify(freshPortal));
    navigate(`/cliente/dashboard?portalId=${encodeURIComponent(freshPortal.id)}&clientId=${encodeURIComponent(freshPortal.clientId)}&admin=true`);
  };

  const handleToggleStatus = async (p: ClientPortalAccess) => {
    if (p.id === SAMPLE_CLIENT_PORTAL.id) {
      alert('Este é um portal de demonstração.');
      return;
    }
    const newStatus = p.status === 'active' ? 'inactive' : 'active';
    await setPortalStatus(p.id, newStatus);
  };

  const handleDeletePortal = async (p: ClientPortalAccess) => {
    if (p.id === SAMPLE_CLIENT_PORTAL.id) {
      alert('O portal de demonstração não pode ser excluído.');
      return;
    }
    if (window.confirm(`Tem certeza de que deseja remover o acesso do cliente "${p.clientName}" ao portal?`)) {
      await deleteClientPortalAccess(p.id);
    }
  };

  const toggleShowPassword = (portalId: string) => {
    setShowPasswordMap(prev => ({ ...prev, [portalId]: !prev[portalId] }));
  };

  // Aggregated Stats
  const activeCount = displayPortals.filter(p => p.status === 'active').length;
  const totalProjectsInPortals = displayPortals.reduce((acc, p) => acc + (p.projects?.length || 0), 0);
  const totalDocumentsInPortals = displayPortals.reduce((acc, p) => acc + (p.documents?.length || 0), 0);
  const totalMessages = displayPortals.reduce((acc, p) => acc + (p.messages?.length || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#1c1815] to-[#26201b] border border-[#3d342f] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--theme-primary)]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30 text-[var(--theme-primary)] text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Painel de Gestão do Escritório</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#fcf8f5] tracking-tight">
              Radar da Cliente & Transparência
            </h1>
            <p className="text-xs sm:text-sm text-[#a89c93] leading-relaxed">
              Crie acessos exclusivos para os clientes acompanharem as etapas dos projetos, baixarem plantas e documentos aprovados, e trocarem mensagens com sua equipe de forma centralizada.
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => {
                setSelectedPortalForEdit(null);
                setIsManagerModalOpen(true);
              }}
              className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-[var(--theme-primary)] hover:brightness-110 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Acesso de Cliente</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center shrink-0 border border-[var(--theme-primary)]/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#a89c93] uppercase tracking-wider block">
              Portais Ativos
            </span>
            <span className="text-xl sm:text-2xl font-bold text-[#fcf8f5]">
              {activeCount}
            </span>
          </div>
        </div>

        <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#a89c93] uppercase tracking-wider block">
              Projetos no Portal
            </span>
            <span className="text-xl sm:text-2xl font-bold text-[#fcf8f5]">
              {totalProjectsInPortals}
            </span>
          </div>
        </div>

        <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#a89c93] uppercase tracking-wider block">
              Documentos & Plantas
            </span>
            <span className="text-xl sm:text-2xl font-bold text-[#fcf8f5]">
              {totalDocumentsInPortals}
            </span>
          </div>
        </div>

        <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[#a89c93] uppercase tracking-wider block">
              Mensagens Trocadas
            </span>
            <span className="text-xl sm:text-2xl font-bold text-[#fcf8f5]">
              {totalMessages}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#a89c93] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por cliente, projeto ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl pl-9 pr-4 py-2 text-xs text-[#fcf8f5] placeholder-[#6b625b] focus:outline-none focus:border-[var(--theme-primary)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-[#a89c93] flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Status:
          </span>
          <div className="flex bg-[#12100e] p-1 rounded-xl border border-[#3d342f]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[var(--theme-primary)] text-black font-bold'
                  : 'text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              Todos ({displayPortals.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              Ativos ({displayPortals.filter(p => p.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-rose-500/20 text-rose-300 font-bold border border-rose-500/40'
                  : 'text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              Suspensos ({displayPortals.filter(p => p.status === 'inactive').length})
            </button>
          </div>
        </div>
      </div>

      {/* Portals List Cards */}
      <div className="space-y-4">
        {filteredPortals.map((p) => {
          const isSample = p.id === SAMPLE_CLIENT_PORTAL.id;
          const showPassword = !!showPasswordMap[p.id];
          const primaryProject = p.projects?.[0];

          // Check linkage to office registry
          const linkedOfficeClient = clients.find(
            c => c.id === p.clientId ||
                 (c.email && c.email.toLowerCase() === p.clientEmail.toLowerCase()) ||
                 c.name.toLowerCase() === p.clientName.toLowerCase()
          );

          const linkedOfficeProject = architectureProjects.find(
            ap => p.projects?.some(proj => proj.id === ap.id || proj.title.toLowerCase() === ap.title.toLowerCase())
          );

          return (
            <div
              key={p.id}
              className={`bg-[#1a1614] border rounded-2xl p-5 sm:p-6 transition-all hover:border-[var(--theme-primary)]/50 space-y-4 shadow-sm ${
                p.status === 'active' ? 'border-[#3d342f]' : 'border-rose-900/40 opacity-80'
              }`}
            >
              {/* Header row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#3d342f]/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#241e1b] border border-[#3d342f] text-[var(--theme-primary)] flex items-center justify-center font-bold text-base">
                    {p.clientName ? p.clientName.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-[#fcf8f5] text-base">
                        {p.clientName}
                      </h3>
                      {isSample && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                          Modelo / Demonstração
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        p.status === 'active' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}>
                        {p.status === 'active' ? '● Acesso Liberado' : '○ Acesso Suspenso'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-[#a89c93] mt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-[#a89c93]" />
                        {p.clientEmail}
                      </span>
                      {p.clientPhone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-[#a89c93]" />
                          {p.clientPhone}
                        </span>
                      )}
                    </div>

                    {/* Office Connection Badges */}
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {linkedOfficeClient ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Cliente conectado ao cadastro</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#241e1b] text-[#a89c93] border border-[#3d342f]">
                          <Building2 className="w-3 h-3 text-[#a89c93]" />
                          <span>Cliente não vinculado</span>
                        </span>
                      )}

                      {linkedOfficeProject ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-400 border border-blue-500/25">
                          <FolderOpen className="w-3 h-3 text-blue-400" />
                          <span>Projeto vinculado: {linkedOfficeProject.title}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[#241e1b] text-[#a89c93] border border-[#3d342f]">
                          <FolderOpen className="w-3 h-3 text-[#a89c93]" />
                          <span>Projeto local</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => handleOpenClientPortal(p)}
                    className="px-3 py-1.5 rounded-xl bg-[#251f1b] hover:bg-[#322a24] text-[#fcf8f5] hover:text-[var(--theme-primary)] border border-[#3d342f] hover:border-[var(--theme-primary)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Visualizar o portal como o cliente visualiza"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                    <span>Visualizar Portal</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedPortalForEdit(p);
                      setIsManagerModalOpen(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-[#241e1b] hover:bg-[#2d2521] text-[#fcf8f5] border border-[#3d342f] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Gerenciar fases, documentos e configurações"
                  >
                    <Settings2 className="w-3.5 h-3.5 text-[#a89c93]" />
                    <span>Gerenciar Portal</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(p)}
                    className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                      p.status === 'active'
                        ? 'border-[#3d342f] text-[#a89c93] hover:text-rose-400 hover:border-rose-500/30'
                        : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                    }`}
                    title={p.status === 'active' ? 'Suspender Acesso' : 'Ativar Acesso'}
                  >
                    <Power className="w-4 h-4" />
                  </button>

                  {!isSample && (
                    <button
                      onClick={() => handleDeletePortal(p)}
                      className="p-1.5 rounded-xl border border-[#3d342f] text-[#a89c93] hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer"
                      title="Excluir Acesso"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Projects & Credentials Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                
                {/* Projects Column */}
                <div className="md:col-span-2 space-y-2">
                  <span className="text-[10px] font-bold text-[#a89c93] uppercase tracking-wider block">
                    Projetos Vinculados ({p.projects?.length || 0})
                  </span>
                  
                  <div className="space-y-2">
                    {(p.projects || []).map((proj) => (
                      <div
                        key={proj.id}
                        className="bg-[#14110f] border border-[#3d342f] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <span className="font-bold text-[#fcf8f5] block">
                            {proj.title}
                          </span>
                          <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#a89c93]">
                            <span className="px-2 py-0.5 rounded-md bg-[#241e1b] border border-[#3d342f] text-[var(--theme-primary)] font-medium">
                              Fase: {proj.currentStageName || proj.status}
                            </span>
                            <span>•</span>
                            <span>Progresso: <strong className="text-[#fcf8f5]">{proj.progressPercent || 0}%</strong></span>
                            {proj.deliveryDate && (
                              <>
                                <span>•</span>
                                <span>Previsão: {proj.deliveryDate}</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Progress mini bar */}
                        <div className="w-full sm:w-28 space-y-1">
                          <div className="h-1.5 w-full bg-[#241e1b] rounded-full overflow-hidden border border-[#3d342f]">
                            <div 
                              className="h-full bg-[var(--theme-primary)] rounded-full transition-all"
                              style={{ width: `${proj.progressPercent || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Access Credentials & Sharing Column */}
                <div className="bg-[#14110f] border border-[#3d342f] rounded-xl p-3.5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-[#a89c93] uppercase tracking-wider block">
                      Credenciais do Cliente
                    </span>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between bg-[#1c1815] px-2.5 py-1.5 rounded-lg border border-[#3d342f]">
                        <span className="text-[11px] text-[#a89c93]">Código / Senha:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[var(--theme-primary)] text-xs">
                            {showPassword ? p.accessCode : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleShowPassword(p.id)}
                            className="text-[#a89c93] hover:text-[#fcf8f5] transition-colors cursor-pointer"
                            title={showPassword ? 'Ocultar código' : 'Ver código'}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleCopyCredentials(p)}
                          className="flex-1 py-1.5 px-2 bg-[#241e1b] hover:bg-[#2e2622] text-[#fcf8f5] border border-[#3d342f] rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Copiar mensagem com credenciais completas"
                        >
                          {copiedId === p.id + '-text' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3 text-[#a89c93]" />
                              <span>Copiar Texto</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleCopyLink(p)}
                          className="flex-1 py-1.5 px-2 bg-[#241e1b] hover:bg-[#2e2622] text-[#fcf8f5] border border-[#3d342f] rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                          title="Copiar link direto para envio"
                        >
                          {copiedId === p.id + '-link' ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Link Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Share2 className="w-3 h-3 text-[#a89c93]" />
                              <span>Link Direto</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Send via WhatsApp Button */}
                  {p.clientPhone && (
                    <button
                      onClick={() => handleOpenWhatsApp(p)}
                      className="w-full py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Enviar Acesso no WhatsApp</span>
                    </button>
                  )}
                </div>

              </div>

              {/* Bottom quick stats */}
              <div className="flex items-center justify-between pt-2 border-t border-[#3d342f]/40 text-[11px] text-[#a89c93]">
                <div className="flex items-center gap-4">
                  <span>Arquivos disponibilizados: <strong className="text-[#fcf8f5]">{p.documents?.length || 0}</strong></span>
                  <span>Mensagens no chat: <strong className="text-[#fcf8f5]">{p.messages?.length || 0}</strong></span>
                </div>
                <div>
                  {p.lastLoginAt ? (
                    <span>Último acesso do cliente: {new Date(p.lastLoginAt).toLocaleDateString('pt-BR')}</span>
                  ) : (
                    <span className="italic">Cliente ainda não fez o primeiro login</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Guide Card for the Office */}
      <div className="bg-[#161311] border border-[#3d342f] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#fcf8f5]">
          <Sparkles className="w-4 h-4 text-[var(--theme-primary)]" />
          <span>Como funciona a segurança e o isolamento do Radar da Cliente?</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[#a89c93]">
          <div className="space-y-1.5 p-3.5 rounded-xl bg-[#1c1815] border border-[#3d342f]/60">
            <strong className="text-[#fcf8f5] block">1. Total Isolamento de Dados</strong>
            <p className="leading-relaxed">
              Cada cliente acessa estritamente o seu projeto. Informações internas, custos, margens de lucro, fornecedores e notas da equipe permanecem 100% confidenciais.
            </p>
          </div>
          <div className="space-y-1.5 p-3.5 rounded-xl bg-[#1c1815] border border-[#3d342f]/60">
            <strong className="text-[#fcf8f5] block">2. Controle em Tempo Real</strong>
            <p className="leading-relaxed">
              Tudo o que você atualizar na tela de gestão (avançar de fase, adicionar prancha em PDF ou enviar mensagem) é refletido instantaneamente no radar da cliente.
            </p>
          </div>
          <div className="space-y-1.5 p-3.5 rounded-xl bg-[#1c1815] border border-[#3d342f]/60">
            <strong className="text-[#fcf8f5] block">3. Gestão Centralizada no Escritório</strong>
            <p className="leading-relaxed">
              Você e sua equipe gerenciam prazos, etapas, pranchas em PDF, senhas e canais de atendimento diretamente por este painel, com praticidade total.
            </p>
          </div>
        </div>
      </div>

      {/* Shared Office Client Portal Manager Modal */}
      <OfficeClientPortalManagerModal
        isOpen={isManagerModalOpen}
        onClose={() => {
          setIsManagerModalOpen(false);
          setSelectedPortalForEdit(null);
        }}
        initialPortal={selectedPortalForEdit}
      />

    </div>
  );
};
