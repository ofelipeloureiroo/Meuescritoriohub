import React, { useEffect, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  Car,
  CreditCard,
  Home,
  PartyPopper,
  Plus,
  ShoppingBag,
  User,
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ExpenseCategory, IncomeSource, PaymentMethod, TransactionType } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialType?: 'income' | 'expense';
  initialCategoryOrSource?: string;
}

export const NewTransactionModal: React.FC<NewTransactionModalProps> = ({
  isOpen,
  onClose,
  initialType = 'expense',
  initialCategoryOrSource,
}) => {
  const { bankAccounts, clients, addTransaction } = useFinance();

  const [type, setType] = useState<TransactionType>(initialType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id || '');
  const [toBankAccountId, setToBankAccountId] = useState(bankAccounts[1]?.id || '');

  // Category & Source
  const [category, setCategory] = useState<ExpenseCategory>('casa');
  const [incomeSource, setIncomeSource] = useState<IncomeSource>('clt');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (initialType) {
      setType(initialType);
    }
    if (initialCategoryOrSource) {
      if (initialType === 'income') {
        setIncomeSource(initialCategoryOrSource as IncomeSource);
      } else {
        setCategory(initialCategoryOrSource as ExpenseCategory);
      }
    }
  }, [initialType, initialCategoryOrSource, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.')) || 0;
    if (!description.trim() || numAmount <= 0) return;

    const client = clients.find((c) => c.id === selectedClientId);

    addTransaction({
      description,
      amount: numAmount,
      type,
      date,
      bankAccountId,
      toBankAccountId: type === 'transfer' ? toBankAccountId : undefined,
      category: type === 'expense' ? category : undefined,
      incomeSource: type === 'income' ? incomeSource : undefined,
      paymentMethod,
      clientId: type === 'income' && incomeSource === 'freelancer' ? selectedClientId : undefined,
      clientName: type === 'income' && incomeSource === 'freelancer' && client ? client.name : undefined,
      notes,
      status: 'completed',
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-[#18181b] border border-[#27272a] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <h3 className="text-base font-bold text-[#fafafa] flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-400" />
            Novo Lançamento Financeiro
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Transaction Type Segmented Switcher */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#09090b] rounded-xl border border-[#27272a] text-xs">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              type === 'expense'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            <span>Despesa (Saída)</span>
          </button>

          <button
            type="button"
            onClick={() => setType('income')}
            className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              type === 'income'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>Receita (Entrada)</span>
          </button>

          <button
            type="button"
            onClick={() => setType('transfer')}
            className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              type === 'transfer'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-blue-400" />
            <span>Transferência</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          {/* Amount and Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#a1a1aa] font-medium mb-1">Valor (R$) *</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a] font-bold">
                  R$
                </span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] font-bold text-base focus:outline-none focus:border-emerald-500"
                  required
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="block text-[#a1a1aa] font-medium mb-1">Data *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[#a1a1aa] font-medium mb-1">Descrição do Lançamento *</label>
            <input
              type="text"
              placeholder={
                type === 'income'
                  ? 'Ex: Salário CLT Empresa, Freela Website E-commerce...'
                  : type === 'transfer'
                  ? 'Ex: Saque para Dinheiro Físico, Pix Nubank para Itaú...'
                  : 'Ex: Parcela do Financiamento da Casa, Gasolina do Carro, Jantar...'
              }
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500"
              required
            />
          </div>

          {/* Dynamic Sections Based on Type */}
          {type === 'income' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[#09090b] border border-[#27272a]">
              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1.5">Origem da Renda *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setIncomeSource('clt')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      incomeSource === 'clt'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-bold'
                        : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa]'
                    }`}
                  >
                    <Building2 className="w-4 h-4 mx-auto mb-1 text-blue-400" />
                    Salário CLT
                  </button>

                  <button
                    type="button"
                    onClick={() => setIncomeSource('freelancer')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      incomeSource === 'freelancer'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-300 font-bold'
                        : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa]'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 mx-auto mb-1 text-purple-400" />
                    Freelancer
                  </button>

                  <button
                    type="button"
                    onClick={() => setIncomeSource('rendimento')}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      incomeSource === 'rendimento'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa]'
                    }`}
                  >
                    <Zap className="w-4 h-4 mx-auto mb-1 text-emerald-400" />
                    Outra Renda
                  </button>
                </div>
              </div>

              {incomeSource === 'freelancer' && (
                <div>
                  <label className="block text-[#a1a1aa] font-medium mb-1">Cliente Vinculado (Opcional)</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#18181b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="">Selecione o Cliente do Freela...</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.city}/{c.state})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {type === 'expense' && (
            <div className="space-y-3 p-3.5 rounded-xl bg-[#09090b] border border-[#27272a]">
              <label className="block text-[#a1a1aa] font-medium mb-1.5">Categoria do Gasto *</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'casa', label: '🏠 Casa & Moradia', color: 'indigo' },
                  { id: 'carro', label: '🚗 Carro & Transp.', color: 'orange' },
                  { id: 'lazer', label: '🌴 Lazer & Viagem', color: 'pink' },
                  { id: 'alimentacao', label: '🛒 Alimentação', color: 'emerald' },
                  { id: 'financiamento', label: '🏦 Financiamento', color: 'purple' },
                  { id: 'freela_tools', label: '💻 Freela / MEI', color: 'cyan' },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id as ExpenseCategory)}
                    className={`p-2 rounded-xl border text-center transition-all text-xs cursor-pointer ${
                      category === cat.id
                        ? 'bg-[#27272a] border-emerald-500 text-emerald-400 font-bold'
                        : 'bg-[#18181b] border-[#27272a] text-[#a1a1aa]'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Account Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[#a1a1aa] font-medium mb-1">
                {type === 'transfer' ? 'Conta de Origem' : type === 'income' ? 'Conta de Depósito' : 'Pagar com'}
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500 cursor-pointer"
                required
              >
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({formatCurrency(b.balance)})
                  </option>
                ))}
              </select>
            </div>

            {type === 'transfer' ? (
              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Conta de Destino</label>
                <select
                  value={toBankAccountId}
                  onChange={(e) => setToBankAccountId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500 cursor-pointer"
                  required
                >
                  {bankAccounts
                    .filter((b) => b.id !== bankAccountId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({formatCurrency(b.balance)})
                      </option>
                    ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Forma de Pagamento</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="pix">PIX</option>
                  <option value="debito">Cartão de Débito</option>
                  <option value="credito">Cartão de Crédito</option>
                  <option value="boleto">Boleto Bancário</option>
                  <option value="dinheiro_vivo">Dinheiro Vivo / Espécie</option>
                  <option value="ted">TED / Transferência</option>
                </select>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[#a1a1aa] font-medium mb-1">Observações (Opcional)</label>
            <input
              type="text"
              placeholder="Ex: Parcela 1/3, comprovante salvo..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] transition-colors font-medium cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="submit"
              className={`px-5 py-2 rounded-full font-bold transition-all cursor-pointer ${
                type === 'income'
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-black'
                  : type === 'transfer'
                  ? 'bg-blue-500 hover:bg-blue-400 text-white'
                  : 'bg-rose-500 hover:bg-rose-400 text-white'
              }`}
            >
              Confirmar Lançamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
