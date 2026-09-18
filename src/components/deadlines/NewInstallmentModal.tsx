import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Plus,
  User,
  X,
  Building2,
  Sparkles,
} from 'lucide-react';
import { ProjectInstallment } from '../../types';
import { useFinance } from '../../context/FinanceContext';

interface NewInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
}

export const NewInstallmentModal: React.FC<NewInstallmentModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
}) => {
  const {
    architectureProjects = [],
    clients = [],
    freelanceProjects = [],
    addProjectInstallment,
  } = useFinance();

  // Consolidate project sources
  const combinedOptions = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      clientName: string;
      clientPhone?: string;
      source: 'arch' | 'freelance' | 'client';
    }> = [];

    // 1. Architecture Projects
    (architectureProjects || []).forEach((p) => {
      list.push({
        id: p.id,
        title: p.title || 'Projeto sem Título',
        clientName: p.clientName || 'Cliente sem Nome',
        clientPhone: p.clientPhone,
        source: 'arch',
      });
    });

    // 2. Freelance Projects (if not already included)
    (freelanceProjects || []).forEach((fp) => {
      if (!list.some((item) => item.id === fp.id)) {
        list.push({
          id: fp.id,
          title: fp.title || 'Projeto Freelance',
          clientName: fp.clientName || 'Cliente',
          source: 'freelance',
        });
      }
    });

    // 3. Standalone Clients
    (clients || []).forEach((cli) => {
      if (!list.some((item) => item.clientName.toLowerCase() === (cli.name || '').toLowerCase())) {
        list.push({
          id: `cli_${cli.id}`,
          title: `Projeto - ${cli.name}`,
          clientName: cli.name,
          clientPhone: cli.phone,
          source: 'client',
        });
      }
    });

    return list;
  }, [architectureProjects, freelanceProjects, clients]);

  const [selectedId, setSelectedId] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customProjectTitle, setCustomProjectTitle] = useState<string>('');
  const [customClientName, setCustomClientName] = useState<string>('');
  const [customClientPhone, setCustomClientPhone] = useState<string>('');

  const [installmentNumber, setInstallmentNumber] = useState(1);
  const [totalInstallments, setTotalInstallments] = useState(3);
  const [description, setDescription] = useState('Sinal / Início do Projeto');
  const [amount, setAmount] = useState<number>(3500);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  // Set initial selected ID whenever options or modal open changes
  useEffect(() => {
    if (isOpen) {
      if (defaultProjectId && combinedOptions.some((o) => o.id === defaultProjectId)) {
        setSelectedId(defaultProjectId);
        setIsCustomMode(false);
      } else if (combinedOptions.length > 0) {
        setSelectedId(combinedOptions[0].id);
        setIsCustomMode(false);
      } else {
        setIsCustomMode(true);
      }
    }
  }, [isOpen, defaultProjectId, combinedOptions]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !dueDate) return;

    let finalProjectId = '';
    let finalProjectTitle = '';
    let finalClientName = '';
    let finalClientPhone = '';

    if (isCustomMode || combinedOptions.length === 0) {
      if (!customProjectTitle.trim() && !customClientName.trim()) {
        alert('Por favor, informe o nome do projeto ou cliente.');
        return;
      }
      finalProjectId = `proj_manual_${Date.now()}`;
      finalProjectTitle = customProjectTitle.trim() || `Projeto ${customClientName.trim()}`;
      finalClientName = customClientName.trim() || 'Cliente';
      finalClientPhone = customClientPhone.trim();
    } else {
      const selected = combinedOptions.find((o) => o.id === selectedId);
      if (!selected) {
        alert('Por favor, selecione um projeto ou cliente.');
        return;
      }
      finalProjectId = selected.id;
      finalProjectTitle = selected.title;
      finalClientName = selected.clientName;
      finalClientPhone = selected.clientPhone || '';
    }

    addProjectInstallment({
      projectId: finalProjectId,
      projectTitle: finalProjectTitle,
      clientName: finalClientName,
      clientPhone: finalClientPhone,
      installmentNumber,
      totalInstallments,
      description,
      amount,
      dueDate,
      status: 'pending',
      notes,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-card-hover)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--theme-primary)]/15 border border-[var(--theme-primary)]/30 flex items-center justify-center text-[var(--theme-primary)]">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[var(--text-main)]">
                Nova Parcela de Honorários
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Cadastrar cobrança ou etapa de pagamento do projeto
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-[var(--bg-input)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project & Client Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[var(--text-main)]">
                Projeto / Cliente *
              </label>
              {combinedOptions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsCustomMode(!isCustomMode)}
                  className="text-[11px] text-[var(--theme-primary)] hover:underline cursor-pointer font-medium"
                >
                  {isCustomMode ? 'Selecionar da Lista' : '+ Digitar Novo Projeto/Cliente'}
                </button>
              )}
            </div>

            {!isCustomMode && combinedOptions.length > 0 ? (
              <select
                value={selectedId}
                onChange={(e) => {
                  if (e.target.value === '__custom__') {
                    setIsCustomMode(true);
                  } else {
                    setSelectedId(e.target.value);
                  }
                }}
                required
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              >
                {combinedOptions.map((opt) => (
                  <option key={opt.id} value={opt.id} className="bg-[var(--bg-card)] text-[var(--text-main)]">
                    {opt.title} — {opt.clientName}
                  </option>
                ))}
                <option value="__custom__" className="bg-[var(--bg-card)] text-[var(--theme-primary)] font-semibold">
                  + Digitar outro Projeto ou Cliente...
                </option>
              </select>
            ) : (
              <div className="space-y-2.5 p-3 rounded-xl bg-[var(--bg-input)]/50 border border-[var(--border-color)]">
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">Nome do Projeto</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Reforma Residencial Jardins"
                    value={customProjectTitle}
                    onChange={(e) => setCustomProjectTitle(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">Nome do Cliente</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Mariana Silva"
                      value={customClientName}
                      onChange={(e) => setCustomClientName(e.target.value)}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[var(--text-muted)] mb-1">WhatsApp (DDD + Número)</label>
                    <input
                      type="text"
                      placeholder="Ex: 11999998888"
                      value={customClientPhone}
                      onChange={(e) => setCustomClientPhone(e.target.value)}
                      className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)]"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Installment Numbers & Description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Número da Parcela
              </label>
              <input
                type="number"
                min="1"
                required
                value={installmentNumber}
                onChange={(e) => setInstallmentNumber(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Total de Parcelas
              </label>
              <input
                type="number"
                min="1"
                required
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Etapa / Descrição da Parcela *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Sinal / Entrega do Anteprojeto 3D"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
            />
          </div>

          {/* Amount & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Valor da Parcela (R$) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Data de Vencimento *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Condicionado à aprovação do 3D renderizado"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border-color)]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[var(--bg-input)] hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl text-xs font-semibold border border-[var(--border-color)] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-[var(--theme-primary)] hover:opacity-90 text-white dark:text-black font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Salvar Parcela</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
