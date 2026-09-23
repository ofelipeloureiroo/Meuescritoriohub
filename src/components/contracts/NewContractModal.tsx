import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  FileSignature,
  Layers,
  Link2,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  User,
  Users,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency } from '../../utils/formatters';
import { convertTemplateToWorkflowStages, DEFAULT_PROJECT_TEMPLATES } from '../../data/defaultProjectTemplates';
import { ProjectWorkflowStage } from '../../types';

interface NewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultClientId?: string;
  defaultProjectId?: string;
}

const COLOR_OPTIONS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#059669', // Emerald
  '#8b5cf6', // Purple
  '#6366f1', // Violet
];

export const NewContractModal: React.FC<NewContractModalProps> = ({
  isOpen,
  onClose,
  defaultClientId,
}) => {
  const { clients, addWorkContract, addArchitectureProject, addClient, officeSettings } = useFinance();

  const availableTemplates = officeSettings?.projectTemplates && officeSettings.projectTemplates.length > 0
    ? officeSettings.projectTemplates
    : [];

  const [clientMode, setClientMode] = useState<'new' | 'select'>('select');
  const [newClientName, setNewClientName] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientDocument, setNewClientDocument] = useState('');
  const [newClientCity, setNewClientCity] = useState('');
  const [newClientState, setNewClientState] = useState('');

  const [selectedClientId, setSelectedClientId] = useState(defaultClientId || '');
  const [linkedLeadId, setLinkedLeadId] = useState('');
  const [projectName, setProjectName] = useState('');
  const [identityColor, setIdentityColor] = useState('#3b82f6');
  const [projectType, setProjectType] = useState('');
  const [status, setStatus] = useState('Proposta');
  const [stageTemplate, setStageTemplate] = useState('Sem template — iniciar projeto em branco');
  const [acquisitionChannel, setAcquisitionChannel] = useState('');
  
  // Vendas (Visão Econômica)
  const [contractValue, setContractValue] = useState<string>('');
  const [estimatedCost, setEstimatedCost] = useState<string>('');
  const [pricingMethod, setPricingMethod] = useState('Margem %');
  const [closingDate, setClosingDate] = useState('');

  // Datas e Execução
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(todayStr);
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [executionStart, setExecutionStart] = useState('');
  const [executionEnd, setExecutionEnd] = useState('');
  const [tags, setTags] = useState('');
  const [notes, setNotes] = useState('');

  // Sync selected client and default project name
  useEffect(() => {
    if (isOpen) {
      const hasClients = (clients || []).length > 0;
      const activeClient = clients.find((c) => c.id === defaultClientId);

      if (activeClient) {
        setSelectedClientId(activeClient.id);
        setClientMode('select');
        setProjectName(`Projeto - ${activeClient.name}`);
      } else if (hasClients) {
        setSelectedClientId(clients[0].id);
        setClientMode('select');
        setProjectName(`Projeto - ${clients[0].name}`);
      } else {
        setSelectedClientId('');
        setClientMode('new');
        setProjectName('');
      }

      setNewClientName('');
      setNewClientEmail('');
      setNewClientPhone('');
      setNewClientDocument('');
      setNewClientCity('');
      setNewClientState('');
      setLinkedLeadId('');
      setIdentityColor('#3b82f6');
      setProjectType('Projeto de Arquitetura');
      setStatus('Proposta');
      setStageTemplate('Sem template — iniciar projeto em branco');
      setAcquisitionChannel('');
      setContractValue('');
      setEstimatedCost('');
      setPricingMethod('Margem %');
      setClosingDate('');
      setStartDate(todayStr);
      setExpectedEndDate('');
      setExecutionStart('');
      setExecutionEnd('');
      setTags('');
      setNotes('');
    }
  }, [isOpen, defaultClientId, clients]);

  if (!isOpen) return null;

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0];

  // Calculated values
  const valNum = parseFloat(contractValue) || 0;
  const costNum = parseFloat(estimatedCost) || 0;
  const estimatedMargin = valNum - costNum;
  const marginPercentage = valNum > 0 ? ((estimatedMargin / valNum) * 100).toFixed(1) : '0.0';

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId);
    const cli = clients.find((c) => c.id === clientId);
    if (cli) {
      setProjectName(`Projeto - ${cli.name}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleSubmit: Starting project & contract creation...');

    try {
      let finalClient = selectedClient;

      if (clientMode === 'new') {
        const clientName = newClientName.trim() || projectName.trim() || 'Cliente sem nome';
        const newCli = {
          id: `cli-${Date.now()}`,
          name: clientName,
          email: newClientEmail.trim() || undefined,
          phone: newClientPhone.trim() || undefined,
          whatsapp: newClientPhone.trim() || undefined,
          document: newClientDocument.trim() || undefined,
          city: newClientCity.trim() || undefined,
          state: newClientState.trim() || undefined,
          type: 'Pessoa Física' as const,
          clientProfile: 'Médio' as const,
          status: 'Ativo' as const,
          createdAt: new Date().toISOString(),
        };
        addClient(newCli);
        finalClient = newCli as any;
        console.log('handleSubmit: New client created', finalClient.id);
      }

      if (!finalClient) {
        finalClient = {
          id: `cli-${Date.now()}`,
          name: projectName || 'Cliente sem nome',
          email: '',
          phone: '',
          document: '',
          city: '',
          state: '',
        } as any;
      }

      // Save as Work Contract
      addWorkContract({
        clientId: finalClient.id,
        clientName: finalClient.name,
        clientEmail: finalClient.email || '',
        clientPhone: finalClient.phone || (finalClient as any).whatsapp || '',
        clientDocument: (finalClient as any).document || '',
        clientCity: finalClient.city || '',
        clientState: finalClient.state || '',
        projectTitle: projectName || 'Novo Projeto',
        title: projectType ? `${projectType} - ${projectName}` : (projectName || 'Novo Projeto'),
        serviceScope: notes || 'Prestação de serviços e desenvolvimento de projeto técnico.',
        totalAmount: valNum,
        downPaymentAmount: valNum * 0.5,
        paymentTerms: pricingMethod,
        deadline: expectedEndDate || closingDate || startDate,
        status: status === 'Concluído' ? 'paid' : status === 'Aguardando Pagamento' ? 'awaiting_payment' : 'draft',
      });
      console.log('handleSubmit: Work contract added.');

      // Build workflow stages from selected template
      let initialStages: ProjectWorkflowStage[] = [];
      if (stageTemplate && stageTemplate !== 'Sem template — iniciar projeto em branco') {
        const foundTemplate = availableTemplates.find(
          (t) => t.name === stageTemplate || t.id === stageTemplate
        );
        if (foundTemplate) {
          initialStages = convertTemplateToWorkflowStages(foundTemplate, startDate || todayStr);
        }
      }
      if (initialStages.length === 0 && stageTemplate !== 'Sem template — iniciar projeto em branco') {
        const fallbackTpl = availableTemplates[0] || DEFAULT_PROJECT_TEMPLATES[0];
        if (fallbackTpl) {
          initialStages = convertTemplateToWorkflowStages(fallbackTpl, startDate || todayStr);
        }
      }

      // Also register in Architecture Projects
      addArchitectureProject({
        title: projectName || 'Novo Projeto',
        clientId: finalClient.id,
        clientName: finalClient.name,
        category: 'residencial',
        location: finalClient.city ? `${finalClient.city}, ${finalClient.state || 'RJ'}` : 'Rio de Janeiro, RJ',
        state: finalClient.state || 'RJ',
        areaM2: 0,
        honorarios: valNum,
        status: 'estudo_preliminar',
        coverImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
        description: notes || '',
        deliveryDate: expectedEndDate || startDate,
        tags: tags ? tags.split(',').map((t) => t.trim()) : ['Design', 'Projeto'],
        stages: initialStages.length > 0 ? initialStages : undefined,
      });
      console.log('handleSubmit: Architecture project added.');

    } catch (error) {
      console.error('handleSubmit: Error creating project:', error);
    } finally {
      console.log('handleSubmit: Finished.');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-zinc-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 bg-gradient-to-r from-[#faf6f0] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#c8a97e]/15 text-[#a38253] flex items-center justify-center border border-[#c8a97e]/30 shrink-0">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-zinc-900 tracking-tight">
                Gerar Novo Contrato
              </h3>
              <p className="text-xs text-zinc-500">
                Selecione o cliente e configure os dados financeiros e etapas do contrato.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Card 1: Seleção de Cliente */}
          <div className="bg-[#faf6f0]/60 border border-[#f0eae1] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#3d342f]">
                <User className="w-4 h-4 text-[#a38253]" />
                <span>Cliente do Contrato</span>
              </div>
              <span className="text-[11px] font-medium text-zinc-400">
                {clients.length} cliente{clients.length === 1 ? '' : 's'} cadastrado{clients.length === 1 ? '' : 's'}
              </span>
            </div>

            {/* Client Mode Switcher Tabs */}
            <div className="flex p-1 bg-zinc-200/60 rounded-xl gap-1">
              <button
                type="button"
                onClick={() => setClientMode('select')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  clientMode === 'select'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Users className="w-3.5 h-3.5 text-[#a38253]" />
                <span>Cliente Existente {clients.length > 0 ? `(${clients.length})` : ''}</span>
              </button>
              <button
                type="button"
                onClick={() => setClientMode('new')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  clientMode === 'new'
                    ? 'bg-white text-zinc-900 shadow-xs'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Cadastrar Novo Cliente</span>
              </button>
            </div>

            {clientMode === 'select' ? (
              <div className="space-y-3">
                {clients.length === 0 ? (
                  <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-4 text-center space-y-2">
                    <p className="text-xs text-zinc-500">
                      Você ainda não possui clientes cadastrados no escritório.
                    </p>
                    <button
                      type="button"
                      onClick={() => setClientMode('new')}
                      className="px-3.5 py-1.5 rounded-lg bg-[#c8a97e] text-white text-xs font-bold shadow-xs hover:bg-[#b8986d] transition-colors"
                    >
                      Cadastrar Primeiro Cliente
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="bg-white border border-zinc-200 rounded-xl p-2.5 flex items-center gap-3 shadow-2xs">
                      <div className="w-8 h-8 rounded-full bg-[#faf6f0] border border-[#f0eae1] flex items-center justify-center font-extrabold text-[#a38253] text-xs shrink-0">
                        {selectedClient?.name ? selectedClient.name.charAt(0).toUpperCase() : 'C'}
                      </div>

                      <select
                        value={selectedClientId}
                        onChange={(e) => handleClientChange(e.target.value)}
                        className="w-full font-bold text-xs text-zinc-900 bg-transparent border-none focus:outline-none cursor-pointer py-1"
                      >
                        {clients.map((cli) => (
                          <option key={cli.id} value={cli.id}>
                            {cli.name} {cli.company ? `(${cli.company})` : ''} {cli.city ? `• ${cli.city}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedClient && (
                      <div className="bg-white/80 border border-zinc-200/70 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-zinc-600">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span className="font-semibold text-zinc-800 truncate">{selectedClient.name}</span>
                        </div>
                        {(selectedClient.phone || (selectedClient as any).whatsapp) && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{selectedClient.phone || (selectedClient as any).whatsapp}</span>
                          </div>
                        )}
                        {selectedClient.email && (
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="truncate">{selectedClient.email}</span>
                          </div>
                        )}
                        {selectedClient.city && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span>{selectedClient.city}{selectedClient.state ? `, ${selectedClient.state}` : ''}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3 bg-white p-4 rounded-xl border border-zinc-200">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-800">Nome do Novo Cliente *</label>
                  <div className="border border-zinc-200 rounded-xl p-2.5 flex items-center gap-2">
                    <User className="w-4 h-4 text-zinc-400 shrink-0" />
                    <input
                      type="text"
                      required={clientMode === 'new'}
                      placeholder="Ex: Lucas Holanda, Mariana Costa..."
                      value={newClientName}
                      onChange={(e) => {
                        setNewClientName(e.target.value);
                        if (!projectName || projectName.startsWith('Projeto - ')) {
                          setProjectName(`Projeto - ${e.target.value}`);
                        }
                      }}
                      className="w-full text-xs font-medium text-zinc-800 bg-transparent focus:outline-none placeholder:text-zinc-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">WhatsApp / Telefone</label>
                    <div className="border border-zinc-200 rounded-xl p-2.5 flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <input
                        type="text"
                        placeholder="(11) 99999-9999"
                        value={newClientPhone}
                        onChange={(e) => setNewClientPhone(e.target.value)}
                        className="w-full text-xs text-zinc-800 bg-transparent focus:outline-none placeholder:text-zinc-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">Email</label>
                    <div className="border border-zinc-200 rounded-xl p-2.5 flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <input
                        type="email"
                        placeholder="cliente@email.com"
                        value={newClientEmail}
                        onChange={(e) => setNewClientEmail(e.target.value)}
                        className="w-full text-xs text-zinc-800 bg-transparent focus:outline-none placeholder:text-zinc-400"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">CPF / CNPJ</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={newClientDocument}
                      onChange={(e) => setNewClientDocument(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-zinc-700">Cidade / UF</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Cidade"
                        value={newClientCity}
                        onChange={(e) => setNewClientCity(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none"
                      />
                      <input
                        type="text"
                        placeholder="UF"
                        maxLength={2}
                        value={newClientState}
                        onChange={(e) => setNewClientState(e.target.value.toUpperCase())}
                        className="w-14 px-2 py-2 text-center rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Vincular Lead (Opcional) */}
          {clients.length > 0 && (
            <div className="border border-zinc-200/90 rounded-2xl p-4 space-y-2 bg-white">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-800">
                <div className="flex items-center gap-1.5">
                  <Link2 className="w-4 h-4 text-zinc-500" />
                  <span>Vincular Lead do Funil (Opcional)</span>
                </div>
                <span className="text-[11px] font-normal text-zinc-400">
                  Preenche dados automaticamente
                </span>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={linkedLeadId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLinkedLeadId(val);
                    const lead = clients.find((c) => c.id === val);
                    if (lead) {
                      setSelectedClientId(lead.id);
                      setClientMode('select');
                      setProjectName(`Projeto - ${lead.name}`);
                      if (lead.originChannel) setAcquisitionChannel(lead.originChannel);
                    }
                  }}
                  className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-700 focus:outline-none focus:border-[#c8a97e] appearance-none bg-white cursor-pointer"
                >
                  <option value="">Buscar cliente/lead para vincular...</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.city || 'Cliente'})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Field 3: Nome do Projeto * */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-800">Título do Contrato / Nome do Projeto *</label>
            <input
              type="text"
              required
              placeholder="Ex: Reforma Apartamento 102, Casa de Praia, etc."
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs font-medium text-zinc-900 focus:outline-none focus:border-[#c8a97e]"
            />
          </div>

          {/* Field 4: Cor de Identidade */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-800">Cor de Identidade</label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {COLOR_OPTIONS.map((color) => {
                const isSelected = identityColor === color;
                return (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setIdentityColor(color)}
                    className="w-7 h-7 rounded-full transition-transform cursor-pointer flex items-center justify-center"
                    style={{
                      backgroundColor: color,
                      boxShadow: isSelected ? `0 0 0 2px #ffffff, 0 0 0 4px ${color}` : 'none',
                    }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Field 5: Tipo de Projeto * & Status * */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-800">Tipo de Projeto *</label>
              <select
                required
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e] bg-white cursor-pointer"
              >
                <option value="Projeto de Arquitetura">Projeto de Arquitetura</option>
                <option value="Projeto de Interiores">Projeto de Interiores</option>
                <option value="Consultoria">Consultoria</option>
                <option value="Decoração">Decoração</option>
                <option value="Quadros & Arte">Quadros & Arte</option>
                <option value="Execução de Obra">Execução de Obra</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-800">Status *</label>
              <select
                required
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e] bg-white cursor-pointer"
              >
                <option value="Proposta">Proposta</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Em Execução">Em Execução</option>
                <option value="Aguardando Pagamento">Aguardando Pagamento</option>
                <option value="Concluído">Concluído</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Field 6: Template de Etapas */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-800">Template de Etapas</label>
            <div className="relative">
              <Layers className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={stageTemplate}
                onChange={(e) => setStageTemplate(e.target.value)}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e] bg-white cursor-pointer"
              >
                <option value="Sem template — iniciar projeto em branco">
                  Sem template — iniciar projeto em branco
                </option>
                {availableTemplates.some(t => !t.isSystem) && (
                  <optgroup label="Templates da Empresa (Personalizados)">
                    {availableTemplates
                      .filter(t => !t.isSystem)
                      .map(t => (
                        <option key={t.id} value={t.name}>
                          ★ {t.name} ({t.stages?.length || 0} etapas)
                        </option>
                      ))}
                  </optgroup>
                )}
                {availableTemplates.some(t => t.isSystem) && (
                  <optgroup label="Templates Padrão do Sistema">
                    {availableTemplates
                      .filter(t => t.isSystem)
                      .map(t => (
                        <option key={t.id} value={t.name}>
                          {t.name} ({t.stages?.length || 0} etapas)
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </div>
            <p className="text-[11px] text-zinc-400">
              As etapas e checklist do template serão aplicados ao criar o projeto.
            </p>
          </div>

          {/* Field 7: Canal de Aquisição */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-800">Canal de Aquisição</label>
            <select
              value={acquisitionChannel}
              onChange={(e) => setAcquisitionChannel(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e] bg-white cursor-pointer"
            >
              <option value="">Selecione...</option>
              <option value="Instagram">Instagram</option>
              <option value="Indicação">Indicação</option>
              <option value="Site">Site</option>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Evento / Feira">Evento / Feira</option>
              <option value="Cliente Antigo">Cliente Antigo</option>
              <option value="Outro">Outro</option>
            </select>
          </div>

          {/* SECTION: VENDAS (VISÃO ECONÔMICA) */}
          <div className="pt-2 border-t border-zinc-100 space-y-4">
            <h4 className="font-extrabold text-xs text-[#3d342f] uppercase tracking-wider">
              VENDAS (VISÃO ECONÔMICA)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-800">Valor Total do Contrato *</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0,00"
                  value={contractValue}
                  onChange={(e) => setContractValue(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-[#c8a97e]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-800">Custo Estimado Total</label>
                <input
                  type="number"
                  step="any"
                  placeholder="0,00"
                  value={estimatedCost}
                  onChange={(e) => setEstimatedCost(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 focus:outline-none focus:border-[#c8a97e]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-800">Método de Precificação *</label>
                <select
                  value={pricingMethod}
                  onChange={(e) => setPricingMethod(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e] bg-white cursor-pointer"
                >
                  <option value="Margem %">Margem %</option>
                  <option value="Valor Fixo">Valor Fixo</option>
                  <option value="Por m²">Por m²</option>
                  <option value="Por Hora">Por Hora</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-800">Data de Fechamento do Contrato</label>
                <input
                  type="date"
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e]"
                />
                <p className="text-[11px] text-zinc-400">Quando você fechou este contrato?</p>
              </div>
            </div>

            {/* Calculated Margin Box */}
            <div className="bg-[#faf6f0] border border-[#f0eae1] rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
                <span>Margem Estimada (R$)</span>
                <span className="font-extrabold text-base text-[#a38253]">
                  {formatCurrency(estimatedMargin)}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs font-medium text-zinc-600">
                <span>Margem %</span>
                <span className="font-extrabold text-sm text-zinc-900">
                  {marginPercentage}%
                </span>
              </div>

              <div className="pt-2 border-t border-[#f0eae1] text-[10px] text-zinc-400">
                Margem % = (Valor - Custo) / Valor × 100
              </div>
            </div>
          </div>

          {/* SECTION: DATAS E EXECUÇÃO */}
          <div className="pt-2 border-t border-zinc-100 space-y-4">
            <h4 className="font-extrabold text-xs text-[#3d342f] uppercase tracking-wider">
              DATAS E EXECUÇÃO
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-800">Data de Início *</label>
                <input
                  type="date"
                  required
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-800">Data Prevista de Término</label>
                <input
                  type="date"
                  value={expectedEndDate}
                  onChange={(e) => setExpectedEndDate(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e]"
                />
              </div>
            </div>

            {/* Período de Execução (Competência) */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-zinc-800">
                  Período de Execução (Competência)
                </label>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-100 text-zinc-500 border border-zinc-200">
                  Opcional
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Quando preenchido, a receita do contrato será rateada proporcionalmente por esses meses no relatório econômico — em vez de aparecer integralmente no mês de vencimento.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600">Início da Execução</label>
                  <input
                    type="date"
                    value={executionStart}
                    onChange={(e) => setExecutionStart(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-600">Fim da Execução</label>
                  <input
                    type="date"
                    value={executionEnd}
                    onChange={(e) => setExecutionEnd(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e]"
                  />
                </div>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-800">Tags</label>
              <input
                type="text"
                placeholder="Ex: residencial, urgente, marcenaria..."
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e]"
              />
            </div>

            {/* Observações */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-zinc-800">Observações / Escopo</label>
              <textarea
                rows={3}
                placeholder="Detalhes adicionais, escopo ou particularidades do contrato..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-800 focus:outline-none focus:border-[#c8a97e] resize-none"
              />
            </div>
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-zinc-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 font-bold text-xs hover:bg-zinc-50 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#c8a97e] hover:bg-[#b8986d] text-white font-bold text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-2"
            >
              <FileSignature className="w-4 h-4" />
              <span>Gerar Contrato & Projeto</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

