import React, { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs } from 'firebase/firestore';
import { db, sanitizeFirestoreData } from '../../lib/firebase';
import { SupportTicket, SupportMessage } from '../../types';
import { UserProfile, useAuth } from '../../context/AuthContext';
import {
  MessageSquare,
  Search,
  Send,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  Shield,
  Trash2,
  Phone,
  Mail,
  RefreshCw,
  Sparkles,
  Headset,
  CornerDownLeft,
  Plus,
  X
} from 'lucide-react';

interface AdminSupportTabProps {
  users?: UserProfile[];
}

const QUICK_RESPONSES = [
  'Olá! Seja bem-vindo(a) ao suporte do Meu Escritório Online. Como posso te ajudar hoje?',
  'Verifiquei aqui e seu acesso já está 100% liberado e ativo no sistema!',
  'Recebi sua solicitação e já estamos realizando o ajuste para você.',
  'Seu pagamento via PIX foi identificado e confirmado com sucesso!',
  'Precisa de mais alguma ajuda ou ficou alguma dúvida adicional?'
];

export const AdminSupportTab: React.FC<AdminSupportTabProps> = ({ users = [] }) => {
  const { user: currentAdminUser, profile } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'waiting_admin' | 'in_progress' | 'resolved'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [replyInput, setReplyInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [selectedUserForNewChat, setSelectedUserForNewChat] = useState<UserProfile | null>(null);
  const [initialMessageInput, setInitialMessageInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync real-time with Firestore support_tickets collection and localStorage fallback
  useEffect(() => {
    const loadTickets = () => {
      const map = new Map<string, SupportTicket>();

      // 1. Load from localStorage first
      try {
        const globalPool = localStorage.getItem('meu_escritorio_global_support_tickets');
        if (globalPool) {
          const parsedPool = JSON.parse(globalPool) as SupportTicket[];
          if (Array.isArray(parsedPool)) {
            parsedPool.forEach(t => {
              if (t && t.id) map.set(t.id, t);
            });
          }
        }

        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('meu_escritorio_user_support_ticket_')) {
            const val = localStorage.getItem(key);
            if (val) {
              const parsed = JSON.parse(val) as SupportTicket;
              if (parsed && parsed.id) {
                map.set(parsed.id, parsed);
              }
            }
          }
        }
      } catch {}

      // 2. Also check direct ticket list if any
      try {
        const directList = localStorage.getItem('meu_escritorio_support_tickets_list');
        if (directList) {
          const parsedList = JSON.parse(directList) as SupportTicket[];
          if (Array.isArray(parsedList)) {
            parsedList.forEach(t => {
              if (t && t.id) map.set(t.id, t);
            });
          }
        }
      } catch {}

      const list = Array.from(map.values());
      list.sort((a, b) => {
        if (a.status === 'waiting_admin' && b.status !== 'waiting_admin') return -1;
        if (b.status === 'waiting_admin' && a.status !== 'waiting_admin') return 1;
        return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
      });

      if (list.length > 0) {
        setTickets(list);
        setSelectedTicketId((prev) => (prev && list.some(t => t.id === prev) ? prev : list[0].id));
      }
    };

    loadTickets();

    const handleCustomUpdate = () => loadTickets();
    window.addEventListener('support_tickets_updated', handleCustomUpdate);
    window.addEventListener('storage', handleCustomUpdate);

    const unsub = onSnapshot(collection(db, 'support_tickets'), (snapshot) => {
      const list: SupportTicket[] = [];
      snapshot.forEach((d) => {
        const data = d.data() as SupportTicket;
        list.push({ ...data, id: d.id });
      });

      if (list.length > 0) {
        list.forEach(t => {
          try {
            localStorage.setItem(`meu_escritorio_user_support_ticket_${t.id}`, JSON.stringify(t));
          } catch {}
        });
      }

      loadTickets();
    }, (err) => {
      console.warn('Firestore onSnapshot support_tickets notice:', err);
    });

    return () => {
      unsub();
      window.removeEventListener('support_tickets_updated', handleCustomUpdate);
      window.removeEventListener('storage', handleCustomUpdate);
    };
  }, []);

  const activeTicket = tickets.find((t) => t.id === selectedTicketId) || (tickets.length > 0 ? tickets[0] : null);

  // Auto scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicket?.messages]);

  // When admin opens a ticket with unread messages, mark as read
  useEffect(() => {
    if (activeTicket && activeTicket.unreadByAdmin > 0) {
      updateDoc(doc(db, 'support_tickets', activeTicket.id), {
        unreadByAdmin: 0,
        status: activeTicket.status === 'waiting_admin' ? 'in_progress' : activeTicket.status,
      }).catch(console.warn);
    }
  }, [activeTicket?.id, activeTicket?.unreadByAdmin]);

  // Send message from Admin to Subscriber
  const handleSendReply = async (customText?: string) => {
    const textToSend = (customText || replyInput).trim();
    if (!textToSend || !activeTicket) return;

    setIsSending(true);
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];
    const adminDisplayName = profile?.name || currentAdminUser?.displayName || 'Carlos Felipe (Admin)';

    const newMsg: SupportMessage = {
      id: `msg_admin_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'admin',
      senderName: adminDisplayName,
      senderEmail: currentAdminUser?.email || 'suporte@meuescritorio.online',
      text: textToSend,
      time: timeStr,
      date: dateStr,
      timestamp: now.toISOString(),
      read: true,
    };

    const updatedMessages = [...(activeTicket.messages || []), newMsg];
    const updatedTicket: SupportTicket = {
      ...activeTicket,
      messages: updatedMessages,
      lastMessage: textToSend,
      lastMessageTime: timeStr,
      lastMessageSender: 'admin',
      status: 'in_progress',
      unreadByAdmin: 0,
      unreadByUser: (activeTicket.unreadByUser || 0) + 1,
      updatedAt: now.toISOString(),
    };

    setReplyInput('');

    // Persist to localStorage & Firestore
    try {
      localStorage.setItem(`meu_escritorio_user_support_ticket_${activeTicket.id}`, JSON.stringify(updatedTicket));
      window.dispatchEvent(new CustomEvent('support_tickets_updated'));
    } catch {}

    try {
      await setDoc(doc(db, 'support_tickets', activeTicket.id), sanitizeFirestoreData(updatedTicket), { merge: true });
      window.dispatchEvent(new CustomEvent('support_tickets_updated'));
    } catch (e) {
      console.warn('Error sending reply to support ticket:', e);
    } finally {
      setIsSending(false);
    }
  };

  // Start a new conversation manually with an existing subscriber
  const handleStartNewChatWithSubscriber = async (targetUser: UserProfile) => {
    if (!targetUser || !targetUser.email) return;

    const cleanEmail = targetUser.email.toLowerCase().trim();
    const docId = `ticket_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    const adminDisplayName = profile?.name || currentAdminUser?.displayName || 'Carlos Felipe (Admin)';

    const initialText = initialMessageInput.trim() || 'Olá! Sou do suporte do Meu Escritório Online. Como posso ajudar você hoje?';

    const firstMsg: SupportMessage = {
      id: `msg_admin_${Date.now()}`,
      sender: 'admin',
      senderName: adminDisplayName,
      senderEmail: currentAdminUser?.email || 'suporte@meuescritorio.online',
      text: initialText,
      time: timeStr,
      date: now.toISOString().split('T')[0],
      timestamp: now.toISOString(),
      read: true,
    };

    const newTicket: SupportTicket = {
      id: docId,
      subscriberUid: targetUser.uid || cleanEmail,
      subscriberName: targetUser.name || cleanEmail.split('@')[0],
      subscriberEmail: cleanEmail,
      subscriberPhone: (targetUser as any).phone || '',
      status: 'in_progress',
      unreadByAdmin: 0,
      unreadByUser: 1,
      lastMessage: initialText,
      lastMessageTime: timeStr,
      lastMessageSender: 'admin',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      messages: [firstMsg],
    };

    try {
      await setDoc(doc(db, 'support_tickets', docId), sanitizeFirestoreData(newTicket), { merge: true });
      setSelectedTicketId(docId);
      setIsNewChatModalOpen(false);
      setSelectedUserForNewChat(null);
      setInitialMessageInput('');
    } catch (err) {
      console.warn('Error starting support conversation:', err);
    }
  };

  // Change ticket status
  const handleChangeStatus = async (ticketId: string, newStatus: SupportTicket['status']) => {
    try {
      await updateDoc(doc(db, 'support_tickets', ticketId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Error updating ticket status:', e);
    }
  };

  // Delete ticket
  const handleDeleteTicket = async (ticketId: string) => {
    if (!window.confirm('Deseja realmente excluir este atendimento de suporte?')) return;

    try {
      // 1. Remove from localStorage keys and global pool
      try {
        localStorage.removeItem(`meu_escritorio_user_support_ticket_${ticketId}`);
        const rawPool = localStorage.getItem('meu_escritorio_global_support_tickets');
        if (rawPool) {
          let pool: SupportTicket[] = JSON.parse(rawPool);
          pool = pool.filter(t => t.id !== ticketId);
          localStorage.setItem('meu_escritorio_global_support_tickets', JSON.stringify(pool));
        }
      } catch {}

      // 2. Delete from Firestore
      await deleteDoc(doc(db, 'support_tickets', ticketId)).catch(() => {});

      // 3. Update state & dispatch event
      setTickets((prev) => prev.filter(t => t.id !== ticketId));
      if (selectedTicketId === ticketId) {
        setSelectedTicketId('');
      }
      window.dispatchEvent(new CustomEvent('support_tickets_updated'));
    } catch (e) {
      console.warn('Error deleting support ticket:', e);
    }
  };

  // Filter tickets
  const filteredTickets = tickets.filter((ticket) => {
    const nameMatch = (ticket.subscriberName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = (ticket.subscriberEmail || '').toLowerCase().includes(searchTerm.toLowerCase());
    const phoneMatch = ticket.subscriberPhone && ticket.subscriberPhone.includes(searchTerm);
    const messageMatch = (ticket.lastMessage || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (!nameMatch && !emailMatch && !phoneMatch && !messageMatch) return false;

    if (filterStatus === 'waiting_admin') return ticket.status === 'waiting_admin' || (ticket.unreadByAdmin || 0) > 0;
    if (filterStatus === 'in_progress') return ticket.status === 'in_progress';
    if (filterStatus === 'resolved') return ticket.status === 'resolved';

    return true;
  });

  const totalWaiting = tickets.filter((t) => t.status === 'waiting_admin' || (t.unreadByAdmin || 0) > 0).length;

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Top Banner Alert when messages are waiting */}
      {totalWaiting > 0 && (
        <div className="bg-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-700 shrink-0">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
              </span>
            </div>
            <div>
              <h3 className="font-serif font-extrabold text-sm sm:text-base text-amber-950">
                🔔 {totalWaiting} Assinante(s) com Mensagem Aguardando Sua Resposta
              </h3>
              <p className="text-xs text-amber-900 font-medium">
                Responda os assinantes no chat em tempo real abaixo para manter o suporte ágil e humanizado.
              </p>
            </div>
          </div>

          <button
            onClick={() => setFilterStatus('waiting_admin')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer"
          >
            Ver Aguardando Resposta ({totalWaiting})
          </button>
        </div>
      )}

      {/* Main Support Grid Layout */}
      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm flex flex-col lg:grid lg:grid-cols-12 h-[calc(100vh-210px)] min-h-[600px] max-h-[820px]">
        
        {/* Left Column: Tickets / Subscribers List (4 cols) */}
        <div className={`lg:col-span-4 border-r border-zinc-200 flex flex-col h-full min-h-0 bg-zinc-50/50 ${selectedTicketId ? 'hidden lg:flex' : 'flex'}`}>
          {/* Header & Search */}
          <div className="p-3.5 space-y-3 border-b border-zinc-200 bg-white shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Headset className="w-4 h-4 text-[#b5986e]" />
                <h3 className="font-serif font-bold text-sm text-zinc-900">Conversas de Suporte</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  title="Iniciar conversa com um assinante"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-700" />
                  <span>Novo Chat</span>
                </button>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                  {tickets.length}
                </span>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-amber-600 font-medium"
              />
            </div>

            {/* Filter Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 rounded-xl text-[11px] font-semibold">
              <button
                onClick={() => setFilterStatus('all')}
                className={`py-1 px-2 rounded-lg text-center transition-all cursor-pointer ${
                  filterStatus === 'all' ? 'bg-white text-zinc-900 shadow-2xs font-bold' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterStatus('waiting_admin')}
                className={`py-1 px-1 rounded-lg text-center transition-all cursor-pointer relative ${
                  filterStatus === 'waiting_admin' ? 'bg-white text-amber-900 shadow-2xs font-bold' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <span>Aguardando</span>
                {totalWaiting > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[9px] font-extrabold">
                    {totalWaiting}
                  </span>
                )}
              </button>
              <button
                onClick={() => setFilterStatus('resolved')}
                className={`py-1 px-2 rounded-lg text-center transition-all cursor-pointer ${
                  filterStatus === 'resolved' ? 'bg-white text-zinc-900 shadow-2xs font-bold' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Resolvidos
              </button>
            </div>
          </div>

          {/* Tickets List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 min-h-0">
            {filteredTickets.map((ticket) => {
              const isSelected = ticket.id === activeTicket?.id;
              const hasUnread = (ticket.unreadByAdmin || 0) > 0;
              const isWaiting = ticket.status === 'waiting_admin' || hasUnread;

              return (
                <div
                  key={ticket.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedTicketId(ticket.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedTicketId(ticket.id);
                    }
                  }}
                  className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 relative group select-none ${
                    isSelected
                      ? 'bg-amber-50/90 border-l-4 border-l-[#b5986e] shadow-2xs'
                      : isWaiting
                      ? 'bg-amber-50/40 hover:bg-amber-50/60'
                      : 'hover:bg-zinc-100/80 active:bg-zinc-200/60'
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-xs border border-amber-200 shadow-2xs">
                      {ticket.subscriberName ? ticket.subscriberName.substring(0, 2).toUpperCase() : 'AS'}
                    </div>
                    {isWaiting ? (
                      <span className="w-3 h-3 rounded-full bg-amber-500 border-2 border-white absolute bottom-0 right-0 animate-pulse"></span>
                    ) : (
                      <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"></span>
                    )}
                  </div>

                  {/* Content snippet */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-zinc-900 truncate">
                        {ticket.subscriberName}
                      </h4>
                      <span className="text-[10px] text-zinc-400 font-medium shrink-0">
                        {ticket.lastMessageTime}
                      </span>
                    </div>

                    <div className="text-[10px] text-zinc-500 truncate flex items-center gap-1 mt-0.5">
                      <Mail className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{ticket.subscriberEmail}</span>
                    </div>

                    <p className={`text-xs truncate mt-1 ${hasUnread ? 'font-bold text-zinc-900' : 'text-zinc-500 font-normal'}`}>
                      {ticket.lastMessageSender === 'admin' ? <span className="text-[#b5986e] font-semibold">Você: </span> : ''}
                      {ticket.lastMessage || 'Nova conversa iniciada'}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-zinc-100/60">
                      {/* Status Badge */}
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                        isWaiting
                          ? 'bg-amber-100 text-amber-900 border-amber-200'
                          : ticket.status === 'resolved'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-zinc-100 text-zinc-700 border-zinc-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isWaiting ? 'bg-amber-500' : ticket.status === 'resolved' ? 'bg-emerald-500' : 'bg-zinc-400'
                        }`} />
                        {isWaiting ? 'Aguardando Resposta' : ticket.status === 'resolved' ? 'Resolvido' : 'Em Atendimento'}
                      </span>

                      {hasUnread && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-[9px] font-extrabold flex items-center gap-1 shadow-2xs animate-pulse">
                          <span>{ticket.unreadByAdmin} nova(s)</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredTickets.length === 0 && (
              <div className="p-8 text-center text-zinc-400 space-y-3">
                <MessageSquare className="w-10 h-10 mx-auto opacity-30 text-zinc-400" />
                <p className="text-xs font-bold text-zinc-700">Nenhum atendimento no momento</p>
                <p className="text-[11px] text-zinc-400 max-w-[220px] mx-auto leading-relaxed">
                  Quando um assinante enviar mensagem pelo botão de suporte no app, aparecerá aqui instantaneamente em tempo real.
                </p>
                <button
                  type="button"
                  onClick={() => setIsNewChatModalOpen(true)}
                  className="px-3 py-1.5 bg-[#b5986e] hover:bg-[#a3865c] text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Iniciar Atendimento Manual</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Chat Window (8 cols) */}
        {activeTicket ? (
          <div className="lg:col-span-8 flex flex-col h-full min-h-0 bg-[#faf7f2]/50 relative overflow-hidden">
            
            {/* Top Chat Header */}
            <div className="p-3.5 bg-white border-b border-zinc-200 flex items-center justify-between gap-3 shadow-2xs shrink-0 z-10">
              <div className="flex items-center gap-3 min-w-0">
                {/* Mobile back button */}
                <button
                  type="button"
                  onClick={() => setSelectedTicketId('')}
                  className="lg:hidden p-1.5 -ml-1 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <CornerDownLeft className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-bold text-sm shrink-0 border border-amber-200 shadow-2xs">
                  {activeTicket.subscriberName ? activeTicket.subscriberName.substring(0, 2).toUpperCase() : 'AS'}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-sm text-zinc-900 truncate">
                      {activeTicket.subscriberName}
                    </h3>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                      Assinante da Plataforma
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                    <span className="flex items-center gap-1 truncate">
                      <Mail className="w-3 h-3 text-zinc-400" />
                      {activeTicket.subscriberEmail}
                    </span>
                    {activeTicket.subscriberPhone && (
                      <span className="hidden sm:flex items-center gap-1 font-mono text-zinc-600">
                        <Phone className="w-3 h-3 text-zinc-400" />
                        {activeTicket.subscriberPhone}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Status and Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <select
                  value={activeTicket.status}
                  onChange={(e) => handleChangeStatus(activeTicket.id, e.target.value as any)}
                  className={`text-[11px] font-bold px-2.5 py-1.5 rounded-xl border cursor-pointer focus:outline-none ${
                    activeTicket.status === 'waiting_admin'
                      ? 'bg-amber-50 text-amber-900 border-amber-300'
                      : activeTicket.status === 'resolved'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                      : 'bg-zinc-100 text-zinc-700 border-zinc-300'
                  }`}
                >
                  <option value="waiting_admin">Aguardando Resposta</option>
                  <option value="in_progress">Em Atendimento</option>
                  <option value="resolved">Resolvido / Concluído</option>
                </select>

                <button
                  type="button"
                  onClick={() => handleDeleteTicket(activeTicket.id)}
                  className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Excluir Atendimento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-4 py-2 bg-zinc-50 border-b border-zinc-200/80 flex items-center gap-1.5 overflow-x-auto scrollbar-none shrink-0">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1 shrink-0 mr-1">
                <Sparkles className="w-3 h-3 text-[#b5986e]" /> Respostas Rápidas:
              </span>
              {QUICK_RESPONSES.map((chip, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendReply(chip)}
                  className="text-[11px] font-medium text-zinc-700 hover:text-zinc-900 bg-white hover:bg-amber-50/80 border border-zinc-200 hover:border-amber-300 px-2.5 py-1 rounded-lg whitespace-nowrap transition-all cursor-pointer shadow-2xs"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 min-h-0 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
              <div className="text-center my-1">
                <span className="text-[10px] text-zinc-500 bg-white px-3 py-1 rounded-full border border-zinc-200 shadow-2xs">
                  Atendimento de Suporte • {activeTicket.subscriberName} ({activeTicket.subscriberEmail})
                </span>
              </div>

              {(activeTicket.messages || []).map((msg) => {
                const isAdmin = msg.sender === 'admin';
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${isAdmin ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 shadow-2xs ${
                        isAdmin
                          ? 'bg-[#b5986e] text-white font-bold text-xs'
                          : 'bg-white text-zinc-700 border border-zinc-200 font-bold text-xs'
                      }`}
                    >
                      {isAdmin ? <Shield className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                    </div>

                    <div
                      className={`max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-xs space-y-1 shadow-xs ${
                        isAdmin
                          ? 'bg-[#b5986e] text-white font-medium rounded-tr-xs'
                          : 'bg-white text-zinc-900 border border-zinc-200/90 rounded-tl-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 pb-0.5 border-b border-white/20">
                        <span className={`font-bold text-[10px] ${isAdmin ? 'text-amber-100' : 'text-zinc-600'}`}>
                          {msg.senderName || (isAdmin ? 'Administrador' : activeTicket.subscriberName)}
                        </span>
                        <span className={`text-[9px] ${isAdmin ? 'text-white/80' : 'text-zinc-400'}`}>
                          {msg.time}
                        </span>
                      </div>

                      <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Bottom Input Box */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendReply();
              }}
              className="p-3 bg-white border-t border-zinc-200 flex items-center gap-2 shrink-0"
            >
              <input
                type="text"
                placeholder={`Responder ${activeTicket.subscriberName ? activeTicket.subscriberName.split(' ')[0] : 'Assinante'}... (Pressione Enter para enviar)`}
                value={replyInput}
                onChange={(e) => setReplyInput(e.target.value)}
                disabled={isSending}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-[#b5986e] font-medium"
              />

              <button
                type="submit"
                disabled={!replyInput.trim() || isSending}
                className="px-4 py-2.5 bg-[#b5986e] hover:bg-[#a3865c] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                <span>Enviar</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        ) : (
          <div className="lg:col-span-8 flex flex-col items-center justify-center p-8 text-center text-zinc-400 bg-zinc-50/50">
            <MessageSquare className="w-12 h-12 mb-3 text-zinc-300" />
            <h4 className="text-sm font-bold text-zinc-700">Selecione uma conversa ou inicie um atendimento</h4>
            <p className="text-xs text-zinc-400 max-w-sm mt-1">
              Escolha um assinante na lista ou clique em "Novo Chat" para enviar uma mensagem para um usuário cadastrado.
            </p>
          </div>
        )}
      </div>

      {/* Modal: Iniciar Novo Chat com Assinante */}
      {isNewChatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2.5">
                <Headset className="w-5 h-5 text-[#b5986e]" />
                <h3 className="font-serif font-bold text-base text-zinc-900">Iniciar Chat com Assinante</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewChatModalOpen(false);
                  setSelectedUserForNewChat(null);
                  setInitialMessageInput('');
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Selecione o Assinante:
                </label>
                <select
                  value={selectedUserForNewChat?.uid || ''}
                  onChange={(e) => {
                    const u = users.find(x => x.uid === e.target.value);
                    setSelectedUserForNewChat(u || null);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 text-xs font-semibold text-zinc-900 bg-zinc-50 focus:bg-white focus:outline-none focus:border-[#b5986e]"
                >
                  <option value="">Selecione um usuário...</option>
                  {users.filter(u => u.email?.toLowerCase().trim() !== 'lfquadrosdecorativos@gmail.com').map((u) => (
                    <option key={u.uid} value={u.uid}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">
                  Primeira Mensagem:
                </label>
                <textarea
                  rows={3}
                  value={initialMessageInput}
                  onChange={(e) => setInitialMessageInput(e.target.value)}
                  placeholder="Olá! Sou do suporte do Meu Escritório Online. Como posso te ajudar hoje?"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 text-xs font-medium text-zinc-900 bg-zinc-50 focus:bg-white focus:outline-none focus:border-[#b5986e]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => {
                  setIsNewChatModalOpen(false);
                  setSelectedUserForNewChat(null);
                  setInitialMessageInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedUserForNewChat}
                onClick={() => {
                  if (selectedUserForNewChat) {
                    handleStartNewChatWithSubscriber(selectedUserForNewChat);
                  }
                }}
                className="px-4 py-2 bg-[#b5986e] hover:bg-[#a3865c] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Iniciar Conversa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
