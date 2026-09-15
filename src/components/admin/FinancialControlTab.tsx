import React, { useState } from 'react';
import { RefreshCw, TrendingUp, Trash2 } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

export const FinancialControlTab: React.FC = () => {
  const { transactions, resetFinancialData } = useFinance();

  const incomeTransactions = transactions.filter(t => t.type === 'income');
  const totalIncoming = incomeTransactions.reduce((acc, t) => acc + t.amount, 0);

  const handleReset = () => {
    if (window.confirm('Tem certeza que deseja zerar todo o controle financeiro e transações? Esta ação não pode ser desfeita.')) {
      resetFinancialData();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-extrabold text-zinc-900 tracking-tight">Controle Financeiro</h2>
          <p className="text-xs text-zinc-500 font-medium">Histórico de faturamento e receitas do escritório</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Zerar Controle</span>
          </button>
          <button
            onClick={() => {/* refresh */}}
            className="px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-800 border border-zinc-300 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#b5986e]" />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      <div className="bg-white border border-emerald-200/90 rounded-2xl p-6 relative overflow-hidden h-[130px] flex flex-col justify-center shadow-2xs">
        <div className="absolute -top-4 -right-4 p-4 opacity-10">
          <TrendingUp className="w-24 h-24 text-emerald-600" />
        </div>
        <h3 className="text-emerald-800 text-xs font-bold uppercase tracking-wider mb-1">Total Entradas</h3>
        <div className="text-4xl font-serif font-bold text-emerald-600 mb-0.5">
          {totalIncoming.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
        </div>
      </div>

      <div className="bg-white border border-zinc-200/90 rounded-2xl p-6 shadow-2xs">
        <h3 className="text-zinc-900 font-serif font-bold text-lg mb-4">Últimas Entradas</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/80">
                <th className="px-4 py-3 text-xs font-bold text-zinc-600 uppercase tracking-wider">Descrição</th>
                <th className="px-4 py-3 text-xs font-bold text-zinc-600 uppercase tracking-wider">Data</th>
                <th className="px-4 py-3 text-xs font-bold text-zinc-600 uppercase tracking-wider text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {incomeTransactions.slice(0, 10).map((t) => (
                <tr key={t.id} className="hover:bg-amber-50/30 transition-colors">
                  <td className="px-4 py-3.5 text-sm font-semibold text-zinc-900">{t.description}</td>
                  <td className="px-4 py-3.5 text-sm text-zinc-500 font-medium">{t.date}</td>
                  <td className="px-4 py-3.5 text-sm text-emerald-600 font-bold text-right">
                    {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              ))}
              {incomeTransactions.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-zinc-500 text-xs font-medium">
                    Nenhuma entrada registrada até o momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
