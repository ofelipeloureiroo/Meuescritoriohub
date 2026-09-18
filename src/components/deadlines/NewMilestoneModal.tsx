import React, { useState, useMemo, useEffect } from 'react';
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
  const {
    architectureProjects = [],
    clients = [],
    freelanceProjects = [],
    addProjectMilestone,
  } = useFinance();

  // Consolidate project sources
  const combinedOptions = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      clientName: string;
      clientPhone?: string;
    }> = [];

    // 1. Architecture Projects
    (architectureProjects || []).forEach((p) => {
      list.push({
        id: p.id,
        title: p.title || 'Projeto sem Título',
        clientName: p.clientName || 'Cliente sem Nome',
        clientPhone: p.clientPhone,
      });
    });

    // 2. Freelance Projects
    (freelanceProjects || []).forEach((fp) => {
      if (!list.some((item) => item.id === fp.id)) {
        list.push({
          id: fp.id,
          title: fp.title || 'Projeto Freelance',
          clientName: fp.clientName || 'Cliente',
        });
      }
    });

    // 3. Clients
    (clients || []).forEach((cli) => {
      if (!list.some((item) => item.clientName.toLowerCase() === (cli.name || '').toLowerCase())) {
        list.push({
          id: `cli_${cli.id}`,
          title: `Projeto - ${cli.name}`,
          clientName: cli.name,
          clientPhone: cli.phone,
        });
      }
    });

    return list;
  }, [architectureProjects, freelanceProjects, clients]);

  const [selectedId, setSelectedId] = useState<string>('');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customProjectTitle, setCustomProjectTitle] = useState<string>('');
  const [customClientName, setCustomClientName] = useState<string>('');

  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<ProjectMilestone['stage']>('anteprojeto');
  const [priority, setPriority] = useState<ProjectMilestone['priority']>('alta');
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  });
  const [notes, setNotes] = useState('');

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
    if (!title.trim() || !dueDate) return;

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

    addProjectMilestone({
      projectId: finalProjectId,
      projectTitle: finalProjectTitle,
      clientName: finalClientName,
      clientPhone: finalClientPhone,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-card-hover)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--theme-primary)]/15 border border-[var(--theme-primary)]/30 flex items-center justify-center text-[var(--theme-primary)]">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[var(--text-main)]">
                Novo Prazo de Entrega
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Defina um marco ou data limite para entrega de etapa
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
          {/* Project Selection */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold text-[var(--text-main)]">
                Projeto / Obra *
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
                {combinedOptions.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[var(--bg-card)] text-[var(--text-main)]">
                    {p.title} ({p.clientName})
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
                    placeholder="Ex: Reforma Ap. Jardins"
                    value={customProjectTitle}
                    onChange={(e) => setCustomProjectTitle(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[var(--text-muted)] mb-1">Nome do Cliente</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Felipe"
                    value={customClientName}
                    onChange={(e) => setCustomClientName(e.target.value)}
                    className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Milestone Title */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Título do Prazo / Entrega *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Entrega das pranchas do Executivo e iluminação"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
            />
          </div>

          {/* Stage & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Etapa do Projeto *
              </label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as any)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              >
                <option value="briefing" className="bg-[var(--bg-card)] text-[var(--text-main)]">Briefing & Levantamento</option>
                <option value="estudo_preliminar" className="bg-[var(--bg-card)] text-[var(--text-main)]">Estudo Preliminar</option>
                <option value="anteprojeto" className="bg-[var(--bg-card)] text-[var(--text-main)]">Anteprojeto (3D & Layout)</option>
                <option value="executivo" className="bg-[var(--bg-card)] text-[var(--text-main)]">Projeto Executivo</option>
                <option value="obra" className="bg-[var(--bg-card)] text-[var(--text-main)]">Acompanhamento de Obra</option>
                <option value="entregue" className="bg-[var(--bg-card)] text-[var(--text-main)]">Entrega Final</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
                Prioridade *
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              >
                <option value="baixa" className="bg-[var(--bg-card)] text-[var(--text-main)]">Baixa</option>
                <option value="media" className="bg-[var(--bg-card)] text-[var(--text-main)]">Média</option>
                <option value="alta" className="bg-[var(--bg-card)] text-[var(--text-main)]">Alta</option>
                <option value="urgente" className="bg-[var(--bg-card)] text-[var(--text-main)]">🚨 Urgente</option>
              </select>
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Data Limite de Entrega *
            </label>
            <input
              type="date"
              required
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-[var(--text-main)] mb-1">
              Observações / Checklist
            </label>
            <input
              type="text"
              placeholder="Ex: Verificar amostra de revestimentos antes da reunião"
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
              <span>Salvar Prazo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
