import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Building2, 
  LogOut, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  FolderKanban, 
  FileText, 
  MessageSquare, 
  Send, 
  Download, 
  AlertTriangle, 
  ChevronRight, 
  Layers, 
  UserCheck, 
  Phone, 
  Mail, 
  ShieldCheck, 
  ExternalLink,
  Sparkles,
  Info,
  Check,
  FileCheck2,
  Paperclip,
  Settings2,
  ArrowLeft,
  Crown,
  Eye,
  SlidersHorizontal,
  Plus
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';
import { 
  ClientPortalAccess, 
  ClientPortalMessage,
  ClientPortalProject, 
  ClientProjectHealthStatus 
} from '../../types';
import { 
  subscribeToClientPortal, 
  sendPortalMessage,
  subscribeToOfficePortals,
  buildClientPortalAccess,
  syncPortalWithOfficeRegistry,
  SAMPLE_CLIENT_PORTAL 
} from '../../services/clientPortalService';
import { OfficeClientPortalManagerModal } from './OfficeClientPortalManagerModal';

export const ClientPortalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { clients, architectureProjects, architectProfile } = useFinance();

  const isAdminParam = searchParams.get('admin') === 'true';
  const requestedPortalId = searchParams.get('portalId');
  const requestedClientId = searchParams.get('clientId');
  const isAdminMode = isAdminParam || !!user;

  const [officePortals, setOfficePortals] = useState<ClientPortalAccess[]>([SAMPLE_CLIENT_PORTAL]);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [adminSenderRole, setAdminSenderRole] = useState<'office' | 'client'>('office');

  const [portal, setPortal] = useState<ClientPortalAccess>(() => {
    const raw = sessionStorage.getItem('client_portal_session');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // fallback
      }
    }
    return SAMPLE_CLIENT_PORTAL;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'etapas' | 'documentos' | 'mensagens'>('etapas');
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Synchronize the portal state in real time with the Office database
  const effectivePortal = useMemo(() => {
    const targetClientId = requestedClientId || portal.clientId;
    const matchedClient = clients.find(
      (c) =>
        (targetClientId && c.id === targetClientId) ||
        (requestedPortalId && (requestedPortalId === `portal-${c.id}` || requestedPortalId === c.id)) ||
        (portal.clientEmail && c.email && c.email.trim().toLowerCase() === portal.clientEmail.trim().toLowerCase()) ||
        (portal.clientName && c.name.trim().toLowerCase() === portal.clientName.trim().toLowerCase())
    );

    if (matchedClient) {
      return buildClientPortalAccess(matchedClient, architectureProjects, architectProfile, portal);
    }

    return syncPortalWithOfficeRegistry(portal, clients, architectureProjects, architectProfile);
  }, [portal, clients, architectureProjects, architectProfile, requestedClientId, requestedPortalId]);

  // All client portal options available for office preview
  const allOfficeClientPortals = useMemo(() => {
    if (clients && clients.length > 0) {
      return clients.map((c) => {
        const match = officePortals.find(
          (p) =>
            p.clientId === c.id ||
            (p.clientEmail && c.email && p.clientEmail.trim().toLowerCase() === c.email.trim().toLowerCase()) ||
            p.clientName.trim().toLowerCase() === c.name.trim().toLowerCase()
        );
        return buildClientPortalAccess(c, architectureProjects, architectProfile, match);
      });
    }
    return officePortals.length > 0 ? officePortals : [SAMPLE_CLIENT_PORTAL];
  }, [clients, officePortals, architectureProjects, architectProfile]);

  // Load office portals if admin/office user is logged in
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToOfficePortals(user.uid, (list) => {
      if (list && list.length > 0) {
        setOfficePortals(list);
        if (requestedPortalId) {
          const matched = list.find((p) => p.id === requestedPortalId);
          if (matched) {
            setPortal(matched);
            sessionStorage.setItem('client_portal_session', JSON.stringify(matched));
          }
        }
      }
    });
    return () => unsubscribe();
  }, [user, requestedPortalId]);

  // Subscribe to real-time updates if connected to a real Firestore document
  useEffect(() => {
    if (!portal || portal.id === SAMPLE_CLIENT_PORTAL.id) {
      return;
    }

    const unsubscribe = subscribeToClientPortal(portal.id, (updatedPortal) => {
      if (updatedPortal) {
        setPortal(updatedPortal);
        sessionStorage.setItem('client_portal_session', JSON.stringify(updatedPortal));
      } else if (!isAdminMode) {
        sessionStorage.removeItem('client_portal_session');
        navigate('/cliente/login');
      }
    });

    return () => unsubscribe();
  }, [portal?.id, isAdminMode, navigate]);

  // Set default active project based on effectivePortal
  useEffect(() => {
    if (effectivePortal.projects && effectivePortal.projects.length > 0) {
      if (!activeProjectId || !effectivePortal.projects.some((p) => p.id === activeProjectId)) {
        setActiveProjectId(effectivePortal.projects[0].id);
      }
    } else {
      setActiveProjectId('');
    }
  }, [effectivePortal.projects, activeProjectId]);

  const handleLogout = () => {
    sessionStorage.removeItem('client_portal_session');
    navigate('/cliente/login');
  };

  const currentProject = effectivePortal.projects?.find((p) => p.id === activeProjectId) || effectivePortal.projects?.[0];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim()) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');

    const sender = isAdminMode ? adminSenderRole : 'client';
    const senderName = sender === 'office' ? `${effectivePortal.officeName} (Equipe)` : effectivePortal.clientName;

    const newMsg: ClientPortalMessage = {
      id: `msg-${Date.now()}`,
      sender,
      senderName,
      text: textToSend,
      createdAt: new Date().toISOString()
    };

    const updated = {
      ...portal,
      messages: [...(effectivePortal.messages || []), newMsg]
    };
    setPortal(updated);
    sessionStorage.setItem('client_portal_session', JSON.stringify(updated));

    if (portal.id === SAMPLE_CLIENT_PORTAL.id || !portal.id.startsWith('portal-')) {
      if (sender === 'client') {
        setTimeout(() => {
          const replyMsg: ClientPortalMessage = {
            id: `msg-${Date.now() + 1}`,
            sender: 'office',
            senderName: `${effectivePortal.officeName} (Equipe)`,
            text: 'Recebemos sua mensagem! Nossa equipe já registrou a solicitação e responderemos em breve.',
            createdAt: new Date().toISOString()
          };
          setPortal((prev) => {
            const up = { ...prev, messages: [...(prev.messages || []), replyMsg] };
            sessionStorage.setItem('client_portal_session', JSON.stringify(up));
            return up;
          });
        }, 1200);
      }
      return;
    }

    setSendingMessage(true);
    try {
      await sendPortalMessage(
        portal.id,
        sender,
        senderName,
        textToSend
      );
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const getHealthBadge = (health?: ClientProjectHealthStatus) => {
    switch (health) {
      case 'no_prazo':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            No Prazo
          </span>
        );
      case 'atencao':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            Em Atenção
          </span>
        );
      case 'atrasado':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Atrasado
          </span>
        );
      case 'concluido':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <Check className="w-3.5 h-3.5" />
            Concluído
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Em Andamento
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#12100e] text-[#fcf8f5] flex flex-col font-sans selection:bg-[var(--theme-primary)]/30">
      
      {/* Top Office Preview Control Bar - only displayed when architect is logged into the system */}
      {user && (
        <div className="bg-gradient-to-r from-[#211a14] via-[#2c2219] to-[#211a14] border-b border-[var(--theme-primary)]/40 px-4 py-2.5 text-xs text-[#fcf8f5] shadow-lg sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-[var(--theme-primary)] text-black font-bold text-xs flex items-center gap-1.5 shadow-sm">
                <Building2 className="w-3.5 h-3.5" />
                <span>Visualização pelo Escritório</span>
              </span>

              {/* Client Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[#a89c93] hidden sm:inline">Cliente:</span>
                <select
                  value={effectivePortal.clientId || effectivePortal.id}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const pool = [...allOfficeClientPortals, SAMPLE_CLIENT_PORTAL];
                    const found = pool.find((p) => p.id === selectedId || p.clientId === selectedId);
                    if (found) {
                      const synced = syncPortalWithOfficeRegistry(found, clients, architectureProjects, architectProfile);
                      setPortal(synced);
                      sessionStorage.setItem('client_portal_session', JSON.stringify(synced));
                      if (synced.projects && synced.projects.length > 0) {
                        setActiveProjectId(synced.projects[0].id);
                      }
                    }
                  }}
                  className="bg-[#14110f] border border-[#3d342f] text-[var(--theme-primary)] font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[var(--theme-primary)] cursor-pointer"
                >
                  {allOfficeClientPortals.map((p) => (
                    <option key={p.id} value={p.clientId || p.id}>
                      {p.clientName} ({p.projects?.length || 0} {p.projects?.length === 1 ? 'projeto' : 'projetos'})
                    </option>
                  ))}
                  {!allOfficeClientPortals.some((p) => p.id === SAMPLE_CLIENT_PORTAL.id) && (
                    <option value={SAMPLE_CLIENT_PORTAL.id}>
                      {SAMPLE_CLIENT_PORTAL.clientName} (Modelo Demonstração)
                    </option>
                  )}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsManagerModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-[#2e2621] hover:bg-[#382f29] text-[var(--theme-primary)] border border-[var(--theme-primary)]/40 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Editar etapas, status, documentos e credenciais deste portal"
              >
                <Settings2 className="w-3.5 h-3.5" />
                <span>Gerenciar Este Portal</span>
              </button>

              <button
                onClick={() => {
                  localStorage.setItem('meo_active_view', 'app');
                  navigate('/app');
                }}
                className="px-3 py-1.5 rounded-lg bg-[var(--theme-primary)] hover:brightness-110 text-black font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Painel do Escritório</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Client Navbar */}
      <header className="sticky top-0 z-40 bg-[#161210]/95 backdrop-blur-md border-b border-[#3d342f] px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Office Branding */}
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              <Building2 className="w-6 h-6 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-serif font-bold text-base sm:text-lg text-[#fcf8f5] leading-tight">
                  {effectivePortal.officeName || 'Meu Escritório Online'}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Portal Seguro
                </span>
              </div>
              <span className="text-[11px] text-[#a89c93] block">
                Cliente: <strong className="text-[#fcf8f5]">{effectivePortal.clientName}</strong>
              </span>
            </div>
          </div>

          {/* Right Controls: Office contact & Logout */}
          <div className="flex items-center gap-2 sm:gap-4">
            {effectivePortal.officePhone && (
              <a
                href={`https://wa.me/${effectivePortal.officePhone.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="hidden md:flex items-center gap-1.5 text-xs text-[#a89c93] hover:text-emerald-400 border border-[#3d342f] px-3 py-1.5 rounded-xl transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-400" />
                <span>WhatsApp Escritório</span>
              </a>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-[#3d342f] text-[#a89c93] hover:text-red-400 hover:border-red-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair do Portal</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
        
        {/* Project Switcher Bar (if more than 1 project) */}
        {effectivePortal.projects && effectivePortal.projects.length > 1 && (
          <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-[#a89c93]">
              <Layers className="w-4 h-4 text-[var(--theme-primary)]" />
              <span>Você possui <strong>{effectivePortal.projects.length} projetos</strong> com este escritório:</span>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto">
              {effectivePortal.projects.map((proj) => (
                <button
                  key={proj.id}
                  onClick={() => setActiveProjectId(proj.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    activeProjectId === proj.id
                      ? 'bg-[var(--theme-primary)] text-black shadow-md'
                      : 'bg-[#12100e] border border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5]'
                  }`}
                >
                  {proj.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Project Hero / Status Card */}
        {currentProject ? (
          <div className="bg-[#1a1614] border border-[#3d342f] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
            
            {/* Header with Title & Health */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#3d342f]/80">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-[var(--theme-primary)] font-bold">
                    {currentProject.category || 'Projeto em Andamento'}
                  </span>
                  {currentProject.contractStatus && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-[#26201c] text-[#a89c93] border border-[#3d342f]">
                      {currentProject.contractStatus}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#fcf8f5]">
                  {currentProject.title}
                </h1>
                {currentProject.description && (
                  <p className="text-xs sm:text-sm text-[#a89c93] mt-1 max-w-2xl">
                    {currentProject.description}
                  </p>
                )}
              </div>

              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                {getHealthBadge(currentProject.generalStatus)}
                <div className="text-xs text-[#a89c93] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                  <span>Previsão de Entrega: <strong className="text-[#fcf8f5]">{currentProject.deliveryDate || 'A definir'}</strong></span>
                </div>
              </div>
            </div>

            {/* Current Stage & Progress Bar */}
            <div className="py-6 border-b border-[#3d342f]/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs text-[#a89c93] block">Fase Atual do Projeto:</span>
                  <div className="text-lg sm:text-xl font-serif font-bold text-[var(--theme-primary)] flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    <span>{currentProject.currentStageName || 'Em Execução'}</span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-[#a89c93]">Progresso Estimado:</span>
                  <span className="text-lg font-bold text-[#fcf8f5] ml-2">
                    {currentProject.progressPercent || 0}%
                  </span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="w-full bg-[#12100e] h-3 rounded-full overflow-hidden border border-[#3d342f]/60 p-0.5">
                <div 
                  className="h-full rounded-full transition-all duration-700 shadow-sm"
                  style={{ 
                    width: `${Math.max(5, Math.min(100, currentProject.progressPercent || 15))}%`,
                    backgroundColor: 'var(--theme-primary)'
                  }}
                />
              </div>
            </div>

            {/* Key Project Numbers / Contract overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 text-left">
              <div className="bg-[#12100e] border border-[#3d342f]/60 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase text-[#a89c93] font-bold block mb-1">
                  Início do Projeto
                </span>
                <span className="text-sm font-bold text-[#fcf8f5]">
                  {currentProject.startDate || 'Confirmado'}
                </span>
              </div>

              <div className="bg-[#12100e] border border-[#3d342f]/60 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase text-[#a89c93] font-bold block mb-1">
                  Entrega Prevista
                </span>
                <span className="text-sm font-bold text-[var(--theme-primary)]">
                  {currentProject.deliveryDate || 'No Cronograma'}
                </span>
              </div>

              <div className="bg-[#12100e] border border-[#3d342f]/60 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase text-[#a89c93] font-bold block mb-1">
                  Etapas Concluídas
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  {currentProject.stages?.filter((s) => s.status === 'completed').length || 0} de {currentProject.stages?.length || 1}
                </span>
              </div>

              <div className="bg-[#12100e] border border-[#3d342f]/60 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase text-[#a89c93] font-bold block mb-1">
                  Documentos & Arquivos
                </span>
                <span className="text-sm font-bold text-[#fcf8f5]">
                  {effectivePortal.documents?.length || 0} disponíveis
                </span>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-[#1a1614] border border-[#3d342f] rounded-3xl p-8 text-center space-y-4">
            <FolderKanban className="w-12 h-12 text-[var(--theme-primary)] mx-auto opacity-70" />
            <h3 className="text-lg font-bold text-[#fcf8f5]">Nenhum projeto associado no momento</h3>
            <p className="text-xs text-[#a89c93] max-w-md mx-auto">
              Quando um projeto for cadastrado ou atualizado no gestor do escritório para este cliente, ele aparecerá aqui automaticamente com todas as etapas e entregas em tempo real.
            </p>
            {isAdminMode && (
              <button
                onClick={() => {
                  localStorage.setItem('meo_active_view', 'app');
                  navigate('/app?tab=projetos');
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--theme-primary)] text-black font-bold text-xs hover:brightness-110 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Projeto no Gestor</span>
              </button>
            )}
          </div>
        )}

        {/* Navigation Tabs: Etapas & Linha do Tempo | Documentos & Entregáveis | Mensagens */}
        <div className="flex border-b border-[#3d342f] gap-2 sm:gap-6">
          <button
            onClick={() => setActiveTab('etapas')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'etapas'
                ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                : 'border-transparent text-[#a89c93] hover:text-[#fcf8f5]'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Linha do Tempo & Fases</span>
          </button>

          <button
            onClick={() => setActiveTab('documentos')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'documentos'
                ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                : 'border-transparent text-[#a89c93] hover:text-[#fcf8f5]'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Documentos & Entregáveis ({effectivePortal.documents?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('mensagens')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'mensagens'
                ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                : 'border-transparent text-[#a89c93] hover:text-[#fcf8f5]'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Mensagens & Avisos ({effectivePortal.messages?.length || 0})</span>
          </button>
        </div>

        {/* TAB 1: ETAPAS & LINHA DO TEMPO */}
        {activeTab === 'etapas' && (
          <div className="space-y-6">
            <div className="bg-[#1a1614] border border-[#3d342f] rounded-3xl p-6 sm:p-8">
              <h2 className="text-xl font-serif font-bold text-[#fcf8f5] mb-1">
                Evolução Passo a Passo do Projeto
              </h2>
              <p className="text-xs text-[#a89c93] mb-8">
                Acompanhe o que já foi finalizado e quais são os próximos passos agendados para a entrega do seu serviço.
              </p>

              {currentProject?.stages && currentProject.stages.length > 0 ? (
                <div className="relative border-l-2 border-[#3d342f] ml-4 sm:ml-6 space-y-8 pl-6 sm:pl-8">
                  {currentProject.stages.map((stage, idx) => {
                    const isCompleted = stage.status === 'completed';
                    const isInProgress = stage.status === 'in_progress';

                    return (
                      <div key={stage.id || idx} className="relative group">
                        
                        {/* Status Icon on line */}
                        <div 
                          className={`absolute -left-[35px] sm:-left-[43px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                            isCompleted 
                              ? 'bg-emerald-500 border-emerald-400 text-black shadow-lg shadow-emerald-500/20' 
                              : isInProgress
                              ? 'bg-[#1a1614] border-[var(--theme-primary)] text-[var(--theme-primary)] ring-4 ring-[var(--theme-primary)]/20 animate-pulse'
                              : 'bg-[#12100e] border-[#3d342f] text-[#6b625b]'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="w-4 h-4 stroke-[3]" />
                          ) : isInProgress ? (
                            <Clock className="w-4 h-4" />
                          ) : (
                            <span className="text-xs font-bold">{idx + 1}</span>
                          )}
                        </div>

                        {/* Stage Card */}
                        <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                          isInProgress
                            ? 'bg-[#1f1a17] border-[var(--theme-primary)]/60 shadow-lg'
                            : isCompleted
                            ? 'bg-[#141210] border-[#3d342f]'
                            : 'bg-[#12100e] border-[#29221d] opacity-80'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className={`text-base font-bold ${
                                isCompleted ? 'text-[#fcf8f5]' : isInProgress ? 'text-[var(--theme-primary)]' : 'text-[#a89c93]'
                              }`}>
                                {stage.name}
                              </h3>
                              {isInProgress && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--theme-primary)] text-black">
                                  Fase Atual
                                </span>
                              )}
                              {isCompleted && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                                  Concluído
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-[#a89c93]">
                              {isCompleted && stage.completedAt 
                                ? `Finalizado em: ${stage.completedAt}` 
                                : stage.plannedDate 
                                ? `Previsão: ${stage.plannedDate}` 
                                : 'Em cronograma'}
                            </span>
                          </div>

                          {stage.description && (
                            <p className="text-xs text-[#a89c93] leading-relaxed">
                              {stage.description}
                            </p>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-[#a89c93] text-xs">
                  As etapas detalhadas deste projeto estão sendo definidas pela equipe e serão exibidas aqui.
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DOCUMENTOS & ARQUIVOS */}
        {activeTab === 'documentos' && (
          <div className="space-y-6">
            <div className="bg-[#1a1614] border border-[#3d342f] rounded-3xl p-6 sm:p-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#fcf8f5]">
                    Documentos & Arquivos do Projeto
                  </h2>
                  <p className="text-xs text-[#a89c93] mt-1">
                    Baixe vias digitais do contrato assinado, relatórios de visita, plantas e arquivos entregues pelo escritório.
                  </p>
                </div>
                <span className="text-xs bg-[#241e1b] px-3 py-1.5 rounded-xl border border-[#3d342f] text-[#a89c93] self-start sm:self-center">
                  Total: <strong>{effectivePortal.documents?.length || 0} arquivos</strong>
                </span>
              </div>

              {effectivePortal.documents && effectivePortal.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {effectivePortal.documents.map((docItem) => (
                    <div 
                      key={docItem.id}
                      className="bg-[#12100e] border border-[#3d342f] p-4 rounded-2xl flex items-center justify-between gap-4 hover:border-[var(--theme-primary)]/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-[var(--theme-badge-bg)] text-[var(--theme-primary)] flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <h4 className="text-sm font-bold text-[#fcf8f5] truncate">
                            {docItem.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-[#a89c93] mt-0.5">
                            <span className="capitalize">{docItem.category || 'Documento'}</span>
                            <span>•</span>
                            <span>{new Date(docItem.date).toLocaleDateString('pt-BR')}</span>
                            {docItem.size && <span>• {docItem.size}</span>}
                          </div>
                        </div>
                      </div>

                      {docItem.fileUrl ? (
                        <a
                          href={docItem.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 rounded-xl bg-[#241e1b] hover:bg-[var(--theme-primary)] hover:text-black text-xs font-bold text-[#fcf8f5] flex items-center gap-1.5 transition-colors shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </a>
                      ) : (
                        <button
                          onClick={() => alert(`Visualização do arquivo: ${docItem.title}\nSolicite a versão em alta resolução ao escritório caso precise de impressão.`)}
                          className="px-3.5 py-2 rounded-xl bg-[#241e1b] hover:bg-[var(--theme-primary)] hover:text-black text-xs font-bold text-[#fcf8f5] flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Acessar</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-[#12100e] border border-dashed border-[#3d342f] rounded-2xl p-8 text-center text-xs text-[#a89c93]">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-[#6b625b]" />
                  <p>Nenhum documento anexado ainda.</p>
                  <p className="text-[11px] mt-1 text-[#6b625b]">
                    Assim que minutas, relatórios ou entregáveis forem disponibilizados pelo escritório, eles aparecerão nesta área para download.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: MENSAGENS & COMUNICAÇÃO */}
        {activeTab === 'mensagens' && (
          <div className="space-y-6">
            <div className="bg-[#1a1614] border border-[#3d342f] rounded-3xl p-6 sm:p-8 flex flex-col h-[580px]">
              
              <div className="pb-4 border-b border-[#3d342f] mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-serif font-bold text-[#fcf8f5]">
                    Canal Direto com o Escritório
                  </h2>
                  <p className="text-xs text-[#a89c93]">
                    Envie observações, dúvidas ou feedbacks sobre o projeto para a equipe responsável.
                  </p>
                </div>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Escritório Online
                </span>
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4">
                {effectivePortal.messages && effectivePortal.messages.length > 0 ? (
                  effectivePortal.messages.map((msg) => {
                    const isClient = msg.sender === 'client';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isClient ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isClient
                              ? 'bg-[var(--theme-primary)] text-black font-medium rounded-br-none shadow-md'
                              : 'bg-[#12100e] border border-[#3d342f] text-[#fcf8f5] rounded-bl-none'
                          }`}
                        >
                          <div className={`text-[10px] font-bold mb-1 opacity-70 ${isClient ? 'text-black' : 'text-[var(--theme-primary)]'}`}>
                            {msg.senderName || (isClient ? 'Você' : 'Equipe do Escritório')}
                          </div>
                          <p>{msg.text}</p>
                          <div className={`text-[9px] mt-1.5 text-right opacity-60`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[#a89c93] space-y-2">
                    <MessageSquare className="w-8 h-8 text-[#6b625b]" />
                    <p>Nenhuma mensagem trocada ainda.</p>
                    <p className="text-[11px] text-[#6b625b] max-w-sm">
                      Envie uma mensagem abaixo para falar com o escritório sobre o andamento do seu projeto.
                    </p>
                  </div>
                )}
              </div>

              {/* If Admin mode, allow choosing who to send as */}
              {isAdminMode && (
                <div className="pt-2 pb-1 flex items-center justify-between text-xs border-t border-[#3d342f]/70">
                  <span className="text-[#a89c93] flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                    <span>Responder mensagem como:</span>
                  </span>
                  <div className="flex items-center gap-1 bg-[#12100e] p-1 rounded-lg border border-[#3d342f]">
                    <button
                      type="button"
                      onClick={() => setAdminSenderRole('office')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        adminSenderRole === 'office'
                          ? 'bg-[var(--theme-primary)] text-black shadow-sm'
                          : 'text-[#a89c93] hover:text-[#fcf8f5]'
                      }`}
                    >
                      🏢 Equipe do Escritório
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminSenderRole('client')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        adminSenderRole === 'client'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'text-[#a89c93] hover:text-[#fcf8f5]'
                      }`}
                    >
                      👤 Simular Cliente
                    </button>
                  </div>
                </div>
              )}

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-[#3d342f] flex gap-2">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder={isAdminMode && adminSenderRole === 'office' ? "Escreva uma resposta oficial da equipe para o cliente..." : "Escreva sua mensagem ou dúvida sobre o projeto..."}
                  className="flex-1 bg-[#12100e] border border-[#3d342f] rounded-xl px-4 py-3 text-xs text-[#fcf8f5] placeholder-[#6b625b] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !newMessageText.trim()}
                  className="px-5 py-3 rounded-xl bg-[var(--theme-primary)] hover:brightness-110 text-black font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Enviar</span>
                </button>
              </form>

            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-[#3d342f]/40 py-6 text-center text-xs text-[#a89c93] mt-12">
        <p>
          {effectivePortal.officeName || 'Meu Escritório Online'} • Portal do Cliente • Acompanhamento em Tempo Real
        </p>
      </footer>

      {/* Office Manager Modal when admin clicks Gerenciar Este Portal */}
      <OfficeClientPortalManagerModal
        isOpen={isManagerModalOpen}
        onClose={() => setIsManagerModalOpen(false)}
        portalToEdit={effectivePortal.id === SAMPLE_CLIENT_PORTAL.id ? undefined : effectivePortal}
        onSaveSuccess={(updatedPortal) => {
          setPortal(updatedPortal);
          sessionStorage.setItem('client_portal_session', JSON.stringify(updatedPortal));
        }}
      />

    </div>
  );
};
