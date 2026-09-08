import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowRightLeft,
  ArrowUpRight,
  Banknote,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Edit2,
  Filter,
  Lock,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  Vault,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
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
import { BankAccount, Transaction } from '../../types';
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
    totalPhysicalCash,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    transactions,
    deleteTransaction,
    exportTransactionsCSV,
    selectedMonth,
  } = useFinance();

  // Hub Subtabs
  const [activeSubtab, setActiveSubtab] = useState<'accounts' | 'charts' | 'txs'>('accounts');

  // Add/Edit Bank modal state
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);

  // Bank Form State
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('');
  const [accountType, setAccountType] = useState<'bank' | 'fintech' | 'investment' | 'physical_cash'>('bank');
  const [color, setColor] = useState('#c58a4b');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankCode, setBankCode] = useState('');

  // Transactions local search & filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all'); // all, income, expense, transfer
  const [filterAccount, setFilterAccount] = useState<string>('all');

  const handleOpenAdd = () => {
    setEditingAccount(null);
    setName('');
    setBalance('');
    setAccountType('bank');
    setColor('#c58a4b');
    setAccountNumber('');
    setBankCode('');
    setIsAddAccountOpen(true);
  };

  const handleOpenEdit = (acc: BankAccount) => {
    setEditingAccount(acc);
    setName(acc.name);
    setBalance(acc.balance.toString());
    setAccountType(acc.type);
    setColor(acc.color);
    setAccountNumber(acc.accountNumber || '');
    setBankCode(acc.bankCode || '');
    setIsAddAccountOpen(true);
  };

  const handleSaveAccount = (e: React.FormEvent) => {
    e.preventDefault();
    const numBalance = parseFloat(balance.replace(',', '.')) || 0;

    if (!name.trim()) return;

    if (editingAccount) {
      updateBankAccount(editingAccount.id, {
        name,
        balance: numBalance,
        type: accountType,
        color,
        accountNumber,
        bankCode,
      });
    } else {
      addBankAccount({
        name,
        balance: numBalance,
        type: accountType,
        color,
        iconName: accountType === 'physical_cash' ? 'Banknote' : 'Building2',
        accountNumber,
        bankCode,
      });
    }

    setIsAddAccountOpen(false);
  };

  // Pre-calculated stats for the currently selected month in standard context
  const currentMonthTransactions = useMemo(() => {
    return transactions.filter((t) => !selectedMonth || t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const monthlyIncome = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'income' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const monthlyExpense = useMemo(() => {
    return currentMonthTransactions
      .filter((t) => t.type === 'expense' && t.status === 'completed')
      .reduce((sum, t) => sum + t.amount, 0);
  }, [currentMonthTransactions]);

  const monthlySavingsRate = useMemo(() => {
    return monthlyIncome > 0 ? Math.max(0, ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100) : 0;
  }, [monthlyIncome, monthlyExpense]);

  // Area Chart Data: Day by day accumulation or comparison
  const areaChartData = useMemo(() => {
    const dailyMap: Record<string, { day: string; receitas: number; despesas: number }> = {};
    
    // Fallback template for days
    for (let i = 1; i <= 30; i += 3) {
      const dayStr = `Dia ${i}`;
      dailyMap[dayStr] = { day: dayStr, receitas: 0, despesas: 0 };
    }

    currentMonthTransactions.forEach((t) => {
      if (t.status !== 'completed') return;
      const dayNum = parseInt(t.date.split('-')[2]) || 1;
      const bucket = `Dia ${dayNum}`;
      if (!dailyMap[bucket]) {
        dailyMap[bucket] = { day: bucket, receitas: 0, despesas: 0 };
      }
      if (t.type === 'income') dailyMap[bucket].receitas += t.amount;
      if (t.type === 'expense') dailyMap[bucket].despesas += t.amount;
    });

    return Object.values(dailyMap).sort((a, b) => {
      const numA = parseInt(a.day.replace('Dia ', ''));
      const numB = parseInt(b.day.replace('Dia ', ''));
      return numA - numB;
    });
  }, [currentMonthTransactions]);

  // Pie Chart category distribution
  const expensePieData = useMemo(() => {
    const categoriesMap: Record<string, { name: string; value: number; color: string }> = {
      projetos: { name: 'Marketing/Projetos', value: 0, color: '#c58a4b' },
      escritorio: { name: 'Aluguel & Escritório', value: 0, color: '#3b82f6' },
      ferramentas: { name: 'Softwares & Ferramentas', value: 0, color: '#8b5cf6' },
      lazer: { name: 'Viagens & Clientes', value: 0, color: '#ec4899' },
      outros: { name: 'Impostos & Diversos', value: 0, color: '#64748b' },
    };

    currentMonthTransactions
      .filter((t) => t.type === 'expense' && t.status === 'completed')
      .forEach((t) => {
        const cat = t.category || 'outros';
        const target = categoriesMap[cat] || categoriesMap.outros;
        target.value += t.amount;
      });

    return Object.values(categoriesMap).filter((item) => item.value > 0);
  }, [currentMonthTransactions]);

  // Live transaction log filtering
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Month selector filter
      if (selectedMonth && !t.date.startsWith(selectedMonth)) {
        if (!searchTerm) return false;
      }

      // Filter by type
      if (filterType !== 'all') {
        if (filterType === 'income' && t.type !== 'income') return false;
        if (filterType === 'expense' && t.type !== 'expense') return false;
        if (filterType === 'transfer' && t.type !== 'transfer') return false;
      }

      // Filter by bank account
      if (filterAccount !== 'all') {
        if (t.bankAccountId !== filterAccount && t.toBankAccountId !== filterAccount) return false;
      }

      // Filter by text search
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesDesc = t.description.toLowerCase().includes(term);
        const matchesClient = t.clientName?.toLowerCase().includes(term);
        const matchesNotes = t.notes?.toLowerCase().includes(term);
        if (!matchesDesc && !matchesClient && !matchesNotes) return false;
      }

      return true;
    });
  }, [transactions, selectedMonth, filterType, filterAccount, searchTerm]);

  const regularBanks = bankAccounts.filter((a) => a.type !== 'physical_cash' && a.id !== 'cash-wallet');
  const physicalCashAcc = bankAccounts.find((a) => a.type === 'physical_cash' || a.id === 'cash-wallet');

  return (
    <div className="space-y-6 pb-12" id="finance-hub-main">
      {/* Visual Header / Subtitle */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-6 rounded-2xl bg-[#1c1815] border border-[#3d342f]">
        <div>
          <h2 className="text-xl font-serif font-bold text-[#fcf8f5] flex items-center gap-2.5">
            <Wallet className="w-6 h-6" style={{ color: 'var(--theme-primary)' }} />
            Centro Financeiro Integrado
          </h2>
          <p className="text-xs text-[#a89c93] mt-1.5 max-w-2xl">
            Sua tesouraria completa. Gerencie saldos bancários, visualize relatórios de margens de projetos arquitetônicos e controle o livro caixa em tempo real.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          {activeSubtab === 'accounts' && (
            <>
              <button
                onClick={onOpenTransferModal}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#241e1b] hover:bg-[#2e2622] text-[#fcf8f5] text-xs font-semibold border border-[#3d342f] transition-all cursor-pointer active:scale-95"
              >
                <ArrowRightLeft className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                <span>Transferência</span>
              </button>
              <button
                onClick={handleOpenAdd}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-black text-xs font-bold transition-all active:scale-95 shadow-md hover:brightness-110 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-primary)' }}
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Adicionar Banco</span>
              </button>
            </>
          )}

          {activeSubtab === 'txs' && (
            <>
              <button
                onClick={() => exportTransactionsCSV()}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#241e1b] hover:bg-[#2e2622] text-[#fcf8f5] text-xs font-semibold border border-[#3d342f] transition-all cursor-pointer"
              >
                <span>Exportar CSV</span>
              </button>
              {onOpenNewTxModal && (
                <button
                  onClick={() => onOpenNewTxModal('expense')}
                  className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-black text-xs font-bold transition-all active:scale-95 shadow-md hover:brightness-110 cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-primary)' }}
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Novo Lançamento</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rhythmic Spacing Navigation Subtabs */}
      <div className="flex items-center gap-1 bg-[#14110f] p-1 rounded-xl border border-[#3d342f] max-w-md">
        <button
          onClick={() => setActiveSubtab('accounts')}
          className={`flex-1 text-center py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
            activeSubtab === 'accounts'
              ? 'bg-[#241e1b] text-[#fcf8f5] border border-[#3d342f]/40 font-semibold'
              : 'text-[#a89c93] hover:text-[#fcf8f5]'
          }`}
        >
          Contas & Caixa
        </button>
        <button
          onClick={() => setActiveSubtab('charts')}
          className={`flex-1 text-center py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
            activeSubtab === 'charts'
              ? 'bg-[#241e1b] text-[#fcf8f5] border border-[#3d342f]/40 font-semibold'
              : 'text-[#a89c93] hover:text-[#fcf8f5]'
          }`}
        >
          Resultados
        </button>
        <button
          onClick={() => setActiveSubtab('txs')}
          className={`flex-1 text-center py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
            activeSubtab === 'txs'
              ? 'bg-[#241e1b] text-[#fcf8f5] border border-[#3d342f]/40 font-semibold'
              : 'text-[#a89c93] hover:text-[#fcf8f5]'
          }`}
        >
          Livro Caixa
        </button>
      </div>

      {/* SUBTAB 1: CONTAS & CAIXA */}
      {activeSubtab === 'accounts' && (
        <div className="space-y-6" id="subtab-accounts">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#1c1815] border border-[#3d342f] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#a89c93] font-medium">Patrimônio Consolidado</span>
                <div className="text-2xl font-serif font-bold text-[#fcf8f5] mt-1.5">
                  {formatCurrency(totalNetWorth)}
                </div>
                <span className="text-[10px] text-[#7a6f68] block mt-1">Soma de todos os saldos integrados</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
                <Wallet className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#1c1815] border border-[#3d342f] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#a89c93] font-medium">Saldo em Bancos</span>
                <div className="text-2xl font-serif font-bold text-[#fcf8f5] mt-1.5" style={{ color: 'var(--theme-primary)' }}>
                  {formatCurrency(totalBankBalance)}
                </div>
                <span className="text-[10px] text-[#7a6f68] block mt-1">{regularBanks.length} contas bancárias ativas</span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/25">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#1c1815] border border-[#3d342f] flex items-center justify-between">
              <div>
                <span className="text-xs text-[#a89c93] font-medium">Dinheiro Físico (Cofre/Espécie)</span>
                <div className="text-2xl font-serif font-bold text-[#fcf8f5] mt-1.5 text-yellow-500">
                  {formatCurrency(totalPhysicalCash)}
                </div>
                <span className="text-[10px] text-[#7a6f68] block mt-1">Reserva guardada fisicamente</span>
              </div>
              <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/25">
                <Banknote className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Regular Banks Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-serif font-bold text-[#fcf8f5] flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#a89c93]" />
              Contas Correntes e Investimentos
            </h3>

            {regularBanks.length === 0 ? (
              <div className="p-8 rounded-2xl border border-dashed border-[#3d342f] text-center text-[#a89c93]">
                <Building2 className="w-8 h-8 mx-auto text-[#7a6f68] mb-3" />
                <p className="text-xs font-medium">Nenhum banco ou corretora cadastrado.</p>
                <button
                  onClick={handleOpenAdd}
                  className="mt-3 text-xs font-bold underline cursor-pointer"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  Adicionar primeira conta
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {regularBanks.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-5 rounded-2xl bg-[#1c1815] border border-[#3d342f] relative group hover:border-[#52463e] transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg text-white"
                          style={{ backgroundColor: acc.color }}
                        >
                          {acc.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-[#fcf8f5]">{acc.name}</h4>
                          <span className="text-[10px] text-[#a89c93] uppercase font-bold tracking-wider">
                            {acc.type === 'investment' ? 'Investimentos' : acc.type === 'fintech' ? 'Fintech / Digital' : 'Banco Tradicional'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 bg-[#14110f] p-1 rounded-lg border border-[#3d342f]">
                        <button
                          onClick={() => handleOpenEdit(acc)}
                          className="p-1.5 text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#241e1b] rounded transition-all cursor-pointer"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja excluir a conta "${acc.name}"? Todos os lançamentos associados perderão o vínculo.`)) {
                              deleteBankAccount(acc.id);
                            }
                          }}
                          className="p-1.5 text-[#a89c93] hover:text-red-400 hover:bg-[#241e1b] rounded transition-all cursor-pointer"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-5 flex items-baseline justify-between border-t border-[#3d342f]/40 pt-4">
                      <span className="text-xs text-[#a89c93]">Saldo em Conta</span>
                      <span className="text-lg font-bold font-serif text-[#fcf8f5]">
                        {formatCurrency(acc.balance)}
                      </span>
                    </div>

                    {(acc.accountNumber || acc.bankCode) && (
                      <p className="text-[10px] text-[#7a6f68] mt-1.5 font-mono">
                        {acc.bankCode ? `Cod: ${acc.bankCode}` : ''} {acc.accountNumber ? `| Ag/Cc: ${acc.accountNumber}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Physical Cash Vault Panel */}
          <div className="p-6 rounded-2xl bg-[#1c1815] border border-[#3d342f] relative overflow-hidden space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
                  <Banknote className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[#fcf8f5]">Cofre Interno & Espécie</h4>
                  <p className="text-xs text-[#a89c93] mt-0.5">Gestão dedicada de papel-moeda físico do escritório</p>
                </div>
              </div>

              <button
                onClick={onOpenCashModal}
                className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <Vault className="w-4 h-4" />
                <span>Movimentar Cofre</span>
              </button>
            </div>

            <div className="p-4 bg-[#14110f] rounded-xl border border-[#3d342f]/60 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-[#a89c93]">Saldo Físico em Mãos</span>
                <div className="text-3xl font-serif font-bold text-yellow-500 mt-1">
                  {formatCurrency(totalPhysicalCash)}
                </div>
                <span className="text-[10px] text-[#7a6f68] block mt-1">Recomendado manter apenas valores operacionais</span>
              </div>

              <div className="flex flex-col justify-center text-xs text-[#a89c93] space-y-2 border-t sm:border-t-0 sm:border-l border-[#3d342f] pt-3 sm:pt-0 sm:pl-4">
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-yellow-500/70" />
                  <span>Segurança aprimorada com criptografia local</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sincronização imediata nas regras do Firestore</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 2: RESULTADOS & INDICADORES */}
      {activeSubtab === 'charts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="subtab-charts">
          {/* Main Chart Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="p-5 rounded-2xl bg-[#1c1815] border border-[#3d342f]">
              <div className="flex items-center justify-between gap-3 mb-6">
                <div>
                  <h3 className="text-base font-serif font-bold text-[#fcf8f5]">Histórico de Lançamentos</h3>
                  <p className="text-[11px] text-[#a89c93] mt-0.5">Análise temporal de fluxo de caixa operacional</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center gap-1 text-[#fcf8f5] font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--theme-primary)]" /> Receitas
                  </span>
                  <span className="flex items-center gap-1 text-[#fcf8f5] font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Despesas
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaChartData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--theme-primary)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--theme-primary)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f87171" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f87171" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="day" stroke="#7a6f68" fontSize={10} tickLine={false} />
                    <YAxis stroke="#7a6f68" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1c1815', borderColor: '#3d342f', borderRadius: 12, color: '#fcf8f5' }}
                      labelClassName="font-bold text-xs"
                    />
                    <Area type="monotone" dataKey="receitas" stroke="var(--theme-primary)" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" name="Receitas" />
                    <Area type="monotone" dataKey="despesas" stroke="#f87171" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" name="Despesas" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Incomes & Expenses Overview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-[#1c1815] border border-[#3d342f] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#a89c93]">Receitas Faturadas</span>
                  <div className="text-xl font-bold font-serif text-emerald-400 mt-1">
                    {formatCurrency(monthlyIncome)}
                  </div>
                </div>
                <ArrowUpRight className="w-5 h-5 text-emerald-400 bg-emerald-500/10 p-1.5 rounded-full" />
              </div>

              <div className="p-4 rounded-xl bg-[#1c1815] border border-[#3d342f] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#a89c93]">Despesas Pagas</span>
                  <div className="text-xl font-bold font-serif text-red-400 mt-1">
                    {formatCurrency(monthlyExpense)}
                  </div>
                </div>
                <ArrowDownRight className="w-5 h-5 text-red-400 bg-red-500/10 p-1.5 rounded-full" />
              </div>
            </div>
          </div>

          {/* Sidebar Metrics */}
          <div className="space-y-6">
            {/* Savings Rate Card */}
            <div className="p-5 rounded-2xl bg-[#1c1815] border border-[#3d342f] text-center">
              <span className="text-xs text-[#a89c93] block">Taxa de Conversão de Lucro</span>
              <div className="text-4xl font-serif font-bold text-[#fcf8f5] mt-2">
                {monthlySavingsRate.toFixed(1)}%
              </div>
              <div className="w-full bg-[#14110f] h-2 rounded-full overflow-hidden mt-4 border border-[#3d342f]">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{ width: `${Math.min(100, monthlySavingsRate)}%` }}
                />
              </div>
              <p className="text-[10px] text-[#7a6f68] mt-3">
                Porcentagem de faturamento que virou saldo líquido neste mês.
              </p>
            </div>

            {/* Expense Distribution Category Pie */}
            <div className="p-5 rounded-2xl bg-[#1c1815] border border-[#3d342f]">
              <h3 className="text-sm font-serif font-bold text-[#fcf8f5] mb-4">Distribuição de Gastos</h3>
              
              {expensePieData.length === 0 ? (
                <p className="text-xs text-[#a89c93] text-center py-8">Nenhuma despesa para exibir gráficos.</p>
              ) : (
                <div className="space-y-4">
                  <div className="h-40 w-full flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expensePieData}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {expensePieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1c1815', borderColor: '#3d342f', borderRadius: 12, color: '#fcf8f5' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="space-y-1.5">
                    {expensePieData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5 text-[#a89c93]">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </span>
                        <span className="font-semibold text-[#fcf8f5]">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: LIVRO CAIXA (TRANSAÇÕES) */}
      {activeSubtab === 'txs' && (
        <div className="space-y-4" id="subtab-transactions">
          {/* Filters Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-[#1c1815] border border-[#3d342f]">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a89c93]" />
              <input
                type="text"
                placeholder="Buscar por descrição, cliente ou notas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl pl-10 pr-4 py-2 text-xs text-[#fcf8f5] placeholder-[#7a6f68] focus:outline-none focus:border-[#c58a4b] transition-colors"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14110f] border border-[#3d342f] rounded-xl text-xs text-[#a89c93]">
                <Filter className="w-3.5 h-3.5" />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-transparent text-[#fcf8f5] focus:outline-none cursor-pointer font-medium"
                >
                  <option value="all" className="bg-[#1c1815]">Todos os Tipos</option>
                  <option value="income" className="bg-[#1c1815]">Receitas</option>
                  <option value="expense" className="bg-[#1c1815]">Despesas</option>
                  <option value="transfer" className="bg-[#1c1815]">Transferências</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#14110f] border border-[#3d342f] rounded-xl text-xs text-[#a89c93]">
                <Building2 className="w-3.5 h-3.5" />
                <select
                  value={filterAccount}
                  onChange={(e) => setFilterAccount(e.target.value)}
                  className="bg-transparent text-[#fcf8f5] focus:outline-none cursor-pointer font-medium"
                >
                  <option value="all" className="bg-[#1c1815]">Todas as Contas</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.id} value={acc.id} className="bg-[#1c1815]">{acc.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Transactions Log Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#3d342f] bg-[#1c1815]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#3d342f] bg-[#241e1b]/45 text-[10px] uppercase font-bold tracking-wider text-[#a89c93]">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Descrição</th>
                  <th className="py-3 px-4">Origem / Destino</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-right">Valor</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3d342f]/50 text-xs">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#a89c93]">
                      Nenhuma transação encontrada para os filtros aplicados neste mês.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-[#241e1b]/30 transition-all">
                      <td className="py-3.5 px-4 font-medium text-[#fcf8f5] whitespace-nowrap">
                        {formatDate(tx.date)}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#fcf8f5]">{tx.description}</div>
                        {tx.notes && <div className="text-[10px] text-[#7a6f68] font-medium mt-0.5">{tx.notes}</div>}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#14110f] border border-[#3d342f] text-[#a89c93]">
                          {tx.bankAccountId === 'cash-wallet' ? 'Cofre Físico' : bankAccounts.find(a => a.id === tx.bankAccountId)?.name || 'Banco'}
                        </span>
                        {tx.toBankAccountId && (
                          <span className="text-[10px] text-[#7a6f68] mx-1.5 font-bold">➔ {bankAccounts.find(a => a.id === tx.toBankAccountId)?.name || 'Cofre'}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-[#241e1b] text-[#fcf8f5] border border-[#3d342f]">
                          {tx.type === 'income' ? (tx.incomeSource === 'clt' ? 'CLT / Pro-labore' : 'Projetos') : (tx.category || 'Geral')}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                        {tx.type === 'income' ? (
                          <span className="text-emerald-400">+{formatCurrency(tx.amount)}</span>
                        ) : tx.type === 'expense' ? (
                          <span className="text-red-400">-{formatCurrency(tx.amount)}</span>
                        ) : (
                          <span className="text-blue-400">{formatCurrency(tx.amount)}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => {
                            if (confirm(`Excluir este lançamento de "${tx.description}"? Isso reverterá o saldo correspondente.`)) {
                              deleteTransaction(tx.id);
                            }
                          }}
                          className="p-1.5 text-[#a89c93] hover:text-red-400 hover:bg-[#14110f] rounded-lg transition-all cursor-pointer"
                          title="Remover Lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Add/Edit account */}
      {isAddAccountOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1c1815] border border-[#3d342f] rounded-2xl max-w-md w-full p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-serif font-bold text-[#fcf8f5] mb-4">
              {editingAccount ? 'Editar Conta Bancária' : 'Cadastrar Conta Bancária'}
            </h3>

            <form onSubmit={handleSaveAccount} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-[#a89c93] mb-1">Nome do Banco / Corretora</label>
                <input
                  type="text"
                  placeholder="Ex: Nubank, Itaú, XP"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#a89c93] mb-1">Saldo Inicial (R$)</label>
                  <input
                    type="text"
                    placeholder="0,00"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#a89c93] mb-1">Tipo de Conta</label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value as any)}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-1.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
                  >
                    <option value="bank" className="bg-[#1c1815]">Tradicional</option>
                    <option value="fintech" className="bg-[#1c1815]">Fintech</option>
                    <option value="investment" className="bg-[#1c1815]">Investimento</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#a89c93] mb-1">Cód. Banco (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 260, 341"
                    value={bankCode}
                    onChange={(e) => setBankCode(e.target.value)}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase tracking-wider font-bold text-[#a89c93] mb-1">Conta / Agência (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 0001 / 12345-6"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-wider font-bold text-[#a89c93] mb-1.5">Cor Temática do Banco</label>
                <div className="flex flex-wrap gap-2">
                  {['#820ad1', '#f50d41', '#e57706', '#009aeb', '#c58a4b', '#10b981', '#64748b'].map((hex) => (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setColor(hex)}
                      className={`w-6 h-6 rounded-full border-2 transition-all cursor-pointer ${color === hex ? 'border-[#fcf8f5] scale-110' : 'border-transparent'}`}
                      style={{ backgroundColor: hex }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-[#3d342f]/40">
                <button
                  type="button"
                  onClick={() => setIsAddAccountOpen(false)}
                  className="flex-1 py-2 text-xs font-semibold rounded-xl bg-[#241e1b] hover:bg-[#2e2622] text-[#fcf8f5] border border-[#3d342f] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 text-xs font-bold rounded-xl text-black transition-colors hover:brightness-110 cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-primary)' }}
                >
                  Salvar Conta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
