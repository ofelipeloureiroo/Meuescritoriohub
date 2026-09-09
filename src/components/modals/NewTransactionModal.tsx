import React, { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Circle,
  FileText,
  Info,
  Package,
  Plus,
  RefreshCw,
  SlidersHorizontal,
  User,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  TransactionOrigin,
  TransactionRecurrenceFrequency,
  TransactionStructure,
  TransactionType,
} from '../../types';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'income' | 'expense';
  initialCategoryOrSource?: string;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  isOpen,
  onClose,
  initialType = 'income',
  initialCategoryOrSource,
}) => {
  const {
    bankAccounts,
    clients,
    architectureProjects,
    addTransaction,
    addProjectInstallment,
  } = useFinance();

  // Core Type: Receita ('income') vs Despesa ('expense')
  const [type, setType] = useState<'income' | 'expense'>(initialType);

  // Structure: 'avulso' | 'contrato' | 'recorrente'
  const [structure, setStructure] = useState<TransactionStructure>('avulso');

  // Fields
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<'completed' | 'pending'>('pending');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });

  // Origin & Linking
  const [origin, setOrigin] = useState<TransactionOrigin>('avulso');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');

  // Bank Account
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || 'cash-wallet');

  // Recurrence Config (Image 5)
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<TransactionRecurrenceFrequency>('mensal');
  const [recurrenceStartDate, setRecurrenceStartDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');

  // Contract Installments Config
  const [installmentsCount, setInstallmentsCount] = useState<number>(3);

  useEffect(() => {
    if (initialType) {
      setType(initialType);
    }
    if (initialCategoryOrSource) {
      setCategory(initialCategoryOrSource);
    }
    if (bankAccounts.length > 0 && !bankAccountId) {
      setBankAccountId(bankAccounts[0].id);
    }
  }, [initialType, initialCategoryOrSource, isOpen, bankAccounts]);

  if (!isOpen) return null;

  // Exact categories from Image 4 for Despesa
  const expenseCategories = [
    'Colaborador / Freelancer',
    'Salário / Pró-labore',
    'Aluguel / Coworking',
    'Software / Assinatura',
    'Marketing / Publicidade',
    'Impostos / Taxas',
    'Material de Escritório',
    'Viagem / Deslocamento',
    'Impressão / Plotagem',
    'Despesa de Obra',
    'Outros',
  ];

  const incomeCategories = [
    'Honorários de Projeto',
    'Consultoria pontual',
    'Comissão / RT',
    'Rendimento / Investimento',
    'Venda de Ativo',
    'Outras Receitas',
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(/\./g, '').replace(',', '.')) || 0;
    if (!description.trim() || numAmount <= 0) return;

    const matchedProject = architectureProjects.find((p) => p.id === selectedProjectId);
    const matchedClient = clients.find((c) => c.id === selectedClientId);

    if (structure === 'contrato' && installmentsCount > 1) {
      // Create multi-installment schedule
      const installmentAmount = Math.round((numAmount / installmentsCount) * 100) / 100;
      const baseDate = new Date(dueDate);

      for (let i = 1; i <= installmentsCount; i++) {
        const instDate = new Date(baseDate);
        instDate.setMonth(baseDate.getMonth() + (i - 1));
        const instDateStr = instDate.toISOString().split('T')[0];

        addTransaction({
          description: `${description.trim()} (Parcela ${i}/${installmentsCount})`,
          amount: installmentAmount,
          type,
          category: category || (type === 'income' ? 'Honorários de Projeto' : 'Outros'),
          bankAccountId,
          date: instDateStr,
          dueDate: instDateStr,
          status: i === 1 && status === 'completed' ? 'completed' : 'pending',
          structure: 'contrato',
          origin,
          installmentsCount,
          installmentNumber: i,
          projectId: origin === 'projeto' ? selectedProjectId : undefined,
          projectName: origin === 'projeto' && matchedProject ? matchedProject.name : undefined,
          clientId: origin === 'cliente' ? selectedClientId : undefined,
          clientName: origin === 'cliente' && matchedClient ? matchedClient.name : undefined,
          notes: `Contrato em ${installmentsCount} parcelas`,
        });

        // Also register project installment if linked to project
        if (origin === 'projeto' && selectedProjectId && type === 'income') {
          addProjectInstallment({
            projectId: selectedProjectId,
            number: i,
            title: `Parcela ${i}/${installmentsCount} - ${description.trim()}`,
            amount: installmentAmount,
            dueDate: instDateStr,
            status: i === 1 && status === 'completed' ? 'paid' : 'pending',
            paidDate: i === 1 && status === 'completed' ? instDateStr : undefined,
          });
        }
      }
    } else if (structure === 'recorrente') {
      // Create primary entry with recurrence metadata
      addTransaction({
        description: description.trim(),
        amount: numAmount,
        type,
        category: category || (type === 'income' ? 'Honorários de Projeto' : 'Software / Assinatura'),
        bankAccountId,
        date: recurrenceStartDate,
        dueDate: recurrenceStartDate,
        status: status,
        structure: 'recorrente',
        origin,
        isRecurring: true,
        recurrenceFrequency,
        recurrenceStartDate,
        recurrenceEndDate: recurrenceEndDate || undefined,
        projectId: origin === 'projeto' ? selectedProjectId : undefined,
        projectName: origin === 'projeto' && matchedProject ? matchedProject.name : undefined,
        clientId: origin === 'cliente' ? selectedClientId : undefined,
        clientName: origin === 'cliente' && matchedClient ? matchedClient.name : undefined,
        notes: `Recorrência ${recurrenceFrequency}`,
      });
    } else {
      // Standard Avulso
      addTransaction({
        description: description.trim(),
        amount: numAmount,
        type,
        category: category || (type === 'income' ? 'Consultoria pontual' : 'Outros'),
        bankAccountId,
        date: dueDate,
        dueDate: dueDate,
        status: status,
        structure: 'avulso',
        origin,
        projectId: origin === 'projeto' ? selectedProjectId : undefined,
        projectName: origin === 'projeto' && matchedProject ? matchedProject.name : undefined,
        clientId: origin === 'cliente' ? selectedClientId : undefined,
        clientName: origin === 'cliente' && matchedClient ? matchedClient.name : undefined,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white text-[#1a1614] shadow-2xl border border-[#e8e2d9] my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-2">
          <h2 className="text-xl font-bold text-[#1a1614] tracking-tight">Novo Lançamento</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#73655c] hover:text-[#1a1614] hover:bg-[#f5f1eb] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[82vh] overflow-y-auto">
          {/* Segmented Switcher: Receita vs Despesa (Images 2 & 3) */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#f8f5f1] rounded-xl border border-[#ece5dc]">
            <button
              type="button"
              onClick={() => setType('income')}
              className={`py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                type === 'income'
                  ? 'bg-[#00966d] text-white shadow-sm'
                  : 'bg-transparent text-[#73655c] hover:text-[#1a1614]'
              }`}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => setType('expense')}
              className={`py-2.5 rounded-lg text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                type === 'expense'
                  ? 'bg-[#eb3b3b] text-white shadow-sm'
                  : 'bg-transparent text-[#73655c] hover:text-[#1a1614]'
              }`}
            >
              Despesa
            </button>
          </div>

          {/* Section: COMO DESEJA REGISTRAR ESTA RECEITA/DESPESA? */}
          <div className="space-y-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#73655c]">
                COMO DESEJA REGISTRAR ESTA {type === 'income' ? 'RECEITA' : 'DESPESA'}?
              </h3>
              <p className="text-xs text-[#9c8e85] mt-0.5">
                Esta escolha define a estrutura do lançamento no sistema.
              </p>
            </div>

            <div className="space-y-2.5 pt-1">
              {/* Option 1: Lançamento Avulso */}
              <div
                onClick={() => setStructure('avulso')}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  structure === 'avulso'
                    ? 'border-[#c58a4b] bg-[#fbf9f6] ring-1 ring-[#c58a4b]/30'
                    : 'border-[#eae4dc] bg-white hover:border-[#d6c9bd]'
                }`}
              >
                <div className="mt-0.5 text-[#c58a4b]">
                  {structure === 'avulso' ? (
                    <div className="w-5 h-5 rounded-full bg-[#c58a4b] text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <Circle className="w-5 h-5 text-[#d0c6bc]" />
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-[#f5efe8] text-[#8c6b48] shrink-0">
                  <Zap className="w-4 h-4 fill-current" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1a1614]">Lançamento Avulso</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#eee9e2] text-[#73655c]">
                      Simples
                    </span>
                  </div>
                  <p className="text-xs text-[#73655c] mt-0.5">
                    Entrada ou saída única, sem gestão contratual.
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[10px] text-[#9c8e85]">1 transação</span>
                    <span className="text-[10px] text-[#d0c6bc]">•</span>
                    <span className="text-[10px] text-[#9c8e85]">Não aparece em Contratos</span>
                    <span className="text-[10px] text-[#d0c6bc]">•</span>
                    <span className="text-[10px] text-[#9c8e85]">Sem renegociação</span>
                  </div>
                </div>
              </div>

              {/* Option 2: Contrato Financeiro */}
              <div
                onClick={() => setStructure('contrato')}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  structure === 'contrato'
                    ? 'border-[#c58a4b] bg-[#fbf9f6] ring-1 ring-[#c58a4b]/30'
                    : 'border-[#eae4dc] bg-white hover:border-[#d6c9bd]'
                }`}
              >
                <div className="mt-0.5 text-[#c58a4b]">
                  {structure === 'contrato' ? (
                    <div className="w-5 h-5 rounded-full bg-[#c58a4b] text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <Circle className="w-5 h-5 text-[#d0c6bc]" />
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-[#f5efe8] text-[#8c6b48] shrink-0">
                  <FileText className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1a1614]">Contrato Financeiro</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#f3ebd8] text-[#9b6f38]">
                      Estruturado
                    </span>
                  </div>
                  <p className="text-xs text-[#73655c] mt-0.5">
                    {type === 'income'
                      ? 'Receita parcelada com gestão, timeline e renegociação.'
                      : 'Despesa parcelada com gestão, timeline e renegociação.'}
                  </p>
                </div>
              </div>

              {/* Option 3: Receita / Despesa Recorrente */}
              <div
                onClick={() => setStructure('recorrente')}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                  structure === 'recorrente'
                    ? 'border-[#c58a4b] bg-[#fbf9f6] ring-1 ring-[#c58a4b]/30'
                    : 'border-[#eae4dc] bg-white hover:border-[#d6c9bd]'
                }`}
              >
                <div className="mt-0.5 text-[#c58a4b]">
                  {structure === 'recorrente' ? (
                    <div className="w-5 h-5 rounded-full bg-[#c58a4b] text-white flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  ) : (
                    <Circle className="w-5 h-5 text-[#d0c6bc]" />
                  )}
                </div>

                <div className="p-2.5 rounded-xl bg-[#f5efe8] text-[#8c6b48] shrink-0">
                  <RefreshCw className="w-4 h-4" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1a1614]">Receita / Despesa Recorrente</span>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#e8f1fa] text-[#2563eb]">
                      Periódico
                    </span>
                  </div>
                  <p className="text-xs text-[#73655c] mt-0.5">
                    Lançamento que se repete automaticamente em determinada frequência.
                  </p>
                  {structure === 'recorrente' && (
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-blue-600">
                      <span className="text-[10px] font-medium">Gera transações periódicas</span>
                      <span className="text-[10px] text-blue-300">•</span>
                      <span className="text-[10px] font-medium">Contrato recorrente</span>
                      <span className="text-[10px] text-blue-300">•</span>
                      <span className="text-[10px] font-medium">Controle por frequência</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Section: DADOS DO LANÇAMENTO */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#73655c]">
              DADOS DO LANÇAMENTO
            </h3>

            {/* DESCRIÇÃO * */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#574d46] mb-1.5">
                DESCRIÇÃO *
              </label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={type === 'income' ? 'Ex: Consultoria pontual — Maio' : 'Ex: Software de gestão'}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6c9bd] bg-white text-sm text-[#1a1614] placeholder-[#a6998e] focus:outline-none focus:border-[#c58a4b] focus:ring-1 focus:ring-[#c58a4b]"
              />
            </div>

            {/* VALOR * & CATEGORIA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#574d46] mb-1.5">
                  VALOR *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0,00"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6c9bd] bg-white text-sm text-[#1a1614] placeholder-[#a6998e] focus:outline-none focus:border-[#c58a4b] focus:ring-1 focus:ring-[#c58a4b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#574d46] mb-1.5">
                  CATEGORIA
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6c9bd] bg-white text-sm text-[#1a1614] focus:outline-none focus:border-[#c58a4b] focus:ring-1 focus:ring-[#c58a4b]"
                >
                  <option value="">Selecione...</option>
                  {type === 'expense'
                    ? expenseCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))
                    : incomeCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                </select>
              </div>
            </div>

            {/* STATUS & DATA DE VENCIMENTO * */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#574d46] mb-1.5">
                  STATUS
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'completed' | 'pending')}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6c9bd] bg-white text-sm text-[#1a1614] focus:outline-none focus:border-[#c58a4b] focus:ring-1 focus:ring-[#c58a4b]"
                >
                  <option value="pending">Previsto</option>
                  <option value="completed">Confirmado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#574d46] mb-1.5">
                  DATA DE VENCIMENTO *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6c9bd] bg-white text-sm text-[#1a1614] focus:outline-none focus:border-[#c58a4b] focus:ring-1 focus:ring-[#c58a4b]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section: ORIGEM E VINCULAÇÃO */}
          <div className="space-y-3 pt-2">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#73655c]">
                ORIGEM E VINCULAÇÃO
              </h3>
              <p className="text-xs text-[#9c8e85] mt-0.5">
                A origem é independente da estrutura. Um projeto pode ter tanto lançamentos avulsos quanto contratos.
              </p>
            </div>

            {/* 5 Toggle Buttons */}
            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setOrigin('projeto')}
                className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  origin === 'projeto'
                    ? 'border-[#c58a4b] bg-white text-[#8c5e28] ring-1 ring-[#c58a4b]/30 font-semibold shadow-xs'
                    : 'border-[#eae4dc] bg-white text-[#73655c] hover:border-[#d6c9bd]'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="text-xs">Projeto</span>
              </button>

              <button
                type="button"
                onClick={() => setOrigin('cliente')}
                className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  origin === 'cliente'
                    ? 'border-[#c58a4b] bg-white text-[#8c5e28] ring-1 ring-[#c58a4b]/30 font-semibold shadow-xs'
                    : 'border-[#eae4dc] bg-white text-[#73655c] hover:border-[#d6c9bd]'
                }`}
              >
                <User className="w-4 h-4 shrink-0" />
                <span className="text-xs">Cliente</span>
              </button>

              <button
                type="button"
                onClick={() => setOrigin('avulso')}
                className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  origin === 'avulso'
                    ? 'border-[#c58a4b] bg-white text-[#8c5e28] ring-1 ring-[#c58a4b]/30 font-semibold shadow-xs'
                    : 'border-[#eae4dc] bg-white text-[#73655c] hover:border-[#d6c9bd]'
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                <span className="text-xs">Avulso</span>
              </button>

              <button
                type="button"
                onClick={() => setOrigin('operacional')}
                className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  origin === 'operacional'
                    ? 'border-[#c58a4b] bg-white text-[#8c5e28] ring-1 ring-[#c58a4b]/30 font-semibold shadow-xs'
                    : 'border-[#eae4dc] bg-white text-[#73655c] hover:border-[#d6c9bd]'
                }`}
              >
                <Wrench className="w-4 h-4 shrink-0" />
                <span className="text-xs">Operacional</span>
              </button>

              <button
                type="button"
                onClick={() => setOrigin('ajuste')}
                className={`py-3 px-2 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                  origin === 'ajuste'
                    ? 'border-[#c58a4b] bg-white text-[#8c5e28] ring-1 ring-[#c58a4b]/30 font-semibold shadow-xs'
                    : 'border-[#eae4dc] bg-white text-[#73655c] hover:border-[#d6c9bd]'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4 shrink-0" />
                <span className="text-xs">Ajuste</span>
              </button>
            </div>

            {/* Conditional Dropdown for Project / Client selection */}
            {origin === 'projeto' && (
              <div className="p-3 rounded-xl bg-[#fbf9f6] border border-[#d6c9bd]">
                <label className="block text-xs font-bold text-[#574d46] mb-1">
                  Selecione o Projeto de Arquitetura:
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#d6c9bd] bg-white text-xs text-[#1a1614]"
                >
                  <option value="">Selecione um projeto...</option>
                  {architectureProjects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} ({proj.clientName || 'Cliente não definido'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {origin === 'cliente' && (
              <div className="p-3 rounded-xl bg-[#fbf9f6] border border-[#d6c9bd]">
                <label className="block text-xs font-bold text-[#574d46] mb-1">
                  Selecione o Cliente:
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#d6c9bd] bg-white text-xs text-[#1a1614]"
                >
                  <option value="">Selecione um cliente...</option>
                  {clients.map((cli) => (
                    <option key={cli.id} value={cli.id}>
                      {cli.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Informational Tips matching screenshots */}
            <div className="p-3 rounded-xl bg-[#f8f5f1] border border-[#ece5dc] text-xs text-[#73655c] flex items-start gap-2">
              <Info className="w-4 h-4 text-[#9c8e85] shrink-0 mt-0.5" />
              <div>
                {type === 'income' && origin === 'avulso' && (
                  <span>Receita sem projeto entra no caixa e DRE, mas não na margem de projetos.</span>
                )}
                {type === 'expense' && (origin === 'avulso' || origin === 'operacional') && (
                  <span>
                    Tipo: <strong className="font-semibold">Indireta (operacional)</strong> — vincule um projeto para classificar como direta.
                  </span>
                )}
                {origin === 'projeto' && (
                  <span>
                    Vinculado ao projeto. Este valor comporá o custo direto e a margem líquida da obra/projeto.
                  </span>
                )}
                {origin === 'cliente' && (
                  <span>Lançamento vinculado ao cliente comercial para histórico financeiro.</span>
                )}
                {origin === 'ajuste' && (
                  <span>Lançamento de conciliação ou ajuste manual de saldo.</span>
                )}
              </div>
            </div>
          </div>

          {/* Section: CONFIGURAÇÃO DE RECORRÊNCIA (Image 5) */}
          {structure === 'recorrente' && (
            <div className="p-4 rounded-xl border border-blue-200 bg-blue-50/20 space-y-3">
              <div className="flex items-center gap-1.5 text-blue-600 font-bold text-xs uppercase tracking-wider">
                <RefreshCw className="w-3.5 h-3.5" />
                <span>CONFIGURAÇÃO DE RECORRÊNCIA</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#574d46] mb-1.5">
                    FREQUÊNCIA
                  </label>
                  <select
                    value={recurrenceFrequency}
                    onChange={(e) => setRecurrenceFrequency(e.target.value as TransactionRecurrenceFrequency)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6c9bd] bg-white text-sm text-[#1a1614] focus:outline-none focus:border-blue-500"
                  >
                    <option value="mensal">Mensal</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="semanal">Semanal</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#574d46] mb-1.5">
                    DATA INICIAL
                  </label>
                  <input
                    type="date"
                    required
                    value={recurrenceStartDate}
                    onChange={(e) => setRecurrenceStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6c9bd] bg-white text-sm text-[#1a1614] focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Section: CONTRATO FINANCEIRO / PARCELAMENTO */}
          {structure === 'contrato' && (
            <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/20 space-y-3">
              <div className="flex items-center gap-1.5 text-amber-700 font-bold text-xs uppercase tracking-wider">
                <FileText className="w-3.5 h-3.5" />
                <span>DETALHES DO PARCELAMENTO / CONTRATO</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#574d46] mb-1.5">
                    NÚMERO DE PARCELAS
                  </label>
                  <select
                    value={installmentsCount}
                    onChange={(e) => setInstallmentsCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6c9bd] bg-white text-sm text-[#1a1614] focus:outline-none focus:border-amber-500"
                  >
                    <option value={2}>2 parcelas</option>
                    <option value={3}>3 parcelas</option>
                    <option value={4}>4 parcelas</option>
                    <option value={5}>5 parcelas</option>
                    <option value={6}>6 parcelas</option>
                    <option value={8}>8 parcelas</option>
                    <option value={10}>10 parcelas</option>
                    <option value={12}>12 parcelas</option>
                    <option value={24}>24 parcelas</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#574d46] mb-1.5">
                    1º VENCIMENTO
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6c9bd] bg-white text-sm text-[#1a1614] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Account Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#574d46] mb-1.5">
              CONTA / BANCO
            </label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#d6c9bd] bg-white text-sm text-[#1a1614] focus:outline-none focus:border-[#c58a4b]"
            >
              {bankAccounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.type === 'physical_cash' ? 'Caixa Físico' : 'Conta Corrente'})
                </option>
              ))}
            </select>
          </div>

          {/* Modal Footer (Images 2, 3, 5) */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#eae4dc]">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-[#d6c9bd] bg-white text-sm font-semibold text-[#574d46] hover:bg-[#f8f5f1] transition-all cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-[#c58a4b] hover:bg-[#b3793d] text-white text-sm font-bold transition-all shadow-sm cursor-pointer active:scale-95"
            >
              {structure === 'recorrente'
                ? 'Criar Recorrência'
                : structure === 'contrato'
                ? 'Criar Contrato & Parcelas'
                : 'Salvar Lançamento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
