import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Clock,
  Flag,
  Plus,
  X,
} from 'lucide-react';
import { ProjectMilestone } from '../../types';
import { useFinance } from '../../context/FinanceContext';

interface NewMilestoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
}

export const NewMilestoneModal: React.FC<NewMilestoneModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
}) => {
  const { architectureProjects, addProjectMilestone } = useFinance();

  const [projectId, setProjectId] = useState(defaultProjectId || (architectureProjects[0]?.id || ''));
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<ProjectMilestone['stage']>('anteprojeto');
  const [priority, setPriority] = useState<ProjectMilestone['priority']>('alta');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

  const selectedProject = architectureProjects.find((p) => p.id === projectId);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || !title.trim() || !dueDate) return;

    addProjectMilestone({
      projectId: selectedProject.id,
      projectTitle: selectedProject.title,
      clientName: selectedProject.clientName,
      clientPhone: selectedProject.clientPhone,
      title: title.trim(),
      stage,
      priority,
      dueDate,
      completed: false,
      notes: notes.trim() || undefined,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3d342f] bg-[#14110f]/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#d48b8e]/15 border border-[#d48b8e]/30 flex items-center justify-center text-[#d48b8e]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#fcf8f5]">
                Novo Prazo de Entrega
              </h3>
              <p className="text-xs text-[#a89c93]">
                Defina um marco ou data limite para entrega de etapa
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
              Projeto / Obra *
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

          {/* Milestone Title */}
          <div>
            <label className="block text-xs font-medium text-[#a89c93] mb-1">
              Título do Prazo / Entrega *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Entrega das pranchas do Projeto Executivo e iluminação"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#241e1b] border border-[#3d342f] rounded-xl px-4 py-2.5 text-sm text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
            />
          </div>

          {/* Stage & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-[#a89c93] mb-1">
                Etapa do Projeto *
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as any)}
                className="w-full bg-[#241e1b] border border-[#3d342f] rounded-xl px-4 py-2.5 text-sm text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
              >
                <option value="briefing">Briefing & Levantamento</option>
                <option value="estudo_preliminar">Estudo Preliminar</option>
                <option value="anteprojeto">Anteprojeto (3D & Layout)</option>
                <option value="executivo">Projeto Executivo</option>
                <option value="obra">Acompanhamento de Obra</option>
                <option value="entregue">Entrega Final</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#a89c93] mb-1">
                Prioridade *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-[#241e1b] border border-[#3d342f] rounded-xl px-4 py-2.5 text-sm text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
              >
                <option value="baixa">Baixa</option>
                <option value="media">Média</option>
                <option value="alta">Alta</option>
                <option value="urgente">🚨 Urgente</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-medium text-[#a89c93] mb-1">
              Data Limite de Entrega *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#241e1b] border border-[#3d342f] rounded-xl px-4 py-2.5 text-sm text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-[#a89c93] mb-1">
              Observações / Checklist
            </label>
            <input
              type="text"
              placeholder="Ex: Verificar amostra de revestimentos antes da reunião"
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
              className="flex items-center gap-2 px-5 py-2.5 bg-[#d48b8e] hover:bg-[#e09fa2] text-black font-bold rounded-xl text-xs shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Salvar Prazo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
