import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Download,
  Edit2,
  FileText,
  Filter,
  Flame,
  Layers,
  MoreVertical,
  Package,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinance } from '../../context/FinanceContext';
import { BankAccount, Transaction, TransactionStatus } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

interface BanksAndCashTabProps {
  onOpenTransferModal: () => void;
  onOpenCashModal: () => void;
  onOpenNewTxModal?: (initialType?: 'income' | 'expense', sourceOrCat?: string) => void;
}

export const BanksAndCashTab: React.FC<BanksAndCashTabProps> = ({
  onOpenTransferModal,
  onOpenCashModal,
  onOpenNewTxModal,
}) => {
  const {
    bankAccounts,
    totalNetWorth,
    totalBankBalance,
    transactions,
    architectureProjects,
    clients,
    projectInstallments,
    updateTransaction,
    deleteTransaction,
    updateProjectInstallment,
    exportTransactionsCSV,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
  } = useFinance();

  // Navigation Subtabs: 'caixa_real' | 'projetos' | 'lancamentos'
  const [activeTab, setActiveTab] = useState<'caixa_real' | 'projetos' | 'lancamentos'>('caixa_real');

  // Month selector
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current_month'); // 'current_month' | 'last_month' | 'all'

  // Transactions filters for bottom table
  const [typeFilter, setTypeFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all'); // 'all' | 'pending' | 'completed' | 'overdue' | 'lost' | 'cancelled'
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('all');

  // Bank Accounts Drawer / Modal
  const [isBankDrawerOpen, setIsBankDrawerOpen] = useState(false);
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [bankName, setBankName] = useState('');
  const [bankBalance, setBankBalance] = useState('');
  const [bankType, setBankType] = useState<'bank' | 'fintech' | 'investment' | 'physical_cash'>('bank');

  // Date calculation for "Este mês"
  const currentMonthPrefix = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  const lastMonthPrefix = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
  }, []);

  // Filtered transactions for the selected period
  const periodTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const txDate = t.dueDate || t.date;
      if (selectedPeriod === 'current_month') {
        return txDate.startsWith(currentMonthPrefix);
      }
      if (selectedPeriod === 'last_month') {
        return txDate.startsWith(lastMonthPrefix);
      }
      return true; // 'all'
    });
  }, [transactions, selectedPeriod, currentMonthPrefix, lastMonthPrefix]);

  // Metrics for KPI Cards (Image 1)
  const metricEntradasConfirmadas = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const metricSaidasConfirmadas = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const metricSaldoLiquido = useMemo(() => {
    return metricEntradasConfirmadas - metricSaidasConfirmadas;
  }, [metricEntradasConfirmadas, metricSaidasConfirmadas]);

  const metricPrevistoReceber = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'income' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const metricPrevistoPagar = useMemo(() => {
    return periodTransactions
      .filter((t) => t.type === 'expense' && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const metricEmAtraso = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return periodTransactions
      .filter((t) => (t.status === 'overdue' || (t.status === 'pending' && (t.dueDate || t.date) < today)))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  const metricPerdido = useMemo(() => {
    return periodTransactions
      .filter((t) => t.status === 'lost')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [periodTransactions]);

  // Burn rate: Average monthly expenses over last 3 months
  const metricBurnRate = useMemo(() => {
    const expenses = transactions
      .filter((t) => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
    return expenses > 0 ? expenses / 3 : 0;
  }, [transactions]);

  // Runway: Months of sustainability
  const metricRunway = useMemo(() => {
    if (metricBurnRate <= 0) return 0;
    const months = Math.floor(totalNetWorth / metricBurnRate);
    return isFinite(months) ? Math.max(0, months) : 0;
  }, [totalNetWorth, metricBurnRate]);

  // Historical Monthly Confirmed Income (6 Months for the chart)
  const monthlyChartData = useMemo(() => {
    const monthNames = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.', 'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.'];
    const result: { month: string; receita: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const prefix = `${year}-${m}`;
      const name = monthNames[d.getMonth()];

      const monthIncome = transactions
        .filter((t) => t.type === 'income' && t.status === 'completed' && (t.dueDate || t.date).startsWith(prefix))
        .reduce((sum, t) => sum + t.amount, 0);

      result.push({
        month: name,
        receita: monthIncome,
      });
    }

    return result;
  }, [transactions]);

  // Upcoming dues list (Próximos Vencimentos - Image 1)
  const upcomingDues = useMemo(() => {
    const list: {
      id: string;
      title: string;
      subtitle: string;
      amount: number;
      dueDate: string;
      daysRemaining: number;
      type: 'transaction' | 'installment';
      rawTx?: Transaction;
      installmentId?: string;
    }[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // From transactions
    transactions
      .filter((t) => t.status === 'pending')
      .forEach((t) => {
        const d = new Date(t.dueDate || t.date);
        const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let title = t.description;
        if (t.projectName) title = t.projectName;
        else if (t.clientName) title = t.clientName;

        let subtitle = `${t.category || (t.type === 'income' ? 'Receita' : 'Despesa')}`;
        if (diffDays > 0) subtitle += ` • em ${diffDays}d`;
        else if (diffDays === 0) subtitle += ' • Vence hoje';
        else subtitle += ` • Atrasado ${Math.abs(diffDays)}d`;

        list.push({
          id: t.id,
          title,
          subtitle,
          amount: t.type === 'income' ? t.amount : -t.amount,
          dueDate: t.dueDate || t.date,
          daysRemaining: diffDays,
          type: 'transaction',
          rawTx: t,
        });
      });

    // From project installments
    projectInstallments
      .filter((pi) => pi.status === 'pending')
      .forEach((pi) => {
        const d = new Date(pi.dueDate);
        const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        const proj = architectureProjects.find((p) => p.id === pi.projectId);

        let subtitle = `Honorários de Projeto`;
        if (diffDays > 0) subtitle += ` • em ${diffDays}d`;
        else if (diffDays === 0) subtitle += ' • Vence hoje';
        else subtitle += ` • Atrasado ${Math.abs(diffDays)}d`;

        list.push({
          id: pi.id,
          title: proj?.name || pi.title,
          subtitle,
          amount: pi.amount,
          dueDate: pi.dueDate,
          daysRemaining: diffDays,
          type: 'installment',
          installmentId: pi.id,
        });
      });

    return list.sort((a, b) => a.daysRemaining - b.daysRemaining).slice(0, 6);
  }, [transactions, projectInstallments, architectureProjects]);

  // Confirming an upcoming due directly
  const handleConfirmDue = (due: typeof upcomingDues[0]) => {
    if (due.type === 'transaction' && due.rawTx) {
      updateTransaction(due.rawTx.id, { status: 'completed' });
    } else if (due.type === 'installment' && due.installmentId) {
      updateProjectInstallment(due.installmentId, {
        status: 'paid',
        paidDate: new Date().toISOString().split('T')[0],
      });
    }
  };

  // Table items after all filters applied
  const finalFilteredTransactions = useMemo(() => {
    return periodTransactions.filter((t) => {
      // Type Filter
      if (typeFilter === 'income' && t.type !== 'income') return false;
      if (typeFilter === 'expense' && t.type !== 'expense') return false;

      // Status Filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'pending' && t.status !== 'pending') return false;
        if (statusFilter === 'completed' && t.status !== 'completed') return false;
        if (statusFilter === 'overdue') {
          const today = new Date().toISOString().split('T')[0];
          const isOverdue = t.status === 'overdue' || (t.status === 'pending' && (t.dueDate || t.date) < today);
          if (!isOverdue) return false;
        }
        if (statusFilter === 'lost' && t.status !== 'lost') return false;
        if (statusFilter === 'cancelled' && t.status !== 'cancelled') return false;
      }

      // Bank account filter
      if (selectedBankFilter !== 'all' && t.bankAccountId !== selectedBankFilter) {
        return false;
      }

      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = t.description.toLowerCase().includes(term);
        const matchesClient = t.clientName?.toLowerCase().includes(term);
        const matchesProject = t.projectName?.toLowerCase().includes(term);
        const matchesCategory = t.category?.toLowerCase().includes(term);
        if (!matchesDesc && !matchesClient && !matchesProject && !matchesCategory) return false;
      }

      return true;
    });
  }, [periodTransactions, typeFilter, statusFilter, selectedBankFilter, searchTerm]);

  // Counts for filters
  const countAll = periodTransactions.length;
  const countIncome = periodTransactions.filter((t) => t.type === 'income').length;
  const countExpense = periodTransactions.filter((t) => t.type === 'expense').length;

  return (
    <div className="space-y-6 pb-16 font-sans text-[#1a1614]">
      {/* Top Header (Image 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1a1614]">
            Financeiro
          </h1>
          <p className="text-xs sm:text-sm text-[#73655c] mt-0.5">
            Controle do caixa em tempo real
          </p>
        </div>

        {/* Top Right Quick Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBankDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#dfd7cc] bg-white text-xs font-semibold text-[#574d46] hover:bg-[#f8f5f1] transition-all cursor-pointer shadow-2xs"
            title="Ver e gerenciar contas bancárias"
          >
            <Wallet className="w-3.5 h-3.5 text-[#c58a4b]" />
            <span>Contas Bancárias ({bankAccounts.length})</span>
          </button>

          <button
            onClick={onOpenTransferModal}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#dfd7cc] bg-white text-xs font-semibold text-[#574d46] hover:bg-[#f8f5f1] transition-all cursor-pointer shadow-2xs"
            title="Transferência entre contas"
          >
            <ArrowRightLeft className="w-3.5 h-3.5 text-[#73655c]" />
            <span className="hidden sm:inline">Transferir</span>
          </button>
        </div>
      </div>

      {/* Subtabs Navigation Bar (Image 1) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {/* Subtab: Caixa Real */}
          <button
            onClick={() => setActiveTab('caixa_real')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'caixa_real'
                ? 'bg-[#b39b82] text-white shadow-xs'
                : 'bg-white border border-[#e2dacf] text-[#73655c] hover:text-[#1a1614]'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            <span>Caixa Real</span>
          </button>

          {/* Subtab: Projetos */}
          <button
            onClick={() => setActiveTab('projetos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'projetos'
                ? 'bg-[#b39b82] text-white shadow-xs'
                : 'bg-white border border-[#e2dacf] text-[#73655c] hover:text-[#1a1614]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Projetos</span>
          </button>

          {/* Subtab: Lançamentos */}
          <button
            onClick={() => setActiveTab('lancamentos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'lancamentos'
                ? 'bg-[#b39b82] text-white shadow-xs'
                : 'bg-white border border-[#e2dacf] text-[#73655c] hover:text-[#1a1614]'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Lançamentos</span>
          </button>

          {/* Month Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="appearance-none pl-7 pr-8 py-2 rounded-lg border border-[#e2dacf] bg-white text-xs font-semibold text-[#574d46] cursor-pointer hover:border-[#c58a4b] focus:outline-none"
            >
              <option value="current_month">Este mês</option>
              <option value="last_month">Mês anterior</option>
              <option value="all">Todo o histórico</option>
            </select>
            <Calendar className="w-3.5 h-3.5 text-[#73655c] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <span className="text-[10px] text-[#73655c] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              ▼
            </span>
          </div>
        </div>

        {/* Right Action: + Novo Lançamento */}
        <div>
          <button
            onClick={() => onOpenNewTxModal?.('income')}
            className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#b89f82] hover:bg-[#a68c6e] text-white text-xs sm:text-sm font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Novo Lançamento</span>
          </button>
        </div>
      </div>

      {/* Breadcrumb indicator (Image 1) */}
      <div className="pt-1">
        <span className="text-[11px] font-bold tracking-wider text-[#73655c] uppercase block">
          CAIXA REAL
        </span>
        <span className="text-xs text-[#9c8e85]">
          {selectedPeriod === 'current_month'
            ? 'Este mês'
            : selectedPeriod === 'last_month'
            ? 'Mês anterior'
            : 'Histórico consolidado'}
        </span>
      </div>

      {/* ================= VIEW 1: CAIXA REAL ================= */}
      {activeTab === 'caixa_real' && (
        <div className="space-y-6">
          {/* KPI ROW 1: Entradas, Saídas, Saldo Líquido, Saldo Acumulado (Image 1) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Entradas Confirmadas */}
            <div className="p-5 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-[#73655c]">
                    Entradas Confirmadas
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-[#1a1614] mt-2">
                    {formatCurrency(metricEntradasConfirmadas)}
                  </div>
                  <span className="text-xs text-[#9c8e85] block mt-1">Confirmado</span>
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <TrendingUp className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Card 2: Saídas Confirmadas */}
            <div className="p-5 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-[#73655c]">
                    Saídas Confirmadas
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-[#1a1614] mt-2">
                    {formatCurrency(metricSaidasConfirmadas)}
                  </div>
                  <span className="text-xs text-[#9c8e85] block mt-1">Confirmado</span>
                </div>
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-100">
                  <TrendingDown className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Card 3: Saldo Líquido */}
            <div className="p-5 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-[#73655c]">
                    Saldo Líquido
                  </span>
                  <div
                    className={`text-xl sm:text-2xl font-bold mt-2 ${
                      metricSaldoLiquido >= 0 ? 'text-[#1a1614]' : 'text-rose-600'
                    }`}
                  >
                    {formatCurrency(metricSaldoLiquido)}
                  </div>
                  <span className="text-xs text-[#9c8e85] block mt-1">Este mês</span>
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold text-xs flex items-center justify-center w-7 h-7">
                  $
                </div>
              </div>
            </div>

            {/* Card 4: Saldo Acumulado */}
            <div className="p-5 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-[#73655c]">
                    Saldo Acumulado
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-[#1a1614] mt-2">
                    {formatCurrency(totalNetWorth || totalBankBalance)}
                  </div>
                  <span className="text-xs text-[#9c8e85] block mt-1">Histórico total</span>
                </div>
                <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* KPI ROW 2: Previsto a Receber, Previsto a Pagar, Em Atraso, Perdido (Image 1) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Previsto a Receber */}
            <div className="p-5 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-[#73655c]">
                    Previsto a Receber
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-[#1a1614] mt-2">
                    {formatCurrency(metricPrevistoReceber)}
                  </div>
                  <span className="text-xs text-[#9c8e85] block mt-1">
                    Pendente no período
                  </span>
                </div>
                <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Card 2: Previsto a Pagar */}
            <div className="p-5 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-[#73655c]">
                    Previsto a Pagar
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-[#1a1614] mt-2">
                    {formatCurrency(metricPrevistoPagar)}
                  </div>
                  <span className="text-xs text-[#9c8e85] block mt-1">
                    Pendente no período
                  </span>
                </div>
                <div className="p-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-100">
                  <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>
            </div>

            {/* Card 3: Em Atraso */}
            <div className="p-5 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-[#73655c]">Em Atraso</span>
                  <div
                    className={`text-xl sm:text-2xl font-bold mt-2 ${
                      metricEmAtraso > 0 ? 'text-rose-600' : 'text-[#1a1614]'
                    }`}
                  >
                    {formatCurrency(metricEmAtraso)}
                  </div>
                  <span className="text-xs text-[#9c8e85] block mt-1">
                    {metricEmAtraso > 0 ? 'Exige atenção' : 'Nenhum em atraso'}
                  </span>
                </div>
                <div
                  className={`p-1.5 rounded-lg border ${
                    metricEmAtraso > 0
                      ? 'bg-rose-50 text-rose-600 border-rose-100'
                      : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Card 4: Perdido */}
            <div className="p-5 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-[#73655c]">Perdido</span>
                  <div className="text-xl sm:text-2xl font-bold text-[#1a1614] mt-2">
                    {formatCurrency(metricPerdido)}
                  </div>
                  <span className="text-xs text-[#9c8e85] block mt-1">
                    Sem perdas registradas
                  </span>
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <AlertCircle className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* KPI ROW 3: Burn Rate & Runway (Image 1) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            {/* Card: Burn Rate */}
            <div className="p-5 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-[#73655c]">Burn Rate</span>
                  <div className="text-xl sm:text-2xl font-bold text-[#1a1614] mt-2">
                    {formatCurrency(metricBurnRate)}
                  </div>
                  <span className="text-xs text-[#9c8e85] block mt-1">
                    Gasto médio/mês
                  </span>
                </div>
                <div className="p-1.5 rounded-lg bg-orange-50 text-orange-500 border border-orange-100">
                  <Flame className="w-4 h-4" />
                </div>
              </div>
            </div>

            {/* Card: Runway */}
            <div className="p-5 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs relative">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-medium text-[#73655c]">Runway</span>
                  <div className="text-xl sm:text-2xl font-bold text-[#1a1614] mt-2">
                    {metricRunway} {metricRunway === 1 ? 'mês' : 'meses'}
                  </div>
                  <span className="text-xs text-[#9c8e85] block mt-1">
                    Sustentabilidade
                  </span>
                </div>
                <div className="p-1.5 rounded-lg bg-rose-50 text-rose-500 border border-rose-100">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE ROW: Historical Chart & Próximos Vencimentos (Image 1) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column (8 cols): Receita Confirmada — Histórico Mensal */}
            <div className="lg:col-span-8 p-6 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#1a1614]">
                  Receita Confirmada — Histórico Mensal
                </h3>
              </div>

              <div className="h-60 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorReceitaGold" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#c58a4b" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#c58a4b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#73655c', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#9c8e85', fontSize: 10 }}
                      tickFormatter={(val) => `R$${val > 999 ? (val / 1000).toFixed(0) + 'k' : val}`}
                    />
                    <Tooltip
                      formatter={(val: number) => [formatCurrency(val), 'Receita']}
                      contentStyle={{
                        backgroundColor: '#ffffff',
                        border: '1px solid #eae4dc',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#1a1614',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="receita"
                      stroke="#c58a4b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorReceitaGold)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Right Column (4 cols): Próximos Vencimentos */}
            <div className="lg:col-span-4 p-6 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs space-y-4 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#1a1614] mb-4">
                  Próximos Vencimentos
                </h3>

                {upcomingDues.length === 0 ? (
                  <div className="py-12 text-center text-[#9c8e85] text-xs">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-[#c58a4b] mb-2 opacity-60" />
                    <p>Nenhum vencimento pendente no período.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingDues.map((due) => (
                      <div
                        key={due.id}
                        className="p-3 rounded-xl border border-[#eae4dc] hover:border-[#d6c9bd] transition-all flex items-center justify-between gap-3 bg-[#fdfcfb]"
                      >
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-[#1a1614] truncate">
                            {due.title}
                          </h4>
                          <span className="text-[10px] text-[#73655c] block truncate">
                            {due.subtitle}
                          </span>
                        </div>

                        <div className="text-right shrink-0 flex items-center gap-2">
                          <span
                            className={`text-xs font-bold ${
                              due.amount >= 0 ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {due.amount >= 0 ? `+${formatCurrency(due.amount)}` : formatCurrency(due.amount)}
                          </span>

                          <button
                            onClick={() => handleConfirmDue(due)}
                            className="px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-500/30 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                          >
                            Confirmar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {upcomingDues.length > 0 && (
                <div className="text-center pt-2">
                  <button
                    onClick={() => setActiveTab('lancamentos')}
                    className="text-xs text-[#73655c] hover:text-[#1a1614] font-medium underline cursor-pointer"
                  >
                    Ver todos os lançamentos
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* BOTTOM SECTION: Lançamentos do Período (Image 1) */}
          <div className="p-6 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs space-y-4">
            {/* Header & Totals */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
              <div>
                <h3 className="text-base font-bold text-[#1a1614]">
                  Lançamentos do Período
                </h3>
                <span className="text-xs text-[#73655c]">
                  Este mês • {finalFilteredTransactions.length} de {periodTransactions.length} lançamentos
                </span>
              </div>

              <div className="flex items-center gap-3 text-xs font-bold">
                <span className="text-emerald-700">
                  +{formatCurrency(metricEntradasConfirmadas)}
                </span>
                <span className="text-rose-600">
                  -{formatCurrency(metricSaidasConfirmadas)}
                </span>
              </div>
            </div>

            {/* Filter Pills Bar (Image 1) */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-[#f2ede6]">
              {/* Type Filter Tabs: Todos, Receitas, Despesas */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    typeFilter === 'all'
                      ? 'bg-[#f0ebe3] text-[#1a1614] font-bold'
                      : 'text-[#73655c] hover:bg-[#f8f5f1]'
                  }`}
                >
                  Todos {countAll}
                </button>
                <button
                  onClick={() => setTypeFilter('income')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    typeFilter === 'income'
                      ? 'bg-[#e8f5ed] text-emerald-800 font-bold'
                      : 'text-[#73655c] hover:bg-[#f8f5f1]'
                  }`}
                >
                  Receitas {countIncome}
                </button>
                <button
                  onClick={() => setTypeFilter('expense')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    typeFilter === 'expense'
                      ? 'bg-[#fbeeed] text-rose-800 font-bold'
                      : 'text-[#73655c] hover:bg-[#f8f5f1]'
                  }`}
                >
                  Despesas {countExpense}
                </button>
              </div>

              {/* Status Filter Pills: Todos, Previstos, Confirmados, Atrasados, Perdidos, Cancelados */}
              <div className="flex flex-wrap items-center gap-1 text-xs">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'pending', label: 'Previstos' },
                  { id: 'completed', label: 'Confirmados' },
                  { id: 'overdue', label: 'Atrasados' },
                  { id: 'lost', label: 'Perdidos' },
                  { id: 'cancelled', label: 'Cancelados' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => setStatusFilter(st.id)}
                    className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                      statusFilter === st.id
                        ? 'bg-[#1a1614] text-white font-semibold'
                        : 'text-[#73655c] hover:text-[#1a1614] hover:bg-[#f8f5f1]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}

                {/* Filter toggle button */}
                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-[#dfd7cc] text-[#73655c] hover:text-[#1a1614] hover:bg-[#f8f5f1] transition-all cursor-pointer ml-1"
                >
                  <Filter className="w-3 h-3" />
                  <span>Filtros</span>
                  <span className="text-[10px]">▾</span>
                </button>
              </div>
            </div>

            {/* Advanced Filters Expandable Box */}
            {showAdvancedFilters && (
              <div className="p-4 rounded-xl bg-[#f8f5f1] border border-[#eae4dc] grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#73655c] mb-1">
                    Buscar Texto
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Descrição, cliente, categoria..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#dfd7cc] bg-white text-xs text-[#1a1614] focus:outline-none focus:border-[#c58a4b]"
                    />
                    <Search className="w-3.5 h-3.5 text-[#9c8e85] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-[#73655c] mb-1">
                    Filtrar por Conta
                  </label>
                  <select
                    value={selectedBankFilter}
                    onChange={(e) => setSelectedBankFilter(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-[#dfd7cc] bg-white text-xs text-[#1a1614] focus:outline-none"
                  >
                    <option value="all">Todas as Contas</option>
                    {bankAccounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedBankFilter('all');
                      setStatusFilter('all');
                      setTypeFilter('all');
                    }}
                    className="px-3 py-1.5 text-xs text-[#73655c] hover:text-[#1a1614] underline cursor-pointer"
                  >
                    Limpar Filtros
                  </button>
                </div>
              </div>
            )}

            {/* Content: Empty State (Image 1) OR Populated Table */}
            {finalFilteredTransactions.length === 0 ? (
              <div className="py-16 text-center space-y-2">
                <div className="text-4xl font-light text-[#bfb3a7] select-none">$</div>
                <p className="text-xs text-[#73655c]">
                  Nenhum lançamento neste período.
                </p>
                <button
                  onClick={() => onOpenNewTxModal?.('income')}
                  className="text-xs text-[#9c8e85] hover:text-[#1a1614] underline cursor-pointer transition-colors block mx-auto"
                >
                  Adicionar primeiro lançamento
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto pt-2">
                <table className="w-full text-left text-xs text-[#1a1614] border-collapse">
                  <thead>
                    <tr className="border-b border-[#eae4dc] text-[11px] font-bold text-[#73655c] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3">Origem / Vínculo</th>
                      <th className="py-2.5 px-3">Vencimento</th>
                      <th className="py-2.5 px-3">Conta</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2ede6]">
                    {finalFilteredTransactions.map((tx) => {
                      const bank = bankAccounts.find((a) => a.id === tx.bankAccountId);

                      return (
                        <tr key={tx.id} className="hover:bg-[#fbf9f6] transition-colors">
                          <td className="py-3 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                tx.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : tx.status === 'overdue'
                                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                  : tx.status === 'lost'
                                  ? 'bg-gray-100 text-gray-700 border border-gray-200'
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}
                            >
                              {tx.status === 'completed'
                                ? 'Confirmado'
                                : tx.status === 'overdue'
                                ? 'Atrasado'
                                : tx.status === 'lost'
                                ? 'Perdido'
                                : 'Previsto'}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <span className="font-semibold block text-[#1a1614]">
                              {tx.description}
                            </span>
                            {tx.structure && (
                              <span className="text-[10px] text-[#9c8e85] capitalize">
                                {tx.structure === 'avulso'
                                  ? 'Lançamento Avulso'
                                  : tx.structure === 'contrato'
                                  ? 'Contrato'
                                  : 'Recorrente'}
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-[#574d46]">
                            {tx.category || (tx.type === 'income' ? 'Receita' : 'Despesa')}
                          </td>

                          <td className="py-3 px-3 text-[#574d46]">
                            {tx.projectName ? (
                              <span className="flex items-center gap-1 text-[#8c6b48] font-medium">
                                <Building2 className="w-3 h-3" />
                                {tx.projectName}
                              </span>
                            ) : tx.clientName ? (
                              <span className="flex items-center gap-1 text-[#574d46]">
                                <User className="w-3 h-3" />
                                {tx.clientName}
                              </span>
                            ) : (
                              <span className="text-[#9c8e85] capitalize">{tx.origin || 'Avulso'}</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-[#73655c]">
                            {formatDate(tx.dueDate || tx.date)}
                          </td>

                          <td className="py-3 px-3 text-[#73655c]">
                            {bank?.name || 'Caixa Geral'}
                          </td>

                          <td className="py-3 px-3 text-right font-bold">
                            <span
                              className={
                                tx.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                              }
                            >
                              {tx.type === 'income' ? '+' : '-'}
                              {formatCurrency(tx.amount)}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {tx.status !== 'completed' && (
                                <button
                                  onClick={() => updateTransaction(tx.id, { status: 'completed' })}
                                  className="px-2 py-0.5 rounded text-[10px] font-semibold border border-emerald-500/30 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors cursor-pointer"
                                  title="Marcar como Confirmado"
                                >
                                  Confirmar
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  if (confirm(`Excluir o lançamento "${tx.description}"?`)) {
                                    deleteTransaction(tx.id);
                                  }
                                }}
                                className="p-1 rounded text-[#9c8e85] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Excluir"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= VIEW 2: PROJETOS ================= */}
      {activeTab === 'projetos' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs">
            <h3 className="text-base font-bold text-[#1a1614] mb-1">
              Desempenho Financeiro por Projeto
            </h3>
            <p className="text-xs text-[#73655c] mb-6">
              Acompanhamento de receitas contratadas, pagamentos recebidos, custos diretos e margem de lucro por obra/projeto.
            </p>

            {architectureProjects.length === 0 ? (
              <div className="py-12 text-center text-[#9c8e85] text-xs">
                Nenhum projeto cadastrado no sistema.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {architectureProjects.map((proj) => {
                  const projTxs = transactions.filter((t) => t.projectId === proj.id);
                  const projIncome = projTxs
                    .filter((t) => t.type === 'income' && t.status === 'completed')
                    .reduce((sum, t) => sum + t.amount, 0);
                  const projExpenses = projTxs
                    .filter((t) => t.type === 'expense' && t.status === 'completed')
                    .reduce((sum, t) => sum + t.amount, 0);
                  const projMargin = projIncome - projExpenses;
                  const marginPct = projIncome > 0 ? Math.round((projMargin / projIncome) * 100) : 0;

                  return (
                    <div
                      key={proj.id}
                      className="p-5 rounded-2xl border border-[#eae4dc] bg-white shadow-2xs space-y-4 hover:border-[#c58a4b] transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-[#1a1614]">{proj.name}</h4>
                          <span className="text-xs text-[#73655c]">
                            {proj.clientName || 'Cliente não associado'}
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f5efe8] text-[#8c6b48]">
                          {proj.status || 'Em andamento'}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#f2ede6] text-xs">
                        <div>
                          <span className="text-[10px] text-[#9c8e85] block">Receita Entregue</span>
                          <span className="font-bold text-emerald-700">
                            {formatCurrency(projIncome)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#9c8e85] block">Custos Diretos</span>
                          <span className="font-bold text-rose-600">
                            {formatCurrency(projExpenses)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#9c8e85] block">Margem Líquida</span>
                          <span className="font-bold text-[#1a1614]">
                            {marginPct}% ({formatCurrency(projMargin)})
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= VIEW 3: LANÇAMENTOS ================= */}
      {activeTab === 'lancamentos' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-[#eae4dc] shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#1a1614]">Livro Caixa Completo</h3>
                <p className="text-xs text-[#73655c]">
                  Histórico detalhado de todas as transações, parcelas e conciliações.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportTransactionsCSV()}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#dfd7cc] bg-white text-xs font-semibold text-[#574d46] hover:bg-[#f8f5f1] transition-all cursor-pointer shadow-2xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>
              </div>
            </div>

            {/* List with full search and filters */}
            <div className="pt-2">
              <input
                type="text"
                placeholder="Pesquisar em todo o histórico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#dfd7cc] bg-white text-xs text-[#1a1614] focus:outline-none focus:border-[#c58a4b] mb-4"
              />

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-[#1a1614] border-collapse">
                  <thead>
                    <tr className="border-b border-[#eae4dc] text-[11px] font-bold text-[#73655c] uppercase">
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Descrição</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f2ede6]">
                    {transactions
                      .filter((t) => {
                        if (!searchTerm.trim()) return true;
                        const s = searchTerm.toLowerCase();
                        return (
                          t.description.toLowerCase().includes(s) ||
                          t.category?.toLowerCase().includes(s) ||
                          t.clientName?.toLowerCase().includes(s)
                        );
                      })
                      .map((tx) => (
                        <tr key={tx.id} className="hover:bg-[#fbf9f6]">
                          <td className="py-2.5 px-3 text-[#73655c]">
                            {formatDate(tx.dueDate || tx.date)}
                          </td>
                          <td className="py-2.5 px-3 font-medium text-[#1a1614]">
                            {tx.description}
                          </td>
                          <td className="py-2.5 px-3 capitalize text-[#73655c]">
                            {tx.type === 'income' ? 'Receita' : 'Despesa'}
                          </td>
                          <td className="py-2.5 px-3 text-[#73655c]">
                            {tx.category || '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                tx.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {tx.status === 'completed' ? 'Confirmado' : 'Previsto'}
                            </span>
                          </td>
                          <td
                            className={`py-2.5 px-3 text-right font-bold ${
                              tx.type === 'income' ? 'text-emerald-700' : 'text-rose-600'
                            }`}
                          >
                            {tx.type === 'income' ? '+' : '-'}
                            {formatCurrency(tx.amount)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= DRAWER: CONTAS BANCÁRIAS ================= */}
      {isBankDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white text-[#1a1614] shadow-2xl border border-[#e8e2d9] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#eae4dc] pb-3">
              <h3 className="text-base font-bold text-[#1a1614] flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[#c58a4b]" />
                Contas Bancárias e Saldos
              </h3>
              <button
                onClick={() => setIsBankDrawerOpen(false)}
                className="p-1 rounded-lg text-[#73655c] hover:text-[#1a1614] hover:bg-[#f5f1eb] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {bankAccounts.map((acc) => (
                <div
                  key={acc.id}
                  className="p-4 rounded-xl border border-[#eae4dc] flex items-center justify-between gap-3 bg-[#fdfcfb]"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                      style={{ backgroundColor: acc.color || '#c58a4b' }}
                    >
                      {acc.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#1a1614]">{acc.name}</h4>
                      <span className="text-[10px] text-[#73655c] capitalize">
                        {acc.type === 'physical_cash' ? 'Caixa Físico' : 'Conta Corrente'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-[#9c8e85] block">Saldo Atual</span>
                    <span className="text-sm font-bold font-serif text-[#1a1614]">
                      {formatCurrency(acc.balance)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={onOpenTransferModal}
                className="px-4 py-2 rounded-xl border border-[#dfd7cc] bg-white text-xs font-semibold text-[#574d46] hover:bg-[#f8f5f1] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Nova Transferência</span>
              </button>

              <button
                onClick={() => {
                  const name = prompt('Nome do Banco/Conta (ex: Nubank PJ, Itaú):');
                  if (!name) return;
                  const balanceStr = prompt('Saldo inicial (R$):', '0');
                  const bal = parseFloat((balanceStr || '0').replace(',', '.')) || 0;
                  addBankAccount({
                    name,
                    balance: bal,
                    type: 'bank',
                    color: '#c58a4b',
                    iconName: 'Building2',
                  });
                }}
                className="px-4 py-2 rounded-xl bg-[#c58a4b] text-white text-xs font-bold hover:bg-[#b0783d] transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Adicionar Banco</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
