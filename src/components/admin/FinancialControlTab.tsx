import React, { useState } from 'react';
import { RefreshCw, TrendingUp, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const FinancialControlTab: React.FC = () => {
  const { transactions, resetFinancialData } = useFinance();
  const [confirmReset, setConfirmReset] = useState(false);

  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const totalIncoming = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);

  const handleReset = () => {
    if (window.confirm('Tem certeza que deseja zerar todo o controle financeiro e transações? Esta ação não pode ser desfeita.')) {
      resetFinancialData();
      setConfirmReset(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-[var(--text-main)]">Controle Financeiro</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Zerar Controle</span>
          </button>
          <button
            onClick={() => {/* refresh */}}
            className="px-4 py-2 bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card-hover)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 relative overflow-hidden h-[130px] flex flex-col justify-center">
        <div className="absolute -top-4 -right-4 p-4 opacity-10">
          <TrendingUp className="w-24 h-24 text-emerald-500" />
        </div>
        <h3 className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider mb-1">Total Entradas</h3>
        <div className="text-4xl font-serif font-bold text-emerald-400 mb-0.5">
          {totalIncoming.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </div>
      </div>

      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6">
        <h3 className="text-[var(--text-main)] font-serif font-bold text-lg mb-4">Últimas Entradas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] uppercase">Descrição</th>
                <th className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] uppercase">Data</th>
                <th className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] uppercase text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {incomeTransactions.slice(0, 10).map((t) => (
                <tr key={t.id} className="hover:bg-[var(--bg-card-secondary)]">
                  <td className="px-4 py-3 text-sm text-[var(--text-main)]">{t.description}</td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">{t.date}</td>
                  <td className="px-4 py-3 text-sm text-emerald-400 font-bold text-right">
                    {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
