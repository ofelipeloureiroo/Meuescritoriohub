import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Landmark,
  MessageCircle,
  Sparkles,
  X,
} from 'lucide-react';
import { ProjectInstallment } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency } from '../../utils/formatters';

interface ReceiveInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: ProjectInstallment | null;
  onOpenReceiptWhatsApp?: (installment: ProjectInstallment) => void;
}

export const ReceiveInstallmentModal: React.FC<ReceiveInstallmentModalProps> = ({
  isOpen,
  onClose,
  installment,
  onOpenReceiptWhatsApp,
}) => {
  const { bankAccounts, receiveInstallmentPayment } = useFinance();

  const [selectedAccountId, setSelectedAccountId] = useState(() => {
    return bankAccounts.find((b) => b.isDefault)?.id || bankAccounts[0]?.id || '';
  });
  const [paidDate, setPaidDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [paidAmount, setPaidAmount] = useState<number>(() => installment?.amount || 0);
  const [notifyAfter, setNotifyAfter] = useState(true);

  // Sync amount when installment opens
  React.useEffect(() => {
    if (installment) {
      setPaidAmount(installment.amount);
    }
  }, [installment]);

  if (!isOpen || !installment) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAccountId || paidAmount <= 0) return;

    // Call context action which updates installment, architecture project paidAmount, creates transaction, and adds to bank account balance
    receiveInstallmentPayment(installment.id, selectedAccountId, paidDate, paidAmount);

    onClose();

    if (notifyAfter && onOpenReceiptWhatsApp) {
      onOpenReceiptWhatsApp({
        ...installment,
        status: 'paid',
        paidDate,
        paidAmount,
        bankAccountId: selectedAccountId,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-card-hover)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[var(--text-main)]">
                Confirmar Recebimento
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Dar baixa na parcela e atualizar saldo bancário
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-[var(--bg-card-secondary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project & Installment Info Summary Box */}
          <div className="p-3.5 bg-[var(--bg-card-secondary)] rounded-xl border border-[var(--border-color)] space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Projeto:</span>
              <span className="font-semibold text-[var(--text-main)]">{installment.projectTitle}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Cliente:</span>
              <span className="font-semibold text-amber-700 dark:text-[#d49454]">{installment.clientName}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--text-muted)]">Parcela:</span>
              <span className="text-[var(--text-main)]">
                {installment.installmentNumber}/{installment.totalInstallments} ({installment.description})
              </span>
            </div>
            <div className="flex justify-between items-center text-xs pt-1 border-t border-[var(--border-color)]">
              <span className="text-[var(--text-muted)]">Valor Previsto:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                {formatCurrency(installment.amount)}
              </span>
            </div>
          </div>

          {/* Amount Paid */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Valor Efetivamente Recebido (R$) *
            </label>
            <div className="relative">
              <DollarSign className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="number"
                step="0.01"
                required
                value={paidAmount}
                onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Date of Receipt */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Data do Recebimento *
            </label>
            <input
              type="date"
              required
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[#c58a4b]"
            />
          </div>

          {/* Destination Bank Account */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">
              Conta de Destino / Onde o dinheiro entrou *
            </label>
            <div className="relative">
              <Landmark className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                required
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[#c58a4b]"
              >
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.balance)})
                  </option>
                ))}
              </select>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              O saldo desta conta será creditado automaticamente e o lançamento registrado no Extrato.
            </p>
          </div>

          {/* WhatsApp Receipt Option */}
          <div className="pt-2 border-t border-[var(--border-color)]">
            <label className="flex items-center gap-2.5 text-xs text-[var(--text-main)] cursor-pointer">
              <input
                type="checkbox"
                checked={notifyAfter}
                onChange={(e) => setNotifyAfter(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-[var(--bg-input)] border-[var(--border-color)] focus:ring-emerald-500"
              />
              <div className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Abrir mensagem de confirmação/recibo no WhatsApp</span>
              </div>
            </label>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl text-xs font-semibold border border-[var(--border-color)] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirmar Baixa</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
