import React, { useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Clock,
  DollarSign,
  Flame,
  Home,
  Sparkles,
  TrendingDown,
  X,
  Zap,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatPercent, simulateMortgageAmortization } from '../../utils/formatters';

interface AmortizationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AmortizationModal: React.FC<AmortizationModalProps> = ({ isOpen, onClose }) => {
  const { houseMortgage, bankAccounts, applyMortgageAmortization } = useFinance();

  const [amount, setAmount] = useState<number>(3000);
  const [type, setType] = useState<'prazo' | 'prestacao'>('prazo');
  const [sourceAccountId, setSourceAccountId] = useState(bankAccounts[0]?.id || '');
  const [notes, setNotes] = useState('Abatimento extraordinário com lucro do Freela');

  const remainingInstallments = Math.max(
    0,
    houseMortgage.totalInstallments - houseMortgage.paidInstallments
  );

  const simResult = useMemo(() => {
    return simulateMortgageAmortization(
      houseMortgage.currentDebt,
      remainingInstallments,
      houseMortgage.annualInterestRate,
      amount,
      type
    );
  }, [houseMortgage, remainingInstallments, amount, type]);

  if (!isOpen) return null;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    applyMortgageAmortization(amount, type, sourceAccountId, notes);

    try {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl bg-[#18181b] border border-[#27272a] shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-[#27272a] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Home className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-[#fafafa]">
              Amortizar Financiamento da Casa
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#a1a1aa] hover:text-[#fafafa] hover:bg-[#27272a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApply} className="space-y-4 text-xs">
          {/* Quick presets */}
          <div>
            <label className="block text-[#a1a1aa] font-medium mb-1.5">
              Valor do Abatimento (R$) *
            </label>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {[1000, 2500, 5000, 10000, 15000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer ${
                    amount === val
                      ? 'bg-emerald-500 text-black font-bold'
                      : 'bg-[#09090b] text-[#a1a1aa] hover:text-[#fafafa] border border-[#27272a]'
                  }`}
                >
                  + {formatCurrency(val)}
                </button>
              ))}
            </div>

            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#71717a] font-bold">
                R$
              </span>
              <input
                type="number"
                step="100"
                value={amount}
                onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] text-base font-bold focus:outline-none focus:border-emerald-500"
                required
              />
            </div>
          </div>

          {/* Strategy Selection */}
          <div>
            <label className="block text-[#a1a1aa] font-medium mb-1.5">
              Estratégia de Amortização *
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType('prazo')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'prazo'
                    ? 'bg-[#27272a] border-emerald-500 text-emerald-400 font-bold'
                    : 'bg-[#09090b] border-[#27272a] text-[#a1a1aa]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[#fafafa] mb-1">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Reduzir Prazo (Meses)</span>
                </div>
                <p className="text-[10px] text-[#a1a1aa]">
                  Corta parcelas do final do contrato e economiza juros brutais.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setType('prestacao')}
                className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'prestacao'
                    ? 'bg-[#27272a] border-emerald-500 text-emerald-400 font-bold'
                    : 'bg-[#09090b] border-[#27272a] text-[#a1a1aa]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-[#fafafa] mb-1">
                  <TrendingDown className="w-3.5 h-3.5 text-blue-400" />
                  <span>Reduzir Prestação</span>
                </div>
                <p className="text-[10px] text-[#a1a1aa]">
                  Mantém o prazo e diminui a mensalidade para aliviar o orçamento.
                </p>
              </button>
            </div>
          </div>

          {/* Real-Time Impact Projection */}
          <div className="p-3.5 rounded-xl bg-[#09090b] border border-[#27272a] space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
              ⚡ Impacto Estimado Deste Abatimento:
            </span>

            {type === 'prazo' ? (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#a1a1aa]">Parcelas eliminadas:</span>
                  <strong className="text-[#fafafa]">
                    - {simResult.reducedMonths} meses (~{(simResult.reducedMonths / 12).toFixed(1)} anos)
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a1a1aa]">Juros que você NÃO vai pagar ao banco:</span>
                  <strong className="text-emerald-400 text-sm">
                    {formatCurrency(simResult.estimatedInterestSaved)}
                  </strong>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#a1a1aa]">Nova parcela mensal:</span>
                  <strong className="text-emerald-400 text-sm">
                    {formatCurrency(simResult.newInstallmentValue)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#a1a1aa]">Alívio mensal no bolso:</span>
                  <strong className="text-[#fafafa]">
                    - {formatCurrency(Math.max(0, houseMortgage.currentInstallmentValue - simResult.newInstallmentValue))} /mês
                  </strong>
                </div>
              </div>
            )}
          </div>

          {/* Account Source */}
          <div>
            <label className="block text-[#a1a1aa] font-medium mb-1">Debitar de qual conta?</label>
            <select
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({formatCurrency(b.balance)})
                </option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[#a1a1aa] font-medium mb-1">Motivo / Notas</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Actions */}
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
              className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              Confirmar e Abater da Dívida
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
