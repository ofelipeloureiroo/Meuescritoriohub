import React, { useState, useEffect } from 'react';
import {
  X,
  KeyRound,
  Plus,
  Trash2,
  FileText,
  FolderOpen,
  User,
  Mail,
  Phone,
  CheckCircle2,
  RefreshCw,
  Clock,
  Sparkles,
  Link,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { 
  ClientPortalAccess, 
  ClientPortalProject, 
  ClientPortalDocument, 
  ClientProjectHealthStatus,
  ClientPortalStage
} from '../../types';
import { 
  saveClientPortalAccess, 
  generateProvisionalPassword 
} from '../../services/clientPortalService';

interface OfficeClientPortalManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPortal?: ClientPortalAccess | null;
}

const DEFAULT_STAGES: ClientPortalStage[] = [
  { id: 'stg-1', name: '1. Briefing & Levantamento', status: 'completed', completedAt: 'Concluído' },
  { id: 'stg-2', name: '2. Estudo Preliminar & Conceito 3D', status: 'completed', completedAt: 'Concluído' },
  { id: 'stg-3', name: '3. Anteprojeto & Aprovação', status: 'completed', completedAt: 'Concluído' },
  { id: 'stg-4', name: '4. Projeto Executivo & Marcenaria', status: 'in_progress', plannedDate: 'Em andamento' },
  { id: 'stg-5', name: '5. Detalhamentos & Compatibilização', status: 'pending', plannedDate: 'Próxima etapa' },
  { id: 'stg-6', name: '6. Entrega Final do Caderno & Renders', status: 'pending', plannedDate: 'Etapa final' }
];

export const OfficeClientPortalManagerModal: React.FC<OfficeClientPortalManagerModalProps> = ({
  isOpen,
  onClose,
  initialPortal
}) => {
  const { user } = useAuth();
  const { clients, architectureProjects, architectProfile } = useFinance();

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'cliente' | 'projeto' | 'documentos'>('cliente');

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Project state
  const [projectTitle, setProjectTitle] = useState('');
  const [currentStageName, setCurrentStageName] = useState('Projeto Executivo & Marcenaria');
  const [progressPercent, setProgressPercent] = useState(65);
  const [generalStatus, setGeneralStatus] = useState<ClientProjectHealthStatus>('no_prazo');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [stages, setStages] = useState<ClientPortalStage[]>(DEFAULT_STAGES);

  // Documents state
  const [documents, setDocuments] = useState<ClientPortalDocument[]>([]);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<'planta' | 'contrato' | 'relatorio' | 'entregavel'>('planta');
  const [newDocFileName, setNewDocFileName] = useState('');
  const [newDocUrl, setNewDocUrl] = useState('');

  // Prepopulate when opened
  useEffect(() => {
    if (initialPortal) {
      setClientName(initialPortal.clientName || '');
      setClientEmail(initialPortal.clientEmail || '');
      setClientPhone(initialPortal.clientPhone || '');
      setAccessCode(initialPortal.accessCode || generateProvisionalPassword());
      setStatus(initialPortal.status || 'active');

      const p0 = initialPortal.projects?.[0];
      if (p0) {
        setProjectTitle(p0.title || '');
        setCurrentStageName(p0.currentStageName || 'Projeto Executivo');
        setProgressPercent(p0.progressPercent ?? 50);
        setGeneralStatus(p0.generalStatus || 'no_prazo');
        setDeliveryDate(p0.deliveryDate || '');
        setStages(p0.stages && p0.stages.length > 0 ? p0.stages : DEFAULT_STAGES);
      } else {
        setProjectTitle('Projeto Residencial');
        setStages(DEFAULT_STAGES);
      }

      setDocuments(initialPortal.documents || []);
    } else {
      // New portal defaults
      setClientName('');
      setClientEmail('');
      setClientPhone('');
      setAccessCode(generateProvisionalPassword());
      setStatus('active');
      setProjectTitle('');
      setCurrentStageName('Estudo Preliminar & Conceito 3D');
      setProgressPercent(30);
      setGeneralStatus('no_prazo');
      setDeliveryDate('25/11/2026');
      setStages(DEFAULT_STAGES);
      setDocuments([
        {
          id: 'doc-init-1',
          title: 'Contrato de Prestação de Serviços de Arquitetura',
          category: 'contrato',
          fileName: 'Contrato_Servicos_Arquitetura.pdf',
          date: new Date().toLocaleDateString('pt-BR'),
          size: '1.2 MB'
        }
      ]);
    }
  }, [initialPortal, isOpen]);

  if (!isOpen) return null;

  // Handle selecting an existing client from office database
  const handleSelectClient = (selectedClientId: string) => {
    const found = clients.find(c => c.id === selectedClientId);
    if (found) {
      setClientName(found.name);
      if (found.email) setClientEmail(found.email);
      if (found.phone) setClientPhone(found.phone);

      // Check if this client has an associated project
      const clientProject = architectureProjects.find(
        p => p.linkedClients?.some(lc => lc.clientId === found.id) || p.title.toLowerCase().includes(found.name.toLowerCase())
      );
      if (clientProject) {
        setProjectTitle(clientProject.title);
        if (clientProject.deliveryDate) setDeliveryDate(clientProject.deliveryDate);
      }
    }
  };

  // Stage status toggles
  const handleToggleStageStatus = (stageId: string) => {
    setStages(prev =>
      prev.map(s => {
        if (s.id !== stageId) return s;
        if (s.status === 'completed') return { ...s, status: 'pending', completedAt: undefined };
        if (s.status === 'in_progress') return { ...s, status: 'completed', completedAt: new Date().toLocaleDateString('pt-BR') };
        return { ...s, status: 'in_progress', plannedDate: 'Em andamento' };
      })
    );
  };

  // Add document
  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim()) return;

    const newDoc: ClientPortalDocument = {
      id: 'doc-' + Date.now(),
      title: newDocTitle.trim(),
      category: newDocCategory,
      fileName: newDocFileName.trim() || `${newDocTitle.trim().replace(/\s+/g, '_')}.pdf`,
      fileUrl: newDocUrl.trim() || undefined,
      date: new Date().toLocaleDateString('pt-BR'),
      size: '2.4 MB'
    };

    setDocuments(prev => [newDoc, ...prev]);
    setNewDocTitle('');
    setNewDocFileName('');
    setNewDocUrl('');
  };

  const handleRemoveDoc = (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
  };

  const handleSave = async () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      alert('Por favor, informe o nome e o e-mail do cliente.');
      return;
    }

    setSaving(true);
    try {
      const portalId = initialPortal?.id || `portal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const officeUid = user?.uid || 'demo-office-user';
      const officeName = architectProfile?.name || 'Escritório de Arquitetura';

      const project: ClientPortalProject = {
        id: initialPortal?.projects?.[0]?.id || `proj-${Date.now()}`,
        title: projectTitle.trim() || 'Projeto Arquitetônico',
        currentStageName,
        currentStageIndex: 3,
        progressPercent: Number(progressPercent),
        generalStatus,
        deliveryDate: deliveryDate.trim() || 'Sob consulta',
        startDate: initialPortal?.projects?.[0]?.startDate || new Date().toLocaleDateString('pt-BR'),
        status: 'Em andamento',
        stages
      };

      const portalData: ClientPortalAccess = {
        id: portalId,
        officeUid,
        officeName,
        officeEmail: user?.email || undefined,
        officePhone: architectProfile?.pixKey || undefined,
        clientId: initialPortal?.clientId || `cli-${Date.now()}`,
        clientName: clientName.trim(),
        clientEmail: clientEmail.trim().toLowerCase(),
        clientPhone: clientPhone.trim(),
        accessCode: accessCode.trim() || generateProvisionalPassword(),
        status,
        createdAt: initialPortal?.createdAt || new Date().toISOString(),
        projects: [project],
        messages: initialPortal?.messages || [
          {
            id: 'welcome-msg',
            sender: 'office',
            senderName: `${officeName} (Equipe)`,
            text: `Olá, ${clientName.trim()}! Seja muito bem-vindo ao seu portal exclusivo. Aqui você poderá acompanhar as etapas do seu projeto, baixar plantas e falar com a equipe.`,
            createdAt: new Date().toISOString(),
            read: true
          }
        ],
        documents
      };

      await saveClientPortalAccess(portalData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar portal do cliente:', error);
      alert('Houve um erro ao salvar o portal. Tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-[#1a1614] border border-[#3d342f] rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3d342f] bg-[#14110f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center border border-[var(--theme-primary)]/20">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#fcf8f5]">
                {initialPortal ? 'Gerenciar Portal do Cliente' : 'Criar Novo Acesso ao Portal'}
              </h2>
              <p className="text-xs text-[#a89c93]">
                Configure os dados de acesso, etapas e pranchas visíveis para o cliente
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#241e1b] hover:bg-[#2e2622] text-[#a89c93] hover:text-[#fcf8f5] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#3d342f] bg-[#161311] px-6">
          <button
            onClick={() => setActiveTab('cliente')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'cliente'
                ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                : 'border-transparent text-[#a89c93] hover:text-[#fcf8f5]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>1. Dados & Credenciais</span>
          </button>

          <button
            onClick={() => setActiveTab('projeto')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'projeto'
                ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                : 'border-transparent text-[#a89c93] hover:text-[#fcf8f5]'
            }`}
          >
            <FolderOpen className="w-3.5 h-3.5" />
            <span>2. Projeto & Etapas Visíveis</span>
          </button>

          <button
            onClick={() => setActiveTab('documentos')}
            className={`py-3 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'documentos'
                ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                : 'border-transparent text-[#a89c93] hover:text-[#fcf8f5]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>3. Documentos & Plantas ({documents.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 text-xs text-[#fcf8f5]">
          
          {/* TAB 1: CLIENT DATA & ACCESS */}
          {activeTab === 'cliente' && (
            <div className="space-y-5">
              
              {/* Client Auto-select from office CRM */}
              {clients.length > 0 && !initialPortal && (
                <div className="bg-[#14110f] border border-[#3d342f] rounded-2xl p-4 space-y-2">
                  <label className="text-[11px] font-bold text-[#a89c93] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                    <span>Importar dados de um cliente já cadastrado no escritório:</span>
                  </label>
                  <select
                    onChange={(e) => handleSelectClient(e.target.value)}
                    defaultValue=""
                    className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  >
                    <option value="" disabled>Selecione um cliente cadastrado...</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.email ? `(${c.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#a89c93] block">
                    Nome Completo do Cliente *
                  </label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-[#a89c93] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: Roberto Silveira"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#a89c93] block">
                    E-mail do Cliente (Login) *
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#a89c93] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="roberto@email.com"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#a89c93] block">
                    WhatsApp / Telefone do Cliente
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[#a89c93] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="(11) 98765-4321"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#a89c93] block">
                    Código de Acesso / Senha Provisória *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      className="flex-1 bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2.5 text-xs font-mono font-bold text-[var(--theme-primary)] focus:outline-none focus:border-[var(--theme-primary)]"
                    />
                    <button
                      type="button"
                      onClick={() => setAccessCode(generateProvisionalPassword())}
                      className="px-3 py-2 bg-[#241e1b] hover:bg-[#2e2622] text-[#a89c93] hover:text-[#fcf8f5] border border-[#3d342f] rounded-xl transition-colors cursor-pointer"
                      title="Gerar nova senha automática"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Status toggle */}
              <div className="flex items-center justify-between p-3.5 bg-[#14110f] border border-[#3d342f] rounded-xl">
                <div>
                  <span className="font-bold text-[#fcf8f5] block">Status do Acesso</span>
                  <span className="text-[11px] text-[#a89c93]">
                    Se inativo, o cliente verá uma mensagem cordial avisando que o acesso está temporariamente pausado.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setStatus(prev => prev === 'active' ? 'inactive' : 'active')}
                  className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                    status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                  }`}
                >
                  {status === 'active' ? '✓ Acesso Ativo' : '✕ Acesso Pausado'}
                </button>
              </div>

            </div>
          )}

          {/* TAB 2: PROJECT & STAGES */}
          {activeTab === 'projeto' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold text-[#a89c93] block">
                    Nome do Projeto Exibido no Portal *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Residência Alphaville - Reforma & Interiores"
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#a89c93] block">
                    Etapa Atual em Destaque
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Projeto Executivo & Marcenaria"
                    value={currentStageName}
                    onChange={(e) => setCurrentStageName(e.target.value)}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#a89c93] block">
                    Previsão de Entrega
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 15/12/2026"
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-[#a89c93] block">
                    Status Geral do Cronograma
                  </label>
                  <select
                    value={generalStatus}
                    onChange={(e) => setGeneralStatus(e.target.value as ClientProjectHealthStatus)}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  >
                    <option value="no_prazo">🟢 No Prazo (Cronograma Regular)</option>
                    <option value="atencao">🟡 Requer Atenção (Ajustes em Andamento)</option>
                    <option value="atrasado">🔴 Atenção Especial (Prazo Prorrogado)</option>
                    <option value="concluido">🔵 Concluído & Entregue</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-[11px] font-bold text-[#a89c93]">
                      Progresso Geral:
                    </label>
                    <span className="font-bold text-[var(--theme-primary)] text-xs">
                      {progressPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={progressPercent}
                    onChange={(e) => setProgressPercent(Number(e.target.value))}
                    className="w-full accent-[var(--theme-primary)] cursor-pointer"
                  />
                </div>
              </div>

              {/* Stages List */}
              <div className="space-y-2 pt-2 border-t border-[#3d342f]">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#fcf8f5]">
                    Cronograma de Etapas (Clique para alternar status):
                  </span>
                  <span className="text-[11px] text-[#a89c93]">
                    Verde = Concluído | Laranja = Em Andamento | Cinza = Pendente
                  </span>
                </div>

                <div className="space-y-2">
                  {stages.map((stg, idx) => (
                    <div
                      key={stg.id}
                      onClick={() => handleToggleStageStatus(stg.id)}
                      className="bg-[#14110f] hover:bg-[#1a1613] border border-[#3d342f] rounded-xl p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          stg.status === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : stg.status === 'in_progress'
                            ? 'bg-[var(--theme-primary)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/40'
                            : 'bg-[#241e1b] text-[#a89c93] border border-[#3d342f]'
                        }`}>
                          {stg.status === 'completed' ? '✓' : idx + 1}
                        </div>
                        <span className={`font-medium ${stg.status === 'completed' ? 'text-emerald-300' : 'text-[#fcf8f5]'}`}>
                          {stg.name}
                        </span>
                      </div>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        stg.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : stg.status === 'in_progress'
                          ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border-[var(--theme-primary)]/30'
                          : 'bg-[#241e1b] text-[#a89c93] border-[#3d342f]'
                      }`}>
                        {stg.status === 'completed' ? 'Concluído' : stg.status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: DOCUMENTS & DELIVERABLES */}
          {activeTab === 'documentos' && (
            <div className="space-y-5">
              
              {/* Add document form */}
              <div className="bg-[#14110f] border border-[#3d342f] rounded-2xl p-4 space-y-3">
                <span className="font-bold text-xs text-[#fcf8f5] block">
                  + Adicionar Nova Planta, Contrato ou Caderno
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="Título (ex: Planta Executiva de Marcenaria)"
                    value={newDocTitle}
                    onChange={(e) => setNewDocTitle(e.target.value)}
                    className="bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  />

                  <select
                    value={newDocCategory}
                    onChange={(e) => setNewDocCategory(e.target.value as any)}
                    className="bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  >
                    <option value="planta">Planta / Desenho Técnico</option>
                    <option value="contrato">Contrato / Documento Legal</option>
                    <option value="entregavel">Caderno de Especificações</option>
                    <option value="relatorio">Relatório Fotográfico / Visita</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Nome do arquivo (ex: Prancha_03_Marcenaria.pdf)"
                    value={newDocFileName}
                    onChange={(e) => setNewDocFileName(e.target.value)}
                    className="bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  />
                </div>

                <div className="flex items-center justify-between gap-3">
                  <input
                    type="text"
                    placeholder="Link para download (Drive, Dropbox ou URL externa - opcional)"
                    value={newDocUrl}
                    onChange={(e) => setNewDocUrl(e.target.value)}
                    className="flex-1 bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  />

                  <button
                    type="button"
                    onClick={handleAddDocument}
                    className="px-4 py-2 bg-[var(--theme-primary)] hover:brightness-110 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Inserir Arquivo</span>
                  </button>
                </div>
              </div>

              {/* Existing documents list */}
              <div className="space-y-2">
                <span className="font-bold text-xs text-[#a89c93] block">
                  Arquivos Disponíveis no Portal ({documents.length})
                </span>

                {documents.length === 0 ? (
                  <p className="text-xs text-[#a89c93] italic py-4 text-center">
                    Nenhum documento adicionado ainda. Adicione uma prancha ou contrato acima.
                  </p>
                ) : (
                  documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-[#14110f] border border-[#3d342f] rounded-xl p-3 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center shrink-0 border border-[var(--theme-primary)]/20">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <span className="font-bold text-[#fcf8f5] block truncate">
                            {doc.title}
                          </span>
                          <span className="text-[11px] text-[#a89c93] block">
                            {doc.fileName} • {doc.date}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveDoc(doc.id)}
                        className="p-2 text-[#a89c93] hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                        title="Remover documento"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}

        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#3d342f] bg-[#14110f]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#241e1b] font-medium text-xs transition-colors cursor-pointer"
          >
            Cancelar
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-[var(--theme-primary)] hover:brightness-110 text-black font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando no Sistema...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Salvar Acesso do Cliente</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
