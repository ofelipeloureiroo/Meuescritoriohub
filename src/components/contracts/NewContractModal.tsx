import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  Layers,
  Link2,
  Plus,
  Search,
  User,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency } from '../../utils/formatters';

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
  const { clients, addWorkContract, addArchitectureProject, addClient } = useFinance();

  const [clientMode, setClientMode] = useState<'new' | 'select'>('new');
  const [newClientName, setNewClientName] = useState('');
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
      setClientMode('new');
      setNewClientName('');
      const activeClient = clients.find((c) => c.id === defaultClientId);
      if (activeClient) {
        setSelectedClientId(activeClient.id);
        setClientMode('select');
      } else {
        setSelectedClientId(clients[0]?.id || '');
      }
      setLinkedLeadId('');
      setProjectName('');
      setIdentityColor('#3b82f6');
      setProjectType('');
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
    if (cli && !projectName) {
      setProjectName(cli.name);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    let finalClient = selectedClient;

    if (clientMode === 'new') {
      const clientName = newClientName.trim() || projectName.trim() || 'Cliente sem nome';
      const newCli = {
        id: `cli-${Date.now()}`,
        name: clientName,
        type: 'Pessoa Física',
        clientProfile: 'Médio',
        status: 'Ativo' as const,
        createdAt: new Date().toISOString(),
      };
      addClient(newCli);
      finalClient = newCli as any;
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

    // Also register in Architecture Projects
    addArchitectureProject({
      title: projectName || 'Novo Projeto',
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
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl border border-zinc-200 overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <h3 className="font-extrabold text-lg text-zinc-900 tracking-tight">
            Novo Projeto
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Card 1: Cliente */}
          <div className="bg-[#faf6f0] border border-[#f0eae1] rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#3d342f]">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4 text-zinc-500" />
                <span>Cliente</span>
              </div>
              <span className="text-[11px] font-normal text-zinc-400">
                Todo projeto precisa de um cliente
              </span>
            </div>

            {clientMode === 'new' ? (
              <div className="space-y-1">
                <div className="bg-white border border-zinc-200 rounded-xl p-2.5 flex items-center gap-2 shadow-2xs">
                  <User className="w-4 h-4 text-zinc-400 shrink-0 ml-1" />
                  <input
                    type="text"
                    placeholder="Nome do novo cliente"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    className="w-full text-xs font-medium text-zinc-800 bg-transparent focus:outline-none placeholder:text-zinc-400"
                  />
                  {newClientName && (
                    <button
                      type="button"
                      onClick={() => setNewClientName('')}
                      className="p-1 rounded-full hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {clients.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setClientMode('select')}
                      className="text-[11px] text-[#c8a97e] font-bold hover:underline shrink-0 px-2"
                    >
                      Selecionar existente
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-zinc-400 font-normal pl-1">
                  Um novo registro de cliente será criado ao salvar.
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="bg-white border border-zinc-200 rounded-xl p-2.5 flex items-center gap-3 shadow-2xs">
                  <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center font-bold text-zinc-700 text-xs shrink-0">
                    {selectedClient?.name ? selectedClient.name.charAt(0).toUpperCase() : 'C'}
                  </div>

                  <select
                    value={selectedClientId}
                    onChange={(e) => handleClientChange(e.target.value)}
                    className="w-full font-bold text-xs text-zinc-900 bg-transparent border-none focus:outline-none cursor-pointer"
                  >
                    {clients.map((cli) => (
                      <option key={cli.id} value={cli.id}>
                        {cli.name} {cli.company ? `(${cli.company})` : ''}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setClientMode('new')}
                    className="text-[11px] text-[#c8a97e] font-bold hover:underline shrink-0 px-2"
                  >
                    Novo cliente
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Vincular Lead */}
          <div className="border border-zinc-200/90 rounded-2xl p-4 space-y-2 bg-white">
            <div className="flex items-center justify-between text-xs font-bold text-zinc-800">
              <div className="flex items-center gap-1.5">
                <Link2 className="w-4 h-4 text-zinc-500" />
                <span>Vincular Lead</span>
              </div>
              <span className="text-[11px] font-normal text-zinc-400">
                Opcional — preenche dados automaticamente
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
                    setProjectName(lead.name);
                    if (lead.originChannel) setAcquisitionChannel(lead.originChannel);
                  }
                }}
                className="w-full pl-10 pr-8 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-700 focus:outline-none focus:border-[#c8a97e] appearance-none bg-white cursor-pointer"
              >
                <option value="">Buscar lead para vincular...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.city || 'Lead'})
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Field 3: Nome do Projeto * */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-zinc-800">Nome do Projeto *</label>
            <input
              type="text"
              required
              placeholder="Ex: Reforma Apartamento, Casa de Praia, etc."
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
                <option value="">Selecione...</option>
                <option value="Projeto de Arquitetura">Projeto de Arquitetura</option>
                <option value="Projeto de Interiores">Projeto de Interiores</option>
                <option value="Consultoria">Consultoria</option>
                <option value="Decoração">Decoração</option>
                <option value="Quadros & Arte">Quadros & Arte</option>
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
                <option value="Template Residencial Completo">Template Residencial Completo</option>
                <option value="Template Comercial Express">Template Comercial Express</option>
                <option value="Template Consultoria Rápida">Template Consultoria Rápida</option>
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
              <label className="text-xs font-bold text-zinc-800">Observações</label>
              <textarea
                rows={3}
                placeholder="Detalhes adicionais, escopo ou particularidades do projeto..."
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
              className="px-6 py-2.5 rounded-xl bg-[#c8a97e] hover:bg-[#b8986d] text-white font-bold text-xs shadow-2xs transition-all cursor-pointer"
            >
              Criar Projeto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
