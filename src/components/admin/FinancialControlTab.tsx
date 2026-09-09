import React from 'react';
import { RefreshCw, TrendingUp } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const FinancialControlTab: React.FC = () => {
  const { transactions } = useFinance();

  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const totalIncoming = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-bold text-[#fcf8f5]">Controle Financeiro</h2>
        <button
          onClick={() => {/* TODO: Implement refresh logic */}}
          className="px-4 py-2 bg-[#241e1b] hover:bg-[#322a26] text-[#fcf8f5] border border-[#3d342f] rounded-xl text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[var(--theme-primary)]" />
          <span>Atualizar</span>
        </button>
      </div>

      <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-6 relative overflow-hidden h-[130px] flex flex-col justify-center">
        <div className="absolute -top-4 -right-4 p-4 opacity-10">
          <TrendingUp className="w-24 h-24 text-emerald-500" />
        </div>
        <h3 className="text-[#a89c93] text-xs font-bold uppercase tracking-wider mb-1">Total Entradas</h3>
        <div className="text-4xl font-serif font-bold text-emerald-400 mb-0.5">
          {totalIncoming.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </div>
      </div>

      <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-6">
        <h3 className="text-[#fcf8f5] font-serif font-bold text-lg mb-4">Últimas Entradas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#3d342f]">
                <th className="px-4 py-2 text-xs font-bold text-[#a89c93] uppercase">Descrição</th>
                <th className="px-4 py-2 text-xs font-bold text-[#a89c93] uppercase">Data</th>
                <th className="px-4 py-2 text-xs font-bold text-[#a89c93] uppercase text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3d342f]">
              {incomeTransactions.slice(0, 10).map((t) => (
                <tr key={t.id} className="hover:bg-[#241e1b]">
                  <td className="px-4 py-3 text-sm text-[#fcf8f5]">{t.description}</td>
                  <td className="px-4 py-3 text-sm text-[#a89c93]">{t.date}</td>
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
