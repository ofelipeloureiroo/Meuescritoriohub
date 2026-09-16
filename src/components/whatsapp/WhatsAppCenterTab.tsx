import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Search,
  Plus,
  Send,
  Paperclip,
  Check,
  CheckCheck,
  User,
  Phone,
  FolderOpen,
  UserCheck,
  FileText,
  Image as ImageIcon,
  Clock,
  QrCode,
  Settings,
  RefreshCw,
  Sparkles,
  Lock,
  ChevronRight,
  Filter,
  X,
  Bot,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  MoreVertical,
  Download,
  Calendar,
  Eye,
  Trash2,
  CheckCircle2
} from 'lucide-react';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { useAuth } from '../../context/AuthContext';

export interface WhatsAppMessage {
  id: string;
  sender: 'client' | 'team';
  senderName: string;
  text: string;
  timestamp: string; // ISO or HH:mm
  date: string; // YYYY-MM-DD
  status: 'sent' | 'delivered' | 'read';
  mediaUrl?: string;
  mediaType?: 'image' | 'document' | 'audio';
  mediaName?: string;
  isInternalNote?: boolean;
}

export interface WhatsAppChat {
  id: string;
  clientName: string;
  clientEmail?: string;
  clientPhone: string;
  clientAvatar?: string;
  projectName?: string;
  assignedMember: string; // Name of team member assigned
  status: 'open' | 'in_progress' | 'waiting_client' | 'closed';
  unreadCount: number;
  lastMessage: string;
  lastMessageTime: string;
  messages: WhatsAppMessage[];
  createdAt: string;
  tags?: string[];
}

const STORAGE_KEY = 'meu_escritorio_whatsapp_chats_v2';

const DEFAULT_CHATS: WhatsAppChat[] = [
  {
    id: 'chat-maria-laura',
    clientName: 'Maria Laura',
    clientEmail: 'marialaura@lparquitetura.com.br',
    clientPhone: '+55 (21) 98765-4321',
    clientAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150',
    projectName: 'Residência Alphaville - Interiores',
    assignedMember: 'João Silva (Arquiteto)',
    status: 'in_progress',
    unreadCount: 1,
    lastMessage: 'Amei a proposta do revestimento da cozinha! Quando podemos agendar a apresentação 3D?',
    lastMessageTime: '10:42',
    tags: ['VIP', 'Em Andamento'],
    createdAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-1',
        sender: 'team',
        senderName: 'João Silva (Arquiteto)',
        text: 'Olá Maria Laura, bom dia! Enviamos o detalhamento de marcenaria da suíte master no seu e-mail.',
        timestamp: '09:15',
        date: new Date().toISOString().split('T')[0],
        status: 'read'
      },
      {
        id: 'msg-2',
        sender: 'team',
        senderName: 'João Silva (Arquiteto)',
        text: 'Nota Interna: Cliente solicitou alteração na iluminação do closet. Verificar fornecedor da fita LED.',
        timestamp: '09:18',
        date: new Date().toISOString().split('T')[0],
        status: 'read',
        isInternalNote: true
      },
      {
        id: 'msg-3',
        sender: 'client',
        senderName: 'Maria Laura',
        text: 'Amei a proposta do revestimento da cozinha! Quando podemos agendar a apresentação 3D?',
        timestamp: '10:42',
        date: new Date().toISOString().split('T')[0],
        status: 'read'
      }
    ]
  },
  {
    id: 'chat-laine-loureiro',
    clientName: 'Laine Paula Loureiro',
    clientEmail: 'laine@lparquitetura.com.br',
    clientPhone: '+55 (11) 97123-8899',
    clientAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
    projectName: 'Reforma Comercial Loft LP',
    assignedMember: 'Maria Paula (Designer)',
    status: 'open',
    unreadCount: 0,
    lastMessage: 'Recebi o orçamento de iluminação do fornecedor parceiro. Segue o comprovante de aprovação.',
    lastMessageTime: 'Ontem',
    tags: ['Comercial'],
    createdAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-10',
        sender: 'client',
        senderName: 'Laine Paula Loureiro',
        text: 'Recebi o orçamento de iluminação do fornecedor parceiro. Segue o comprovante de aprovação.',
        timestamp: '16:30',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        status: 'read'
      },
      {
        id: 'msg-11',
        sender: 'team',
        senderName: 'Maria Paula (Designer)',
        text: 'Excelente Laine! Já dei entrada no pedido de compras com a loja parceira.',
        timestamp: '16:45',
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        status: 'read'
      }
    ]
  },
  {
    id: 'chat-carlos-eduardo',
    clientName: 'Carlos Eduardo',
    clientEmail: 'carlos.eduardo@empresa.com.br',
    clientPhone: '+55 (21) 99112-4455',
    projectName: 'Cobertura Duplex Barra',
    assignedMember: 'Equipe Geral',
    status: 'waiting_client',
    unreadCount: 0,
    lastMessage: 'Enviamos o contrato assinado e a primeira parcela via PIX. Por favor confirmem o recebimento.',
    lastMessageTime: '14/09',
    tags: ['Novos Leads'],
    createdAt: new Date().toISOString(),
    messages: [
      {
        id: 'msg-20',
        sender: 'client',
        senderName: 'Carlos Eduardo',
        text: 'Enviamos o contrato assinado e a primeira parcela via PIX. Por favor confirmem o recebimento.',
        timestamp: '14:10',
        date: '2026-09-14',
        status: 'read'
      }
    ]
  }
];

const PRESET_TEMPLATES = [
  { label: 'Apresentação 3D Pronta', text: 'Olá! A apresentação 3D do seu projeto já está pronta. Podemos agendar uma reunião online para apresentar?' },
  { label: 'Relatório Financeiro', text: 'Olá! Atualizamos a planilha de custos e fornecedores do seu projeto. O documento foi disponibilizado no seu Portal do Cliente.' },
  { label: 'Lembrete de Reunião', text: 'Olá! Confirmando nossa reunião agendada para amanhã às 14:00 no escritório para definição dos acabamentos.' },
  { label: 'Contrato & Boas-vindas', text: 'Olá! Seja muito bem-vindo(a) ao nosso escritório. Em anexo enviamos o termo contratual e o cronograma inicial das etapas.' }
];

interface WhatsAppCenterTabProps {
  onNavigateTab?: (tab: string) => void;
}

export const WhatsAppCenterTab: React.FC<WhatsAppCenterTabProps> = ({ onNavigateTab }) => {
  const { user, profile } = useAuth();
  const [chats, setChats] = useState<WhatsAppChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string>('chat-maria-laura');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'mine' | 'unread' | 'closed'>('all');
  
  // Message composition states
  const [messageInput, setMessageInput] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; type: 'image' | 'document' } | null>(null);
  
  // Modals & Sliders
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showTemplatesDropdown, setShowTemplatesDropdown] = useState(false);
  const [autoSimulateReply, setAutoSimulateReply] = useState(true);

  // Connection settings state
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  const [instanceName, setInstanceName] = useState('Escritório Principal');
  const [instancePhone, setInstancePhone] = useState('+55 (21) 99821-3069');
  const [providerApi, setProviderApi] = useState<'zapi' | 'evolution' | 'twilio' | 'dev'>('zapi');
  const [zapiInstanceId, setZapiInstanceId] = useState('3F93F58A2B108198830236EE76B60FCD');
  const [zapiInstanceToken, setZapiInstanceToken] = useState('B47651661E706A718A173D03');
  const [zapiClientToken, setZapiClientToken] = useState('');
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [isTestingZapi, setIsTestingZapi] = useState(false);
  const [zapiTestResult, setZapiTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSaveConfig = () => {
    const config = {
      providerApi,
      instanceName,
      instancePhone,
      zapiInstanceId,
      zapiInstanceToken,
      zapiClientToken,
      autoSimulateReply,
    };
    localStorage.setItem('meu_escritorio_zapi_config_v1', JSON.stringify(config));
    setShowConfigModal(false);
    alert('Configurações salvas com sucesso no sistema!');
  };

  const handleTestZapi = async () => {
    if (!zapiInstanceId || !zapiInstanceToken) {
      alert('Por favor, preencha o ID da Instância e o Token da Instância primeiro.');
      return;
    }
    setIsTestingZapi(true);
    setZapiTestResult(null);

    // Target a client phone if selected, or fallback
    const targetPhone = activeChat?.clientPhone ? activeChat.clientPhone.replace(/\D/g, '') : instancePhone.replace(/\D/g, '');

    try {
      const res = await fetch('/api/zapi/send-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: zapiInstanceId.trim(),
          instanceToken: zapiInstanceToken.trim(),
          clientToken: zapiClientToken.trim(),
          phone: targetPhone,
          message: '🔔 Teste de conexão Z-API realizado com sucesso pelo Meu Escritório Online!',
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setZapiTestResult({
          success: true,
          message: `✅ Conexão Z-API OK! Mensagem de teste enviada para o número (${targetPhone}).`,
        });
      } else {
        const errorDetail = data.error || data.message || (data.details ? JSON.stringify(data.details) : 'Erro de comunicação');
        setZapiTestResult({
          success: false,
          message: `⚠️ Resposta da Z-API: ${errorDetail}`,
        });
      }
    } catch (err: any) {
      setZapiTestResult({
        success: false,
        message: `❌ Falha na chamada: ${err.message || 'Erro de rede/servidor'}`,
      });
    } finally {
      setIsTestingZapi(false);
    }
  };

  // New Chat Form
  const [newChatData, setNewChatData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    projectName: '',
    assignedMember: profile?.name || user?.email?.split('@')[0] || 'Arquiteto João',
    initialMessage: 'Olá! Entro em contato referente ao seu projeto de arquitetura.'
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load team members from local storage
  const teamMembersList = (() => {
    try {
      const saved = localStorage.getItem('meu_escritorio_equipe_v1');
      if (saved) {
        const arr = JSON.parse(saved);
        if (Array.isArray(arr) && arr.length > 0) {
          return arr.map((m: any) => m.name || m.email);
        }
      }
    } catch {}
    return ['João Silva (Arquiteto)', 'Maria Paula (Designer)', 'Ana Costa (Coordenadora)', 'Equipe Geral'];
  })();

  // 1. Initial Load & Firestore Realtime Sync
  useEffect(() => {
    let unsub: () => void = () => {};

    // Load saved Z-API config
    try {
      const savedConfig = localStorage.getItem('meu_escritorio_zapi_config_v1');
      if (savedConfig) {
        const cfg = JSON.parse(savedConfig);
        if (cfg.providerApi) setProviderApi(cfg.providerApi);
        if (cfg.instanceName) setInstanceName(cfg.instanceName);
        if (cfg.instancePhone) setInstancePhone(cfg.instancePhone);
        if (cfg.zapiInstanceId) setZapiInstanceId(cfg.zapiInstanceId);
        if (cfg.zapiInstanceToken) setZapiInstanceToken(cfg.zapiInstanceToken);
        if (cfg.zapiClientToken !== undefined) setZapiClientToken(cfg.zapiClientToken);
        if (cfg.autoSimulateReply !== undefined) setAutoSimulateReply(cfg.autoSimulateReply);
      }
    } catch (err) {
      console.warn("Could not load zapi config:", err);
    }

    const loadChats = async () => {
      // Local cache first
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChats(parsed);
          } else {
            setChats(DEFAULT_CHATS);
          }
        } catch (e) {
          setChats(DEFAULT_CHATS);
        }
      } else {
        setChats(DEFAULT_CHATS);
      }

      // Firestore Listener
      try {
        const colRef = collection(db, 'whatsapp_chats');
        unsub = onSnapshot(colRef, (snapshot) => {
          const fsChats: WhatsAppChat[] = [];
          snapshot.forEach(doc => {
            fsChats.push({ id: doc.id, ...doc.data() } as WhatsAppChat);
          });

          if (fsChats.length > 0) {
            // Sort by last message time
            setChats(fsChats);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(fsChats));
          }
        }, (err) => {
          console.warn("Firestore whatsapp_chats listener warning:", err);
        });
      } catch (err) {
        console.warn("Could not subscribe to whatsapp_chats Firestore:", err);
      }
    };

    loadChats();

    return () => unsub();
  }, []);

  // Save changes helper
  const saveChatsState = (newChats: WhatsAppChat[]) => {
    setChats(newChats);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newChats));

    // Async sync to Firestore
    const active = newChats.find(c => c.id === activeChatId);
    if (active) {
      setDoc(doc(db, 'whatsapp_chats', active.id), active).catch(console.warn);
    }
  };

  // Scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeChatId, chats]);

  // Active Chat Object
  const activeChat = chats.find(c => c.id === activeChatId) || chats[0];

  // Send message handler
  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() && !attachedFile) return;

    if (!activeChat) return;

    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toISOString().split('T')[0];
    const currentUserName = profile?.name || user?.email?.split('@')[0] || 'Arquiteto João';

    const newMsg: WhatsAppMessage = {
      id: `msg-${Date.now()}`,
      sender: 'team',
      senderName: currentUserName,
      text: messageInput.trim(),
      timestamp: timeStr,
      date: dateStr,
      status: 'sent',
      isInternalNote: isInternalNote,
      mediaName: attachedFile?.name,
      mediaType: attachedFile?.type,
      mediaUrl: attachedFile ? 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&q=80&w=800' : undefined
    };

    const updatedMessages = [...activeChat.messages, newMsg];
    const updatedChat: WhatsAppChat = {
      ...activeChat,
      messages: updatedMessages,
      lastMessage: isInternalNote ? `[Nota Interna]: ${messageInput}` : messageInput || (attachedFile ? `[Arquivo: ${attachedFile.name}]` : ''),
      lastMessageTime: timeStr,
      status: isInternalNote ? activeChat.status : 'waiting_client'
    };

    const updatedChatsList = chats.map(c => c.id === activeChat.id ? updatedChat : c);
    saveChatsState(updatedChatsList);

    // Send real message via Z-API if configured
    if (providerApi === 'zapi' && zapiInstanceId && zapiInstanceToken && !isInternalNote && activeChat.clientPhone) {
      fetch('/api/zapi/send-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId: zapiInstanceId,
          instanceToken: zapiInstanceToken,
          clientToken: zapiClientToken,
          phone: activeChat.clientPhone,
          message: messageInput.trim(),
        }),
      }).catch((err) => console.warn('Z-API direct dispatch info:', err));
    }

    setMessageInput('');
    setAttachedFile(null);
    setIsInternalNote(false);

    // Auto-reply Simulation if enabled and not an internal note
    if (autoSimulateReply && !isInternalNote) {
      setTimeout(() => {
        const replyTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const clientReply: WhatsAppMessage = {
          id: `reply-${Date.now()}`,
          sender: 'client',
          senderName: activeChat.clientName,
          text: `Perfeito ${currentUserName.split(' ')[0]}! Recebi a mensagem aqui no meu WhatsApp. Muito obrigado pela atenção!`,
          timestamp: replyTime,
          date: dateStr,
          status: 'read'
        };

        setChats(prev => {
          const current = prev.find(c => c.id === activeChat.id);
          if (!current) return prev;
          const withReply = {
            ...current,
            messages: [...current.messages, clientReply],
            lastMessage: clientReply.text,
            lastMessageTime: replyTime,
            status: 'in_progress' as const
          };
          const nextChats = prev.map(c => c.id === current.id ? withReply : c);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(nextChats));
          setDoc(doc(db, 'whatsapp_chats', current.id), withReply).catch(console.warn);
          return nextChats;
        });
      }, 2500);
    }
  };

  // Create New Chat
  const handleCreateNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatData.clientName || !newChatData.clientPhone) return;

    const newId = `chat-${Date.now()}`;
    const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const dateStr = new Date().toISOString().split('T')[0];

    const initialMsgObj: WhatsAppMessage = {
      id: `msg-init-${Date.now()}`,
      sender: 'team',
      senderName: newChatData.assignedMember,
      text: newChatData.initialMessage,
      timestamp: timeStr,
      date: dateStr,
      status: 'delivered'
    };

    const newChat: WhatsAppChat = {
      id: newId,
      clientName: newChatData.clientName.trim(),
      clientPhone: newChatData.clientPhone.trim(),
      clientEmail: newChatData.clientEmail.trim(),
      projectName: newChatData.projectName.trim() || 'Novo Atendimento',
      assignedMember: newChatData.assignedMember,
      status: 'open',
      unreadCount: 0,
      lastMessage: newChatData.initialMessage,
      lastMessageTime: timeStr,
      createdAt: new Date().toISOString(),
      tags: ['Manual'],
      messages: [initialMsgObj]
    };

    const updated = [newChat, ...chats];
    saveChatsState(updated);
    setActiveChatId(newId);
    setShowNewChatModal(false);

    setNewChatData({
      clientName: '',
      clientPhone: '',
      clientEmail: '',
      projectName: '',
      assignedMember: profile?.name || user?.email?.split('@')[0] || 'Arquiteto João',
      initialMessage: 'Olá! Entro em contato referente ao seu projeto de arquitetura.'
    });
  };

  // Change assigned team member for active chat
  const handleAssignMember = (memberName: string) => {
    if (!activeChat) return;
    const updated = { ...activeChat, assignedMember: memberName };
    const list = chats.map(c => c.id === activeChat.id ? updated : c);
    saveChatsState(list);
  };

  // Change status of active chat
  const handleStatusChange = (status: WhatsAppChat['status']) => {
    if (!activeChat) return;
    const updated = { ...activeChat, status };
    const list = chats.map(c => c.id === activeChat.id ? updated : c);
    saveChatsState(list);
  };

  // Delete chat
  const handleDeleteChat = (chatId: string) => {
    const updated = chats.filter(c => c.id !== chatId);
    setChats(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    deleteDoc(doc(db, 'whatsapp_chats', chatId)).catch(console.warn);
    if (activeChatId === chatId && updated.length > 0) {
      setActiveChatId(updated[0].id);
    }
  };

  // Filtered chats list
  const filteredChats = chats.filter(chat => {
    const matchesSearch =
      chat.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.clientPhone.includes(searchTerm) ||
      (chat.projectName && chat.projectName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterTab === 'mine') {
      const currentUserName = profile?.name || user?.email?.split('@')[0] || 'João';
      return chat.assignedMember.toLowerCase().includes(currentUserName.toLowerCase());
    }
    if (filterTab === 'unread') return chat.unreadCount > 0;
    if (filterTab === 'closed') return chat.status === 'closed';

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Header & Connection Banner */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
            <MessageSquare className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-serif font-extrabold text-zinc-900 tracking-tight">
                Central de Atendimento WhatsApp
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                API Ativa
              </span>
            </div>
            <p className="text-zinc-500 text-xs font-medium mt-0.5">
              Comunicação integrada entre clientes e membros da sua equipe de arquitetura.
            </p>
          </div>
        </div>

        {/* Quick Connection Info & Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-bold text-zinc-700">{instancePhone}</span>
            <span className="text-zinc-400">|</span>
            <span className="text-zinc-500 font-medium">{instanceName}</span>
          </div>

          <button
            onClick={() => setShowConfigModal(true)}
            className="px-3.5 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer border border-zinc-200"
          >
            <QrCode className="w-4 h-4 text-emerald-600" />
            <span>QR Code / Conexão API</span>
          </button>

          <button
            onClick={() => setShowNewChatModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Chat WhatsApp</span>
          </button>
        </div>
      </div>

      {/* Main Container Layout (3 Columns: Left List, Center Chat, Right Details) */}
      <div className="bg-white border border-zinc-200 rounded-3xl overflow-hidden shadow-sm grid grid-cols-1 lg:grid-cols-12 min-h-[620px] max-h-[750px] h-[calc(100vh-220px)]">
        
        {/* Left Column: Chats List (4 cols) */}
        <div className="lg:col-span-4 border-r border-zinc-200 flex flex-col bg-zinc-50/50">
          {/* Search & Tabs Header */}
          <div className="p-3.5 space-y-3 border-b border-zinc-200 bg-white">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, projeto ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-zinc-100 border border-zinc-200 text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:bg-white focus:border-emerald-500 font-medium"
              />
            </div>

            {/* Sub-filter tabs */}
            <div className="flex items-center justify-between gap-1 p-1 bg-zinc-100 rounded-xl text-[11px] font-semibold">
              <button
                onClick={() => setFilterTab('all')}
                className={`flex-1 py-1 px-2 rounded-lg text-center transition-all cursor-pointer ${
                  filterTab === 'all' ? 'bg-white text-zinc-900 shadow-2xs font-bold' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Todos ({chats.length})
              </button>
              <button
                onClick={() => setFilterTab('mine')}
                className={`flex-1 py-1 px-2 rounded-lg text-center transition-all cursor-pointer ${
                  filterTab === 'mine' ? 'bg-white text-zinc-900 shadow-2xs font-bold' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Meus
              </button>
              <button
                onClick={() => setFilterTab('unread')}
                className={`flex-1 py-1 px-2 rounded-lg text-center transition-all cursor-pointer ${
                  filterTab === 'unread' ? 'bg-white text-zinc-900 shadow-2xs font-bold' : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                Não Lidos
              </button>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
            {filteredChats.map((chat) => {
              const isSelected = chat.id === activeChatId;
              return (
                <div
                  key={chat.id}
                  onClick={() => {
                    setActiveChatId(chat.id);
                    // Clear unread badge
                    if (chat.unreadCount > 0) {
                      const updated = chats.map(c => c.id === chat.id ? { ...c, unreadCount: 0 } : c);
                      saveChatsState(updated);
                    }
                  }}
                  className={`p-3.5 transition-all cursor-pointer flex items-start gap-3 relative group ${
                    isSelected
                      ? 'bg-emerald-50/60 border-l-4 border-l-emerald-600'
                      : 'hover:bg-zinc-100/80'
                  }`}
                >
                  {/* Client Avatar */}
                  <div className="relative shrink-0">
                    {chat.clientAvatar ? (
                      <img
                        src={chat.clientAvatar}
                        alt={chat.clientName}
                        className="w-10 h-10 rounded-full object-cover border border-zinc-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm border border-emerald-200">
                        {chat.clientName.substring(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white absolute bottom-0 right-0"></span>
                  </div>

                  {/* Chat Content Snippet */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-zinc-900 truncate">
                        {chat.clientName}
                      </h4>
                      <span className="text-[10px] text-zinc-400 font-medium shrink-0">
                        {chat.lastMessageTime}
                      </span>
                    </div>

                    {chat.projectName && (
                      <span className="inline-block text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200/60 mt-0.5 truncate max-w-full">
                        {chat.projectName}
                      </span>
                    )}

                    <p className="text-xs text-zinc-500 truncate mt-1 font-normal">
                      {chat.lastMessage}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t border-zinc-100/60">
                      <span className="text-[10px] text-zinc-600 font-semibold flex items-center gap-1 truncate">
                        <UserCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{chat.assignedMember}</span>
                      </span>

                      {chat.unreadCount > 0 && (
                        <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[9px] font-extrabold flex items-center justify-center shrink-0 shadow-2xs">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredChats.length === 0 && (
              <div className="p-8 text-center text-zinc-400 space-y-2">
                <MessageSquare className="w-8 h-8 mx-auto opacity-30" />
                <p className="text-xs font-medium">Nenhuma conversa encontrada.</p>
              </div>
            )}
          </div>
        </div>

        {/* Center Column: Active Chat Window (5 cols or 8 cols depending on detail bar) */}
        {activeChat ? (
          <div className="lg:col-span-8 flex flex-col h-full bg-[#efeae2]/40 relative">
            
            {/* Chat Top Header */}
            <div className="p-3.5 bg-white border-b border-zinc-200 flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                {activeChat.clientAvatar ? (
                  <img
                    src={activeChat.clientAvatar}
                    alt={activeChat.clientName}
                    className="w-10 h-10 rounded-full object-cover border border-zinc-200 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                    {activeChat.clientName.substring(0, 2).toUpperCase()}
                  </div>
                )}
                
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif font-bold text-sm text-zinc-900 truncate">
                      {activeChat.clientName}
                    </h3>
                    <span className="text-[11px] font-mono text-zinc-500 hidden sm:inline-block">
                      {activeChat.clientPhone}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-medium truncate mt-0.5">
                    <span className="text-amber-700 font-bold">{activeChat.projectName || 'Projeto Não Especificado'}</span>
                  </div>
                </div>
              </div>

              {/* Header Right Actions & Assignee Selector */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Team Assignee Selector */}
                <div className="hidden sm:flex items-center gap-1.5 bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded-xl text-xs">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <select
                    value={activeChat.assignedMember}
                    onChange={(e) => handleAssignMember(e.target.value)}
                    className="bg-transparent text-xs text-zinc-800 font-bold focus:outline-none cursor-pointer"
                    title="Alterar membro da equipe responsável"
                  >
                    {teamMembersList.map((m: string) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                {/* Status Switcher */}
                <select
                  value={activeChat.status}
                  onChange={(e) => handleStatusChange(e.target.value as any)}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-xl border cursor-pointer focus:outline-none ${
                    activeChat.status === 'in_progress' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    activeChat.status === 'waiting_client' ? 'bg-amber-50 text-amber-800 border-amber-200' :
                    activeChat.status === 'closed' ? 'bg-zinc-100 text-zinc-600 border-zinc-200' :
                    'bg-sky-50 text-sky-800 border-sky-200'
                  }`}
                >
                  <option value="open">Aberto</option>
                  <option value="in_progress">Em Atendimento</option>
                  <option value="waiting_client">Aguardando Cliente</option>
                  <option value="closed">Concluído</option>
                </select>

                <button
                  onClick={() => handleDeleteChat(activeChat.id)}
                  className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Excluir Atendimento"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Thread Background */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
              
              {/* Security Banner Notice */}
              <div className="max-w-md mx-auto p-2.5 bg-amber-50/90 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 text-center font-medium shadow-2xs flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Mensagens sincronizadas via API oficial com histórico do escritório.</span>
              </div>

              {activeChat.messages.map((msg) => {
                const isTeam = msg.sender === 'team';
                const isInternal = msg.isInternalNote;

                if (isInternal) {
                  return (
                    <div key={msg.id} className="max-w-md mx-auto my-2">
                      <div className="bg-amber-100/90 border border-amber-300 text-amber-900 p-3 rounded-2xl text-xs shadow-2xs space-y-1">
                        <div className="flex items-center justify-between gap-2 font-bold text-[10px] uppercase tracking-wider text-amber-800 border-b border-amber-200/60 pb-1">
                          <span className="flex items-center gap-1">
                            <Lock className="w-3 h-3 text-amber-700" />
                            Nota Interna da Equipe (Invisível para o cliente)
                          </span>
                          <span>{msg.timestamp}</span>
                        </div>
                        <p className="font-medium">{msg.text}</p>
                        <div className="text-[10px] text-amber-700 font-bold text-right">
                          Registrado por: {msg.senderName}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isTeam ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[82%] sm:max-w-[70%] p-3 rounded-2xl text-xs shadow-2xs relative space-y-1 ${
                        isTeam
                          ? 'bg-emerald-700 text-white rounded-tr-none'
                          : 'bg-white text-zinc-900 rounded-tl-none border border-zinc-200'
                      }`}
                    >
                      {/* Sender Name Label */}
                      <div className={`text-[10px] font-bold flex items-center justify-between gap-3 pb-0.5 ${
                        isTeam ? 'text-emerald-100' : 'text-zinc-500'
                      }`}>
                        <span>{msg.senderName}</span>
                        <span className="font-normal opacity-80">{msg.timestamp}</span>
                      </div>

                      {/* Attached media display */}
                      {msg.mediaName && (
                        <div className={`p-2 rounded-xl flex items-center gap-2 text-xs font-bold mb-1 ${
                          isTeam ? 'bg-emerald-800 text-white' : 'bg-zinc-100 text-zinc-800'
                        }`}>
                          <FileText className="w-4 h-4 shrink-0 text-amber-400" />
                          <span className="truncate flex-1">{msg.mediaName}</span>
                          <Download className="w-3.5 h-3.5 cursor-pointer hover:opacity-80" />
                        </div>
                      )}

                      {/* Message Text */}
                      <p className="leading-relaxed whitespace-pre-wrap font-medium">
                        {msg.text}
                      </p>

                      {/* Status Checkmark */}
                      {isTeam && (
                        <div className="flex justify-end pt-0.5">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-200" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              <div ref={messagesEndRef} />
            </div>

            {/* Composer Footer Bar */}
            <div className="p-3 bg-white border-t border-zinc-200 space-y-2">
              
              {/* Mode Toggle & Presets */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsInternalNote(false)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      !isInternalNote
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    Mensagem WhatsApp
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsInternalNote(true)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      isInternalNote
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                    }`}
                  >
                    <Lock className="w-3 h-3" />
                    <span>Nota Interna (Privada)</span>
                  </button>
                </div>

                {/* Templates Dropdown Button */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowTemplatesDropdown(!showTemplatesDropdown)}
                    className="px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded-xl text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Zap className="w-3 h-3 text-amber-600" />
                    <span>Respostas Rápidas</span>
                  </button>

                  {showTemplatesDropdown && (
                    <div className="absolute right-0 bottom-full mb-2 w-72 bg-white border border-zinc-200 rounded-2xl shadow-xl p-2 z-30 space-y-1">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-2 py-1">
                        Modelos de Resposta Padrão
                      </div>
                      {PRESET_TEMPLATES.map((tmpl, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setMessageInput(tmpl.text);
                            setShowTemplatesDropdown(false);
                          }}
                          className="w-full text-left p-2 rounded-xl hover:bg-emerald-50 text-xs font-medium text-zinc-800 hover:text-emerald-900 transition-colors block"
                        >
                          <div className="font-bold text-emerald-800 text-[11px]">{tmpl.label}</div>
                          <div className="text-[10px] text-zinc-500 truncate">{tmpl.text}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Attached file preview chip */}
              {attachedFile && (
                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between font-bold">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Anexo: {attachedFile.name}</span>
                  </span>
                  <button onClick={() => setAttachedFile(null)} className="text-zinc-400 hover:text-rose-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Main Text Input & Actions */}
              <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                <label className="p-2 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer shrink-0">
                  <Paperclip className="w-4 h-4" />
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setAttachedFile({
                          name: file.name,
                          type: file.type.startsWith('image/') ? 'image' : 'document'
                        });
                      }
                    }}
                  />
                </label>

                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder={
                    isInternalNote
                      ? 'Escreva uma nota interna sobre o projeto (visível apenas para a equipe)...'
                      : 'Digite sua mensagem via WhatsApp para o cliente...'
                  }
                  className={`flex-1 px-4 py-2.5 rounded-2xl text-xs font-medium focus:outline-none transition-all ${
                    isInternalNote
                      ? 'bg-amber-50 border border-amber-300 text-amber-900 placeholder-amber-400 focus:bg-white'
                      : 'bg-zinc-100 border border-zinc-200 text-zinc-900 placeholder-zinc-400 focus:bg-white focus:border-emerald-500'
                  }`}
                />

                <button
                  type="submit"
                  disabled={!messageInput.trim() && !attachedFile}
                  className={`p-2.5 rounded-2xl text-white font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 ${
                    isInternalNote ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                  title={isInternalNote ? 'Salvar Nota Interna' : 'Enviar WhatsApp'}
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-8 flex flex-col items-center justify-center p-8 bg-zinc-50 text-center space-y-3">
            <MessageSquare className="w-12 h-12 text-zinc-300" />
            <h3 className="font-serif font-bold text-lg text-zinc-700">Nenhum Atendimento Selecionado</h3>
            <p className="text-xs text-zinc-500 max-w-sm">
              Selecione uma conversa ao lado ou inicie um novo chat de WhatsApp com seu cliente.
            </p>
          </div>
        )}
      </div>

      {/* Modal de Conexão WhatsApp / QR Code / API */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 w-full max-w-lg space-y-5 shadow-2xl relative animate-in zoom-in-95 duration-200 text-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-emerald-600" />
                <h3 className="font-serif font-bold text-lg text-zinc-900">
                  Configuração de Conexão WhatsApp API
                </h3>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Live QR Code Box */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-2xl p-4 text-center space-y-3">
              <div className="w-44 h-44 bg-white border-2 border-emerald-500 rounded-2xl mx-auto p-3 flex flex-col items-center justify-center relative shadow-xs">
                {/* QR Code Graphic Mock */}
                <QrCode className="w-32 h-32 text-zinc-900" />
                <div className="absolute inset-0 bg-emerald-500/5 backdrop-blur-[0.5px] rounded-2xl flex items-center justify-center">
                  <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-2xs">
                    INSTÂNCIA ONLINE
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold text-emerald-700 flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Conectado com sucesso: {instancePhone}</span>
                </div>
                <p className="text-[11px] text-zinc-500">
                  Instância "{instanceName}" pronta para enviar e receber mensagens de clientes da equipe.
                </p>
              </div>
            </div>

            {/* Provider Settings Form */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                  Provedor de API WhatsApp
                </label>
                <select
                  value={providerApi}
                  onChange={(e) => setProviderApi(e.target.value as any)}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
                >
                  <option value="zapi">Z-API (Conexão QR Code Simples)</option>
                  <option value="evolution">Evolution API (Open-Source Multi-Device)</option>
                  <option value="twilio">Twilio / Meta WhatsApp Official Business</option>
                  <option value="dev">Simulador Dev (Local Test)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                    Nome da Instância
                  </label>
                  <input
                    type="text"
                    value={instanceName}
                    onChange={(e) => setInstanceName(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                    Número do WhatsApp
                  </label>
                  <input
                    type="text"
                    value={instancePhone}
                    onChange={(e) => setInstancePhone(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {providerApi === 'zapi' && (
                <div className="space-y-3 p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-500" />
                      Credenciais da Instância Z-API
                    </span>
                    <span className="text-[10px] text-zinc-500 font-medium">z-api.io</span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        ID da Instância (Instance ID)
                      </label>
                      <input
                        type="text"
                        value={zapiInstanceId}
                        onChange={(e) => setZapiInstanceId(e.target.value)}
                        placeholder="Ex: 3F93F58A2B108198830236EE76B60FCD"
                        className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Token da Instância (Instance Token)
                      </label>
                      <input
                        type="text"
                        value={zapiInstanceToken}
                        onChange={(e) => setZapiInstanceToken(e.target.value)}
                        placeholder="Ex: B47651661E706A718A173D03"
                        className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono font-bold text-zinc-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 mb-1">
                        Client Token / Security Token (Opcional)
                      </label>
                      <input
                        type="text"
                        value={zapiClientToken}
                        onChange={(e) => setZapiClientToken(e.target.value)}
                        placeholder="Token de segurança configurado no painel do Z-API"
                        className="w-full bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-mono text-zinc-900 focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Webhook Configuration Guide */}
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Configurar Webhook de Mensagens Recebidas</span>
                      </div>
                      <p className="text-[11px] text-amber-800 line-clamp-2 leading-relaxed">
                        No painel do Z-API, clique no aviso <strong>"Configurar agora"</strong> ou vá em <strong>Webhooks</strong> e cole a URL abaixo no campo <em>"Ao receber mensagem"</em>:
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/api/zapi/webhook`}
                          className="flex-1 bg-white border border-amber-300 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-amber-950 font-bold select-all"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/api/zapi/webhook`);
                            setCopiedWebhook(true);
                            setTimeout(() => setCopiedWebhook(false), 2000);
                          }}
                          className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold rounded-lg shrink-0 transition-colors"
                        >
                          {copiedWebhook ? 'Copiado!' : 'Copiar URL'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Test Connection Output */}
              {zapiTestResult && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium border ${
                    zapiTestResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  {zapiTestResult.message}
                </div>
              )}

              {/* Auto Reply Simulator Toggle */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-emerald-900">Simulação de Resposta de Clientes</div>
                  <div className="text-[10px] text-emerald-700">Simula respostas automáticas dos clientes para testes em ambiente local</div>
                </div>
                <input
                  type="checkbox"
                  checked={autoSimulateReply}
                  onChange={(e) => setAutoSimulateReply(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-200">
              {providerApi === 'zapi' ? (
                <button
                  type="button"
                  onClick={handleTestZapi}
                  disabled={isTestingZapi}
                  className="py-2 px-3.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-xs font-bold transition-all cursor-pointer border border-zinc-300 disabled:opacity-50"
                >
                  {isTestingZapi ? 'Testando...' : '⚡ Testar Envio Z-API'}
                </button>
              ) : <div></div>}

              <button
                type="button"
                onClick={handleSaveConfig}
                className="py-2 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                Salvar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Iniciar Novo Chat WhatsApp */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-zinc-200 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative animate-in zoom-in-95 duration-200 text-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-600" />
                <h3 className="font-serif font-bold text-base text-zinc-900">
                  Iniciar Novo Chat WhatsApp
                </h3>
              </div>
              <button
                onClick={() => setShowNewChatModal(false)}
                className="p-1 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewChat} className="space-y-3.5">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                  Nome do Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: Patricia Alencar"
                  value={newChatData.clientName}
                  onChange={(e) => setNewChatData(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                    WhatsApp (DDD + Número) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="+55 (11) 98877-6655"
                    value={newChatData.clientPhone}
                    onChange={(e) => setNewChatData(prev => ({ ...prev, clientPhone: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                    Projeto Relacionado
                  </label>
                  <input
                    type="text"
                    placeholder="ex: Casa de Campo"
                    value={newChatData.projectName}
                    onChange={(e) => setNewChatData(prev => ({ ...prev, projectName: e.target.value }))}
                    className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                  Responsável da Equipe
                </label>
                <select
                  value={newChatData.assignedMember}
                  onChange={(e) => setNewChatData(prev => ({ ...prev, assignedMember: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-xs font-bold text-zinc-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  {teamMembersList.map((m: string) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-zinc-600 uppercase tracking-wider">
                  Mensagem Inicial
                </label>
                <textarea
                  rows={2}
                  value={newChatData.initialMessage}
                  onChange={(e) => setNewChatData(prev => ({ ...prev, initialMessage: e.target.value }))}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl px-3.5 py-2 text-xs text-zinc-900 focus:outline-none focus:border-emerald-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setShowNewChatModal(false)}
                  className="py-2 px-4 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Iniciar Conversa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
