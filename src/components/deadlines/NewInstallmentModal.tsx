import React, { useState } from 'react';
import {
  Calendar,
  CreditCard,
  DollarSign,
  FileText,
  Plus,
  User,
  X,
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
  const { architectureProjects, addProjectInstallment } = useFinance();

  const [projectId, setProjectId] = useState(defaultProjectId || (architectureProjects[0]?.id || ''));
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

  // Selected project info
  const selectedProject = architectureProjects.find((p) => p.id === projectId);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || amount <= 0 || !dueDate) return;

    addProjectInstallment({
      projectId: selectedProject.id,
      projectTitle: selectedProject.title,
      clientName: selectedProject.clientName,
      clientPhone: selectedProject.clientPhone,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3d342f] bg-[#14110f]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#c58a4b]/15 border border-[#c58a4b]/30 flex items-center justify-center text-[#d49454]">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#fcf8f5]">
                Nova Parcela de Honorários
              </h3>
              <p className="text-xs text-[#a89c93]">
                Cadastrar cobrança ou etapa de pagamento do projeto
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#a89c93] hover:text-[#fcf8f5] p-1.5 rounded-lg hover:bg-[#241e1b] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Selection */}
          <div>
            <label className="block text-xs font-medium text-[#a89c93] mb-1">
              Projeto / Cliente *
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              required
              className="w-full bg-[#241e1b] border border-[#3d342f] rounded-xl px-4 py-2.5 text-sm text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
            >
              {architectureProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.clientName})
                </option>
              ))}
            </select>
          </div>

          {/* Installment Numbers & Description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#a89c93] mb-1">
                Número da Parcela
              </label>
              <input
                type="number"
                min="1"
                required
                value={installmentNumber}
                onChange={(e) => setInstallmentNumber(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[#241e1b] border border-[#3d342f] rounded-xl px-4 py-2.5 text-sm text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#a89c93] mb-1">
                Total de Parcelas
              </label>
              <input
                type="number"
                min="1"
                required
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(parseInt(e.target.value, 10) || 1)}
                className="w-full bg-[#241e1b] border border-[#3d342f] rounded-xl px-4 py-2.5 text-sm text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-[#a89c93] mb-1">
              Etapa / Descrição da Parcela *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Entrega do Anteprojeto 3D"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#241e1b] border border-[#3d342f] rounded-xl px-4 py-2.5 text-sm text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
            />
          </div>

          {/* Amount & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#a89c93] mb-1">
                Valor da Parcela (R$) *
              </label>
              <div className="relative">
                <DollarSign className="w-4 h-4 text-[#a89c93] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#241e1b] border border-[#3d342f] rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-emerald-400 focus:outline-none focus:border-[#c58a4b]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#a89c93] mb-1">
                Data de Vencimento *
              </label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-[#241e1b] border border-[#3d342f] rounded-xl px-4 py-2.5 text-sm text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-[#a89c93] mb-1">
              Observações (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ex: Condicionado à aprovação do 3D renderizado"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#241e1b] border border-[#3d342f] rounded-xl px-4 py-2.5 text-sm text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3d342f]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-[#241e1b] hover:bg-[#322924] text-[#a89c93] hover:text-[#fcf8f5] rounded-xl text-xs font-semibold border border-[#3d342f] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-[#c58a4b] hover:bg-[#d49454] text-black font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer active:scale-95"
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
