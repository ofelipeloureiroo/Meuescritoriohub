import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  X, 
  Copy, 
  Check, 
  Send, 
  Plus, 
  Trash2, 
  KeyRound, 
  ExternalLink, 
  MessageSquare, 
  FileText, 
  Layers, 
  Clock, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Calendar,
  Share2,
  RefreshCw,
  Eye,
  Power
} from 'lucide-react';
import { 
  ArchitectureProject, 
  Client, 
  ClientPortalAccess, 
  ClientPortalDocument, 
  ClientPortalProject, 
  ClientProjectHealthStatus 
} from '../../types';
import { 
  generateProvisionalPassword, 
  saveClientPortalAccess, 
  subscribeToClientPortal, 
  sendPortalMessage, 
  addPortalDocument, 
  deletePortalDocument, 
  updatePortalProject, 
  setPortalStatus 
} from '../../services/clientPortalService';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  // Can be opened from a project or from a client
  initialProject?: ArchitectureProject | null;
  initialClient?: Client | null;
}

export const OfficeClientPortalManagerModal: React.FC<Props> = ({
  isOpen,
  onClose,
  initialProject,
  initialClient
}) => {
  const { user, profile } = useAuth();
  const { architectProfile, architectureProjects, clients } = useFinance();

  // Find linked client or project
  const selectedClient = initialClient || clients.find(c => c.name === initialProject?.clientName || c.id === initialProject?.id);
  const clientEmail = selectedClient?.email || initialProject?.clientEmail || '';
  const clientName = selectedClient?.name || initialProject?.clientName || 'Cliente';
  const clientPhone = selectedClient?.phone || initialProject?.clientPhone || '';

  const portalId = 'portal-' + (selectedClient?.id || initialProject?.id || 'client-default');

  const [portal, setPortal] = useState<ClientPortalAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'acesso' | 'fases' | 'documentos' | 'mensagens'>('acesso');
  const [copied, setCopied] = useState(false);

  // New Document form
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<'contrato' | 'relatorio' | 'entregavel' | 'planta' | 'outro'>('entregavel');
  const [newDocUrl, setNewDocUrl] = useState('');

  // Office message form
  const [officeMsg, setOfficeMsg] = useState('');
  const [isSendingMsg, setIsSendingMsg] = useState(false);

  // Subscribe to this portal's Firestore state
  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    const unsubscribe = subscribeToClientPortal(portalId, (data) => {
      setPortal(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, portalId]);

  if (!isOpen) return null;

  // Build default stages for the project
  const buildDefaultStages = (proj?: ArchitectureProject) => {
    if (proj?.stages && proj.stages.length > 0) {
      return proj.stages.map((s, idx) => ({
        id: s.id || 'stage-' + idx,
        name: s.name,
        description: s.tasks?.map(t => t.name).join(', ') || undefined,
        status: s.status === 'completed' ? 'completed' : s.status === 'in_progress' ? 'in_progress' : 'pending',
        plannedDate: s.endDatePlanned || undefined
      }));
    }

    return [
      { id: 'stg-1', name: 'Contrato Assinado & Alinhamento', status: 'completed', completedAt: new Date().toLocaleDateString('pt-BR') },
      { id: 'stg-2', name: 'Estudo Preliminar & Briefing', status: 'completed', completedAt: new Date().toLocaleDateString('pt-BR') },
      { id: 'stg-3', name: 'Desenvolvimento do Projeto', status: 'in_progress', plannedDate: 'Em andamento' },
      { id: 'stg-4', name: 'Revisão & Aprovação com Cliente', status: 'pending', plannedDate: 'Próxima etapa' },
      { id: 'stg-5', name: 'Entrega Final dos Arquivos & Executivo', status: 'pending', plannedDate: proj?.deliveryDate || 'Cronograma final' }
    ];
  };

  // Build default project summary
  const buildClientPortalProject = (proj: ArchitectureProject): ClientPortalProject => {
    const stages = buildDefaultStages(proj);
    const completedStages = stages.filter(s => s.status === 'completed').length;
    const progress = Math.round((completedStages / Math.max(1, stages.length)) * 100);

    return {
      id: proj.id,
      title: proj.title,
      category: proj.category || 'Projeto',
      description: proj.description || undefined,
      status: proj.status,
      generalStatus: 'no_prazo',
      currentStageName: stages.find(s => s.status === 'in_progress')?.name || stages[0]?.name || 'Em Andamento',
      currentStageIndex: 2,
      progressPercent: progress,
      stages: stages as any,
      startDate: proj.startDate || new Date().toISOString().split('T')[0],
      deliveryDate: proj.deliveryDate || 'No Prazo',
      contractTitle: `Contrato de Prestação de Serviços - ${proj.title}`,
      contractStatus: 'Assinado e Ativo'
    };
  };

  // Handler to Create Portal Access
  const handleCreateAccess = async () => {
    if (!user) return;
    const relevantProjects = architectureProjects.filter(p => 
      p.clientName === clientName || (selectedClient && p.clientName === selectedClient.name) || p.id === initialProject?.id
    );

    const projectPayloads: ClientPortalProject[] = relevantProjects.length > 0
      ? relevantProjects.map(p => buildClientPortalProject(p))
      : initialProject 
      ? [buildClientPortalProject(initialProject)]
      : [{
          id: 'proj-' + Date.now(),
          title: `Projeto de ${clientName}`,
          category: 'Serviço Contratado',
          status: 'em_andamento',
          generalStatus: 'no_prazo',
          currentStageName: 'Desenvolvimento Inicial',
          currentStageIndex: 1,
          progressPercent: 30,
          stages: buildDefaultStages(),
          startDate: new Date().toISOString().split('T')[0],
          deliveryDate: 'A definir',
          contractTitle: 'Contrato de Serviços',
          contractStatus: 'Ativo'
        }];

    const newPortal: ClientPortalAccess = {
      id: portalId,
      officeUid: user.uid,
      officeName: architectProfile?.name || 'Meu Escritório',
      officeEmail: user.email || undefined,
      officePhone: architectProfile?.phone || undefined,
      clientId: selectedClient?.id || initialProject?.id || 'client-gen',
      clientName: clientName,
      clientEmail: clientEmail || (clientName.toLowerCase().replace(/\s+/g, '') + '@cliente.com'),
      clientPhone: clientPhone || undefined,
      accessCode: generateProvisionalPassword(),
      status: 'active',
      createdAt: new Date().toISOString(),
      projects: projectPayloads,
      messages: [
        {
          id: 'msg-welcome',
          sender: 'office',
          senderName: architectProfile?.name || 'Escritório',
          text: `Olá ${clientName}! Seja bem-vindo ao seu Portal do Cliente. Aqui você poderá acompanhar todas as fases do projeto, prazos, entregáveis e trocar mensagens conosco.`,
          createdAt: new Date().toISOString()
        }
      ],
      documents: [
        {
          id: 'doc-init',
          title: 'Contrato de Prestação de Serviços (Via Digital)',
          category: 'contrato',
          fileName: 'Contrato_Assinado.pdf',
          date: new Date().toISOString(),
          size: '1.2 MB'
        }
      ]
    };

    await saveClientPortalAccess(newPortal);
    setPortal(newPortal);
  };

  const currentProj = portal?.projects?.[0];

  const handleUpdateStage = async (stageIndex: number) => {
    if (!portal || !currentProj) return;
    const updatedStages = currentProj.stages.map((s, idx) => {
      if (idx < stageIndex) {
        return { ...s, status: 'completed' as const, completedAt: s.completedAt || new Date().toLocaleDateString('pt-BR') };
      } else if (idx === stageIndex) {
        return { ...s, status: 'in_progress' as const };
      } else {
        return { ...s, status: 'pending' as const };
      }
    });

    const progress = Math.round(((stageIndex + 0.5) / updatedStages.length) * 100);
    const stageName = updatedStages[stageIndex]?.name || 'Fase Atual';

    await updatePortalProject(portal.id, currentProj.id, {
      stages: updatedStages,
      currentStageIndex: stageIndex,
      currentStageName: stageName,
      progressPercent: progress
    });
  };

  const handleUpdateHealth = async (health: ClientProjectHealthStatus) => {
    if (!portal || !currentProj) return;
    await updatePortalProject(portal.id, currentProj.id, {
      generalStatus: health
    });
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !portal) return;

    await addPortalDocument(portal.id, {
      title: newDocTitle.trim(),
      category: newDocCategory,
      fileName: newDocTitle.trim() + '.pdf',
      fileUrl: newDocUrl.trim() || undefined,
      size: '1.5 MB'
    });

    setNewDocTitle('');
    setNewDocUrl('');
  };

  const handleSendOfficeMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officeMsg.trim() || !portal) return;

    setIsSendingMsg(true);
    await sendPortalMessage(
      portal.id,
      'office',
      architectProfile?.name || 'Equipe do Escritório',
      officeMsg.trim()
    );
    setOfficeMsg('');
    setIsSendingMsg(false);
  };

  const portalLink = `${window.location.origin}/cliente/login?email=${encodeURIComponent(portal?.clientEmail || '')}&code=${portal?.accessCode || ''}`;

  const copyWhatsappMessage = () => {
    const text = `Olá, *${portal?.clientName}*! 👋\n\nO seu *Portal do Cliente* exclusivo no *${portal?.officeName || 'nosso escritório'}* está ativo para você acompanhar o andamento, cronograma e entregas do seu projeto em tempo real.\n\n🔗 *Link de Acesso Direto:*\n${portalLink}\n\n📧 *Seu E-mail:* ${portal?.clientEmail}\n🔑 *Sua Senha de Acesso:* ${portal?.accessCode}\n\nQualquer dúvida, estamos à disposição por aqui!`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="w-full max-w-3xl bg-[#1a1614] border border-[#3d342f] rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#3d342f] bg-[#161210] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shrink-0"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              <KeyRound className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-serif font-bold text-[#fcf8f5]">
                  Gerenciar Portal do Cliente
                </h3>
                {portal && (
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    portal.status === 'active' 
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                      : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {portal.status === 'active' ? 'Acesso Ativo' : 'Acesso Desativado'}
                  </span>
                )}
              </div>
              <span className="text-xs text-[#a89c93]">
                Cliente: <strong className="text-[#fcf8f5]">{clientName}</strong> {clientEmail && `(${clientEmail})`}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg border border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#26201c] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {!portal ? (
            <div className="py-12 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--theme-badge-bg)] border border-[var(--theme-badge-border)] text-[var(--theme-primary)] flex items-center justify-center mx-auto">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h4 className="text-xl font-serif font-bold text-[#fcf8f5]">
                Liberar Acesso do Cliente ao Portal
              </h4>
              <p className="text-xs text-[#a89c93] leading-relaxed">
                Ao gerar o acesso, o cliente receberá um login exclusivo para consultar em tempo real a linha do tempo do projeto, prazos de entrega, relatórios e trocar mensagens, com total isolamento do restante do sistema.
              </p>
              <button
                onClick={handleCreateAccess}
                className="w-full py-3 px-6 rounded-xl bg-[var(--theme-primary)] hover:brightness-110 text-black font-bold text-sm shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Gerar Credenciais & Criar Portal do Cliente</span>
              </button>
            </div>
          ) : (
            <>
              {/* Navigation Sub-Tabs */}
              <div className="flex border-b border-[#3d342f] gap-4">
                <button
                  onClick={() => setActiveTab('acesso')}
                  className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'acesso'
                      ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                      : 'border-transparent text-[#a89c93] hover:text-[#fcf8f5]'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Acesso & Envio</span>
                </button>

                <button
                  onClick={() => setActiveTab('fases')}
                  className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'fases'
                      ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                      : 'border-transparent text-[#a89c93] hover:text-[#fcf8f5]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Fase & Status do Projeto</span>
                </button>

                <button
                  onClick={() => setActiveTab('documentos')}
                  className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'documentos'
                      ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                      : 'border-transparent text-[#a89c93] hover:text-[#fcf8f5]'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Arquivos para o Cliente ({portal.documents?.length || 0})</span>
                </button>

                <button
                  onClick={() => setActiveTab('mensagens')}
                  className={`pb-2.5 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border-b-2 ${
                    activeTab === 'mensagens'
                      ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                      : 'border-transparent text-[#a89c93] hover:text-[#fcf8f5]'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Mensagens & Avisos ({portal.messages?.length || 0})</span>
                </button>
              </div>

              {/* TAB 1: ACESSO & ENVIO DAS CREDENCIAIS */}
              {activeTab === 'acesso' && (
                <div className="space-y-4">
                  <div className="bg-[#12100e] border border-[#3d342f] rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#fcf8f5] flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-[var(--theme-primary)]" />
                        Credenciais de Acesso do Cliente
                      </span>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
                            const newCode = generateProvisionalPassword();
                            await saveClientPortalAccess({ ...portal, accessCode: newCode });
                          }}
                          className="text-[11px] text-[#a89c93] hover:text-[var(--theme-primary)] flex items-center gap-1 cursor-pointer"
                        >
                          <RefreshCw className="w-3 h-3" /> Redefinir Senha
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="bg-[#1a1614] p-3 rounded-xl border border-[#3d342f]">
                        <span className="text-[10px] text-[#a89c93] uppercase block mb-1">E-mail de Login</span>
                        <span className="font-mono font-bold text-[#fcf8f5]">{portal.clientEmail}</span>
                      </div>

                      <div className="bg-[#1a1614] p-3 rounded-xl border border-[#3d342f] flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-[#a89c93] uppercase block mb-1">Senha / Código</span>
                          <span className="font-mono font-bold text-[var(--theme-primary)] tracking-widest text-sm">{portal.accessCode}</span>
                        </div>
                      </div>
                    </div>

                    {/* Quick WhatsApp Share Button */}
                    <div className="pt-2 flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={copyWhatsappMessage}
                        className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                        <span>{copied ? 'Mensagem Copiada!' : 'Copiar Convite Formatado para WhatsApp'}</span>
                      </button>

                      <a
                        href={portalLink}
                        target="_blank"
                        rel="noreferrer"
                        className="py-3 px-4 rounded-xl bg-[#26201c] hover:bg-[#322a25] border border-[#3d342f] text-[#fcf8f5] font-bold text-xs flex items-center justify-center gap-2 transition-all"
                      >
                        <Eye className="w-4 h-4 text-[var(--theme-primary)]" />
                        <span>Abrir Visão do Cliente</span>
                      </a>
                    </div>
                  </div>

                  {/* Status Toggle & Deactivation */}
                  <div className="bg-[#12100e] border border-[#3d342f] rounded-2xl p-4 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-[#fcf8f5] block">Estado do Acesso</span>
                      <span className="text-[#a89c93] text-[11px]">
                        {portal.status === 'active' 
                          ? 'O cliente pode acessar seu painel normalmente.' 
                          : 'O acesso está suspenso. O cliente não conseguirá visualizar dados.'}
                      </span>
                    </div>

                    <button
                      onClick={() => setPortalStatus(portal.id, portal.status === 'active' ? 'inactive' : 'active')}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer ${
                        portal.status === 'active'
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{portal.status === 'active' ? 'Desativar Acesso' : 'Reativar Acesso'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: FASE E STATUS DO PROJETO */}
              {activeTab === 'fases' && currentProj && (
                <div className="space-y-5">
                  {/* Health status switcher */}
                  <div className="bg-[#12100e] border border-[#3d342f] rounded-2xl p-4 space-y-2">
                    <span className="text-xs font-bold text-[#fcf8f5] block">Status Geral de Andamento:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {(['no_prazo', 'atencao', 'atrasado', 'concluido'] as ClientProjectHealthStatus[]).map((h) => {
                        const isSelected = currentProj.generalStatus === h;
                        return (
                          <button
                            key={h}
                            type="button"
                            onClick={() => handleUpdateHealth(h)}
                            className={`p-2.5 rounded-xl border text-center font-bold capitalize transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[var(--theme-primary)] text-black border-transparent shadow-md'
                                : 'bg-[#1a1614] border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5]'
                            }`}
                          >
                            {h === 'no_prazo' ? '✓ No Prazo' : h === 'atencao' ? '⚠ Em Atenção' : h === 'atrasado' ? '✕ Atrasado' : '★ Concluído'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage Progress selector */}
                  <div className="bg-[#12100e] border border-[#3d342f] rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#fcf8f5]">
                        Clique para definir em qual fase o projeto está agora:
                      </span>
                      <span className="text-[11px] text-[var(--theme-primary)] font-bold">
                        Progresso: {currentProj.progressPercent || 0}%
                      </span>
                    </div>

                    <div className="space-y-2">
                      {currentProj.stages?.map((stage, idx) => {
                        const isCurrent = stage.status === 'in_progress';
                        const isDone = stage.status === 'completed';

                        return (
                          <div
                            key={stage.id || idx}
                            onClick={() => handleUpdateStage(idx)}
                            className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                              isCurrent
                                ? 'bg-[#241e1b] border-[var(--theme-primary)] text-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)]/40'
                                : isDone
                                ? 'bg-[#161311] border-[#3d342f] text-[#a89c93]'
                                : 'bg-[#12100e] border-[#29221d] text-[#6b625b] hover:border-[#3d342f]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                isDone ? 'bg-emerald-500/20 text-emerald-400' : isCurrent ? 'bg-[var(--theme-primary)] text-black' : 'bg-[#26201c] text-[#6b625b]'
                              }`}>
                                {isDone ? '✓' : idx + 1}
                              </span>
                              <span className="text-xs font-bold">{stage.name}</span>
                            </div>

                            <span className="text-[10px] font-bold">
                              {isCurrent ? '● Fase Ativa' : isDone ? 'Concluída' : 'A Iniciar'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: DOCUMENTOS & ARQUIVOS */}
              {activeTab === 'documentos' && (
                <div className="space-y-4">
                  {/* Add Document Form */}
                  <form onSubmit={handleAddDocument} className="bg-[#12100e] border border-[#3d342f] rounded-2xl p-4 space-y-3">
                    <span className="text-xs font-bold text-[#fcf8f5] block">Disponibilizar Novo Arquivo / Entregável</span>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        placeholder="Ex: Planta Humanizada v2.pdf"
                        required
                        className="sm:col-span-2 bg-[#1a1614] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                      />

                      <select
                        value={newDocCategory}
                        onChange={(e) => setNewDocCategory(e.target.value as any)}
                        className="bg-[#1a1614] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                      >
                        <option value="contrato">Contrato</option>
                        <option value="entregavel">Entregável</option>
                        <option value="planta">Planta / Desenho</option>
                        <option value="relatorio">Relatório</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={newDocUrl}
                        onChange={(e) => setNewDocUrl(e.target.value)}
                        placeholder="Link direto para download (Google Drive, Dropbox, etc. - opcional)"
                        className="flex-1 bg-[#1a1614] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-[var(--theme-primary)] text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer hover:brightness-110"
                      >
                        <Plus className="w-3.5 h-3.5" /> Adicionar
                      </button>
                    </div>
                  </form>

                  {/* Document List */}
                  <div className="space-y-2">
                    {portal.documents?.map((d) => (
                      <div key={d.id} className="bg-[#12100e] border border-[#3d342f] p-3 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-[var(--theme-primary)]" />
                          <div>
                            <span className="font-bold text-[#fcf8f5] block">{d.title}</span>
                            <span className="text-[10px] text-[#a89c93]">{d.category} • {new Date(d.date).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => deletePortalDocument(portal.id, d.id)}
                          className="p-1.5 text-[#a89c93] hover:text-red-400 transition-colors"
                          title="Remover documento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: MENSAGENS COM O CLIENTE */}
              {activeTab === 'mensagens' && (
                <div className="space-y-4">
                  <div className="bg-[#12100e] border border-[#3d342f] rounded-2xl p-4 h-64 overflow-y-auto space-y-2">
                    {portal.messages?.map((msg) => {
                      const isOffice = msg.sender === 'office';
                      return (
                        <div key={msg.id} className={`flex flex-col ${isOffice ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-md p-3 rounded-xl text-xs ${
                            isOffice 
                              ? 'bg-[var(--theme-primary)] text-black font-medium' 
                              : 'bg-[#1a1614] border border-[#3d342f] text-[#fcf8f5]'
                          }`}>
                            <span className="text-[10px] font-bold block opacity-70 mb-0.5">
                              {msg.senderName}
                            </span>
                            <p>{msg.text}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <form onSubmit={handleSendOfficeMessage} className="flex gap-2">
                    <input
                      type="text"
                      value={officeMsg}
                      onChange={(e) => setOfficeMsg(e.target.value)}
                      placeholder="Enviar resposta ou aviso para o cliente..."
                      className="flex-1 bg-[#12100e] border border-[#3d342f] rounded-xl px-4 py-2.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                    />
                    <button
                      type="submit"
                      disabled={isSendingMsg || !officeMsg.trim()}
                      className="px-4 py-2.5 rounded-xl bg-[var(--theme-primary)] text-black font-bold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" /> Enviar
                    </button>
                  </form>
                </div>
              )}
            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#3d342f] bg-[#161210] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#26201c] hover:bg-[#322a25] text-xs font-bold text-[#fcf8f5] transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
