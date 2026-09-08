import React, { useState } from 'react';
import { ArrowRightLeft, Banknote, Building2, X } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency } from '../../utils/formatters';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose }) => {
  const { bankAccounts, transferBetweenAccounts } = useFinance();

  const [fromId, setFromId] = useState(bankAccounts[0]?.id || '');
  const [toId, setToId] = useState(bankAccounts[1]?.id || 'cash-wallet');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('Transferência entre contas');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(',', '.')) || 0;
    if (numAmount <= 0 || fromId === toId) return;

    transferBetweenAccounts(fromId, toId, numAmount, description, date);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl bg-[#18181b] border border-[#27272a] shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <ArrowRightLeft className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-[#fafafa]">Transferir entre Contas</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-[#a1a1aa] font-medium mb-1">Valor a Transferir (R$) *</label>
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
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] font-bold text-base focus:outline-none focus:border-blue-500"
                required
                autoFocus
              />
            </div>
          </div>

          <div>
            <label className="block text-[#a1a1aa] font-medium mb-1">Conta de Origem (Sair de) *</label>
            <select
              value={fromId}
              onChange={(e) => setFromId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-blue-500 cursor-pointer"
              required
            >
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({formatCurrency(b.balance)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#a1a1aa] font-medium mb-1">Conta de Destino (Entrar em) *</label>
            <select
              value={toId}
              onChange={(e) => setToId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-blue-500 cursor-pointer"
              required
            >
              {bankAccounts
                .filter((b) => b.id !== fromId)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({formatCurrency(b.balance)})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-[#a1a1aa] font-medium mb-1">Descrição</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-[#a1a1aa] font-medium mb-1">Data</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-blue-500"
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
              className="px-4 py-2 rounded-full bg-blue-500 hover:bg-blue-400 text-white font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              Efetivar Transferência
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
