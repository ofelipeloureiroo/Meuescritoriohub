import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Plus,
  User,
  X,
  Pencil,
  Building2,
  Sparkles,
  Layers,
} from 'lucide-react';
import { ProjectInstallment } from '../../types';
import { useFinance } from '../../context/FinanceContext';

interface NewInstallmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
  installmentToEdit?: ProjectInstallment | null;
}

export const NewInstallmentModal: React.FC<NewInstallmentModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
  installmentToEdit,
}) => {
  const {
    architectureProjects = [],
    clients = [],
    freelanceProjects = [],
    addProjectInstallment,
    updateProjectInstallment,
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

  // String state for inputs so erasing all digits leaves clean empty string
  const [installmentNumberStr, setInstallmentNumberStr] = useState<string>('1');
  const [totalInstallmentsStr, setTotalInstallmentsStr] = useState<string>('3');
  const [description, setDescription] = useState('Sinal / Início do Projeto');
  const [amountStr, setAmountStr] = useState<string>('3500');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 15);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');
  const [autoGenerateAll, setAutoGenerateAll] = useState<boolean>(true);

  // Set initial selected ID whenever options or modal open changes
  useEffect(() => {
    if (isOpen) {
      if (installmentToEdit) {
        // Pre-fill fields for editing
        setSelectedId(installmentToEdit.projectId);
        setIsCustomMode(false);
        setCustomProjectTitle(installmentToEdit.projectTitle);
        setCustomClientName(installmentToEdit.clientName);
        setCustomClientPhone(installmentToEdit.clientPhone || '');
        setInstallmentNumberStr(String(installmentToEdit.installmentNumber || 1));
        setTotalInstallmentsStr(String(installmentToEdit.totalInstallments || 1));
        setDescription(installmentToEdit.description || '');
        setAmountStr(String(installmentToEdit.amount ?? ''));
        setDueDate(installmentToEdit.dueDate || new Date().toISOString().split('T')[0]);
        setNotes(installmentToEdit.notes || '');
        setAutoGenerateAll(false);
      } else {
        // Reset for new creation
        setInstallmentNumberStr('1');
        setTotalInstallmentsStr('3');
        setDescription('Sinal / Início do Projeto');
        setAmountStr('3500');
        const d = new Date();
        d.setDate(d.getDate() + 15);
        setDueDate(d.toISOString().split('T')[0]);
        setNotes('');
        setAutoGenerateAll(true);

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
    }
  }, [isOpen, defaultProjectId, installmentToEdit, combinedOptions]);

  if (!isOpen) return null;

  const parsedTotal = parseInt(totalInstallmentsStr, 10) || 1;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amountStr.replace(',', '.')) || 0;
    const parsedInstallmentNum = parseInt(installmentNumberStr, 10) || 1;
    const parsedTotalInstallments = parseInt(totalInstallmentsStr, 10) || 1;

    if (!dueDate) {
      alert('Por favor, informe a data de vencimento.');
      return;
    }

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

    if (installmentToEdit) {
      // Edit existing installment
      updateProjectInstallment(installmentToEdit.id, {
        projectId: finalProjectId,
        projectTitle: finalProjectTitle,
        clientName: finalClientName,
        clientPhone: finalClientPhone,
        installmentNumber: parsedInstallmentNum,
        totalInstallments: parsedTotalInstallments,
        description,
        amount: parsedAmount,
        dueDate,
        notes,
      });
    } else {
      // Create new installment(s)
      if (autoGenerateAll && parsedTotalInstallments > 1) {
        // Auto-generate all N installments with monthly due dates
        const initialDate = new Date(dueDate + 'T00:00:00');
        for (let i = 1; i <= parsedTotalInstallments; i++) {
          const itemDueDate = new Date(initialDate);
          itemDueDate.setMonth(initialDate.getMonth() + (i - 1));
          const dateStr = itemDueDate.toISOString().split('T')[0];

          let desc = description;
          if (desc === 'Sinal / Início do Projeto') {
            desc = `Parcela ${i}/${parsedTotalInstallments} do Projeto`;
          } else if (!desc.includes(`${i}/`)) {
            desc = `${description} (${i}/${parsedTotalInstallments})`;
          }

          addProjectInstallment({
            projectId: finalProjectId,
            projectTitle: finalProjectTitle,
            clientName: finalClientName,
            clientPhone: finalClientPhone,
            installmentNumber: i,
            totalInstallments: parsedTotalInstallments,
            description: desc,
            amount: parsedAmount,
            dueDate: dateStr,
            status: 'pending',
            notes,
          });
        }
      } else {
        // Create single installment record
        addProjectInstallment({
          projectId: finalProjectId,
          projectTitle: finalProjectTitle,
          clientName: finalClientName,
          clientPhone: finalClientPhone,
          installmentNumber: parsedInstallmentNum,
          totalInstallments: parsedTotalInstallments,
          description,
          amount: parsedAmount,
          dueDate,
          status: 'pending',
          notes,
        });
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-card-hover)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--theme-primary)]/15 border border-[var(--theme-primary)]/30 flex items-center justify-center text-[var(--theme-primary)]">
              {installmentToEdit ? <Pencil className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[var(--text-main)]">
                {installmentToEdit ? 'Editar Parcela de Honorários' : 'Nova Parcela de Honorários'}
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {installmentToEdit ? 'Atualizar valores, datas e detalhes da parcela' : 'Cadastrar cobrança ou etapa de pagamento do projeto'}
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
                type="text"
                inputMode="numeric"
                required
                value={installmentNumberStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setInstallmentNumberStr(val);
                }}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Total de Parcelas
              </label>
              <input
                type="text"
                inputMode="numeric"
                required
                value={totalInstallmentsStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, '');
                  setTotalInstallmentsStr(val);
                }}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
            </div>
          </div>

          {/* Auto-generate Checkbox for Multi-Installments */}
          {!installmentToEdit && parsedTotal > 1 && (
            <div className="p-3 bg-[var(--bg-input)]/70 rounded-xl border border-[var(--theme-primary)]/30 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="autoGenerateAll"
                checked={autoGenerateAll}
                onChange={(e) => setAutoGenerateAll(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded text-[var(--theme-primary)] border-[var(--border-color)] focus:ring-0 cursor-pointer"
              />
              <label htmlFor="autoGenerateAll" className="text-xs text-[var(--text-main)] cursor-pointer select-none leading-relaxed">
                <strong>Gerar todas as {parsedTotal} parcelas automaticamente:</strong> Cria sequencialmente do n.º 1 até ao {parsedTotal} (ex: 1/{parsedTotal}, 2/{parsedTotal}, 3/{parsedTotal}) com vencimentos mensais a partir de {dueDate ? new Date(dueDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'hoje'}.
              </label>
            </div>
          )}

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
                  type="text"
                  inputMode="decimal"
                  required
                  placeholder="0,00"
                  value={amountStr}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.,]/g, '');
                    setAmountStr(val);
                  }}
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
              {installmentToEdit ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              <span>{installmentToEdit ? 'Salvar Alterações' : 'Salvar Parcela'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
