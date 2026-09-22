import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  fetchPortalMessages,
  subscribeToOfficePortals,
  buildClientPortalAccess,
  syncPortalWithOfficeRegistry,
  savePortalLocally,
  isPortalEqual,
  SAMPLE_CLIENT_PORTAL 
} from '../../services/clientPortalService';
import { OfficeClientPortalManagerModal } from './OfficeClientPortalManagerModal';

export const ClientPortalDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { clients, architectureProjects, architectProfile, projectMilestones } = useFinance();

  const isAdminParam = searchParams.get('admin') === 'true';
  const isClientView = searchParams.get('clientView') === 'true';
  const requestedPortalId = searchParams.get('portalId');
  const requestedClientId = searchParams.get('clientId');
  // Admin mode is only active when explicitly requested via URL (e.g. from office tab simulator)
  const isAdminMode = !isClientView && isAdminParam === true;

  const [officePortals, setOfficePortals] = useState<ClientPortalAccess[]>([SAMPLE_CLIENT_PORTAL]);
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [adminSenderRole, setAdminSenderRole] = useState<'office' | 'client'>('office');

  const [portal, setPortal] = useState<ClientPortalAccess>(() => {
    const raw = sessionStorage.getItem('client_portal_session') || localStorage.getItem('client_portal_session');
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
      return buildClientPortalAccess(matchedClient, architectureProjects, architectProfile, portal, projectMilestones);
    }

    return syncPortalWithOfficeRegistry(portal, clients, architectureProjects, architectProfile, projectMilestones);
  }, [portal, clients, architectureProjects, architectProfile, projectMilestones, requestedClientId, requestedPortalId]);

  // All client portal options available for office preview
  const allOfficeClientPortals = useMemo(() => {
    const activeClients = (clients || []).filter((c) => c.status !== 'lead');
    if (activeClients.length > 0) {
      return activeClients.map((c) => {
        const match = officePortals.find(
          (p) =>
            p.clientId === c.id ||
            (p.clientEmail && c.email && p.clientEmail.trim().toLowerCase() === c.email.trim().toLowerCase()) ||
            p.clientName.trim().toLowerCase() === c.name.trim().toLowerCase()
        );
        return buildClientPortalAccess(c, architectureProjects, architectProfile, match, projectMilestones);
      });
    }
    return officePortals.length > 0 ? officePortals.filter(p => p.id !== SAMPLE_CLIENT_PORTAL.id) : [];
  }, [clients, officePortals, architectureProjects, architectProfile, projectMilestones]);

  // Load office portals if admin/office user is logged in
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToOfficePortals(user.uid, (list) => {
      if (list && list.length > 0) {
        setOfficePortals((prev) => (JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
        if (requestedPortalId) {
          const matched = list.find((p) => p.id === requestedPortalId || p.clientId === requestedPortalId);
          if (matched) {
            setPortal((prev) => {
              if (JSON.stringify(prev) === JSON.stringify(matched)) return prev;
              sessionStorage.setItem('client_portal_session', JSON.stringify(matched));
              return matched;
            });
          }
        }
      }
    });
    return () => unsubscribe();
  }, [user, requestedPortalId]);

  // Load portal from server when opened in a fresh browser session (or via URL parameters)
  useEffect(() => {
    const fetchPortalFromUrlOrServer = async () => {
      const pId = requestedPortalId || portal.id;
      const cId = requestedClientId || portal.clientId;
      const pEmail = portal.clientEmail;

      if (!pId && !cId && !pEmail) return;

      try {
        const qs = new URLSearchParams();
        if (pId) qs.set('id', pId);
        if (cId) qs.set('id', cId);
        if (pEmail) qs.set('email', pEmail);

        const res = await fetch(`/api/portals/lookup?${qs.toString()}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.portal) {
            setPortal((prev) => {
              if (isPortalEqual(prev, data.portal)) {
                return prev;
              }
              const mergedMessages = (data.portal.messages && data.portal.messages.length > 0)
                ? data.portal.messages
                : prev.messages;
              const mergedProjects = (data.portal.projects && data.portal.projects.length > 0)
                ? data.portal.projects
                : prev.projects;
              const updated = {
                ...prev,
                ...data.portal,
                messages: mergedMessages,
                projects: mergedProjects
              };
              sessionStorage.setItem('client_portal_session', JSON.stringify(updated));
              return updated;
            });
          }
        }
      } catch (err) {
        console.warn('Notice fetching initial portal from server:', err);
      }
    };

    fetchPortalFromUrlOrServer();
  }, [requestedPortalId, requestedClientId]);

  const targetDocId = useMemo(() => (portal && portal.id !== SAMPLE_CLIENT_PORTAL.id) ? portal.id : requestedPortalId, [portal?.id, requestedPortalId]);
  const currentClientId = useMemo(() => requestedClientId || portal?.clientId, [requestedClientId, portal?.clientId]);
  const currentClientEmail = useMemo(() => portal?.clientEmail, [portal?.clientEmail]);

  // Subscribe to real-time updates if connected to a real Firestore document
  useEffect(() => {
    if (!targetDocId || targetDocId === SAMPLE_CLIENT_PORTAL.id) {
      return;
    }

    const unsubscribe = subscribeToClientPortal(targetDocId, (updatedPortal) => {
      if (updatedPortal) {
        setPortal((prev) => {
          if (isPortalEqual(prev, updatedPortal)) {
            return prev;
          }
          sessionStorage.setItem('client_portal_session', JSON.stringify(updatedPortal));
          return updatedPortal;
        });
      }
    }, {
      clientId: currentClientId,
      clientEmail: currentClientEmail
    });

    return () => unsubscribe();
  }, [targetDocId, currentClientId, currentClientEmail]);

  // Set default active project based on effectivePortal
  const projectIdsKey = (effectivePortal.projects || []).map((p) => p.id).join(',');
  const firstProjectId = effectivePortal.projects?.[0]?.id || '';

  const chatPortalId = effectivePortal.id || portal?.id || requestedPortalId;
  const chatClientId = effectivePortal.clientId || portal?.clientId || requestedClientId;
  const chatClientEmail = effectivePortal.clientEmail || portal?.clientEmail;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll server for new messages in real time so client sees office replies immediately
  useEffect(() => {
    if (!chatPortalId && !chatClientId && !chatClientEmail) return;

    let isMounted = true;

    const pollMessages = async () => {
      try {
        const msgs = await fetchPortalMessages({
          portalId: chatPortalId,
          clientId: chatClientId,
          clientEmail: chatClientEmail
        });
        if (isMounted && msgs && msgs.length > 0) {
          setPortal((prev) => {
            const currentMsgs = prev.messages || [];
            if (JSON.stringify(currentMsgs) !== JSON.stringify(msgs)) {
              const updated = { ...prev, messages: msgs };
              sessionStorage.setItem('client_portal_session', JSON.stringify(updated));
              return updated;
            }
            return prev;
          });
        }
      } catch {}
    };

    pollMessages();
    const interval = setInterval(pollMessages, 3000);

    const onUpdate = () => pollMessages();
    window.addEventListener('portal_messages_updated', onUpdate);
    window.addEventListener('client_portals_updated', onUpdate);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener('portal_messages_updated', onUpdate);
      window.removeEventListener('client_portals_updated', onUpdate);
    };
  }, [chatPortalId, chatClientId, chatClientEmail]);

  useEffect(() => {
    if (activeTab === 'mensagens') {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeTab, effectivePortal.messages?.length]);

  useEffect(() => {
    if (effectivePortal.projects && effectivePortal.projects.length > 0) {
      if (!activeProjectId || !effectivePortal.projects.some((p) => p.id === activeProjectId)) {
        setActiveProjectId(firstProjectId);
      }
    } else if (activeProjectId !== '') {
      setActiveProjectId('');
    }
  }, [projectIdsKey, firstProjectId, activeProjectId]);

  const handleLogout = () => {
    sessionStorage.removeItem('client_portal_session');
    navigate('/cliente/login');
  };

  const currentProject = effectivePortal.projects?.find((p) => p.id === activeProjectId) || effectivePortal.projects?.[0];
  const projTitle = (currentProject?.title || '').trim().toLowerCase();
  const stageName = (currentProject?.currentStageName || '').trim().toLowerCase();
  const isAwaitingProject = !currentProject || 
    projTitle.includes('aguardando') ||
    projTitle.includes('projeto de arquitetura e interiores') ||
    stageName.includes('aguardando') ||
    currentProject?.status === 'Aguardando Vínculo';

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
      id: effectivePortal.id || portal.id,
      clientId: effectivePortal.clientId || portal.clientId,
      messages: [...(effectivePortal.messages || portal.messages || []), newMsg]
    };
    setPortal(updated);
    sessionStorage.setItem('client_portal_session', JSON.stringify(updated));
    savePortalLocally(updated);

    if (portal.id === SAMPLE_CLIENT_PORTAL.id) {
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
            savePortalLocally(up);
            return up;
          });
        }, 1200);
      }
      return;
    }

    setSendingMessage(true);
    try {
      await sendPortalMessage(
        effectivePortal.id || portal.id,
        sender,
        senderName,
        textToSend,
        {
          clientId: effectivePortal.clientId || portal.clientId,
          clientEmail: effectivePortal.clientEmail || portal.clientEmail
        }
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
    <div className="min-h-screen bg-[#fdfbf7] text-zinc-900 flex flex-col font-sans selection:bg-[var(--theme-primary)]/30">
      
      {/* Top Office Preview Control Bar - only displayed when architect is logged into the system */}
      {user && (
        <div className="bg-gradient-to-r from-amber-50 via-amber-100/70 to-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-zinc-900 shadow-sm sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-[var(--theme-primary)] text-black font-bold text-xs flex items-center gap-1.5 shadow-sm">
                <Building2 className="w-3.5 h-3.5" />
                <span>Visualização pelo Escritório</span>
              </span>

              {/* Client Selector */}
              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-zinc-500 hidden sm:inline">Cliente:</span>
                <select
                  value={effectivePortal.clientId || effectivePortal.id}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const pool = allOfficeClientPortals;
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
                  className="bg-white border border-zinc-300 text-zinc-900 font-bold rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-[var(--theme-primary)] cursor-pointer"
                >
                  {allOfficeClientPortals.map((p) => (
                    <option key={p.id} value={p.clientId || p.id}>
                      {p.clientName} ({p.projects?.length || 0} {p.projects?.length === 1 ? 'projeto' : 'projetos'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsManagerModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-200 px-4 sm:px-8 py-3.5 shadow-2xs">
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
                <span className="font-serif font-bold text-base sm:text-lg text-zinc-900 leading-tight">
                  {effectivePortal.officeName || 'Escritório'}
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                  Portal Seguro
                </span>
              </div>
              <span className="text-[11px] text-zinc-500 block">
                Cliente: <strong className="text-zinc-900">{effectivePortal.clientName}</strong>
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
                className="hidden md:flex items-center gap-1.5 text-xs text-zinc-600 hover:text-emerald-600 border border-zinc-200 px-3 py-1.5 rounded-xl transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>WhatsApp Escritório</span>
              </a>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-zinc-200 text-zinc-600 hover:text-red-600 hover:border-red-500/30 text-xs font-bold transition-colors cursor-pointer"
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
          <div className="bg-white border border-zinc-200 rounded-2xl p-3 flex items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs text-zinc-600">
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
                      : 'bg-zinc-50 border border-zinc-200 text-zinc-600 hover:text-zinc-900'
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
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-sm relative overflow-hidden">
            
            {/* Header with Title & Health */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[11px] uppercase tracking-wider text-amber-800 font-bold">
                    {isAwaitingProject ? 'Aguardando Vínculo' : (currentProject.category || 'Projeto em Andamento')}
                  </span>
                  {currentProject.contractStatus && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-100 text-zinc-600 border border-zinc-200">
                      {currentProject.contractStatus}
                    </span>
                  )}
                  {isAwaitingProject && (
                    <span className="px-2 py-0.5 rounded text-[10px] bg-amber-50 text-amber-700 border border-amber-200 font-bold">
                      Aguardando Início do Projeto
                    </span>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-bold text-zinc-900">
                  {isAwaitingProject ? 'Aguardando projeto ser vinculado' : currentProject.title}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-500 mt-1 max-w-2xl">
                  {isAwaitingProject 
                    ? 'O escritório ainda não vinculou um projeto a este cliente. Assim que a equipe vincular seu projeto, você poderá acompanhar todo o cronograma, pranchas, entregas e falar com os profissionais por aqui.'
                    : (currentProject.description || 'Acompanhe as fases, cronograma e arquivos do seu projeto em tempo real.')}
                </p>
              </div>

              <div className="flex flex-col sm:items-end gap-2 shrink-0">
                {isAwaitingProject ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Aguardando Vínculo</span>
                  </span>
                ) : (
                  getHealthBadge(currentProject.generalStatus)
                )}
                <div className="text-xs text-zinc-500 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-amber-700" />
                  <span>Previsão de Entrega: <strong className="text-zinc-900">{isAwaitingProject ? 'A definir pelo escritório' : (currentProject.deliveryDate || 'A definir')}</strong></span>
                </div>
              </div>
            </div>

            {/* Current Stage & Progress Bar - ONLY shown when project is linked */}
            {isAwaitingProject ? (
              <div className="py-5 border-b border-zinc-100 flex items-center gap-3 text-amber-800 bg-amber-50/60 p-4 rounded-2xl border border-amber-200/60 my-2">
                <Clock className="w-5 h-5 shrink-0 text-amber-600" />
                <div className="text-xs">
                  <strong className="block text-zinc-900 font-bold mb-0.5">Status: Aguardando projeto ser vinculado</strong>
                  <span className="text-zinc-500">Assim que o escritório associar o seu projeto oficial a este acesso, você visualizará todas as fases, pranchas e evolução aqui.</span>
                </div>
              </div>
            ) : (
              <div className="py-6 border-b border-zinc-100 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-xs text-zinc-500 block">Fase Atual do Projeto:</span>
                    <div className="text-lg sm:text-xl font-serif font-bold text-amber-800 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      <span>{currentProject.currentStageName || 'Em Execução'}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-zinc-500">Progresso Estimado:</span>
                    <span className="text-lg font-bold text-zinc-900 ml-2">
                      {currentProject.progressPercent || 0}%
                    </span>
                  </div>
                </div>

                {/* Progress Track */}
                <div className="w-full bg-zinc-100 h-3 rounded-full overflow-hidden border border-zinc-200 p-0.5">
                  <div 
                    className="h-full rounded-full transition-all duration-700 shadow-2xs"
                    style={{ 
                      width: `${Math.max(5, Math.min(100, currentProject.progressPercent || 0))}%`,
                      backgroundColor: 'var(--theme-primary)'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Key Project Numbers / Contract overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 text-left">
              <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">
                  Início do Projeto
                </span>
                <span className="text-sm font-bold text-zinc-900">
                  {isAwaitingProject ? 'A definir' : (currentProject.startDate || 'Confirmado')}
                </span>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">
                  Entrega Prevista
                </span>
                <span className="text-sm font-bold text-amber-800">
                  {isAwaitingProject ? 'A definir' : (currentProject.deliveryDate || 'No Cronograma')}
                </span>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">
                  Etapas Concluídas
                </span>
                <span className="text-sm font-bold text-emerald-600">
                  {isAwaitingProject ? '0 etapas' : `${currentProject.stages?.filter((s) => s.status === 'completed').length || 0} de ${currentProject.stages?.length || 1}`}
                </span>
              </div>

              <div className="bg-zinc-50 border border-zinc-200 p-3.5 rounded-2xl">
                <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">
                  Documentos & Arquivos
                </span>
                <span className="text-sm font-bold text-zinc-900">
                  {effectivePortal.documents?.length || 0} disponíveis
                </span>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-3xl p-8 text-center space-y-4 shadow-sm">
            <FolderKanban className="w-12 h-12 text-amber-700 mx-auto opacity-70" />
            <h3 className="text-lg font-bold text-zinc-900">Nenhum projeto associado no momento</h3>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
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
        <div className="flex border-b border-zinc-200 gap-2 sm:gap-6">
          <button
            onClick={() => setActiveTab('etapas')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'etapas'
                ? 'border-[var(--theme-primary)] text-amber-800'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Linha do Tempo & Fases</span>
          </button>

          <button
            onClick={() => setActiveTab('documentos')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'documentos'
                ? 'border-[var(--theme-primary)] text-amber-800'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Documentos & Entregáveis ({effectivePortal.documents?.length || 0})</span>
          </button>

          <button
            onClick={() => setActiveTab('mensagens')}
            className={`pb-3 text-xs sm:text-sm font-bold flex items-center gap-2 transition-colors cursor-pointer border-b-2 ${
              activeTab === 'mensagens'
                ? 'border-[var(--theme-primary)] text-amber-800'
                : 'border-transparent text-zinc-500 hover:text-zinc-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Mensagens & Avisos ({effectivePortal.messages?.length || 0})</span>
          </button>
        </div>

        {/* TAB 1: ETAPAS & LINHA DO TEMPO */}
        {activeTab === 'etapas' && (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <h2 className="text-xl font-serif font-bold text-zinc-900 mb-1">
                Evolução Passo a Passo do Projeto
              </h2>
              <p className="text-xs text-zinc-500 mb-8">
                Acompanhe o que já foi finalizado e quais são os próximos passos agendados para a entrega do seu serviço.
              </p>

              {currentProject?.stages && currentProject.stages.length > 0 ? (
                <div className="relative border-l-2 border-zinc-200 ml-4 sm:ml-6 space-y-8 pl-6 sm:pl-8">
                  {currentProject.stages.map((stage, idx) => {
                    const isCompleted = stage.status === 'completed';
                    const isInProgress = stage.status === 'in_progress';

                    return (
                      <div key={stage.id || idx} className="relative group">
                        
                        {/* Status Icon on line */}
                        <div 
                          className={`absolute -left-[35px] sm:-left-[43px] top-0 w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                            isCompleted 
                              ? 'bg-emerald-500 border-emerald-400 text-white shadow-md' 
                              : isInProgress
                              ? 'bg-white border-[var(--theme-primary)] text-amber-800 ring-4 ring-amber-500/20 animate-pulse'
                              : 'bg-zinc-100 border-zinc-300 text-zinc-500'
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
                            ? 'bg-amber-50/60 border-amber-300 shadow-sm'
                            : isCompleted
                            ? 'bg-zinc-50/80 border-zinc-200'
                            : 'bg-white border-zinc-200 opacity-80'
                        }`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <h3 className={`text-base font-bold ${
                                isCompleted ? 'text-zinc-900' : isInProgress ? 'text-amber-900' : 'text-zinc-600'
                              }`}>
                                {stage.name}
                              </h3>
                              {isInProgress && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[var(--theme-primary)] text-black">
                                  Fase Atual
                                </span>
                              )}
                              {isCompleted && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  Concluído
                                </span>
                              )}
                            </div>

                            <span className="text-[11px] text-zinc-500">
                              {isCompleted && stage.completedAt 
                                ? `Finalizado em: ${stage.completedAt}` 
                                : stage.plannedDate 
                                ? `Previsão: ${stage.plannedDate}` 
                                : 'Em cronograma'}
                            </span>
                          </div>

                          {stage.description && (
                            <p className="text-xs text-zinc-600 leading-relaxed">
                              {stage.description}
                            </p>
                          )}
                        </div>

                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-10 px-4 rounded-2xl bg-zinc-50 border border-zinc-200">
                  <Clock className="w-8 h-8 text-amber-600 mx-auto mb-2 opacity-60" />
                  <p className="font-bold text-zinc-900 text-xs mb-1">
                    {isAwaitingProject ? 'Aguardando projeto ser vinculado' : 'Etapas em definição'}
                  </p>
                  <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                    {isAwaitingProject 
                      ? 'O cronograma detalhado de etapas será disponibilizado assim que o escritório vincular seu projeto a este portal.'
                      : 'As etapas detalhadas deste projeto estão sendo preparadas pela equipe e serão exibidas aqui.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: DOCUMENTOS & ARQUIVOS */}
        {activeTab === 'documentos' && (
          <div className="space-y-6">
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-serif font-bold text-zinc-900">
                    Documentos & Arquivos do Projeto
                  </h2>
                  <p className="text-xs text-zinc-500 mt-1">
                    Baixe vias digitais do contrato assinado, relatórios de visita, plantas e arquivos entregues pelo escritório.
                  </p>
                </div>
                <span className="text-xs bg-zinc-100 px-3 py-1.5 rounded-xl border border-zinc-200 text-zinc-600 self-start sm:self-center">
                  Total: <strong>{effectivePortal.documents?.length || 0} arquivos</strong>
                </span>
              </div>

              {effectivePortal.documents && effectivePortal.documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {effectivePortal.documents.map((docItem) => (
                    <div 
                      key={docItem.id}
                      className="bg-zinc-50 border border-zinc-200 p-4 rounded-2xl flex items-center justify-between gap-4 hover:border-amber-300 transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="truncate">
                          <h4 className="text-sm font-bold text-zinc-900 truncate">
                            {docItem.title}
                          </h4>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-500 mt-0.5">
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
                          className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-[var(--theme-primary)] hover:text-black text-xs font-bold text-zinc-800 flex items-center gap-1.5 transition-colors shrink-0"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Baixar</span>
                        </a>
                      ) : (
                        <button
                          onClick={() => alert(`Visualização do arquivo: ${docItem.title}\nSolicite a versão em alta resolução ao escritório caso precise de impressão.`)}
                          className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-[var(--theme-primary)] hover:text-black text-xs font-bold text-zinc-800 flex items-center gap-1.5 transition-colors shrink-0 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Acessar</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-zinc-50 border border-dashed border-zinc-200 rounded-2xl p-8 text-center text-xs text-zinc-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-zinc-400" />
                  <p>Nenhum documento anexado ainda.</p>
                  <p className="text-[11px] mt-1 text-zinc-400">
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
            <div className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 flex flex-col h-[580px] shadow-sm">
              
              <div className="pb-4 border-b border-zinc-200 mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-serif font-bold text-zinc-900">
                    Canal Direto com o Escritório
                  </h2>
                  <p className="text-xs text-zinc-500">
                    Envie observações, dúvidas ou feedbacks sobre o projeto para a equipe responsável.
                  </p>
                </div>
                <span className="text-[11px] text-emerald-600 flex items-center gap-1 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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
                              ? 'bg-[var(--theme-primary)] text-black font-medium rounded-br-none shadow-sm'
                              : 'bg-zinc-100 border border-zinc-200 text-zinc-900 rounded-bl-none'
                          }`}
                        >
                          <div className={`text-[10px] font-bold mb-1 opacity-70 ${isClient ? 'text-black' : 'text-amber-800'}`}>
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
                  <div className="h-full flex flex-col items-center justify-center text-center text-xs text-zinc-500 space-y-2">
                    <MessageSquare className="w-8 h-8 text-zinc-400" />
                    <p>Nenhuma mensagem trocada ainda.</p>
                    <p className="text-[11px] text-zinc-400 max-w-sm">
                      Envie uma mensagem abaixo para falar com o escritório sobre o andamento do seu projeto.
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* If Admin mode, allow choosing who to send as */}
              {isAdminMode && (
                <div className="pt-2 pb-1 flex items-center justify-between text-xs border-t border-zinc-200">
                  <span className="text-zinc-600 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-700" />
                    <span>Responder mensagem como:</span>
                  </span>
                  <div className="flex items-center gap-1 bg-zinc-50 p-1 rounded-lg border border-zinc-200">
                    <button
                      type="button"
                      onClick={() => setAdminSenderRole('office')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        adminSenderRole === 'office'
                          ? 'bg-[var(--theme-primary)] text-black shadow-sm'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      🏢 Equipe do Escritório
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminSenderRole('client')}
                      className={`px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                        adminSenderRole === 'client'
                          ? 'bg-amber-400 text-black shadow-sm'
                          : 'text-zinc-600 hover:text-zinc-900'
                      }`}
                    >
                      👤 Simular Cliente
                    </button>
                  </div>
                </div>
              )}

              {/* Message Input Box */}
              <form onSubmit={handleSendMessage} className="pt-3 border-t border-zinc-200 flex gap-2">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder={isAdminMode && adminSenderRole === 'office' ? "Escreva uma resposta oficial da equipe para o cliente..." : "Escreva sua mensagem ou dúvida sobre o projeto..."}
                  className="flex-1 bg-zinc-50 border border-zinc-300 rounded-xl px-4 py-3 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                />
                <button
                  type="submit"
                  disabled={sendingMessage || !newMessageText.trim()}
                  className="px-5 py-3 rounded-xl bg-[var(--theme-primary)] hover:brightness-110 text-black font-bold text-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
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
      <footer className="border-t border-zinc-200 py-6 text-center text-xs text-zinc-500 mt-12 bg-white/50">
        <p>
          {effectivePortal.officeName || 'Meu Escritório Online'} • Site do Cliente • Acompanhamento em Tempo Real
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
