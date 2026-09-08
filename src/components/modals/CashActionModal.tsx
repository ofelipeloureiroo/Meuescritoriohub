import React, { useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Banknote, Building2, ShoppingBag, X } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ExpenseCategory } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface CashActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashActionModal: React.FC<CashActionModalProps> = ({ isOpen, onClose }) => {
  const {
    totalPhysicalCash,
    bankAccounts,
    transferBetweenAccounts,
    addTransaction,
  } = useFinance();

  const [mode, setMode] = useState<'withdraw_to_cash' | 'spend_cash' | 'deposit_to_bank'>('withdraw_to_cash');
  const [amount, setAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState(
    bankAccounts.find((b) => b.id !== 'cash-wallet')?.id || ''
  );
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('casa');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amount.replace(',', '.')) || 0;
    if (val <= 0) return;

    if (mode === 'withdraw_to_cash') {
      // From Bank -> Cash Wallet
      transferBetweenAccounts(
        selectedBankId,
        'cash-wallet',
        val,
        description || 'Saque do banco para guardar no cofre/dinheiro físico',
        date
      );
    } else if (mode === 'deposit_to_bank') {
      // From Cash Wallet -> Bank
      transferBetweenAccounts(
        'cash-wallet',
        selectedBankId,
        val,
        description || 'Depósito de dinheiro físico no banco',
        date
      );
    } else {
      // Spend physical cash directly
      addTransaction({
        description: description || 'Gasto em dinheiro físico',
        amount: val,
        type: 'expense',
        category: expenseCategory,
        bankAccountId: 'cash-wallet',
        paymentMethod: 'dinheiro_vivo',
        date,
        status: 'completed',
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-[#18181b] border border-[#27272a] shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              <Banknote className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-[#fafafa]">Movimentar Dinheiro Físico</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Cash Balance */}
        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-between text-xs">
          <span className="text-yellow-300 font-medium">Saldo Atual no Cofre:</span>
          <span className="text-sm font-bold text-yellow-400">
            {formatCurrency(totalPhysicalCash)}
          </span>
        </div>

        {/* Action Type Mode */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#09090b] rounded-xl border border-[#27272a] text-xs">
          <button
            type="button"
            onClick={() => {
              setMode('withdraw_to_cash');
              setDescription('Saque bancário para guardar em espécie');
            }}
            className={`p-2 rounded-lg font-bold flex flex-col items-center text-center gap-1 transition-all cursor-pointer ${
              mode === 'withdraw_to_cash'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5 text-yellow-400" />
            <span>Guardar (Saque)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('spend_cash');
              setDescription('Gasto pago em dinheiro vivo');
            }}
            className={`p-2 rounded-lg font-bold flex flex-col items-center text-center gap-1 transition-all cursor-pointer ${
              mode === 'spend_cash'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5 text-rose-400" />
            <span>Gastar Espécie</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('deposit_to_bank');
              setDescription('Depósito do cofre para o banco');
            }}
            className={`p-2 rounded-lg font-bold flex flex-col items-center text-center gap-1 transition-all cursor-pointer ${
              mode === 'deposit_to_bank'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                : 'text-[#a1a1aa] hover:text-[#fafafa]'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-blue-400" />
            <span>Depositar</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[#a1a1aa] font-medium mb-1">Valor em Dinheiro (R$) *</label>
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
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] font-bold text-base focus:outline-none focus:border-yellow-500"
                required
                autoFocus
              />
            </div>
          </div>

          {(mode === 'withdraw_to_cash' || mode === 'deposit_to_bank') && (
            <div>
              <label className="block text-[#a1a1aa] font-medium mb-1">
                {mode === 'withdraw_to_cash' ? 'Sacar de qual Banco?' : 'Depositar em qual Banco?'}
              </label>
              <select
                value={selectedBankId}
                onChange={(e) => setSelectedBankId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-yellow-500 cursor-pointer"
                required
              >
                {bankAccounts
                  .filter((b) => b.id !== 'cash-wallet')
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({formatCurrency(b.balance)})
                    </option>
                  ))}
              </select>
            </div>
          )}

          {mode === 'spend_cash' && (
            <div>
              <label className="block text-[#a1a1aa] font-medium mb-1">Categoria do Gasto</label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-yellow-500 cursor-pointer"
              >
                <option value="casa">🏠 Casa & Moradia</option>
                <option value="carro">🚗 Carro & Transporte</option>
                <option value="lazer">🌴 Lazer & Viagem</option>
                <option value="alimentacao">🛒 Feira / Alimentação</option>
                <option value="outros">Outros</option>
              </select>
            </div>
          )}

          <div>
            <label className="block text-[#a1a1aa] font-medium mb-1">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Compra feira em dinheiro com desconto, saque..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div>
            <label className="block text-[#a1a1aa] font-medium mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-yellow-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-yellow-500 hover:bg-yellow-400 text-black font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              Confirmar Operação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
