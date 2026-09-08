import React, { useState } from 'react';
import {
  BarChart3,
  CheckCircle2,
  Database,
  Download,
  FileSpreadsheet,
  HeartHandshake,
  Home,
  PieChart as PieIcon,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Upload,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { BudgetLimits } from '../../types';
import { formatCurrency, formatPercent } from '../../utils/formatters';

export const BudgetAndReportsTab: React.FC = () => {
  const {
    monthlyIncomeSummary,
    monthlyExpenseSummary,
    budgetLimits,
    updateBudgetLimits,
    exportDataJSON,
    importDataJSON,
    exportTransactionsCSV,
    resetToDemoData,
    selectedMonth,
  } = useFinance();

  const [limits, setLimits] = useState<BudgetLimits>(budgetLimits);
  const [isEditingLimits, setIsEditingLimits] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const handleSaveLimits = (e: React.FormEvent) => {
    e.preventDefault();
    updateBudgetLimits(limits);
    setIsEditingLimits(false);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 3000);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const success = importDataJSON(content);
        if (success) {
          alert('Dados restaurados com sucesso!');
        } else {
          alert('Erro ao importar arquivo. Verifique se o formato JSON é válido.');
        }
      }
    };
    reader.readAsText(file);
  };

  // Prepare data for Budget vs Actual chart
  const budgetVsActualData = [
    {
      category: 'Casa & Moradia',
      Orcado: limits.casa,
      Gasto: monthlyExpenseSummary.byCategory.casa,
    },
    {
      category: 'Carro & Transporte',
      Orcado: limits.carro,
      Gasto: monthlyExpenseSummary.byCategory.carro,
    },
    {
      category: 'Lazer & Estilo',
      Orcado: limits.lazer,
      Gasto: monthlyExpenseSummary.byCategory.lazer,
    },
    {
      category: 'Alimentação',
      Orcado: limits.alimentacao,
      Gasto: monthlyExpenseSummary.byCategory.alimentacao,
    },
    {
      category: 'Saúde & Outros',
      Orcado: limits.saude,
      Gasto: monthlyExpenseSummary.byCategory.saude,
    },
    {
      category: 'Freela Tools/MEI',
      Orcado: limits.freela_tools,
      Gasto: monthlyExpenseSummary.byCategory.freela_tools,
    },
  ];

  // Income Breakdown CLT vs Freelancer
  const totalIncome = monthlyIncomeSummary.total;
  const cltPercent = totalIncome > 0 ? (monthlyIncomeSummary.clt / totalIncome) * 100 : 0;
  const freelaPercent = totalIncome > 0 ? (monthlyIncomeSummary.freelancer / totalIncome) * 100 : 0;

  const incomeDistribution = [
    { name: 'Salário CLT', value: monthlyIncomeSummary.clt, color: '#3b82f6' },
    { name: 'Freelancer', value: monthlyIncomeSummary.freelancer, color: '#a855f7' },
    { name: 'Outras Rendas', value: monthlyIncomeSummary.other, color: '#10b981' },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#18181b] border border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <BarChart3 className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-[#fafafa] tracking-tight">
              Orçamento de Gastos & Relatórios Financeiros
            </h2>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-1 max-w-2xl">
            Defina tetos de gastos mensais para Casa, Carro e Lazer, compare o previsto versus realizado e gerencie seus backups.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditingLimits(!isEditingLimits)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] text-xs font-semibold transition-colors cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isEditingLimits ? 'Fechar Edição' : 'Ajustar Tetos de Gastos'}</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>Tetos de orçamento atualizados com sucesso!</span>
        </div>
      )}

      {/* EDIT BUDGET LIMITS PANEL */}
      {isEditingLimits && (
        <form
          onSubmit={handleSaveLimits}
          className="p-5 rounded-2xl bg-[#18181b] border border-indigo-500/30 space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between border-b border-[#27272a] pb-2">
            <h3 className="text-sm font-bold text-[#fafafa]">Configurar Limite Mensal por Categoria</h3>
            <span className="text-[11px] text-[#a1a1aa]">Valores em R$</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block text-[#a1a1aa] font-medium mb-1">🏠 Casa & Moradia (R$)</label>
              <input
                type="number"
                step="50"
                value={limits.casa}
                onChange={(e) => setLimits({ ...limits, casa: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[#a1a1aa] font-medium mb-1">🚗 Carro & Transporte (R$)</label>
              <input
                type="number"
                step="50"
                value={limits.carro}
                onChange={(e) => setLimits({ ...limits, carro: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[#a1a1aa] font-medium mb-1">🌴 Lazer & Estilo (R$)</label>
              <input
                type="number"
                step="50"
                value={limits.lazer}
                onChange={(e) => setLimits({ ...limits, lazer: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[#a1a1aa] font-medium mb-1">🛒 Alimentação (R$)</label>
              <input
                type="number"
                step="50"
                value={limits.alimentacao}
                onChange={(e) => setLimits({ ...limits, alimentacao: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[#a1a1aa] font-medium mb-1">❤️ Saúde (R$)</label>
              <input
                type="number"
                step="50"
                value={limits.saude}
                onChange={(e) => setLimits({ ...limits, saude: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[#a1a1aa] font-medium mb-1">💻 Freela Ferramentas/MEI (R$)</label>
              <input
                type="number"
                step="50"
                value={limits.freela_tools}
                onChange={(e) => setLimits({ ...limits, freela_tools: parseFloat(e.target.value) || 0 })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsEditingLimits(false)}
              className="px-4 py-2 rounded-full bg-[#27272a] text-[#fafafa] hover:bg-[#3f3f46] text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs transition-colors cursor-pointer"
            >
              Salvar Tetos
            </button>
          </div>
        </form>
      )}

      {/* CHARTS & COMPARISONS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Budget vs Actual Bar Chart */}
        <div className="lg:col-span-8 p-5 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#fafafa] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              Teto Orçado vs Gasto Real ({selectedMonth})
            </h3>
            <span className="text-[11px] text-[#a1a1aa]">Verifique se está dentro do limite</span>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={budgetVsActualData} margin={{ top: 10, right: 10, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis
                  dataKey="category"
                  stroke="#71717a"
                  fontSize={10}
                  tickLine={false}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis
                  stroke="#71717a"
                  fontSize={10}
                  tickLine={false}
                  tickFormatter={(val) => `R$${val}`}
                />
                <Tooltip
                  formatter={(val: number) => formatCurrency(val)}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '12px',
                    fontSize: '12px',
                    color: '#fafafa',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Orcado" name="Teto Previsto (R$)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gasto" name="Gasto Real (R$)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Income Sources CLT vs Freelancer */}
        <div className="lg:col-span-4 p-5 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#fafafa] flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-indigo-400" />
              Composição da Renda (CLT vs Freela)
            </h3>
            <p className="text-[11px] text-[#a1a1aa] mt-0.5">
              Origem dos seus ganhos neste mês
            </p>
          </div>

          <div className="h-[180px] w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={incomeDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {incomeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => formatCurrency(val)}
                  contentStyle={{
                    backgroundColor: '#18181b',
                    borderColor: '#27272a',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#fafafa',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 text-xs pt-2 border-t border-[#27272a]">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#a1a1aa]">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Salário CLT:
              </span>
              <span className="font-bold text-[#fafafa]">
                {formatCurrency(monthlyIncomeSummary.clt)} ({cltPercent.toFixed(0)}%)
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#a1a1aa]">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                Freelancer:
              </span>
              <span className="font-bold text-purple-300">
                {formatCurrency(monthlyIncomeSummary.freelancer)} ({freelaPercent.toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* BACKUP & DATA MANAGEMENT SECTION */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#fafafa] tracking-tight flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            Backup, Restauração & Exportação de Dados
          </h3>
          <p className="text-xs text-[#a1a1aa] mt-0.5">
            Seus dados ficam gravados com segurança no seu navegador. Você pode baixar cópias de segurança em JSON ou exportar para Excel (CSV) quando quiser.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Download JSON Backup */}
          <button
            onClick={exportDataJSON}
            className="p-4 rounded-xl bg-[#09090b] border border-[#27272a] hover:border-[#3f3f46] text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs mb-1">
              <Download className="w-4 h-4" />
              <span>Exportar Backup (JSON)</span>
            </div>
            <p className="text-[11px] text-[#a1a1aa]">
              Salva todos os bancos, clientes, financiamento da casa e lançamentos.
            </p>
          </button>

          {/* Import JSON Backup */}
          <label className="p-4 rounded-xl bg-[#09090b] border border-[#27272a] hover:border-[#3f3f46] text-left transition-all cursor-pointer group">
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs mb-1">
              <Upload className="w-4 h-4" />
              <span>Restaurar Backup (JSON)</span>
            </div>
            <p className="text-[11px] text-[#a1a1aa]">
              Carregue um arquivo JSON exportado anteriormente para recuperar seus dados.
            </p>
          </label>

          {/* Export CSV for Excel */}
          <button
            onClick={exportTransactionsCSV}
            className="p-4 rounded-xl bg-[#09090b] border border-[#27272a] hover:border-[#3f3f46] text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-1">
              <FileSpreadsheet className="w-4 h-4" />
              <span>Baixar Planilha (CSV)</span>
            </div>
            <p className="text-[11px] text-[#a1a1aa]">
              Gera arquivo compatível com Excel, Google Sheets e LibreOffice Calc.
            </p>
          </button>
        </div>

        {/* Demo reset */}
        <div className="pt-3 border-t border-[#27272a] flex items-center justify-between text-xs flex-wrap gap-2">
          <span className="text-[#71717a] text-[11px]">
            Deseja restaurar os dados de exemplo padrão?
          </span>
          {confirmReset ? (
            <div className="flex items-center gap-2 bg-rose-950/60 border border-rose-800/80 px-2.5 py-1 rounded-lg">
              <span className="text-[11px] text-rose-200">Confirmar restauração?</span>
              <button
                type="button"
                onClick={() => {
                  resetToDemoData();
                  setConfirmReset(false);
                }}
                className="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] rounded transition-colors cursor-pointer"
              >
                Sim, Resetar
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-1.5 py-0.5 text-[10px] text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="text-[11px] text-[#a1a1aa] hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Restaurar dados demonstrativos
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
