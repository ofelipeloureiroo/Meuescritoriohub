import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  SlidersHorizontal,
  Send,
  X,
  Loader2
} from 'lucide-react';
import { useFinance, isClientTombstoned, getDeletedClientsTombstones } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { ClientPortalAccess, ArchitectureProject, Client, ClientPortalMessage } from '../../types';
import { 
  subscribeToOfficePortals, 
  setPortalStatus, 
  deleteClientPortalAccess,
  buildClientPortalAccess,
  syncPortalWithOfficeRegistry,
  saveClientPortalAccess,
  sendPortalMessage,
  fetchPortalMessages,
  savePortalLocally,
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
  const { architectureProjects, clients, architectProfile, projectMilestones } = useFinance();

  const [portals, setPortals] = useState<ClientPortalAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal state
  const [isManagerModalOpen, setIsManagerModalOpen] = useState(false);
  const [selectedPortalForEdit, setSelectedPortalForEdit] = useState<ClientPortalAccess | null>(null);
  const [selectedPortalForChat, setSelectedPortalForChat] = useState<ClientPortalAccess | null>(null);
  const [chatReplyText, setChatReplyText] = useState('');
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showPasswordMap, setShowPasswordMap] = useState<Record<string, boolean>>({});

  const chatPortalId = selectedPortalForChat?.id;
  const chatClientId = selectedPortalForChat?.clientId;
  const chatClientEmail = selectedPortalForChat?.clientEmail;
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Poll & sync live chat messages whenever a chat modal is open
  useEffect(() => {
    if (!chatPortalId) return;

    let isMounted = true;

    const loadLiveMessages = async () => {
      try {
        const msgs = await fetchPortalMessages({
          portalId: chatPortalId,
          clientId: chatClientId,
          clientEmail: chatClientEmail
        });
        if (isMounted && msgs && msgs.length > 0) {
          setSelectedPortalForChat((prev) => {
            if (!prev) return null;
            if (JSON.stringify(prev.messages) !== JSON.stringify(msgs)) {
              return { ...prev, messages: msgs };
            }
            return prev;
          });
        }
      } catch {}
    };

    loadLiveMessages();
    const interval = setInterval(loadLiveMessages, 1500);

    const onUpdate = () => loadLiveMessages();
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
    if (selectedPortalForChat?.messages) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [selectedPortalForChat?.messages?.length]);

  // Real-time subscribe to all portals created by this office
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToOfficePortals(user.uid, (list) => {
      setPortals((prev) => (JSON.stringify(prev) === JSON.stringify(list) ? prev : list));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Combine real office clients with real-time projects and any cloud saved portals
  const displayPortals = useMemo(() => {
    const tombstones = getDeletedClientsTombstones();
    const rawTombPortals = localStorage.getItem('office_deleted_portal_ids');
    const tombPortalIds = new Set<string>(rawTombPortals ? JSON.parse(rawTombPortals) : []);

    const nonLeads = (clients || []).filter((c) => c.status !== 'lead' && !isClientTombstoned(c, tombstones));
    const portalsList = (portals || []).filter(p => !tombPortalIds.has(p.id) && !isClientTombstoned({ id: p.clientId, name: p.clientName, email: p.clientEmail }, tombstones));

    const allClientsMap = new Map<string, Client>();
    nonLeads.forEach(c => allClientsMap.set(c.id, c));

    // Synthesize client entry from any saved portal record if missing from clients array
    portalsList.forEach(p => {
      if (!p || !p.clientName) return;
      const candidate = { id: p.clientId, name: p.clientName, email: p.clientEmail };
      if (isClientTombstoned(candidate, tombstones) || tombPortalIds.has(p.id)) return;

      const existingKey = Array.from(allClientsMap.keys()).find(id => {
        const c = allClientsMap.get(id)!;
        return c.id === p.clientId ||
          (c.email && p.clientEmail && c.email.trim().toLowerCase() === p.clientEmail.trim().toLowerCase()) ||
          (c.name && p.clientName && c.name.trim().toLowerCase() === p.clientName.trim().toLowerCase());
      });

      if (!existingKey) {
        const synthesizedClient: Client = {
          id: p.clientId || `cli-${p.id}`,
          name: p.clientName,
          email: p.clientEmail || '',
          phone: p.clientPhone || '',
          status: 'active',
          createdAt: p.createdAt || new Date().toISOString(),
          serviceType: 'Arquitetura e Interiores',
          totalBilled: 0,
          totalPaid: 0,
          pendingAmount: 0,
          projectsCount: p.projects?.length || 1,
          city: architectProfile?.location || 'São Paulo',
          state: 'SP'
        };
        allClientsMap.set(synthesizedClient.id, synthesizedClient);
      }
    });

    const combinedClients = Array.from(allClientsMap.values()).filter(c => !isClientTombstoned(c, tombstones));
    if (combinedClients.length === 0) {
      return [];
    }

    return combinedClients.map((client) => {
      const cloudMatch = portalsList.find(
        (p) =>
          p.clientId === client.id ||
          (p.clientEmail && client.email && p.clientEmail.trim().toLowerCase() === client.email.trim().toLowerCase()) ||
          (p.clientName && client.name && p.clientName.trim().toLowerCase() === client.name.trim().toLowerCase())
      );
      return buildClientPortalAccess(client, architectureProjects, architectProfile, cloudMatch, projectMilestones);
    });
  }, [clients, portals, architectureProjects, architectProfile, projectMilestones]);

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
    saveClientPortalAccess(p).catch(() => {});
    const origin = window.location.origin;
    const directUrl = `${origin}/cliente/login?email=${encodeURIComponent(p.clientEmail)}&code=${encodeURIComponent(p.accessCode)}`;
    navigator.clipboard.writeText(directUrl);
    setCopiedId(p.id + '-link');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyCredentials = (p: ClientPortalAccess) => {
    saveClientPortalAccess(p).catch(() => {});
    const origin = window.location.origin;
    const directUrl = `${origin}/cliente/login?email=${encodeURIComponent(p.clientEmail)}&code=${encodeURIComponent(p.accessCode)}`;
    const text = `*Site do Cliente - ${p.officeName || 'Meu Escritório'}*\n\nOlá, ${p.clientName}!\nVocê pode acompanhar todas as etapas, prazos, arquivos e falar com a equipe pelo seu portal exclusivo:\n\n🔗 *Acesso Direto:* ${directUrl}\n📧 *E-mail:* ${p.clientEmail}\n🔑 *Senha/Código de Acesso:* ${p.accessCode}\n\nQualquer dúvida, estamos à disposição!`;
    navigator.clipboard.writeText(text);
    setCopiedId(p.id + '-text');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenWhatsApp = (p: ClientPortalAccess) => {
    saveClientPortalAccess(p).catch(() => {});
    const origin = window.location.origin;
    const directUrl = `${origin}/cliente/login?email=${encodeURIComponent(p.clientEmail)}&code=${encodeURIComponent(p.accessCode)}`;
    const text = `Olá, ${p.clientName}! Aqui está o seu link de acesso ao Site do Cliente para acompanhar o projeto em tempo real:\n\n${directUrl}\n\nE-mail: ${p.clientEmail}\nCódigo de Acesso: ${p.accessCode}`;
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
      try {
        const rawTombPortals = localStorage.getItem('office_deleted_portal_ids');
        const tombset = new Set<string>(rawTombPortals ? JSON.parse(rawTombPortals) : []);
        tombset.add(p.id);
        if (p.clientId) {
          tombset.add(p.clientId);
          tombset.add(`portal-${p.clientId}`);
          tombset.add(`demo-portal-${p.clientId}`);
        }
        localStorage.setItem('office_deleted_portal_ids', JSON.stringify(Array.from(tombset)));

        const tombstones = getDeletedClientsTombstones();
        if (p.clientId && !tombstones.some(t => t.id === p.clientId)) {
          tombstones.push({ id: p.clientId, name: p.clientName, email: p.clientEmail });
          localStorage.setItem('office_deleted_clients_v1', JSON.stringify(tombstones));
        }
      } catch {}

      await deleteClientPortalAccess(p.id);
      if (p.clientId) {
        await deleteClientPortalsForClient(p.clientId, p.clientName, p.clientEmail);
        deleteClient(p.clientId);
      }
      setPortals((prev) => prev.filter((item) => item.id !== p.id && item.clientId !== p.clientId));
    }
  };

  const handleSendChatReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPortalForChat || !chatReplyText.trim() || isSendingChat) return;

    const textToSend = chatReplyText.trim();
    setChatReplyText('');
    setIsSendingChat(true);

    try {
      const senderName = architectProfile?.name || architectProfile?.title || 'Equipe do Escritório';
      await sendPortalMessage(
        selectedPortalForChat.id,
        'office',
        `${senderName} (Equipe)`,
        textToSend,
        {
          clientId: selectedPortalForChat.clientId,
          clientEmail: selectedPortalForChat.clientEmail
        }
      );

      // Locally update selected portal messages for instant feedback
      const newMsg: ClientPortalMessage = {
        id: 'msg-' + Date.now(),
        sender: 'office',
        senderName: `${senderName} (Equipe)`,
        text: textToSend,
        createdAt: new Date().toISOString(),
        read: true
      };

      setSelectedPortalForChat(prev => prev ? {
        ...prev,
        messages: [...(prev.messages || []), newMsg]
      } : null);
    } catch (err) {
      console.error('Erro ao responder chat do cliente:', err);
    } finally {
      setIsSendingChat(false);
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
      <div className="bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-card-secondary)] border border-[var(--border-color)] rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[var(--theme-primary)]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30 text-[var(--theme-primary)] text-xs font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Painel de Gestão do Escritório</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[var(--text-main)] tracking-tight">
              Site do Cliente & Transparência
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
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
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center shrink-0 border border-[var(--theme-primary)]/20">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Portais Ativos
            </span>
            <span className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
              {activeCount}
            </span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Projetos no Portal
            </span>
            <span className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
              {totalProjectsInPortals}
            </span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Documentos & Plantas
            </span>
            <span className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
              {totalDocumentsInPortals}
            </span>
          </div>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-500 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
              Mensagens Trocadas
            </span>
            <span className="text-xl sm:text-2xl font-bold text-[var(--text-main)]">
              {totalMessages}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por cliente, projeto ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-card-secondary)] border border-[var(--border-color)] rounded-xl pl-9 pr-4 py-2 text-xs text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--theme-primary)]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-[var(--text-muted)] flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Status:
          </span>
          <div className="flex bg-[var(--bg-card-secondary)] p-1 rounded-xl border border-[var(--border-color)]">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-[var(--theme-primary)] text-black font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Todos ({displayPortals.length})
            </button>
            <button
              onClick={() => setStatusFilter('active')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'active'
                  ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold border border-emerald-500/40'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Ativos ({displayPortals.filter(p => p.status === 'active').length})
            </button>
            <button
              onClick={() => setStatusFilter('inactive')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === 'inactive'
                  ? 'bg-rose-500/20 text-rose-600 dark:text-rose-300 font-bold border border-rose-500/40'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              Suspensos ({displayPortals.filter(p => p.status === 'inactive').length})
            </button>
          </div>
        </div>
      </div>

      {/* Portals List Cards */}
      <div className="space-y-4">
        {filteredPortals.length === 0 ? (
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-10 sm:p-14 text-center space-y-4 shadow-sm flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-card-secondary)] border border-[var(--border-color)] text-[var(--theme-primary)] flex items-center justify-center shadow-inner">
              <Users className="w-8 h-8 opacity-75 text-[var(--theme-primary)]" />
            </div>
            
            <div className="space-y-1.5 max-w-md">
              <h3 className="text-base sm:text-lg font-bold text-[var(--text-main)]">
                {clients.length === 0
                  ? 'Nenhum cliente cadastrado no escritório'
                  : 'Nenhum site do cliente encontrado para esta busca'}
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                {clients.length === 0
                  ? 'O Site do Cliente exibe e sincroniza os acessos dos clientes cadastrados no seu escritório. Cadastre seus clientes e vincule projetos para liberar o acompanhamento exclusivo em tempo real.'
                  : 'Tente alterar os termos da busca ou os filtros de status acima.'}
              </p>
            </div>

            {clients.length === 0 && (
              <div className="pt-2">
                <button
                  onClick={() => {
                    if (onNavigateTab) {
                      onNavigateTab('freelance');
                    } else {
                      setSelectedPortalForEdit(null);
                      setIsManagerModalOpen(true);
                    }
                  }}
                  className="px-4 py-2.5 rounded-xl bg-[var(--theme-primary)] hover:brightness-110 text-black font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  <span>Cadastrar Primeiro Cliente</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          filteredPortals.map((p) => {
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
                className={`bg-[var(--bg-card)] border rounded-2xl p-5 sm:p-6 transition-all hover:border-[var(--theme-primary)]/50 space-y-4 shadow-sm ${
                  p.status === 'active' ? 'border-[var(--border-color)]' : 'border-rose-900/40 opacity-80'
                }`}
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--bg-card-secondary)] border border-[var(--border-color)] text-[var(--theme-primary)] flex items-center justify-center font-bold text-base">
                      {p.clientName ? p.clientName.charAt(0).toUpperCase() : 'C'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-[var(--text-main)] text-base">
                          {p.clientName}
                        </h3>
                        {isSample && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/30">
                            Modelo / Demonstração
                          </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          p.status === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border-emerald-500/30' 
                            : 'bg-rose-500/10 text-rose-500 dark:text-rose-400 border-rose-500/30'
                        }`}>
                          {p.status === 'active' ? '● Acesso Liberado' : '○ Acesso Suspenso'}
                        </span>
                      </div>

                      <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] mt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-[var(--text-muted)]" />
                          {p.clientEmail}
                        </span>
                        {p.clientPhone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-[var(--text-muted)]" />
                            {p.clientPhone}
                          </span>
                        )}
                      </div>

                      {/* Office Connection Badges */}
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        {linkedOfficeClient ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-500 dark:text-emerald-400 border border-emerald-500/25">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                            <span>Cliente conectado ao cadastro</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[var(--bg-card-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]">
                            <Building2 className="w-3 h-3 text-[var(--text-muted)]" />
                            <span>Cliente não vinculado</span>
                          </span>
                        )}

                        {linkedOfficeProject ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-500 dark:text-blue-400 border border-blue-500/25">
                            <FolderOpen className="w-3 h-3 text-blue-500 dark:text-blue-400" />
                            <span>Projeto vinculado: {linkedOfficeProject.title}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-[var(--bg-card-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]">
                            <FolderOpen className="w-3 h-3 text-[var(--text-muted)]" />
                            <span>Projeto local</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setSelectedPortalForChat(p)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--theme-primary)]/10 hover:bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      title="Ver e responder mensagens deste cliente"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat ({p.messages?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => handleOpenClientPortal(p)}
                      className="px-3 py-1.5 rounded-xl bg-[var(--bg-card-secondary)] hover:opacity-90 text-[var(--text-main)] border border-[var(--border-color)] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
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
                      className="px-3 py-1.5 rounded-xl bg-[var(--bg-card-secondary)] hover:opacity-90 text-[var(--text-main)] border border-[var(--border-color)] text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                      title="Gerenciar fases, documentos e configurações"
                    >
                      <Settings2 className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>Gerenciar Portal</span>
                    </button>

                    <button
                      onClick={() => handleToggleStatus(p)}
                      className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                        p.status === 'active'
                          ? 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-rose-400 hover:border-rose-500/30'
                          : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                      }`}
                      title={p.status === 'active' ? 'Suspender Acesso' : 'Ativar Acesso'}
                    >
                      <Power className="w-4 h-4" />
                    </button>

                    {!isSample && (
                      <button
                        onClick={() => handleDeletePortal(p)}
                        className="p-1.5 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] hover:text-rose-400 hover:border-rose-500/30 transition-colors cursor-pointer"
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
                    <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                      Projetos Vinculados ({p.projects?.length || 0})
                    </span>
                    
                    <div className="space-y-2">
                      {(p.projects || []).map((proj) => {
                        const isAwaitingLink = !linkedOfficeProject && (
                          proj.title.toLowerCase().includes('aguardando') ||
                          proj.title.toLowerCase().includes('projeto de arquitetura e interiores') ||
                          proj.currentStageName?.toLowerCase().includes('aguardando') ||
                          proj.status === 'Aguardando Vínculo'
                        );

                        if (isAwaitingLink) {
                          return (
                            <div
                              key={proj.id}
                              className="bg-[var(--bg-card-secondary)] border border-amber-500/30 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                            >
                              <div className="space-y-1">
                                <span className="font-bold text-amber-600 dark:text-amber-400 block text-xs">
                                  Aguardando projeto ser vinculado
                                </span>
                                <p className="text-[11px] text-[var(--text-muted)]">
                                  Nenhum projeto do escritório foi vinculado a este cliente ainda.
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedPortalForEdit(p);
                                  setIsManagerModalOpen(true);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <FolderOpen className="w-3.5 h-3.5" />
                                <span>Vincular Projeto</span>
                              </button>
                            </div>
                          );
                        }

                        return (
                          <div
                            key={proj.id}
                            className="bg-[var(--bg-card-secondary)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div className="space-y-1">
                              <span className="font-bold text-[var(--text-main)] block">
                                {proj.title}
                              </span>
                              <div className="flex items-center gap-2 flex-wrap text-[11px] text-[var(--text-muted)]">
                                <span className="px-2 py-0.5 rounded-md bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--theme-primary)] font-medium">
                                  Fase: {proj.currentStageName || proj.status}
                                </span>
                                <span>•</span>
                                <span>Progresso: <strong className="text-[var(--text-main)]">{proj.progressPercent || 0}%</strong></span>
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
                              <div className="h-1.5 w-full bg-[var(--bg-card)] rounded-full overflow-hidden border border-[var(--border-color)]">
                                <div 
                                  className="h-full bg-[var(--theme-primary)] rounded-full transition-all"
                                  style={{ width: `${proj.progressPercent || 0}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Access Credentials & Sharing Column */}
                  <div className="bg-[var(--bg-card-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block">
                        Credenciais do Cliente
                      </span>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between bg-[var(--bg-card)] px-2.5 py-1.5 rounded-lg border border-[var(--border-color)]">
                          <span className="text-[11px] text-[var(--text-muted)]">Código / Senha:</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-[var(--theme-primary)] text-xs">
                              {showPassword ? p.accessCode : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleShowPassword(p.id)}
                              className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
                              title={showPassword ? 'Ocultar código' : 'Ver código'}
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <button
                            onClick={() => handleCopyCredentials(p)}
                            className="flex-1 py-1.5 px-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-secondary)] text-[var(--text-main)] border border-[var(--border-color)] rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Copiar mensagem com credenciais completas"
                          >
                            {copiedId === p.id + '-text' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500">Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-[var(--text-muted)]" />
                                <span>Copiar Texto</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleCopyLink(p)}
                            className="flex-1 py-1.5 px-2 bg-[var(--bg-card)] hover:bg-[var(--bg-card-secondary)] text-[var(--text-main)] border border-[var(--border-color)] rounded-lg font-bold text-[10px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                            title="Copiar link direto para envio"
                          >
                            {copiedId === p.id + '-link' ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                <span className="text-emerald-500">Link Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3 h-3 text-[var(--text-muted)]" />
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
                        className="w-full py-2 px-3 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-500 border border-emerald-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Enviar Acesso no WhatsApp</span>
                      </button>
                    )}
                  </div>

                </div>

                {/* Bottom quick stats */}
                <div className="flex items-center justify-between pt-2 border-t border-[var(--border-color)] text-[11px] text-[var(--text-muted)]">
                  <div className="flex items-center gap-4">
                    <span>Arquivos disponibilizados: <strong className="text-[var(--text-main)]">{p.documents?.length || 0}</strong></span>
                    <span>Mensagens no chat: <strong className="text-[var(--text-main)]">{p.messages?.length || 0}</strong></span>
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
          })
        )}
      </div>

      {/* Guide Card for the Office */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-main)]">
          <Sparkles className="w-4 h-4 text-[var(--theme-primary)]" />
          <span>Como funciona a segurança e o isolamento do Site do Cliente?</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-[var(--text-muted)]">
          <div className="space-y-1.5 p-3.5 rounded-xl bg-[var(--bg-card-secondary)] border border-[var(--border-color)]">
            <strong className="text-[var(--text-main)] block">1. Total Isolamento de Dados</strong>
            <p className="leading-relaxed">
              Cada cliente acessa estritamente o seu projeto. Informações internas, custos, margens de lucro, fornecedores e notas da equipe permanecem 100% confidenciais.
            </p>
          </div>
          <div className="space-y-1.5 p-3.5 rounded-xl bg-[var(--bg-card-secondary)] border border-[var(--border-color)]">
            <strong className="text-[var(--text-main)] block">2. Controle em Tempo Real</strong>
            <p className="leading-relaxed">
              Tudo o que você atualizar na tela de gestão (avançar de fase, adicionar prancha em PDF ou enviar mensagem) é refletido instantaneamente no site do cliente.
            </p>
          </div>
          <div className="space-y-1.5 p-3.5 rounded-xl bg-[var(--bg-card-secondary)] border border-[var(--border-color)]">
            <strong className="text-[var(--text-main)] block">3. Gestão Centralizada no Escritório</strong>
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

      {/* Direct Quick Chat Modal for Office */}
      {selectedPortalForChat && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col h-[640px] max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 bg-[var(--bg-card-secondary)] border-b border-[var(--border-color)] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center font-bold text-base border border-[var(--theme-primary)]/20">
                  {selectedPortalForChat.clientName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm sm:text-base text-[var(--text-main)]">
                      {selectedPortalForChat.clientName}
                    </h3>
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Ao Vivo
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {selectedPortalForChat.projects?.[0]?.title ? `Projeto: ${selectedPortalForChat.projects[0].title}` : selectedPortalForChat.clientEmail}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenClientPortal(selectedPortalForChat);
                    setSelectedPortalForChat(null);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-[var(--bg-card)] hover:bg-[var(--bg-card-secondary)] text-xs text-[var(--theme-primary)] border border-[var(--border-color)] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Abrir visão completa do portal do cliente"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Visualizar Portal</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedPortalForChat(null)}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-card)] transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Messages Thread */}
            <div className="flex-1 p-6 overflow-y-auto space-y-3 bg-[var(--bg-card)]">
              {selectedPortalForChat.messages && selectedPortalForChat.messages.length > 0 ? (
                <>
                  {selectedPortalForChat.messages.map((msg) => {
                    const isOffice = msg.sender === 'office';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isOffice ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-xs ${
                            isOffice
                              ? 'bg-[var(--theme-primary)] text-black font-medium rounded-br-none'
                              : 'bg-[var(--bg-card-secondary)] border border-[var(--border-color)] text-[var(--text-main)] rounded-bl-none'
                          }`}
                        >
                          <div className={`text-[10px] font-bold mb-1 ${isOffice ? 'text-black/80' : 'text-[var(--theme-primary)]'}`}>
                            {msg.senderName || (isOffice ? 'Equipe do Escritório' : selectedPortalForChat.clientName)}
                          </div>
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          <div className={`text-[9px] mt-1.5 text-right opacity-70`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(msg.createdAt).toLocaleDateString('pt-BR')}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-[var(--text-muted)] space-y-2">
                  <MessageSquare className="w-10 h-10 text-[var(--text-muted)] opacity-50" />
                  <p className="font-bold text-sm text-[var(--text-main)]">Nenhuma mensagem trocada ainda</p>
                  <p className="max-w-xs text-[11px]">
                    Envie uma mensagem abaixo para iniciar o atendimento deste cliente no site.
                  </p>
                </div>
              )}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendChatReply} className="p-4 bg-[var(--bg-card-secondary)] border-t border-[var(--border-color)] flex items-center gap-3">
              <input
                type="text"
                placeholder="Escreva uma resposta da equipe para o cliente..."
                value={chatReplyText}
                onChange={(e) => setChatReplyText(e.target.value)}
                disabled={isSendingChat}
                className="flex-1 bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-4 py-2.5 text-xs placeholder-[var(--text-muted)] focus:outline-hidden focus:border-[var(--theme-primary)] disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!chatReplyText.trim() || isSendingChat}
                className="px-4 py-2.5 rounded-xl bg-[var(--theme-primary)] hover:brightness-110 disabled:opacity-40 text-black font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md"
              >
                {isSendingChat ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                <span>Enviar</span>
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
