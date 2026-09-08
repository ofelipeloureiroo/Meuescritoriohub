import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  Edit2,
  HeartHandshake,
  Home,
  Laptop,
  Palmtree,
  PiggyBank,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { SavingsGoal } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const SavingsGoalsTab: React.FC = () => {
  const {
    savingsGoals,
    bankAccounts,
    totalPhysicalCash,
    addSavingsGoal,
    updateSavingsGoal,
    deleteSavingsGoal,
    contributeToGoal,
    monthlyExpenseSummary,
  } = useFinance();

  const [isAddGoalOpen, setIsAddGoalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [title, setTitle] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('0');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState<'casa' | 'carro' | 'lazer' | 'reserva' | 'investimento' | 'equipamento'>('reserva');
  const [color, setColor] = useState('#10b981');

  // Contribution modal
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [selectedGoalForContribution, setSelectedGoalForContribution] = useState<SavingsGoal | null>(null);
  const [contributionVal, setContributionVal] = useState('');
  const [sourceAccountId, setSourceAccountId] = useState(bankAccounts[0]?.id || '');

  // Calculated stats
  const totalSavedGoals = savingsGoals.reduce((sum, g) => sum + g.currentAmount, 0);
  const totalTargetGoals = savingsGoals.reduce((sum, g) => sum + g.targetAmount, 0);
  const overallProgress = totalTargetGoals > 0 ? (totalSavedGoals / totalTargetGoals) * 100 : 0;

  // Emergency Fund Benchmark (6 months of Casa + Carro + Alimentação)
  const monthlyFixedCost =
    monthlyExpenseSummary.byCategory.casa +
    monthlyExpenseSummary.byCategory.carro +
    monthlyExpenseSummary.byCategory.alimentacao;
  const recommendedEmergencyFund = Math.max(15000, monthlyFixedCost * 6);

  const handleOpenAdd = () => {
    setEditingGoal(null);
    setTitle('');
    setTargetAmount('');
    setCurrentAmount('0');
    setTargetDate('');
    setCategory('reserva');
    setColor('#10b981');
    setIsAddGoalOpen(true);
  };

  const handleOpenEdit = (g: SavingsGoal) => {
    setEditingGoal(g);
    setTitle(g.title);
    setTargetAmount(g.targetAmount.toString());
    setCurrentAmount(g.currentAmount.toString());
    setTargetDate(g.targetDate || '');
    setCategory(g.category);
    setColor(g.color);
    setIsAddGoalOpen(true);
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const tgt = parseFloat(targetAmount.replace(',', '.')) || 0;
    const cur = parseFloat(currentAmount.replace(',', '.')) || 0;

    if (!title.trim() || tgt <= 0) return;

    if (editingGoal) {
      updateSavingsGoal(editingGoal.id, {
        title,
        targetAmount: tgt,
        currentAmount: cur,
        targetDate,
        category,
        color,
      });
    } else {
      addSavingsGoal({
        title,
        targetAmount: tgt,
        currentAmount: cur,
        targetDate,
        category,
        color,
      });
    }
    setIsAddGoalOpen(false);
  };

  const handleOpenContribute = (g: SavingsGoal) => {
    setSelectedGoalForContribution(g);
    setContributionVal('');
    setSourceAccountId(bankAccounts[0]?.id || '');
    setIsContributeOpen(true);
  };

  const handleConfirmContribution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalForContribution) return;
    const val = parseFloat(contributionVal.replace(',', '.')) || 0;
    if (val <= 0) return;

    contributeToGoal(selectedGoalForContribution.id, val, sourceAccountId);
    setIsContributeOpen(false);

    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }
  };

  const getCategoryIcon = (cat: SavingsGoal['category']) => {
    switch (cat) {
      case 'casa':
        return <Home className="w-5 h-5" />;
      case 'reserva':
        return <ShieldCheck className="w-5 h-5" />;
      case 'lazer':
        return <Palmtree className="w-5 h-5" />;
      case 'equipamento':
        return <Laptop className="w-5 h-5" />;
      default:
        return <PiggyBank className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#18181b] border border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <PiggyBank className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-[#fafafa] tracking-tight">
              Metas de Poupança & Guardar Dinheiro
            </h2>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-1 max-w-2xl">
            Planejamento inteligente para acumular capital, construir sua reserva de emergência e conquistar seus sonhos.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-bold transition-all active:scale-95 shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Criar Nova Meta</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a]">
          <span className="text-[11px] text-[#a1a1aa] font-medium block">Total Já Guardado em Metas</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">
            {formatCurrency(totalSavedGoals)}
          </div>
          <span className="text-[10px] text-[#71717a] mt-1 block">
            {overallProgress.toFixed(1)}% do objetivo total acumulado
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a]">
          <span className="text-[11px] text-[#a1a1aa] font-medium block">Objetivo Total das Metas</span>
          <div className="text-2xl font-bold text-[#fafafa] mt-1">
            {formatCurrency(totalTargetGoals)}
          </div>
          <span className="text-[10px] text-[#71717a] mt-1 block">
            Falta guardar {formatCurrency(Math.max(0, totalTargetGoals - totalSavedGoals))}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-[#18181b] border border-[#27272a]">
          <span className="text-[11px] text-[#a1a1aa] font-medium block">Reserva de Emergência Recomendada</span>
          <div className="text-2xl font-bold text-blue-400 mt-1">
            {formatCurrency(recommendedEmergencyFund)}
          </div>
          <span className="text-[10px] text-blue-400/80 mt-1 block">
            Baseado em 6 meses do custo de vida
          </span>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {savingsGoals.map((goal) => {
          const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);

          return (
            <div
              key={goal.id}
              className="p-5 rounded-2xl bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] transition-all flex flex-col justify-between space-y-4 relative overflow-hidden"
            >
              {/* Colored top bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1"
                style={{ backgroundColor: goal.color }}
              />

              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm"
                      style={{ backgroundColor: goal.color }}
                    >
                      {getCategoryIcon(goal.category)}
                    </div>
                    <div>
                      <h3 className="font-bold text-[#fafafa] text-sm">{goal.title}</h3>
                      <span className="text-[10px] uppercase font-bold text-[#a1a1aa]">
                        {goal.category}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(goal)}
                      className="p-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-[#fafafa] transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteSavingsGoal(goal.id)}
                      className="p-1.5 rounded-lg bg-[#27272a] hover:bg-rose-500/20 text-[#a1a1aa] hover:text-rose-400 transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress Numbers */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-xl font-bold text-[#fafafa]">
                      {formatCurrency(goal.currentAmount)}
                    </span>
                    <span className="text-[#a1a1aa] text-xs">
                      de {formatCurrency(goal.targetAmount)}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full h-2 bg-[#09090b] rounded-full overflow-hidden border border-[#27272a]">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, progress)}%`,
                        backgroundColor: goal.color,
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-[11px] text-[#a1a1aa] pt-0.5">
                    <span>{progress.toFixed(1)}% concluído</span>
                    <span>Faltam {formatCurrency(remaining)}</span>
                  </div>
                </div>

                {goal.targetDate && (
                  <div className="flex items-center gap-1 text-[11px] text-[#71717a]">
                    <Calendar className="w-3 h-3" />
                    <span>Meta para: {formatDate(goal.targetDate)}</span>
                  </div>
                )}
              </div>

              {/* Action Button: Guardar Dinheiro Nesta Meta */}
              <div className="pt-3 border-t border-[#27272a]">
                <button
                  onClick={() => handleOpenContribute(goal)}
                  className="w-full py-2 px-3 rounded-full bg-[#27272a] hover:bg-emerald-500 hover:text-black text-[#fafafa] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Fazer Aporte / Guardar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Goal Modal */}
      {isAddGoalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#18181b] border border-[#27272a] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#fafafa]">
              {editingGoal ? 'Editar Meta' : 'Cadastrar Nova Meta de Poupança'}
            </h3>

            <form onSubmit={handleSaveGoal} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Título do Objetivo *</label>
                <input
                  type="text"
                  placeholder="Ex: Quitação da Casa, Viagem Férias, Reserva..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a1a1aa] font-medium mb-1">Valor Alvo (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[#a1a1aa] font-medium mb-1">Saldo Atual (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    value={currentAmount}
                    onChange={(e) => setCurrentAmount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#a1a1aa] font-medium mb-1">Categoria</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    <option value="reserva">Reserva de Emergência</option>
                    <option value="casa">Casa / Quitação</option>
                    <option value="carro">Carro / Veículo</option>
                    <option value="lazer">Lazer / Viagem</option>
                    <option value="equipamento">Equipamento Freela</option>
                    <option value="investimento">Investimentos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#a1a1aa] font-medium mb-1">Data Prevista (Opcional)</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Cor de Destaque</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                  />
                  <span className="font-mono text-[#a1a1aa] text-xs">{color}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setIsAddGoalOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-colors cursor-pointer"
                >
                  Salvar Meta
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribution Modal */}
      {isContributeOpen && selectedGoalForContribution && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-[#18181b] border border-[#27272a] p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#fafafa]">
              Guardar Dinheiro na Meta: {selectedGoalForContribution.title}
            </h3>

            <form onSubmit={handleConfirmContribution} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Valor do Aporte (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={contributionVal}
                  onChange={(e) => setContributionVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#09090b] border border-[#27272a] text-[#fafafa] text-base font-bold focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[#a1a1aa] font-medium mb-1">Origem dos Recursos</label>
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

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#27272a]">
                <button
                  type="button"
                  onClick={() => setIsContributeOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#27272a] hover:bg-[#3f3f46] text-[#fafafa] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-colors cursor-pointer"
                >
                  Confirmar Aporte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
