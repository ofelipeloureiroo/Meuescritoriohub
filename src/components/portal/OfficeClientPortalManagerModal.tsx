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
  AlertTriangle,
  Building2,
  ExternalLink,
  Check
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { useAuth } from '../../context/AuthContext';
import { 
  ClientPortalAccess, 
  ClientPortalProject, 
  ClientPortalDocument, 
  ClientProjectHealthStatus,
  ClientPortalStage,
  Client,
  ArchitectureProject
} from '../../types';
import { 
  saveClientPortalAccess, 
  generateProvisionalPassword 
} from '../../services/clientPortalService';

interface OfficeClientPortalManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPortal?: ClientPortalAccess | null;
  initialClient?: Client | null;
  initialProject?: ArchitectureProject | null;
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
  initialPortal,
  initialClient,
  initialProject
}) => {
  const { user } = useAuth();
  const { 
    clients, 
    architectureProjects, 
    architectProfile,
    addClient,
    updateClient,
    addArchitectureProject,
    updateArchitectureProject
  } = useFinance();

  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'cliente' | 'projeto' | 'documentos'>('cliente');

  // Office Registry Linkage States
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

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
    if (!isOpen) return;

    if (initialPortal) {
      setClientName(initialPortal.clientName || '');
      setClientEmail(initialPortal.clientEmail || '');
      setClientPhone(initialPortal.clientPhone || '');
      setAccessCode(initialPortal.accessCode || generateProvisionalPassword());
      setStatus(initialPortal.status || 'active');

      // Attempt to link to existing client in office registry
      const matchedClient = clients.find(
        c => c.id === initialPortal.clientId ||
             (c.email && c.email.toLowerCase() === initialPortal.clientEmail.toLowerCase()) ||
             c.name.toLowerCase() === initialPortal.clientName.toLowerCase()
      );
      if (matchedClient) {
        setSelectedClientId(matchedClient.id);
      } else {
        setSelectedClientId(initialPortal.clientId || '');
      }

      const p0 = initialPortal.projects?.[0];
      if (p0) {
        setProjectTitle(p0.title || '');
        setCurrentStageName(p0.currentStageName || 'Projeto Executivo');
        setProgressPercent(p0.progressPercent ?? 50);
        setGeneralStatus(p0.generalStatus || 'no_prazo');
        setDeliveryDate(p0.deliveryDate || '');
        setStages(p0.stages && p0.stages.length > 0 ? p0.stages : DEFAULT_STAGES);

        // Attempt to link to existing project in office registry
        const matchedProject = architectureProjects.find(
          ap => ap.id === p0.id || ap.title.toLowerCase() === p0.title.toLowerCase()
        );
        if (matchedProject) {
          setSelectedProjectId(matchedProject.id);
        } else {
          setSelectedProjectId(p0.id || '');
        }
      } else {
        setProjectTitle('Projeto Residencial');
        setStages(DEFAULT_STAGES);
      }

      setDocuments(initialPortal.documents || []);
    } else if (initialClient) {
      // Opened from Clients tab
      setSelectedClientId(initialClient.id);
      setClientName(initialClient.name);
      setClientEmail(initialClient.email || '');
      setClientPhone(initialClient.phone || '');
      setAccessCode(generateProvisionalPassword());
      setStatus('active');

      // Look up if client has an associated project in office database
      const clientProject = architectureProjects.find(
        p => p.linkedClients?.some(lc => lc.clientId === initialClient.id) ||
             (p.clientName && p.clientName.toLowerCase() === initialClient.name.toLowerCase()) ||
             p.title.toLowerCase().includes(initialClient.name.toLowerCase())
      );

      if (clientProject) {
        setSelectedProjectId(clientProject.id);
        setProjectTitle(clientProject.title);
        if (clientProject.deliveryDate) setDeliveryDate(clientProject.deliveryDate);
        if (clientProject.currentStageName) setCurrentStageName(clientProject.currentStageName);
        if (typeof clientProject.progressPercent === 'number') setProgressPercent(clientProject.progressPercent);
        if (clientProject.stages && clientProject.stages.length > 0) {
          setStages(
            clientProject.stages.map((st, idx) => ({
              id: st.id || `stg-${idx}`,
              name: st.name,
              status: st.status === 'concluida' ? 'completed' : st.status === 'em_andamento' ? 'in_progress' : 'pending',
              plannedDate: st.deadline || undefined,
              completedAt: st.completedDate || undefined,
            }))
          );
        }
      } else {
        setSelectedProjectId('');
        setProjectTitle(`Projeto de Interiores - ${initialClient.name}`);
        setDeliveryDate('25/12/2026');
        setStages(DEFAULT_STAGES);
      }

      setDocuments([
        {
          id: 'doc-init-1',
          title: `Contrato de Prestação de Serviços - ${initialClient.name}`,
          category: 'contrato',
          fileName: 'Contrato_Servicos_Arquitetura.pdf',
          date: new Date().toLocaleDateString('pt-BR'),
          size: '1.2 MB'
        }
      ]);
    } else if (initialProject) {
      // Opened from Projects tab
      setSelectedProjectId(initialProject.id);
      setProjectTitle(initialProject.title);
      setDeliveryDate(initialProject.deliveryDate || 'Sob consulta');
      setCurrentStageName(initialProject.currentStageName || 'Projeto Executivo');
      setProgressPercent(typeof initialProject.progressPercent === 'number' ? initialProject.progressPercent : 50);
      setAccessCode(generateProvisionalPassword());
      setStatus('active');

      if (initialProject.stages && initialProject.stages.length > 0) {
        setStages(
          initialProject.stages.map((st, idx) => ({
            id: st.id || `stg-${idx}`,
            name: st.name,
            status: st.status === 'concluida' ? 'completed' : st.status === 'em_andamento' ? 'in_progress' : 'pending',
            plannedDate: st.deadline || undefined,
            completedAt: st.completedDate || undefined,
          }))
        );
      } else {
        setStages(DEFAULT_STAGES);
      }

      // Find client in office database
      const foundClient = clients.find(
        c => initialProject.linkedClients?.some(lc => lc.clientId === c.id) ||
             (initialProject.clientName && c.name.toLowerCase() === initialProject.clientName.toLowerCase()) ||
             initialProject.title.toLowerCase().includes(c.name.toLowerCase())
      );

      if (foundClient) {
        setSelectedClientId(foundClient.id);
        setClientName(foundClient.name);
        setClientEmail(foundClient.email || '');
        setClientPhone(foundClient.phone || '');
      } else if (initialProject.clientName) {
        setClientName(initialProject.clientName);
        setClientEmail('');
        setClientPhone('');
      }

      setDocuments([
        {
          id: 'doc-init-1',
          title: `Contrato e Memorial Descritivo - ${initialProject.title}`,
          category: 'contrato',
          fileName: 'Contrato_Projeto.pdf',
          date: new Date().toLocaleDateString('pt-BR'),
          size: '1.4 MB'
        }
      ]);
    } else {
      // New portal defaults
      setSelectedClientId('');
      setSelectedProjectId('');
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
  }, [initialPortal, initialClient, initialProject, isOpen]);

  if (!isOpen) return null;

  // Handle selecting an existing client from office database
  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    const found = clients.find(c => c.id === clientId);
    if (found) {
      setClientName(found.name);
      if (found.email) setClientEmail(found.email);
      if (found.phone) setClientPhone(found.phone);

      // Auto-find project associated with this client
      const clientProject = architectureProjects.find(
        p => p.linkedClients?.some(lc => lc.clientId === found.id) ||
             (p.clientName && p.clientName.toLowerCase() === found.name.toLowerCase()) ||
             p.title.toLowerCase().includes(found.name.toLowerCase())
      );
      if (clientProject) {
        setSelectedProjectId(clientProject.id);
        setProjectTitle(clientProject.title);
        if (clientProject.deliveryDate) setDeliveryDate(clientProject.deliveryDate);
        if (clientProject.currentStageName) setCurrentStageName(clientProject.currentStageName);
        if (typeof clientProject.progressPercent === 'number') setProgressPercent(clientProject.progressPercent);
      }
    }
  };

  // Handle selecting an existing project from office database
  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    const found = architectureProjects.find(p => p.id === projectId);
    if (found) {
      setProjectTitle(found.title);
      if (found.deliveryDate) setDeliveryDate(found.deliveryDate);
      if (found.currentStageName) setCurrentStageName(found.currentStageName);
      if (typeof found.progressPercent === 'number') setProgressPercent(found.progressPercent);

      if (found.stages && found.stages.length > 0) {
        setStages(
          found.stages.map((st, idx) => ({
            id: st.id || `stg-${idx}`,
            name: st.name,
            status: st.status === 'concluida' ? 'completed' : st.status === 'em_andamento' ? 'in_progress' : 'pending',
            plannedDate: st.deadline || undefined,
            completedAt: st.completedDate || undefined,
          }))
        );
      }

      // If client not yet selected, match by project
      if (!selectedClientId && found.clientName) {
        const matchingClient = clients.find(
          c => found.linkedClients?.some(lc => lc.clientId === c.id) ||
               c.name.toLowerCase() === found.clientName?.toLowerCase()
        );
        if (matchingClient) {
          setSelectedClientId(matchingClient.id);
          setClientName(matchingClient.name);
          if (matchingClient.email) setClientEmail(matchingClient.email);
          if (matchingClient.phone) setClientPhone(matchingClient.phone);
        } else {
          setClientName(found.clientName);
        }
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

  // Synchronized Save Handler: Ensures Client & Project are permanently connected to Office Registry
  const handleSave = async () => {
    if (!clientName.trim() || !clientEmail.trim()) {
      alert('Por favor, informe o nome e o e-mail do cliente.');
      return;
    }

    setSaving(true);
    try {
      // 1. Resolve or Create Client in Office Registry
      let resolvedClientId = selectedClientId;
      const existingClient = clients.find(
        c => c.id === selectedClientId ||
             (c.email && c.email.toLowerCase() === clientEmail.trim().toLowerCase()) ||
             c.name.toLowerCase() === clientName.trim().toLowerCase()
      );

      if (existingClient) {
        resolvedClientId = existingClient.id;
        // Keep office registry updated with phone/email
        updateClient(existingClient.id, {
          name: clientName.trim(),
          email: clientEmail.trim().toLowerCase(),
          phone: clientPhone.trim() || existingClient.phone,
          status: 'active'
        });
      } else {
        // Automatically add new client to Office Registry
        resolvedClientId = selectedClientId || `cli-${Date.now()}`;
        addClient({
          id: resolvedClientId,
          name: clientName.trim(),
          email: clientEmail.trim().toLowerCase(),
          phone: clientPhone.trim(),
          status: 'active',
          createdAt: new Date().toISOString(),
          serviceType: 'Arquitetura e Interiores',
          totalBilled: 0,
          totalPaid: 0,
          pendingAmount: 0,
          projectsCount: 1,
          city: architectProfile?.location || 'São Paulo',
          state: 'SP'
        });
      }

      // 2. Resolve or Create Project in Office Registry
      let resolvedProjectId = selectedProjectId;
      const existingProject = architectureProjects.find(
        p => p.id === selectedProjectId ||
             p.title.toLowerCase() === (projectTitle.trim() || '').toLowerCase()
      );

      const resolvedTitle = projectTitle.trim() || `Projeto de ${clientName.trim()}`;

      if (existingProject) {
        resolvedProjectId = existingProject.id;
        // Keep office project progress and current stage synchronized
        updateArchitectureProject(existingProject.id, {
          title: resolvedTitle,
          clientName: clientName.trim(),
          deliveryDate: deliveryDate.trim() || existingProject.deliveryDate,
          currentStageName: currentStageName,
          progressPercent: Number(progressPercent),
          status: generalStatus === 'concluido' ? 'entregue' : (existingProject.status || 'executivo'),
          linkedClients: [
            {
              clientId: resolvedClientId,
              clientName: clientName.trim(),
              role: 'Contratante Principal'
            }
          ]
        });
      } else {
        // Automatically add new project to Office Registry
        resolvedProjectId = selectedProjectId || `proj-${Date.now()}`;
        addArchitectureProject({
          id: resolvedProjectId,
          title: resolvedTitle,
          clientName: clientName.trim(),
          category: 'residencial',
          location: architectProfile?.location || 'São Paulo, SP',
          state: 'SP',
          status: generalStatus === 'concluido' ? 'entregue' : 'executivo',
          coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
          images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'],
          deliveryDate: deliveryDate.trim() || 'Sob consulta',
          createdAt: new Date().toISOString(),
          progressPercent: Number(progressPercent),
          currentStageName: currentStageName,
          linkedClients: [
            {
              clientId: resolvedClientId,
              clientName: clientName.trim(),
              role: 'Contratante Principal'
            }
          ]
        });
      }

      // 3. Save Connected Client Portal Access Record
      const portalId = initialPortal?.id || `portal-${resolvedClientId}-${Math.random().toString(36).substring(2, 6)}`;
      const officeUid = user?.uid || 'demo-office-user';
      const officeName = architectProfile?.name || 'Studio Arq & Design de Interiores';

      const project: ClientPortalProject = {
        id: resolvedProjectId,
        title: resolvedTitle,
        currentStageName,
        currentStageIndex: Math.min(Math.max(1, Math.round((Number(progressPercent) / 100) * (stages.length || 5))), stages.length || 5),
        progressPercent: Number(progressPercent),
        generalStatus,
        deliveryDate: deliveryDate.trim() || 'Sob consulta',
        startDate: initialPortal?.projects?.[0]?.startDate || new Date().toLocaleDateString('pt-BR'),
        status: generalStatus === 'concluido' ? 'Concluído & Entregue' : 'Em andamento',
        stages
      };

      const portalData: ClientPortalAccess = {
        id: portalId,
        officeUid,
        officeName,
        officeEmail: user?.email || undefined,
        officePhone: architectProfile?.pixKey || undefined,
        clientId: resolvedClientId,
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
            text: `Olá, ${clientName.trim()}! Seja muito bem-vindo ao seu portal exclusivo do escritório. Aqui você poderá acompanhar as etapas do projeto "${resolvedTitle}", baixar plantas e falar com a equipe.`,
            createdAt: new Date().toISOString(),
            read: true
          }
        ],
        documents
      };

      await saveClientPortalAccess(portalData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar portal do cliente conectado:', error);
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
                {initialPortal ? 'Gerenciar Radar da Cliente' : 'Criar Novo Acesso ao Radar'}
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
              
              {/* Office CRM Connection Box */}
              <div className="bg-[#14110f] border border-[#3d342f] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-[11px] font-bold text-[#fcf8f5] flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                    <span>Conexão com o Cadastro de Clientes do Escritório</span>
                  </label>
                  {selectedClientId && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <Check className="w-3 h-3" />
                      Conectado ao Escritório
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] text-[#a89c93] block">
                    Selecione um cliente já cadastrado no escritório ou preencha abaixo para cadastrar automaticamente:
                  </span>
                  <select
                    value={selectedClientId}
                    onChange={(e) => handleSelectClient(e.target.value)}
                    className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  >
                    <option value="">+ Criar novo cliente e cadastrar no escritório ao salvar</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.email ? `• ${c.email}` : ''} {c.phone ? `• ${c.phone}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
                    E-mail do Cliente (Login de Acesso) *
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

              {/* Office Project Connection Box */}
              <div className="bg-[#14110f] border border-[#3d342f] rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <label className="text-[11px] font-bold text-[#fcf8f5] flex items-center gap-1.5">
                    <FolderOpen className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
                    <span>Conexão com o Cadastro de Projetos do Escritório</span>
                  </label>
                  {selectedProjectId && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <Check className="w-3 h-3" />
                      Projeto Conectado ao Escritório
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] text-[#a89c93] block">
                    Vincule a um projeto existente do escritório ou crie um novo registro automaticamente:
                  </span>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => handleSelectProject(e.target.value)}
                    className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  >
                    <option value="">+ Criar novo projeto e cadastrar no escritório ao salvar</option>
                    {architectureProjects.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.title} {p.clientName ? `(Cliente: ${p.clientName})` : ''} • {p.currentStageName || p.status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

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
