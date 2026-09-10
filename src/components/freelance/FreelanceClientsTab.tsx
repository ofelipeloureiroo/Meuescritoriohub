import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  Edit2,
  FileCheck,
  FileSignature,
  FileText,
  Flame,
  Gift,
  Globe,
  Home,
  Instagram,
  Link2,
  Lock,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MoreHorizontal,
  PenTool,
  Phone,
  Plus,
  Radio,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Tag,
  Trash2,
  TrendingUp,
  User,
  UserCheck,
  UserPlus,
  Users,
  X,
  KeyRound,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { Client, ContractStatus, WorkContract } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { WorkContractModal } from '../contracts/WorkContractModal';
import { NewContractModal } from '../contracts/NewContractModal';
import { DigitalSignatureModal } from '../contracts/DigitalSignatureModal';
import { useTeamMembers } from '../../hooks/useTeamMembers';
import { OfficeClientPortalManagerModal } from '../portal/OfficeClientPortalManagerModal';

interface FreelanceClientsTabProps {
  onNavigateToMap?: () => void;
}

export const FreelanceClientsTab: React.FC<FreelanceClientsTabProps> = ({
  onNavigateToMap,
}) => {
  const { teamMembers } = useTeamMembers();
  const {
    clients,
    workContracts,
    addClient,
    updateClient,
    deleteClient,
    deleteWorkContract,
    sendContractForSignature,
    signWorkContract,
    markContractAwaitingPayment,
    confirmContractPayment,
  } = useFinance();

  // Navigation sub-tabs: Clientes OR Contratos & Assinaturas
  const [activeSubTab, setActiveSubTab] = useState<'clients' | 'contracts'>('clients');

  // Client Status Filter: 'ativos' | 'inativos' | 'aniversarios'
  const [statusFilter, setStatusFilter] = useState<'ativos' | 'inativos' | 'aniversarios'>('ativos');

  const [searchTerm, setSearchTerm] = useState('');
  const [contractStatusFilter, setContractStatusFilter] = useState<string>('all');

  // Contract Modals
  const [selectedContract, setSelectedContract] = useState<WorkContract | null>(null);
  const [contractToDelete, setContractToDelete] = useState<WorkContract | null>(null);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isNewContractModalOpen, setIsNewContractModalOpen] = useState(false);
  const [newContractDefaultClientId, setNewContractDefaultClientId] = useState<string | undefined>();
  const [signingContractTarget, setSigningContractTarget] = useState<WorkContract | null>(null);

  // Client Modal State (Image 2 & Image 3 reference)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Form Fields
  const [clientType, setClientType] = useState<'pf' | 'pj'>('pf');
  const [clientName, setClientName] = useState('');
  const [nameError, setNameError] = useState(false);
  const [clientCompany, setClientCompany] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientWhatsapp, setClientWhatsapp] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientInstagram, setClientInstagram] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [clientNeighborhood, setClientNeighborhood] = useState('');
  const [clientProfession, setClientProfession] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [clientState, setClientState] = useState('RJ');
  const [clientCountry, setClientCountry] = useState('BR');

  // Birthday fields
  const [birthdayDay, setBirthdayDay] = useState('');
  const [birthdayMonth, setBirthdayMonth] = useState('');
  const [birthdayYear, setBirthdayYear] = useState('');

  // Relational context
  const [originChannel, setOriginChannel] = useState('Instagram');
  const [detailedOrigin, setDetailedOrigin] = useState('');
  const [responsibleName, setResponsibleName] = useState('Não definido');
  const [clientProfile, setClientProfile] = useState<'Alto Padrão' | 'Médio' | 'Econômico'>('Médio');
  const [clientNotes, setClientNotes] = useState('');

  // Selected client for detail view
  const [viewingClient, setViewingClient] = useState<Client | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [selectedClientForPortal, setSelectedClientForPortal] = useState<Client | null>(null);
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false);

  useEffect(() => {
    setIsConfirmingDelete(false);
  }, [viewingClient]);

  // Client Action Modal State
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [actionArea, setActionArea] = useState<'Comercial' | 'Operação' | 'Financeiro'>('Comercial');
  const [actionType, setActionType] = useState('Enviar mensagem');
  const [actionDescription, setActionDescription] = useState('');
  const [actionStartDate, setActionStartDate] = useState('');
  const [actionEndDate, setActionEndDate] = useState('');
  const [actionEffortHours, setActionEffortHours] = useState('0');
  const [actionEffortMinutes, setActionEffortMinutes] = useState('0');
  const [actionSpecificTime, setActionSpecificTime] = useState('');
  const [actionResponsible, setActionResponsible] = useState('Laíne Paula Loureiro');
  const [actionNotes, setActionNotes] = useState('');

  // Associate Contract Modal State
  const [isAssociateModalOpen, setIsAssociateModalOpen] = useState(false);
  const [associateSelectedContractId, setAssociateSelectedContractId] = useState('');

  // Counts for top KPI Cards
  const activeClients = useMemo(() => clients.filter((c) => c.status !== 'completed'), [clients]);
  const inactiveClients = useMemo(() => clients.filter((c) => c.status === 'completed'), [clients]);

  // Current month for birthdays
  const currentMonthNum = new Date().getMonth() + 1;
  const MONTHS_NAMES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const birthdayClients = useMemo(() => {
    return clients.filter((c) => {
      if (!c.birthdayMonth) return false;
      const monthIdx = MONTHS_NAMES.indexOf(c.birthdayMonth) + 1;
      return monthIdx === currentMonthNum || parseInt(c.birthdayMonth) === currentMonthNum;
    });
  }, [clients, currentMonthNum]);

  // Filtered Clients based on Search + Filter Tab
  const filteredClients = useMemo(() => {
    return clients.filter((c) => {
      // Status Filter Tab
      if (statusFilter === 'ativos' && c.status === 'completed') return false;
      if (statusFilter === 'inativos' && c.status !== 'completed') return false;
      if (statusFilter === 'aniversarios') {
        if (!c.birthdayMonth) return false;
        const monthIdx = MONTHS_NAMES.indexOf(c.birthdayMonth) + 1;
        if (monthIdx !== currentMonthNum && parseInt(c.birthdayMonth) !== currentMonthNum) {
          return false;
        }
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchName = c.name.toLowerCase().includes(term);
        const matchCompany = (c.company || '').toLowerCase().includes(term);
        const matchEmail = (c.email || '').toLowerCase().includes(term);
        const matchCity = (c.city || '').toLowerCase().includes(term);
        if (!matchName && !matchCompany && !matchEmail && !matchCity) return false;
      }

      return true;
    });
  }, [clients, statusFilter, searchTerm, currentMonthNum]);

  // Filtered Contracts
  const filteredContracts = useMemo(() => {
    return workContracts.filter((c) => {
      if (contractStatusFilter !== 'all' && c.status !== contractStatusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesTitle = c.title.toLowerCase().includes(term);
        const matchesClient = c.clientName.toLowerCase().includes(term);
        const matchesProject = c.projectTitle.toLowerCase().includes(term);
        if (!matchesTitle && !matchesClient && !matchesProject) return false;
      }
      return true;
    });
  }, [workContracts, contractStatusFilter, searchTerm]);

  // Contract Status Helper
  const getContractStatusBadge = (status?: ContractStatus) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Minuta',
          color: 'bg-zinc-100 text-zinc-700 border-zinc-200',
          icon: FileText,
        };
      case 'sent_for_signature':
        return {
          label: 'Enviado para Assinatura',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
          icon: Send,
        };
      case 'signed':
        return {
          label: 'Contrato Assinado',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200 font-bold',
          icon: FileCheck,
        };
      case 'awaiting_payment':
        return {
          label: 'Aguardando Pagamento',
          color: 'bg-purple-100 text-purple-800 border-purple-200 font-bold',
          icon: Clock,
        };
      case 'paid':
        return {
          label: 'Pago & Em Execução',
          color: 'bg-teal-100 text-teal-800 border-teal-200',
          icon: CheckCircle2,
        };
      default:
        return null;
    }
  };

  // Open Client Modal for New Client
  const handleOpenAddClient = () => {
    setEditingClient(null);
    setClientType('pf');
    setClientName('');
    setNameError(false);
    setClientCompany('');
    setClientEmail('');
    setClientWhatsapp('');
    setClientPhone('');
    setClientInstagram('');
    setClientCity('');
    setClientNeighborhood('');
    setClientProfession('');
    setClientAddress('');
    setClientState('RJ');
    setClientCountry('BR');
    setBirthdayDay('');
    setBirthdayMonth('');
    setBirthdayYear('');
    setOriginChannel('Instagram');
    setDetailedOrigin('');
    setResponsibleName('Não definido');
    setClientProfile('Médio');
    setClientNotes('');
    setIsClientModalOpen(true);
  };

  // Open Client Modal for Edit
  const handleOpenEditClient = (c: Client) => {
    setEditingClient(c);
    setClientType(c.clientType || 'pf');
    setClientName(c.name);
    setNameError(false);
    setClientCompany(c.company || '');
    setClientEmail(c.email || '');
    setClientWhatsapp(c.whatsapp || '');
    setClientPhone(c.phone || '');
    setClientInstagram(c.instagram || '');
    setClientCity(c.city || '');
    setClientNeighborhood(c.neighborhood || '');
    setClientProfession(c.profession || '');
    setClientAddress(c.address || '');
    setClientState(c.state || 'RJ');
    setClientCountry(c.country || 'BR');
    setBirthdayDay(c.birthdayDay || '');
    setBirthdayMonth(c.birthdayMonth || '');
    setBirthdayYear(c.birthdayYear || '');
    setOriginChannel(c.originChannel || c.acquisitionChannel || 'Instagram');
    setDetailedOrigin(c.detailedOrigin || '');
    setResponsibleName(c.responsibleName || 'Não definido');
    setClientProfile((c.clientProfile as any) || 'Médio');
    setClientNotes(c.notes || '');
    setIsClientModalOpen(true);
  };

  // Save Client Handler
  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      setNameError(true);
      return;
    }

    const payload = {
      name: clientName,
      company: clientCompany,
      email: clientEmail,
      phone: clientPhone || clientWhatsapp,
      whatsapp: clientWhatsapp,
      instagram: clientInstagram,
      country: clientCountry,
      state: clientState,
      city: clientCity,
      neighborhood: clientNeighborhood,
      profession: clientProfession,
      address: clientAddress,
      serviceType: clientProfession ? `Serviço - ${clientProfession}` : 'Serviços de Arquitetura & Design',
      clientType,
      birthdayDay,
      birthdayMonth,
      birthdayYear,
      originChannel,
      acquisitionChannel: originChannel,
      detailedOrigin,
      responsibleName,
      clientProfile,
      notes: clientNotes,
      status: editingClient ? editingClient.status : ('active' as const),
    };

    if (editingClient) {
      updateClient(editingClient.id, payload);
    } else {
      addClient(payload);
    }

    setIsClientModalOpen(false);
  };

  // Origin Channels List for Modal
  const ORIGIN_CHANNELS = [
    { label: 'Instagram', icon: Instagram },
    { label: 'Indicação', icon: UserPlus },
    { label: 'Site', icon: Globe },
    { label: 'WhatsApp', icon: MessageCircle },
    { label: 'Evento / Feira', icon: Megaphone },
    { label: 'Cliente Antigo', icon: Star },
    { label: 'Cadastro Manual', icon: User },
    { label: 'Outro', icon: Radio },
  ];

  // CLIENT DETAIL VIEW (Matches Reference Screenshot)
  if (viewingClient) {
    const clientContracts = workContracts.filter(
      (wc) => wc.clientId === viewingClient.id || wc.clientName.toLowerCase() === viewingClient.name.toLowerCase()
    );
    const activeContracts = clientContracts.filter(
      (wc) => wc.status !== 'completed' && wc.status !== 'cancelled'
    );
    const completedContracts = clientContracts.filter(
      (wc) => wc.status === 'completed' || wc.status === 'signed' || wc.status === 'paid'
    );
    const totalContractedAmount = clientContracts.reduce(
      (sum, c) => sum + (c.totalAmount || 0),
      0
    );

    const createdDateFormatted = viewingClient.createdAt
      ? formatDate(viewingClient.createdAt)
      : '—';

    const createdMonthYearFormatted = viewingClient.createdAt
      ? new Date(viewingClient.createdAt).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
      : '—';

    return (
      <div className="space-y-6 pb-12 font-sans bg-[#fbf9f5] min-h-screen p-3 sm:p-6 rounded-3xl">
        {/* Breadcrumb Header */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-zinc-500 font-medium">
          <button
            onClick={() => setViewingClient(null)}
            className="flex items-center gap-1.5 hover:text-zinc-900 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-600" />
            <span className="hover:underline">Clientes</span>
          </button>
          <span>/</span>
          <span className="font-bold text-zinc-900">{viewingClient.name}</span>
        </div>

        {/* Client Header Card Banner */}
        <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#b5986e] text-white flex items-center justify-center font-extrabold text-2xl shadow-xs shrink-0">
                {viewingClient.name ? viewingClient.name.charAt(0).toUpperCase() : 'C'}
              </div>

              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 tracking-tight">
                  {viewingClient.name}
                </h2>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-600 border border-zinc-200 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>{viewingClient.clientType === 'pj' ? 'Pessoa Jurídica' : 'Pessoa Física'}</span>
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                    {viewingClient.clientProfile || 'Médio'}
                  </span>
                  {viewingClient.detailedOrigin && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-zinc-100 text-zinc-600 border border-zinc-200">
                      ↔ via {viewingClient.detailedOrigin}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={() => handleOpenEditClient(viewingClient)}
                className="p-2.5 rounded-2xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                title="Editar Cliente"
              >
                <Edit2 className="w-4 h-4" />
              </button>
              {isConfirmingDelete ? (
                <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-100">
                  <button
                    onClick={() => {
                      deleteClient(viewingClient.id);
                      setViewingClient(null);
                      setIsConfirmingDelete(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Confirmar Exclusão
                  </button>
                  <button
                    onClick={() => setIsConfirmingDelete(false)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsConfirmingDelete(true)}
                  className="p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                  title="Excluir Cliente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 4 Metric Sub-cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-5 border-t border-zinc-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#faf6f0] text-[#a38253] flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  EM ANDAMENTO
                </span>
                <span className="text-xl font-extrabold text-zinc-900">
                  {activeContracts.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  CONCLUÍDOS
                </span>
                <span className="text-xl font-extrabold text-zinc-900">
                  {completedContracts.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#faf6f0] text-[#a38253] flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  CLIENTE DESDE
                </span>
                <span className="text-sm sm:text-base font-extrabold text-zinc-900">
                  {createdMonthYearFormatted}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#faf6f0] text-[#a38253] flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  TOTAL CONTRATADO
                </span>
                <span className="text-sm sm:text-base font-extrabold text-zinc-900">
                  {formatCurrency(totalContractedAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column (8 Cols): Projetos + Ações */}
          <div className="lg:col-span-8 space-y-6">
            {/* Projetos Card */}
            <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-zinc-400" />
                  <h3 className="font-bold text-zinc-900 text-sm sm:text-base">
                    Projetos <span className="text-zinc-400 font-normal">{clientContracts.length}</span>
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSelectedClientForPortal(viewingClient);
                      setIsPortalModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#faf6f0] border border-[#e5dcd0] text-[#a38253] hover:bg-[#f0eae1] font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Gerenciar Radar da Cliente"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Radar da Cliente</span>
                  </button>
                  <button
                    onClick={() => setIsAssociateModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span>Associar</span>
                  </button>
                  <button
                    onClick={() => {
                      setNewContractDefaultClientId(viewingClient.id);
                      setIsNewContractModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#c8a97e] hover:bg-[#b8986d] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Novo projeto</span>
                  </button>
                </div>
              </div>

              {/* Projects List */}
              <div className="space-y-3 pt-2">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  PROJETOS DO CLIENTE ({clientContracts.length})
                </span>

                {clientContracts.length === 0 ? (
                  <div className="border border-zinc-100 rounded-2xl p-6 text-center space-y-3">
                    <p className="text-xs text-zinc-400 font-medium">
                      Nenhum projeto ou contrato registrado para este cliente.
                    </p>
                    <button
                      onClick={() => {
                        setNewContractDefaultClientId(viewingClient.id);
                        setIsNewContractModalOpen(true);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#faf6f0] text-[#8a6a3e] hover:bg-[#f3ebe0] font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Criar primeiro projeto</span>
                    </button>
                  </div>
                ) : (
                  clientContracts.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedContract(c);
                        setIsContractModalOpen(true);
                      }}
                      className="border border-zinc-100 hover:border-zinc-300 rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <div>
                          <h4 className="font-bold text-zinc-900 text-sm">{c.projectTitle || c.title}</h4>
                          <p className="text-xs text-zinc-400">
                            {c.status === 'completed' || c.status === 'paid' ? 'Concluído' : 'Em Execução'} -- {c.title}
                          </p>
                        </div>
                      </div>
                      <span className="font-extrabold text-zinc-900 text-sm">
                        {formatCurrency(c.totalAmount)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Ações do cliente Card */}
            <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-zinc-400" />
                  <h3 className="font-bold text-zinc-900 text-sm sm:text-base">Ações do cliente</h3>
                </div>

                <button
                  onClick={() => setIsActionModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#c8a97e] hover:bg-[#b8986d] text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nova ação</span>
                </button>
              </div>

              {/* Actions List or Empty State */}
              {(!viewingClient.clientActions || viewingClient.clientActions.length === 0) ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#faf6f0] text-[#c8a97e] flex items-center justify-center mx-auto">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-zinc-800 text-sm">Nenhuma ação registrada</h4>
                  <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                    Registre contatos administrativos, pedidos de documento ou retornos futuros
                  </p>
                  <button
                    onClick={() => setIsActionModalOpen(true)}
                    className="px-4 py-2.5 rounded-xl bg-[#faf6f0] text-[#8a6a3e] hover:bg-[#f3ebe0] font-bold text-xs transition-colors cursor-pointer inline-flex items-center gap-1.5 mx-auto"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Criar primeira ação</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {viewingClient.clientActions.map((action) => (
                    <div
                      key={action.id}
                      className="p-3.5 rounded-2xl border border-zinc-100 bg-zinc-50/50 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={action.completed}
                          onChange={() => {
                            const updatedActions = viewingClient.clientActions?.map((act) =>
                              act.id === action.id ? { ...act, completed: !act.completed } : act
                            );
                            updateClient(viewingClient.id, { clientActions: updatedActions });
                            setViewingClient({ ...viewingClient, clientActions: updatedActions });
                          }}
                          className="w-4 h-4 rounded text-[#c8a97e] focus:ring-[#c8a97e] cursor-pointer"
                        />
                        <div>
                          <p className={`text-xs font-bold ${action.completed ? 'line-through text-zinc-400' : 'text-zinc-800'}`}>
                            {action.title}
                          </p>
                          <p className="text-[10px] text-zinc-400">{action.date}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const updatedActions = viewingClient.clientActions?.filter((act) => act.id !== action.id);
                          updateClient(viewingClient.id, { clientActions: updatedActions });
                          setViewingClient({ ...viewingClient, clientActions: updatedActions });
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-500 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column (4 Cols): Contato + Origem */}
          <div className="lg:col-span-4 space-y-6">
            {/* Contato Card */}
            <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs p-6 space-y-4">
              <h3 className="font-bold text-zinc-900 text-sm sm:text-base">Contato</h3>

              <div className="space-y-3.5 text-xs">
                <div className="flex items-center gap-3 text-zinc-700">
                  <Phone className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>{viewingClient.whatsapp || viewingClient.phone || '—'}</span>
                </div>

                <div className="flex items-center gap-3 text-zinc-700">
                  <MapPin className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>{viewingClient.city || '—'}</span>
                </div>

                <div className="flex items-center gap-3 text-zinc-700">
                  <Briefcase className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>{viewingClient.profession || '—'}</span>
                </div>

                <div className="flex items-center gap-3 text-zinc-700">
                  <Home className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>{viewingClient.address || '—'}</span>
                </div>
              </div>
            </div>

            {/* Origem Card */}
            <div className="bg-white rounded-3xl border border-zinc-200/80 shadow-xs p-6 space-y-4">
              <h3 className="font-bold text-zinc-900 text-sm sm:text-base">Origem</h3>

              <div className="space-y-4 text-xs">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    ↔ LEAD DE ORIGEM
                  </span>
                  <p className="font-bold text-zinc-900">
                    {viewingClient.detailedOrigin || '—'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                    <Globe className="w-3 h-3 text-zinc-400" />
                    CANAL
                  </span>
                  <p className="font-semibold text-zinc-800">
                    {viewingClient.originChannel || viewingClient.acquisitionChannel || '—'}
                  </p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                    <User className="w-3 h-3 text-zinc-400" />
                    RESPONSÁVEL
                  </span>
                  <p className="font-semibold text-zinc-800">
                    {viewingClient.responsibleName || '—'}
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-100 text-[11px] text-zinc-400">
                  Cadastrado em {createdDateFormatted}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ACTION MODAL */}
        {isActionModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-zinc-200 overflow-hidden my-auto animate-in fade-in zoom-in-95">
              {/* Modal Header */}
              <div className="flex items-start justify-between px-6 py-5 border-b border-zinc-100">
                <div>
                  <h3 className="font-extrabold text-zinc-900 text-lg tracking-tight">Nova ação</h3>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">
                    Ação vinculada automaticamente a este cliente
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActionModalOpen(false)}
                  className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Content */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!viewingClient) return;

                  const titleText = actionDescription.trim() || `${actionType} com ${viewingClient.name}`;

                  const newAct = {
                    id: `act-${Date.now()}`,
                    title: titleText,
                    type: actionType,
                    area: actionArea,
                    date: actionEndDate || actionStartDate || new Date().toISOString().split('T')[0],
                    startDate: actionStartDate,
                    endDate: actionEndDate,
                    effortHours: actionEffortHours,
                    effortMinutes: actionEffortMinutes,
                    specificTime: actionSpecificTime,
                    responsible: actionResponsible,
                    notes: actionNotes,
                    completed: false,
                  };

                  const updatedActions = [...(viewingClient.clientActions || []), newAct];
                  updateClient(viewingClient.id, { clientActions: updatedActions });
                  setViewingClient({ ...viewingClient, clientActions: updatedActions });

                  // Reset form
                  setActionArea('Comercial');
                  setActionType('Enviar mensagem');
                  setActionDescription('');
                  setActionStartDate('');
                  setActionEndDate('');
                  setActionEffortHours('0');
                  setActionEffortMinutes('0');
                  setActionSpecificTime('');
                  setActionResponsible('Laíne Paula Loureiro');
                  setActionNotes('');
                  setIsActionModalOpen(false);
                }}
                className="p-6 space-y-6 max-h-[80vh] overflow-y-auto"
              >
                {/* CONTEXTO DA AÇÃO */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    CONTEXTO DA AÇÃO
                  </span>
                  <div className="bg-[#faf6f0] border border-[#f0eae1] rounded-2xl p-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#f0eae1] flex items-center justify-center shrink-0">
                      <Lock className="w-4 h-4 text-zinc-600" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                        VINCULADO A
                      </span>
                      <p className="font-bold text-zinc-900 text-xs sm:text-sm">
                        Cliente · {viewingClient?.name}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ÁREA */}
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    ÁREA
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Comercial', 'Operação', 'Financeiro'] as const).map((area) => (
                      <button
                        key={area}
                        type="button"
                        onClick={() => setActionArea(area)}
                        className={`py-2.5 px-3 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
                          actionArea === area
                            ? 'bg-[#0a0a0a] text-white shadow-xs'
                            : 'bg-white border border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                        }`}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>

                {/* DEFINIÇÃO DA AÇÃO */}
                <div className="space-y-3.5 pt-2 border-t border-zinc-100">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    DEFINIÇÃO DA AÇÃO
                  </span>

                  {/* TIPO DE AÇÃO */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-700 block">TIPO DE AÇÃO</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        'Enviar mensagem',
                        'Ligar',
                        'Agendar reunião',
                        'Realizar reunião',
                        'Follow-up',
                        'Enviar proposta',
                        'Negociar',
                        'Fechar negócio',
                        'Acompanhar pendência',
                        'Cobrar retorno',
                        'Outro',
                      ].map((typeOption) => {
                        const isSel = actionType === typeOption;
                        return (
                          <button
                            key={typeOption}
                            type="button"
                            onClick={() => setActionType(typeOption)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                              isSel
                                ? 'bg-white border-2 border-zinc-900 text-zinc-900 font-bold shadow-2xs'
                                : 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:border-zinc-300'
                            }`}
                          >
                            {typeOption}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* DESCRIÇÃO DA AÇÃO */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 block">DESCRIÇÃO DA AÇÃO</label>
                    <textarea
                      rows={3}
                      placeholder={`Ex: com ${viewingClient?.name || ''}`}
                      value={actionDescription}
                      onChange={(e) => setActionDescription(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-zinc-200 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#c8a97e] bg-white resize-none"
                    />
                  </div>
                </div>

                {/* PLANEJAMENTO */}
                <div className="space-y-3.5 pt-2 border-t border-zinc-100">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    PLANEJAMENTO
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700 block">INÍCIO PREVISTO</label>
                      <input
                        type="date"
                        value={actionStartDate}
                        onChange={(e) => setActionStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e] bg-white cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700 block">
                        TÉRMINO PREVISTO <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={actionEndDate}
                        onChange={(e) => setActionEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e] bg-white cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* ESFORÇO PREVISTO */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 block">ESFORÇO PREVISTO</label>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="number"
                          min="0"
                          value={actionEffortHours}
                          onChange={(e) => setActionEffortHours(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-zinc-200 text-xs text-center font-bold text-zinc-800 focus:outline-none focus:border-[#c8a97e]"
                        />
                        <span className="text-xs text-zinc-500 font-medium">h</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-1">
                        <input
                          type="number"
                          min="0"
                          max="59"
                          value={actionEffortMinutes}
                          onChange={(e) => setActionEffortMinutes(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl border border-zinc-200 text-xs text-center font-bold text-zinc-800 focus:outline-none focus:border-[#c8a97e]"
                        />
                        <span className="text-xs text-zinc-500 font-medium">min</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-400 font-normal">
                      Tempo estimado de trabalho dedicado a esta ação.
                    </p>
                  </div>

                  {/* HORÁRIO ESPECÍFICO */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 block">HORÁRIO ESPECÍFICO</label>
                    <div className="relative">
                      <input
                        type="time"
                        value={actionSpecificTime}
                        onChange={(e) => setActionSpecificTime(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e] bg-white cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* RESPONSÁVEL */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 block">RESPONSÁVEL</label>
                    <select
                      value={actionResponsible}
                      onChange={(e) => setActionResponsible(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e] bg-white cursor-pointer"
                    >
                      <option value="">Selecione o responsável</option>
                      <option value="Laíne Paula Loureiro">Laíne Paula Loureiro</option>
                      <option value="Bárbara Cristina da Silva">Bárbara Cristina da Silva</option>
                      <option value="Administrador">Administrador</option>
                    </select>
                  </div>
                </div>

                {/* CONTEXTO COMPLEMENTAR */}
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    CONTEXTO COMPLEMENTAR
                  </span>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 block">OBSERVAÇÃO (OPCIONAL)</label>
                    <textarea
                      rows={2}
                      placeholder="Adicione observações ou detalhes adicionais..."
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl border border-zinc-200 text-xs font-medium text-zinc-800 focus:outline-none focus:border-[#c8a97e] bg-white resize-none"
                    />
                  </div>
                </div>

                {/* Footer Buttons */}
                <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsActionModalOpen(false)}
                    className="px-5 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-bold text-xs hover:bg-zinc-50 transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 rounded-xl bg-[#c8a97e] hover:bg-[#b8986d] text-white font-extrabold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Criar ação</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ASSOCIATE CONTRACT MODAL */}
        {isAssociateModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-zinc-900 text-base">Associar Projeto ou Contrato</h3>
                <button
                  onClick={() => setIsAssociateModalOpen(false)}
                  className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-xs text-zinc-500">
                  Selecione um contrato existente para vincular ao cliente{' '}
                  <strong className="text-zinc-800">{viewingClient.name}</strong>:
                </p>

                <select
                  value={associateSelectedContractId}
                  onChange={(e) => setAssociateSelectedContractId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs focus:outline-none focus:border-[#c8a97e] cursor-pointer"
                >
                  <option value="">Selecione um contrato...</option>
                  {workContracts.map((wc) => (
                    <option key={wc.id} value={wc.id}>
                      {wc.projectTitle || wc.title} - {formatCurrency(wc.totalAmount)}
                    </option>
                  ))}
                </select>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsAssociateModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-600 font-bold text-xs hover:bg-zinc-50 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => {
                      if (associateSelectedContractId) {
                        setIsAssociateModalOpen(false);
                      } else {
                        setNewContractDefaultClientId(viewingClient.id);
                        setIsAssociateModalOpen(false);
                        setIsNewContractModalOpen(true);
                      }
                    }}
                    className="px-5 py-2 rounded-xl bg-[#c8a97e] text-white font-bold text-xs hover:bg-[#b8986d] shadow-2xs cursor-pointer"
                  >
                    Confirmar Associação
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WORK CONTRACT MODALS */}
        {isContractModalOpen && selectedContract && (
          <WorkContractModal
            isOpen={isContractModalOpen}
            onClose={() => {
              setIsContractModalOpen(false);
              setSelectedContract(null);
            }}
            contract={selectedContract}
            onSendForSignature={() => {
              sendContractForSignature(selectedContract.id);
              setIsContractModalOpen(false);
            }}
            onOpenDigitalSignature={() => {
              setSigningContractTarget(selectedContract);
              setIsContractModalOpen(false);
            }}
            onMarkAwaitingPayment={() => {
              markContractAwaitingPayment(selectedContract.id);
              setIsContractModalOpen(false);
            }}
            onConfirmPayment={() => {
              confirmContractPayment(selectedContract.id);
              setIsContractModalOpen(false);
            }}
            onDelete={() => {
              deleteWorkContract(selectedContract.id);
              setIsContractModalOpen(false);
            }}
          />
        )}

        {isNewContractModalOpen && (
          <NewContractModal
            isOpen={isNewContractModalOpen}
            onClose={() => {
              setIsNewContractModalOpen(false);
              setNewContractDefaultClientId(undefined);
            }}
            defaultClientId={newContractDefaultClientId}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12 font-sans bg-[#fdfbf7] min-h-screen p-4 sm:p-6 rounded-3xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 tracking-tight">
            Clientes
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Relacionamento contínuo e ações de acompanhamento
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sub-tab Switcher: Clientes vs Contratos */}
          <div className="flex items-center bg-zinc-200/70 p-1 rounded-xl">
            <button
              onClick={() => setActiveSubTab('clients')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'clients'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Clientes ({clients.length})
            </button>
            <button
              onClick={() => setActiveSubTab('contracts')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'contracts'
                  ? 'bg-white text-zinc-900 shadow-xs'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              Contratos & Assinaturas ({workContracts.length})
            </button>
          </div>

          <button
            onClick={handleOpenAddClient}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#c8a97e] hover:bg-[#b8986d] text-white text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cliente</span>
          </button>
        </div>
      </div>

      {/* TOP 4 KPI CARDS (Reference Image 1) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: ATIVOS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              ATIVOS
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
              {activeClients.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: ATRASADAS */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              ATRASADAS
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
              0
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: PENDENTES */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              PENDENTES
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
              0
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center text-zinc-600">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: SEM AÇÃO */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
              SEM AÇÃO
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-zinc-900">
              {activeClients.length}
            </span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-sky-50 flex items-center justify-center text-sky-600">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* MAIN VIEW: CLIENTS */}
      {activeSubTab === 'clients' && (
        <div className="space-y-4">
          {/* SEARCH & STATUS FILTER BUTTONS (Reference Image 1) */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nome, empresa, email ou cidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-zinc-200/80 text-zinc-900 text-xs sm:text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#c8a97e]/30 shadow-xs"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setStatusFilter('ativos')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'ativos'
                    ? 'bg-[#c8a97e] text-white shadow-xs'
                    : 'bg-white text-zinc-600 border border-zinc-200/80 hover:bg-zinc-50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Ativos</span>
                <span className="ml-0.5 opacity-90">{activeClients.length}</span>
              </button>

              <button
                onClick={() => setStatusFilter('inativos')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'inativos'
                    ? 'bg-[#c8a97e] text-white shadow-xs'
                    : 'bg-white text-zinc-600 border border-zinc-200/80 hover:bg-zinc-50'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Inativos</span>
                <span className="ml-0.5 opacity-90">{inactiveClients.length}</span>
              </button>

              <button
                onClick={() => setStatusFilter('aniversarios')}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === 'aniversarios'
                    ? 'bg-[#c8a97e] text-white shadow-xs'
                    : 'bg-white text-zinc-600 border border-zinc-200/80 hover:bg-zinc-50'
                }`}
              >
                <Gift className="w-3.5 h-3.5 text-rose-500" />
                <span>Aniversários</span>
              </button>
            </div>
          </div>

          {/* CLIENT LIST CARDS (Reference Image 1) */}
          <div className="space-y-2.5">
            {filteredClients.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200/80 space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-zinc-900 text-sm">Nenhum cliente encontrado</h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  {statusFilter === 'aniversarios'
                    ? 'Nenhum cliente faz aniversário neste mês.'
                    : 'Cadastre seus clientes para gerenciar contatos, relatórios e contratos.'}
                </p>
                <button
                  onClick={handleOpenAddClient}
                  className="px-4 py-2 rounded-xl bg-[#c8a97e] text-white text-xs font-bold shadow-xs hover:bg-[#b8986d] transition-all cursor-pointer"
                >
                  + Novo Cliente
                </button>
              </div>
            ) : (
              filteredClients.map((client) => {
                const initial = client.name ? client.name.charAt(0).toUpperCase() : 'C';
                const profileBadge = client.clientProfile || 'Médio';
                const clientContracts = workContracts.filter((wc) => wc.clientId === client.id);

                return (
                  <div
                    key={client.id}
                    onClick={() => setViewingClient(client)}
                    className="bg-white hover:bg-zinc-50/80 rounded-2xl p-4 sm:px-5 sm:py-4 border border-zinc-200/80 shadow-xs flex items-center justify-between gap-4 transition-all cursor-pointer group"
                  >
                    {/* Left: Avatar + Info */}
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="w-11 h-11 rounded-full bg-[#f0eae1] border border-[#e5dcd0] flex items-center justify-center font-extrabold text-zinc-800 text-base shrink-0">
                        {initial}
                      </div>

                      {/* Info */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-zinc-900 text-sm sm:text-base group-hover:text-[#c8a97e] transition-colors">
                            {client.name}
                          </h3>

                          {/* Badges */}
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200/60">
                            {profileBadge}
                          </span>

                          {client.pipelineStage && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-zinc-100 text-zinc-600 border border-zinc-200">
                              ↔ lead
                            </span>
                          )}
                        </div>

                        {/* Location Subtitle */}
                        <p className="text-xs text-zinc-400 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-zinc-400" />
                          <span>
                            {client.city || 'Cidade não definida'}
                            {client.state ? `, ${client.state}` : ''}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Right: Actions status + Contract count + Chevron */}
                    <div className="flex items-center gap-4 sm:gap-6 shrink-0">
                      <div className="text-right hidden sm:block">
                        <span className="text-xs text-zinc-400 block">sem ações</span>
                        <div className="text-xs text-zinc-900 font-medium mt-0.5">
                          <strong className="font-bold">{clientContracts.length || 1}</strong>{' '}
                          {clientContracts.length === 1 ? 'projeto' : 'projetos'}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 text-zinc-400 group-hover:text-zinc-900 transition-colors">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClientForPortal(client);
                            setIsPortalModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-[#c8a97e] hover:bg-[#faf6f0] border border-transparent hover:border-[#e5dcd0] transition-colors cursor-pointer"
                          title="Gerenciar Radar da Cliente"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditClient(client);
                          }}
                          className="p-1.5 rounded-lg hover:bg-zinc-200 text-zinc-400 hover:text-zinc-800 transition-colors cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MAIN VIEW: CONTRACTS & SIGNATURES */}
      {activeSubTab === 'contracts' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar contrato por cliente, título ou projeto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-zinc-200/80 text-zinc-900 text-xs sm:text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#c8a97e]/30 shadow-xs"
              />
            </div>

            <button
              onClick={() => {
                setNewContractDefaultClientId(undefined);
                setIsNewContractModalOpen(true);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#c8a97e] text-white text-xs font-bold shadow-xs hover:bg-[#b8986d] transition-all cursor-pointer w-full sm:w-auto justify-center"
            >
              <FileSignature className="w-4 h-4" />
              <span>Gerar Novo Contrato</span>
            </button>
          </div>

          <div className="space-y-2.5">
            {filteredContracts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-zinc-200/80 space-y-3">
                <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-400 mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-zinc-900 text-sm">Nenhum contrato gerado</h3>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Crie minutas de contrato com cláusulas configuráveis e envie aos seus clientes para assinatura digital.
                </p>
                <button
                  onClick={() => setIsNewContractModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-[#c8a97e] text-white text-xs font-bold shadow-xs hover:bg-[#b8986d] transition-all cursor-pointer"
                >
                  Gerar Primeiro Contrato
                </button>
              </div>
            ) : (
              filteredContracts.map((contract) => {
                const badge = getContractStatusBadge(contract.status);

                return (
                  <div
                    key={contract.id}
                    className="bg-white rounded-2xl p-5 border border-zinc-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${badge?.color}`}>
                          {badge?.icon && <badge.icon className="w-3.5 h-3.5" />}
                          <span>{badge?.label}</span>
                        </span>
                        <h4 className="font-bold text-zinc-900 text-sm">{contract.title}</h4>
                      </div>
                      <p className="text-xs text-zinc-500">
                        Cliente: <strong className="text-zinc-800">{contract.clientName}</strong> • Projeto: {contract.projectTitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-0 pt-3 sm:pt-0">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider block font-bold">Valor</span>
                        <span className="font-bold text-zinc-900 text-sm">
                          {formatCurrency(contract.totalAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedContract(contract);
                            setIsContractModalOpen(true);
                          }}
                          className="px-3.5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold transition-all cursor-pointer"
                        >
                          Ver Contrato
                        </button>

                        <button
                          onClick={() => setContractToDelete(contract)}
                          className="p-2 rounded-xl border border-zinc-200 hover:border-rose-300 hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Excluir Contrato"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MODAL: NOVO CLIENTE / EDITAR CLIENTE (Reference Image 2 & Image 3) */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-bold text-zinc-900">
                  {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Preencha os dados do novo cliente
                </p>
              </div>
              <button
                onClick={() => setIsClientModalOpen(false)}
                className="p-2 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <form id="client-form" onSubmit={handleSaveClient} className="p-6 overflow-y-auto space-y-6 text-xs">
              {/* SECTION: IDENTIFICAÇÃO */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  IDENTIFICAÇÃO
                </span>

                {/* TIPO DE CLIENTE */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    TIPO DE CLIENTE
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setClientType('pf')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold border transition-all cursor-pointer ${
                        clientType === 'pf'
                          ? 'bg-[#faf6f0] border-[#c8a97e] text-[#8a6a3e] shadow-2xs'
                          : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      <User className="w-4 h-4" />
                      <span>Pessoa Física</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setClientType('pj')}
                      className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-semibold border transition-all cursor-pointer ${
                        clientType === 'pj'
                          ? 'bg-[#faf6f0] border-[#c8a97e] text-[#8a6a3e] shadow-2xs'
                          : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Pessoa Jurídica</span>
                    </button>
                  </div>
                </div>

                {/* NOME * */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    NOME *
                  </label>
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      if (e.target.value.trim()) setNameError(false);
                    }}
                    className={`w-full px-4 py-3 rounded-2xl bg-white border text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 ${
                      nameError
                        ? 'border-rose-400 focus:ring-rose-200'
                        : 'border-zinc-200/90 focus:border-[#c8a97e] focus:ring-[#c8a97e]/20'
                    }`}
                  />
                  {nameError && (
                    <p className="text-[11px] text-rose-500 font-medium">Nome é obrigatório</p>
                  )}
                </div>
              </div>

              {/* SECTION: CONTATO */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  CONTATO
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* E-MAIL */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      E-MAIL
                    </label>
                    <input
                      type="email"
                      placeholder="exemplo@email.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-zinc-200/90 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#c8a97e]"
                    />
                  </div>

                  {/* WHATSAPP */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      WHATSAPP
                    </label>
                    <input
                      type="text"
                      placeholder="11999999999"
                      value={clientWhatsapp}
                      onChange={(e) => setClientWhatsapp(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-zinc-200/90 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#c8a97e]"
                    />
                  </div>

                  {/* TELEFONE */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      TELEFONE
                    </label>
                    <input
                      type="text"
                      placeholder="(11) 99999-9999"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-zinc-200/90 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#c8a97e]"
                    />
                  </div>

                  {/* INSTAGRAM */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      INSTAGRAM
                    </label>
                    <input
                      type="text"
                      placeholder="@usuario"
                      value={clientInstagram}
                      onChange={(e) => setClientInstagram(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-zinc-200/90 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#c8a97e]"
                    />
                  </div>

                  {/* CIDADE */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      CIDADE
                    </label>
                    <input
                      type="text"
                      placeholder="Sua cidade"
                      value={clientCity}
                      onChange={(e) => setClientCity(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-zinc-200/90 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#c8a97e]"
                    />
                  </div>

                  {/* BAIRRO */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      BAIRRO
                    </label>
                    <input
                      type="text"
                      placeholder="Seu bairro"
                      value={clientNeighborhood}
                      onChange={(e) => setClientNeighborhood(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-zinc-200/90 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#c8a97e]"
                    />
                  </div>
                </div>

                {/* PROFISSÃO */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    PROFISSÃO
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Arquiteta, Engenheiro Civil, Médica..."
                    value={clientProfession}
                    onChange={(e) => setClientProfession(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-zinc-200/90 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#c8a97e]"
                  />
                </div>

                {/* ENDEREÇO */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    ENDEREÇO
                  </label>
                  <input
                    type="text"
                    placeholder="Rua, número, complemento, bairro, cidade, CEP..."
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-zinc-200/90 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#c8a97e]"
                  />
                </div>
              </div>

              {/* SECTION: ANIVERSÁRIO */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  ANIVERSÁRIO
                </span>

                <div className="grid grid-cols-3 gap-3">
                  {/* DIA */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      DIA
                    </label>
                    <select
                      value={birthdayDay}
                      onChange={(e) => setBirthdayDay(e.target.value)}
                      className="w-full px-3 py-3 rounded-2xl bg-white border border-zinc-200/90 text-zinc-900 focus:outline-none focus:border-[#c8a97e] cursor-pointer"
                    >
                      <option value="">--</option>
                      {Array.from({ length: 31 }, (_, i) => {
                        const val = String(i + 1).padStart(2, '0');
                        return (
                          <option key={val} value={val}>
                            {val}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* MÊS */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      MÊS
                    </label>
                    <select
                      value={birthdayMonth}
                      onChange={(e) => setBirthdayMonth(e.target.value)}
                      className="w-full px-3 py-3 rounded-2xl bg-white border border-zinc-200/90 text-zinc-900 focus:outline-none focus:border-[#c8a97e] cursor-pointer"
                    >
                      <option value="">--</option>
                      {MONTHS_NAMES.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* ANO (OPCIONAL) */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      ANO (OPCIONAL)
                    </label>
                    <input
                      type="text"
                      placeholder="1990"
                      value={birthdayYear}
                      onChange={(e) => setBirthdayYear(e.target.value)}
                      className="w-full px-3 py-3 rounded-2xl bg-white border border-zinc-200/90 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#c8a97e]"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION: CONTEXTO RELACIONAL */}
              <div className="space-y-3">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block">
                  CONTEXTO RELACIONAL
                </span>

                {/* CANAL DE ORIGEM */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block">
                    CANAL DE ORIGEM
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {ORIGIN_CHANNELS.map((ch) => {
                      const IconComp = ch.icon;
                      const isSelected = originChannel === ch.label;
                      return (
                        <button
                          key={ch.label}
                          type="button"
                          onClick={() => setOriginChannel(ch.label)}
                          className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-semibold text-xs border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-zinc-50 border-zinc-400 text-zinc-900 shadow-2xs'
                              : 'bg-white border-zinc-200/90 text-zinc-600 hover:bg-zinc-50'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{ch.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* DETALHE DA ORIGEM */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    DETALHE DA ORIGEM
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Amigo de Fulano, retorno de evento..."
                    value={detailedOrigin}
                    onChange={(e) => setDetailedOrigin(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-white border border-zinc-200/90 text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#c8a97e]"
                  />
                </div>

                {/* RESPONSÁVEL INTERNO & PERFIL DO CLIENTE */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* RESPONSÁVEL INTERNO */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                      RESPONSÁVEL INTERNO
                    </label>
                    <select
                      value={responsibleName}
                      onChange={(e) => setResponsibleName(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white border border-zinc-200/90 text-zinc-900 focus:outline-none focus:border-[#c8a97e] cursor-pointer"
                    >
                      <option value="Não definido">Não definido</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.name}>
                          {member.name}{member.roleTitle ? ` (${member.roleTitle})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* PERFIL DO CLIENTE */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider block">
                      PERFIL DO CLIENTE
                    </label>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {['Alto Padrão', 'Médio', 'Econômico'].map((prof) => {
                        const isSelected = clientProfile === prof;
                        return (
                          <button
                            key={prof}
                            type="button"
                            onClick={() => setClientProfile(prof as any)}
                            className={`flex-1 py-2.5 rounded-2xl text-[11px] font-semibold border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-sky-50 border-sky-400 text-sky-700 font-bold'
                                : 'bg-white border-zinc-200/90 text-zinc-600 hover:bg-zinc-50'
                            }`}
                          >
                            {prof}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* OBSERVAÇÕES */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-zinc-600 uppercase tracking-wider">
                    OBSERVAÇÕES
                  </label>
                  <div className="border border-zinc-200/90 rounded-2xl overflow-hidden focus-within:border-[#c8a97e]">
                    {/* Rich text toolbar preview */}
                    <div className="px-3 py-2 bg-zinc-50 border-b border-zinc-200/80 flex items-center gap-3 text-zinc-500 text-xs font-bold">
                      <span className="hover:text-zinc-900 cursor-pointer font-serif">B</span>
                      <span className="hover:text-zinc-900 cursor-pointer italic font-serif">I</span>
                      <span className="hover:text-zinc-900 cursor-pointer">•</span>
                      <span className="hover:text-zinc-900 cursor-pointer">1.</span>
                      <span className="hover:text-zinc-900 cursor-pointer">—</span>
                    </div>
                    <textarea
                      rows={3}
                      placeholder="Preferências de contato, histórico relacional, notas de contexto..."
                      value={clientNotes}
                      onChange={(e) => setClientNotes(e.target.value)}
                      className="w-full p-3 bg-white text-zinc-900 placeholder:text-zinc-400 text-xs focus:outline-none resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-zinc-100 flex items-center gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-5 py-3 rounded-2xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-[#c8a97e] hover:bg-[#b8986d] text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  {editingClient ? 'Salvar Alterações' : 'Criar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* CONTRACT MODALS */}
      {isContractModalOpen && selectedContract && (
        <WorkContractModal
          isOpen={isContractModalOpen}
          onClose={() => {
            setIsContractModalOpen(false);
            setSelectedContract(null);
          }}
          contract={selectedContract}
          onSendForSignature={() => {
            sendContractForSignature(selectedContract.id);
            setIsContractModalOpen(false);
          }}
          onOpenDigitalSignature={() => {
            setSigningContractTarget(selectedContract);
            setIsContractModalOpen(false);
          }}
          onMarkAwaitingPayment={() => {
            markContractAwaitingPayment(selectedContract.id);
            setIsContractModalOpen(false);
          }}
          onConfirmPayment={() => {
            confirmContractPayment(selectedContract.id);
            setIsContractModalOpen(false);
          }}
          onDelete={() => {
            deleteWorkContract(selectedContract.id);
            setIsContractModalOpen(false);
          }}
        />
      )}

      {isNewContractModalOpen && (
        <NewContractModal
          isOpen={isNewContractModalOpen}
          onClose={() => {
            setIsNewContractModalOpen(false);
            setNewContractDefaultClientId(undefined);
          }}
          defaultClientId={newContractDefaultClientId}
        />
      )}

      {signingContractTarget && (
        <DigitalSignatureModal
          isOpen={!!signingContractTarget}
          onClose={() => setSigningContractTarget(null)}
          contract={signingContractTarget}
          onSignComplete={(signatureData) => {
            signWorkContract(signingContractTarget.id, signatureData);
            setSigningContractTarget(null);
          }}
        />
      )}

      {/* Confirmation Modal for Deleting Contract */}
      {contractToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-zinc-900">Excluir Contrato</h3>
                <p className="text-xs text-zinc-500">Esta ação é permanente e não poderá ser desfeita.</p>
              </div>
            </div>

            <div className="bg-zinc-50 rounded-2xl p-4 border border-zinc-200/80 space-y-1.5 text-xs">
              <p className="font-bold text-zinc-900 text-sm">{contractToDelete.title}</p>
              <p className="text-zinc-500">
                Cliente: <strong className="text-zinc-800">{contractToDelete.clientName}</strong> • Projeto: {contractToDelete.projectTitle}
              </p>
              <p className="text-zinc-500">
                Valor do Contrato: <strong className="text-zinc-900 font-bold">{formatCurrency(contractToDelete.totalAmount)}</strong>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                type="button"
                onClick={() => setContractToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteWorkContract(contractToDelete.id);
                  setContractToDelete(null);
                }}
                className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Excluir Contrato
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Office Client Portal Manager Modal */}
      <OfficeClientPortalManagerModal
        isOpen={isPortalModalOpen}
        onClose={() => {
          setIsPortalModalOpen(false);
          setSelectedClientForPortal(null);
        }}
        initialClient={selectedClientForPortal}
      />
    </div>
  );
};
