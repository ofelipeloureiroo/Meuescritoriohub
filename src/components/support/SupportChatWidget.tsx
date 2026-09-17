import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Headset, CheckCircle2, User, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { doc, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db, sanitizeFirestoreData } from '../../lib/firebase';
import { SupportTicket, SupportMessage } from '../../types';

export const SupportChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const { user, profile } = useAuth();
  
  const rawEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const userName = profile?.name || user?.displayName || (rawEmail ? rawEmail.split('@')[0] : 'Assinante');
  const userEmail = rawEmail || 'contato@escritorio.com';
  const userUid = user?.uid || (rawEmail ? `sub_${rawEmail.replace(/[^a-zA-Z0-9]/g, '_')}` : 'guest_user');
  
  // Standardized document ID based on clean email or uid
  const ticketId = rawEmail ? `ticket_${rawEmail.replace(/[^a-zA-Z0-9]/g, '_')}` : `ticket_${userUid}`;

  const defaultInitialMessages: SupportMessage[] = [
    {
      id: 'welcome_1',
      sender: 'admin',
      senderName: 'Carlos Felipe (Suporte Admin)',
      senderEmail: 'lfquadrosdecorativos@gmail.com',
      text: `Olá, ${userName}! Seja muito bem-vindo(a) ao Suporte Dedicado do Meu Escritório Online. Como podemos te ajudar hoje?`,
      time: new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }),
      date: new Date().toISOString().split('T')[0],
      timestamp: new Date().toISOString(),
      read: true
    }
  ];

  const [ticketData, setTicketData] = useState<SupportTicket | null>(() => {
    try {
      const local = localStorage.getItem(`meu_escritorio_user_support_ticket_${ticketId}`);
      if (local) return JSON.parse(local);
    } catch {}
    return null;
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Real-time Firestore sync with the user's support ticket document
  useEffect(() => {
    if (!ticketId) return;

    const docRef = doc(db, 'support_tickets', ticketId);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as SupportTicket;
        setTicketData(data);
        try {
          localStorage.setItem(`meu_escritorio_user_support_ticket_${ticketId}`, JSON.stringify(data));
        } catch {}
      }
    }, (err) => {
      console.warn('Support ticket onSnapshot notice:', err);
    });

    return () => unsub();
  }, [ticketId]);

  // When user opens the chat, mark unread admin messages as read
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      if (ticketData && ticketData.unreadByUser > 0) {
        updateDoc(doc(db, 'support_tickets', ticketId), {
          unreadByUser: 0
        }).catch(() => {});
      }
    }
  }, [isOpen, ticketData?.messages, ticketId]);

  const messagesToDisplay: SupportMessage[] = ticketData?.messages && ticketData.messages.length > 0
    ? ticketData.messages
    : defaultInitialMessages;

  const unreadCountForUser = ticketData?.unreadByUser || 0;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isSending) return;

    const userText = inputMessage.trim();
    setIsSending(true);

    const now = new Date();
    const timeStr = now.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' });
    const dateStr = now.toISOString().split('T')[0];

    const newMsg: SupportMessage = {
      id: `msg_user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender: 'user',
      senderName: userName,
      senderEmail: userEmail,
      text: userText,
      time: timeStr,
      date: dateStr,
      timestamp: now.toISOString(),
      read: false
    };

    const currentMessages = ticketData?.messages || defaultInitialMessages;
    const updatedMessages = [...currentMessages, newMsg];

    const updatedTicket: SupportTicket = {
      id: ticketId,
      subscriberUid: userUid,
      subscriberName: userName,
      subscriberEmail: userEmail,
      subscriberPhone: (profile as any)?.phone || '',
      status: 'waiting_admin',
      unreadByAdmin: (ticketData?.unreadByAdmin || 0) + 1,
      unreadByUser: 0,
      lastMessage: userText,
      lastMessageTime: timeStr,
      lastMessageSender: 'user',
      createdAt: ticketData?.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
      messages: updatedMessages
    };

    // Optimistic UI state
    setTicketData(updatedTicket);
    try {
      localStorage.setItem(`meu_escritorio_user_support_ticket_${ticketId}`, JSON.stringify(updatedTicket));
      window.dispatchEvent(new CustomEvent('support_tickets_updated'));
    } catch {}

    setInputMessage('');

    try {
      await setDoc(doc(db, 'support_tickets', ticketId), sanitizeFirestoreData(updatedTicket), { merge: true });
      window.dispatchEvent(new CustomEvent('support_tickets_updated'));
    } catch (err) {
      console.warn('Error saving support message to Firestore:', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-40">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 sm:gap-2.5 px-3.5 py-2.5 sm:px-5 sm:py-3 bg-[var(--theme-primary)] hover:opacity-95 text-white font-bold text-xs rounded-full shadow-2xl transition-all cursor-pointer group hover:scale-105 border border-black/20"
        >
          <div className="relative">
            <Headset className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-emerald-500 rounded-full border-2 border-[var(--bg-card)] animate-pulse" />
          </div>
          <span className="tracking-wide text-xs text-white">Suporte</span>
          {unreadCountForUser > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-extrabold animate-bounce shadow-xs">
              {unreadCountForUser}
            </span>
          )}
        </button>
      )}

      {/* Chat Window Modal */}
      {isOpen && (
        <div className="w-[calc(100vw-32px)] sm:w-[400px] max-w-[400px] h-[480px] sm:h-[520px] bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Header */}
          <div className="bg-[var(--bg-card-secondary)] px-5 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/30 flex items-center justify-center text-[var(--theme-primary)]">
                <Headset className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-[var(--text-main)] text-sm tracking-wide">Suporte Dedicado</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-[var(--text-muted)] font-medium">Equipe de Atendimento Online</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-[var(--bg-card-secondary)] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[var(--bg-card-secondary)]">
            <div className="text-center my-2">
              <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-card)] px-3 py-1 rounded-full border border-[var(--border-color)]">
                Canal direto com o suporte • Atendimento ao assinante
              </span>
            </div>

            {messagesToDisplay.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      isUser
                        ? 'bg-[var(--theme-primary)] text-white font-bold text-xs'
                        : 'bg-[var(--bg-card)] text-[var(--theme-primary)] border border-[var(--border-color)]'
                    }`}
                  >
                    {isUser ? <User className="w-3.5 h-3.5" /> : <Shield className="w-3.5 h-3.5" />}
                  </div>

                  <div
                    className={`max-w-[78%] px-4 py-3 rounded-2xl text-xs space-y-1 shadow-xs ${
                      isUser
                        ? 'bg-[var(--theme-primary)] text-white font-medium rounded-tr-xs'
                        : 'bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-color)] rounded-tl-xs'
                    }`}
                  >
                    {!isUser && (
                      <div className="text-[10px] font-bold text-[var(--theme-primary)] pb-0.5 border-b border-[var(--border-color)]/50">
                        {msg.senderName || 'Suporte Admin'}
                      </div>
                    )}
                    <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                    <div
                      className={`text-[9px] text-right flex items-center justify-end gap-1 ${
                        isUser ? 'text-white/80' : 'text-[var(--text-muted)]'
                      }`}
                    >
                      <span>{msg.time}</span>
                      {isUser && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSendMessage} className="p-3 bg-[var(--bg-card-secondary)] border-t border-[var(--border-color)] flex items-center gap-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Digite sua dúvida ou solicitação..."
              disabled={isSending}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] text-xs focus:outline-hidden focus:border-[var(--theme-primary)] placeholder:[var(--text-muted)]"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="p-2.5 bg-[var(--theme-primary)] hover:opacity-90 disabled:opacity-40 text-white rounded-xl transition-all cursor-pointer flex items-center justify-center shadow-xs"
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
