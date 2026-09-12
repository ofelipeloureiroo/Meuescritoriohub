import React, { useState } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  Copy, 
  Lock, 
  Edit3, 
  Check, 
  X, 
  Clock, 
  Calendar, 
  Layers, 
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Info
} from 'lucide-react';
import { OfficeSettings, ProjectTemplate, TemplateStage, TemplateTask } from '../../types';
import { DEFAULT_PROJECT_TEMPLATES, normalizeTemplateStages, countTemplateItems } from '../../data/defaultProjectTemplates';

interface ProjectTemplatesManagerProps {
  officeSettings: OfficeSettings;
  updateOfficeSettings: (data: Partial<OfficeSettings>) => void;
  projectTypes: string[];
  templateBindings: Record<string, string>;
  handleUpdateTemplateBinding: (type: string, tplId: string) => void;
}

export const ProjectTemplatesManager: React.FC<ProjectTemplatesManagerProps> = ({
  officeSettings,
  updateOfficeSettings,
  projectTypes,
  templateBindings,
  handleUpdateTemplateBinding
}) => {
  const rawTemplates = officeSettings.projectTemplates && officeSettings.projectTemplates.length > 0 
    ? officeSettings.projectTemplates 
    : DEFAULT_PROJECT_TEMPLATES;

  const projectTemplates: ProjectTemplate[] = rawTemplates.map(t => ({
    ...t,
    stages: normalizeTemplateStages(t.stages)
  }));

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(projectTemplates[0]?.id || 'tpl-1');
  const [expandedStageIds, setExpandedStageIds] = useState<Record<string, boolean>>({ 'stg-1': true });
  
  // Modals state
  const [duplicatingTemplate, setDuplicatingTemplate] = useState<ProjectTemplate | null>(null);
  const [editingTask, setEditingTask] = useState<{
    templateId: string;
    stageId: string;
    task: TemplateTask;
    isNew?: boolean;
    isReadOnly?: boolean;
  } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'template' | 'stage' | 'task';
    id: string;
    stageId?: string;
    title: string;
    message: string;
  } | null>(null);

  // New Template Modal / Inline State
  const [isCreatingTemplateModal, setIsCreatingTemplateModal] = useState<boolean>(false);
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [newTemplateType, setNewTemplateType] = useState<string>(projectTypes[0] || 'Projeto Arquitetônico');

  // Stage inline creation
  const [newStageName, setNewStageName] = useState<string>('');
  const [isAddingStage, setIsAddingStage] = useState<boolean>(false);

  // Quick inline task creation
  const [quickTaskName, setQuickTaskName] = useState<Record<string, string>>({});

  // Editing template header inline
  const [isEditingHeader, setIsEditingHeader] = useState<boolean>(false);
  const [editHeaderName, setEditHeaderName] = useState<string>('');
  const [editHeaderType, setEditHeaderType] = useState<string>('');

  const selectedTpl = projectTemplates.find(t => t.id === selectedTemplateId) || projectTemplates[0];

  const companyTemplates = projectTemplates.filter(t => !t.isSystem && !t.isArchived);
  const systemTemplates = projectTemplates.filter(t => t.isSystem);

  const toggleStageExpand = (stageId: string) => {
    setExpandedStageIds(prev => ({
      ...prev,
      [stageId]: !prev[stageId]
    }));
  };

  // Helper to save modified templates list
  const saveTemplates = (updatedList: ProjectTemplate[]) => {
    updateOfficeSettings({ projectTemplates: updatedList });
  };

  // Duplicate template action
  const handleConfirmDuplicate = () => {
    if (!duplicatingTemplate) return;
    const newId = 'tpl-custom-' + Date.now();
    const clonedStages = (duplicatingTemplate.stages as TemplateStage[]).map((stg, sIdx) => ({
      ...stg,
      id: `stg-${Date.now()}-${sIdx}`,
      items: (stg.items || []).map((tsk, tIdx) => ({
        ...tsk,
        id: `tsk-${Date.now()}-${sIdx}-${tIdx}`
      }))
    }));

    const duplicated: ProjectTemplate = {
      id: newId,
      name: `${duplicatingTemplate.name} (Cópia)`,
      type: duplicatingTemplate.type || 'Projeto Arquitetônico',
      date: new Date().toLocaleDateString('pt-BR'),
      isSystem: false,
      stages: clonedStages
    };

    const updatedList = [...projectTemplates, duplicated];
    saveTemplates(updatedList);
    setSelectedTemplateId(newId);
    setDuplicatingTemplate(null);
  };

  // Create new template action
  const handleCreateNewTemplate = () => {
    if (!newTemplateName.trim()) return;
    const newId = 'tpl-custom-' + Date.now();
    const newTpl: ProjectTemplate = {
      id: newId,
      name: newTemplateName.trim(),
      type: newTemplateType,
      date: new Date().toLocaleDateString('pt-BR'),
      isSystem: false,
      stages: [
        {
          id: 'stg-' + Date.now() + '-1',
          name: '1. Inicial',
          items: []
        }
      ]
    };
    saveTemplates([...projectTemplates, newTpl]);
    setSelectedTemplateId(newId);
    setNewTemplateName('');
    setIsCreatingTemplateModal(false);
  };

  // Delete custom template
  const handleDeleteTemplate = (tplId: string) => {
    const tpl = projectTemplates.find(t => t.id === tplId);
    if (!tpl || tpl.isSystem) return;
    setConfirmDelete({
      type: 'template',
      id: tplId,
      title: 'Excluir template',
      message: `Tem certeza que deseja excluir o template "${tpl.name}"? Esta ação não pode ser desfeita.`
    });
  };

  // Add stage to current custom template
  const handleAddStage = () => {
    if (!newStageName.trim() || !selectedTpl || selectedTpl.isSystem) return;
    const currentStages = selectedTpl.stages as TemplateStage[];
    const newStage: TemplateStage = {
      id: 'stg-' + Date.now(),
      name: `${currentStages.length + 1}. ${newStageName.trim()}`,
      items: []
    };
    const updatedStages = [...currentStages, newStage];
    const updatedTemplates = projectTemplates.map(t => 
      t.id === selectedTpl.id ? { ...t, stages: updatedStages } : t
    );
    saveTemplates(updatedTemplates);
    setNewStageName('');
    setIsAddingStage(false);
    setExpandedStageIds(prev => ({ ...prev, [newStage.id]: true }));
  };

  // Move stage up/down
  const handleMoveStage = (stageIdx: number, direction: 'up' | 'down') => {
    if (!selectedTpl || selectedTpl.isSystem) return;
    const stages = [...(selectedTpl.stages as TemplateStage[])];
    const targetIdx = direction === 'up' ? stageIdx - 1 : stageIdx + 1;
    if (targetIdx < 0 || targetIdx >= stages.length) return;

    const temp = stages[stageIdx];
    stages[stageIdx] = stages[targetIdx];
    stages[targetIdx] = temp;

    const updatedTemplates = projectTemplates.map(t => 
      t.id === selectedTpl.id ? { ...t, stages } : t
    );
    saveTemplates(updatedTemplates);
  };

  // Delete stage
  const handleDeleteStage = (stageId: string) => {
    if (!selectedTpl || selectedTpl.isSystem) return;
    const stage = (selectedTpl.stages as TemplateStage[]).find(s => s.id === stageId);
    setConfirmDelete({
      type: 'stage',
      id: stageId,
      title: 'Excluir etapa',
      message: `Tem certeza que deseja excluir a etapa "${stage?.name || 'selecionada'}" e todas as suas tarefas?`
    });
  };

  // Delete task from stage
  const handleDeleteTask = (stageId: string, taskId: string) => {
    if (!selectedTpl || selectedTpl.isSystem) return;
    let taskName = 'selecionada';
    const stage = (selectedTpl.stages as TemplateStage[]).find(s => s.id === stageId);
    if (stage) {
      const task = (stage.items || []).find(it => it.id === taskId);
      if (task) taskName = task.name;
    }
    setConfirmDelete({
      type: 'task',
      id: taskId,
      stageId,
      title: 'Excluir tarefa',
      message: `Tem certeza que deseja remover a tarefa "${taskName}"?`
    });
  };

  // Execute deletion after confirmation in modal
  const handleExecuteDelete = () => {
    if (!confirmDelete) return;

    if (confirmDelete.type === 'template') {
      const updated = projectTemplates.filter(t => t.id !== confirmDelete.id);
      saveTemplates(updated);
      const remaining = updated.length > 0 ? updated[0].id : 'tpl-1';
      setSelectedTemplateId(remaining);
    } else if (confirmDelete.type === 'stage') {
      if (!selectedTpl || selectedTpl.isSystem) return;
      const stages = (selectedTpl.stages as TemplateStage[]).filter(s => s.id !== confirmDelete.id);
      const updatedTemplates = projectTemplates.map(t => 
        t.id === selectedTpl.id ? { ...t, stages } : t
      );
      saveTemplates(updatedTemplates);
    } else if (confirmDelete.type === 'task' && confirmDelete.stageId) {
      if (!selectedTpl || selectedTpl.isSystem) return;
      const stages = (selectedTpl.stages as TemplateStage[]).map(stg => {
        if (stg.id === confirmDelete.stageId) {
          return { ...stg, items: (stg.items || []).filter(it => it.id !== confirmDelete.id) };
        }
        return stg;
      });

      const updatedTemplates = projectTemplates.map(t => 
        t.id === selectedTpl.id ? { ...t, stages } : t
      );
      saveTemplates(updatedTemplates);
    }

    setConfirmDelete(null);
  };

  // Save edited task details from Modal
  const handleSaveTaskDetail = () => {
    if (!editingTask || !selectedTpl) return;
    const { stageId, task, isNew } = editingTask;
    if (!task.name.trim()) return;

    const stages = (selectedTpl.stages as TemplateStage[]).map(stg => {
      // If task moved to another stage, remove from old stage if needed
      if (stg.id === stageId) {
        let items = stg.items || [];
        if (isNew) {
          items = [...items, { ...task, id: task.id || 'tsk-' + Date.now() }];
        } else {
          items = items.map(it => it.id === task.id ? task : it);
        }
        return { ...stg, items };
      }
      return stg;
    });

    const updatedTemplates = projectTemplates.map(t => 
      t.id === selectedTpl.id ? { ...t, stages } : t
    );
    saveTemplates(updatedTemplates);
    setEditingTask(null);
  };

  // Quick add task inline inside stage
  const handleQuickAddTask = (stageId: string) => {
    const taskName = quickTaskName[stageId]?.trim();
    if (!taskName || !selectedTpl || selectedTpl.isSystem) return;

    const newTask: TemplateTask = {
      id: 'tsk-' + Date.now(),
      name: taskName,
      estimatedDays: 0,
      dayType: 'business',
      startMode: 'automatic'
    };

    const stages = (selectedTpl.stages as TemplateStage[]).map(stg => {
      if (stg.id === stageId) {
        return { ...stg, items: [...(stg.items || []), newTask] };
      }
      return stg;
    });

    const updatedTemplates = projectTemplates.map(t => 
      t.id === selectedTpl.id ? { ...t, stages } : t
    );
    saveTemplates(updatedTemplates);
    setQuickTaskName(prev => ({ ...prev, [stageId]: '' }));
  };

  return (
    <div className="space-y-6">
      {/* CARD 1: Templates de Projeto */}
      <div className="bg-[#1c1815] border border-[#302722] rounded-2xl p-5 space-y-4">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#302722] pb-4">
          <div>
            <h3 className="font-serif font-bold text-[#fcf8f5] text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--theme-primary)]" />
              Templates de Projeto
            </h3>
            <p className="text-[11px] text-[#a89c93] mt-0.5">
              Padronize as etapas e tarefas detalhadas dos projetos criados no seu escritório
            </p>
          </div>
          <button
            onClick={() => setIsCreatingTemplateModal(true)}
            className="px-3.5 py-1.5 rounded-xl border border-[var(--theme-primary)]/40 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] text-xs font-bold hover:bg-[var(--theme-primary)]/20 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo template
          </button>
        </div>

        {/* Main Grid: Left Sidebar + Right Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[420px]">
          
          {/* LEFT SIDEBAR */}
          <div className="lg:col-span-4 border-r border-[#302722] pr-4 space-y-4">
            
            {/* 1. TEMPLATES DA EMPRESA */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold text-amber-500/80 tracking-widest block">
                  TEMPLATES DA EMPRESA ({companyTemplates.length})
                </span>
              </div>

              {companyTemplates.length === 0 ? (
                <div className="p-3.5 bg-[#12100e]/60 border border-dashed border-[#302722] rounded-xl text-[10px] text-[#a89c93] leading-relaxed">
                  A empresa ainda não possui templates personalizados. Duplique um template padrão ou crie um novo acima.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {companyTemplates.map(t => {
                    const isSelected = selectedTemplateId === t.id;
                    const stageCount = t.stages.length;
                    const itemTotal = countTemplateItems(t);
                    return (
                      <button
                        key={t.id}
                        onClick={() => setSelectedTemplateId(t.id)}
                        className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer group ${
                          isSelected 
                            ? 'bg-[#28221e] border-[var(--theme-primary)]/60 text-[#fcf8f5] shadow-lg' 
                            : 'bg-[#12100e]/40 border-[#302722]/60 text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#1a1613]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs truncate text-[#fcf8f5]">{t.name}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            Empresa
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[10px] opacity-70 pt-0.5">
                          <span>{stageCount} etapas • {itemTotal} tarefas</span>
                          <span>{t.date}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. PADRÃO DO SISTEMA */}
            <div className="space-y-2 pt-2">
              <span className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest block">
                PADRÃO DO SISTEMA ({systemTemplates.length})
              </span>
              <div className="space-y-1.5">
                {systemTemplates.map(t => {
                  const isSelected = selectedTemplateId === t.id;
                  const stageCount = t.stages.length;
                  const itemTotal = countTemplateItems(t);
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTemplateId(t.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer group ${
                        isSelected 
                          ? 'bg-[#28221e] border-[var(--theme-primary)]/60 text-[#fcf8f5] shadow-lg' 
                          : 'bg-[#12100e]/40 border-[#302722]/60 text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#1a1613]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs truncate flex items-center gap-1.5 text-[#fcf8f5]">
                          <Lock className="w-3 h-3 text-amber-400/80 shrink-0" />
                          {t.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] opacity-70 pt-0.5">
                        <span>Global • {stageCount} etapas ({itemTotal} itens)</span>
                        <span className="text-[9px] underline group-hover:text-[var(--theme-primary)] transition-colors">
                          Visualizar
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* RIGHT DETAIL VIEW */}
          <div className="lg:col-span-8 space-y-4 flex flex-col justify-between">
            {selectedTpl && (
              <div className="space-y-4">
                
                {/* SYSTEM TEMPLATE BANNER (If system template selected) */}
                {selectedTpl.isSystem && (
                  <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-start sm:items-center justify-between gap-3 text-xs text-amber-200">
                    <div className="flex items-start gap-2.5">
                      <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                      <div>
                        <span className="font-bold block">Template padrão do sistema — somente leitura</span>
                        <p className="text-[11px] text-amber-300/80 mt-0.5">
                          Para personalizar as etapas e tarefas deste modelo, crie uma cópia exclusiva para o seu escritório.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setDuplicatingTemplate(selectedTpl)}
                      className="px-3 py-1.5 rounded-lg bg-amber-500 text-black text-[11px] font-bold hover:bg-amber-400 transition-all cursor-pointer shrink-0 flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Duplicar e personalizar
                    </button>
                  </div>
                )}

                {/* TEMPLATE TITLE & METADATA */}
                <div className="flex items-start justify-between border-b border-[#302722] pb-3 gap-3">
                  <div className="space-y-1">
                    {isEditingHeader && !selectedTpl.isSystem ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editHeaderName}
                          onChange={e => setEditHeaderName(e.target.value)}
                          className="px-2.5 py-1 rounded bg-[#12100e] border border-[var(--theme-primary)] text-sm font-bold text-[#fcf8f5]"
                        />
                        <select
                          value={editHeaderType}
                          onChange={e => setEditHeaderType(e.target.value)}
                          className="px-2 py-1 rounded bg-[#12100e] border border-[#3d342f] text-xs text-[#fcf8f5]"
                        >
                          {projectTypes.map(pt => (
                            <option key={pt} value={pt}>{pt}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => {
                            const updated = projectTemplates.map(t => 
                              t.id === selectedTpl.id 
                                ? { ...t, name: editHeaderName.trim() || t.name, type: editHeaderType } 
                                : t
                            );
                            saveTemplates(updated);
                            setIsEditingHeader(false);
                          }}
                          className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setIsEditingHeader(false)}
                          className="p-1 text-zinc-400 hover:bg-zinc-800 rounded cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif font-bold text-[#fcf8f5] text-base flex items-center gap-2">
                          {selectedTpl.name}
                          {!selectedTpl.isSystem && (
                            <button
                              onClick={() => {
                                setEditHeaderName(selectedTpl.name);
                                setEditHeaderType(selectedTpl.type);
                                setIsEditingHeader(true);
                              }}
                              className="text-zinc-500 hover:text-[var(--theme-primary)] transition-colors p-1"
                              title="Editar nome"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </h4>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-[11px] text-[#a89c93]">
                      <span>Tipo recomendado: <strong className="text-[#fcf8f5] font-semibold">{selectedTpl.type}</strong></span>
                      <span>•</span>
                      <span>{selectedTpl.stages.length} etapas ({countTemplateItems(selectedTpl)} tarefas)</span>
                    </div>
                  </div>

                  {!selectedTpl.isSystem && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteTemplate(selectedTpl.id)}
                        className="px-2.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                        title="Excluir template"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </button>
                    </div>
                  )}
                </div>

                {/* STAGES LIST & ACCORDION */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      ETAPAS SINCRONIZADAS DO FLUXO ({selectedTpl.stages.length}):
                    </span>
                    {!selectedTpl.isSystem && (
                      <button
                        onClick={() => setIsAddingStage(true)}
                        className="text-[11px] font-bold text-[var(--theme-primary)] hover:underline cursor-pointer flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar etapa
                      </button>
                    )}
                  </div>

                  {/* FORM TO ADD NEW STAGE */}
                  {isAddingStage && !selectedTpl.isSystem && (
                    <div className="p-3 bg-[#12100e] border border-[var(--theme-primary)]/50 rounded-xl flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Nome da nova etapa (ex: Detalhamento Técnico)..."
                        value={newStageName}
                        onChange={e => setNewStageName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddStage()}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-[#1c1815] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                        autoFocus
                      />
                      <button
                        onClick={handleAddStage}
                        className="px-3 py-1.5 bg-[var(--theme-primary)] text-black rounded-lg font-bold text-xs hover:opacity-90 cursor-pointer"
                      >
                        Adicionar
                      </button>
                      <button
                        onClick={() => setIsAddingStage(false)}
                        className="p-1.5 text-zinc-400 hover:bg-zinc-800 rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* STAGES CONTAINER */}
                  <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1 no-scrollbar">
                    {(selectedTpl.stages as TemplateStage[]).map((stage, sIdx) => {
                      const isExpanded = expandedStageIds[stage.id] ?? false;
                      const items = stage.items || [];

                      return (
                        <div 
                          key={stage.id} 
                          className="bg-[#12100e] border border-[#302722] rounded-xl overflow-hidden transition-all"
                        >
                          {/* Stage Header Bar */}
                          <div className="flex items-center justify-between p-3 bg-[#181411] border-b border-[#302722]/50 hover:bg-[#1f1a16] transition-colors">
                            <div 
                              onClick={() => toggleStageExpand(stage.id)}
                              className="flex items-center gap-3 cursor-pointer flex-1"
                            >
                              <span className="w-6 h-6 rounded-full bg-[#28221e] border border-[#3d342f] text-[11px] font-bold text-[var(--theme-primary)] flex items-center justify-center shrink-0">
                                {sIdx + 1}
                              </span>
                              <span className="font-bold text-xs text-[#fcf8f5]">{stage.name}</span>
                              <span className="text-[10px] text-[#a89c93] bg-[#221c18] px-2 py-0.5 rounded-full border border-[#302722]">
                                {items.length} {items.length === 1 ? 'item' : 'itens'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {!selectedTpl.isSystem && (
                                <>
                                  <button
                                    onClick={() => handleMoveStage(sIdx, 'up')}
                                    disabled={sIdx === 0}
                                    className="p-1 text-zinc-500 hover:text-[#fcf8f5] disabled:opacity-20 cursor-pointer"
                                    title="Mover para cima"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveStage(sIdx, 'down')}
                                    disabled={sIdx === selectedTpl.stages.length - 1}
                                    className="p-1 text-zinc-500 hover:text-[#fcf8f5] disabled:opacity-20 cursor-pointer"
                                    title="Mover para baixo"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteStage(stage.id);
                                    }}
                                    className="p-1 text-rose-400 hover:bg-rose-500/10 rounded cursor-pointer ml-1"
                                    title="Excluir etapa"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              <button
                                onClick={() => toggleStageExpand(stage.id)}
                                className="p-1 text-zinc-400 hover:text-[#fcf8f5] cursor-pointer ml-1"
                              >
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Stage Items List */}
                          {isExpanded && (
                            <div className="p-3 space-y-2 bg-[#12100e]">
                              {items.length === 0 ? (
                                <p className="text-[11px] text-zinc-500 italic py-1 px-2">
                                  Nenhum item/tarefa nesta etapa ainda.
                                </p>
                              ) : (
                                <div className="space-y-1.5">
                                  {items.map((task) => (
                                    <div
                                      key={task.id}
                                      onClick={() => {
                                        setEditingTask({
                                          templateId: selectedTpl.id,
                                          stageId: stage.id,
                                          task: { ...task },
                                          isReadOnly: selectedTpl.isSystem
                                        });
                                      }}
                                      className="flex items-center justify-between p-2.5 rounded-lg bg-[#1a1613] border border-[#2d2520] hover:border-[#3d342f] hover:bg-[#221c18] transition-all cursor-pointer group"
                                    >
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="w-2 h-2 rounded-full bg-[var(--theme-primary)] shrink-0" />
                                        <span className="text-xs font-semibold text-[#fcf8f5] truncate">
                                          {task.name}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 text-[10px] shrink-0">
                                        {task.estimatedDays ? (
                                          <span className="px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-300 font-medium flex items-center gap-1">
                                            <Clock className="w-3 h-3 text-amber-400" />
                                            {task.estimatedDays} {task.dayType === 'calendar' ? 'dias corr.' : 'dias úteis'}
                                          </span>
                                        ) : (
                                          <span className="text-zinc-600">0d</span>
                                        )}

                                        {!selectedTpl.isSystem && (
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteTask(stage.id, task.id);
                                            }}
                                            className="opacity-0 group-hover:opacity-100 p-1 text-rose-400 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                                            title="Remover tarefa"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* ADD NEW TASK CONTROL INSIDE STAGE */}
                              {!selectedTpl.isSystem && (
                                <div className="pt-2 flex items-center gap-2">
                                  <input
                                    type="text"
                                    placeholder="+ Adicionar item / tarefa..."
                                    value={quickTaskName[stage.id] || ''}
                                    onChange={e => {
                                      const val = e.target.value;
                                      setQuickTaskName(prev => ({ ...prev, [stage.id]: val }));
                                    }}
                                    onKeyDown={e => e.key === 'Enter' && handleQuickAddTask(stage.id)}
                                    className="flex-1 px-3 py-1.5 bg-[#181411] border border-[#302722] rounded-lg text-xs text-[#fcf8f5] placeholder-zinc-600 focus:outline-none focus:border-[var(--theme-primary)]"
                                  />
                                  <button
                                    onClick={() => handleQuickAddTask(stage.id)}
                                    className="px-3 py-1.5 bg-[#25201d] border border-[#3d342f] hover:bg-[#302824] text-xs font-bold text-[#fcf8f5] rounded-lg cursor-pointer"
                                  >
                                    Adicionar
                                  </button>
                                </div>
                              )}

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>
            )}
          </div>

        </div>
      </div>

      {/* CARD 2: Template por Tipo de Projeto */}
      <div className="bg-[#1c1815] border border-[#302722] rounded-2xl p-5 space-y-4">
        <div>
          <h3 className="font-serif font-bold text-[#fcf8f5] text-sm">Template por Tipo de Projeto</h3>
          <p className="text-[11px] text-[#a89c93]">
            Vincule um template padrão a cada tipo. Será aplicado automaticamente ao criar novos projetos no sistema.
          </p>
        </div>

        <div className="space-y-2.5">
          {projectTypes.map(type => {
            const currentTplId = templateBindings[type] || '';
            return (
              <div key={type} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-[#12100e] border border-[#302722] rounded-2xl text-xs">
                <span className="font-bold text-[#fcf8f5]">{type}</span>
                <select
                  value={currentTplId}
                  onChange={(e) => handleUpdateTemplateBinding(type, e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-[#1c1815] border border-[#3d342f] text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)] text-xs font-semibold cursor-pointer max-w-xs"
                >
                  <option value="">Sem template padrão</option>
                  {projectTemplates.map(tpl => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.name} {tpl.isSystem ? '(Sistema)' : '(Empresa)'}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL 1: CREATE NEW TEMPLATE */}
      {isCreatingTemplateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1815] border border-[#302722] rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#302722] pb-3">
              <h3 className="font-serif font-bold text-[#fcf8f5] text-base flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--theme-primary)]" />
                Criar Novo Template
              </h3>
              <button
                onClick={() => setIsCreatingTemplateModal(false)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#a89c93] block mb-1">
                  Nome do Template *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Projeto Comercial Express, Consultoria Residencial..."
                  value={newTemplateName}
                  onChange={e => setNewTemplateName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#12100e] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#a89c93] block mb-1">
                  Tipo Recomendado
                </label>
                <select
                  value={newTemplateType}
                  onChange={e => setNewTemplateType(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#12100e] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                >
                  {projectTypes.map(pt => (
                    <option key={pt} value={pt}>{pt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#302722]">
              <button
                onClick={() => setIsCreatingTemplateModal(false)}
                className="px-4 py-2 rounded-xl border border-[#3d342f] text-xs font-bold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#25201d] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateNewTemplate}
                disabled={!newTemplateName.trim()}
                className="px-4 py-2 rounded-xl bg-[var(--theme-primary)] text-black text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-all cursor-pointer"
              >
                Criar template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DUPLICAR E PERSONALIZAR (Image 3) */}
      {duplicatingTemplate && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1815] border border-amber-500/30 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-[#fcf8f5] text-base">
                    Template padrão do sistema
                  </h3>
                  <p className="text-xs text-amber-400/80 mt-0.5">
                    Este template não pode ser editado diretamente
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDuplicatingTemplate(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-[#12100e] border border-[#302722] rounded-xl space-y-1.5">
              <span className="font-bold text-sm text-[#fcf8f5] block">{duplicatingTemplate.name}</span>
              <p className="text-xs text-[#a89c93]">
                {duplicatingTemplate.stages.length} etapas • {countTemplateItems(duplicatingTemplate)} itens
              </p>
            </div>

            <p className="text-xs text-[#a89c93] leading-relaxed">
              Para personalizar este template, o sistema criará uma cópia exclusiva para o seu escritório. O template original permanecerá intacto.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#302722]">
              <button
                onClick={() => setDuplicatingTemplate(null)}
                className="px-4 py-2 rounded-xl border border-[#3d342f] text-xs font-bold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#25201d] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDuplicate}
                className="px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-all cursor-pointer flex items-center gap-2"
              >
                <Copy className="w-4 h-4" />
                Duplicar e personalizar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: DETALHES DA TAREFA (Image 2) */}
      {editingTask && selectedTpl && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1815] border border-[#302722] rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#302722] pb-3">
              <h3 className="font-serif font-bold text-[#fcf8f5] text-base flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[var(--theme-primary)]" />
                Detalhes da tarefa
              </h3>
              <button
                onClick={() => setEditingTask(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1 no-scrollbar">
              {/* Nome da Tarefa */}
              <div>
                <label className="text-xs font-bold text-[#a89c93] block mb-1">
                  Nome da tarefa *
                </label>
                <input
                  type="text"
                  disabled={editingTask.isReadOnly}
                  value={editingTask.task.name}
                  onChange={e => setEditingTask({
                    ...editingTask,
                    task: { ...editingTask.task, name: e.target.value }
                  })}
                  placeholder="Ex: Receber dados do cliente, Medição presencial..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#12100e] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)] disabled:opacity-60"
                />
              </div>

              {/* Etapa Dropdown */}
              <div>
                <label className="text-xs font-bold text-[#a89c93] block mb-1">
                  Etapa
                </label>
                <select
                  disabled={editingTask.isReadOnly}
                  value={editingTask.stageId}
                  onChange={e => setEditingTask({
                    ...editingTask,
                    stageId: e.target.value
                  })}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#12100e] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)] disabled:opacity-60"
                >
                  {(selectedTpl.stages as TemplateStage[]).map(stg => (
                    <option key={stg.id} value={stg.id}>{stg.name}</option>
                  ))}
                </select>
              </div>

              {/* Descrição da Tarefa */}
              <div>
                <label className="text-xs font-bold text-[#a89c93] block mb-1">
                  Descrição da tarefa
                </label>
                <textarea
                  rows={3}
                  disabled={editingTask.isReadOnly}
                  value={editingTask.task.description || ''}
                  onChange={e => setEditingTask({
                    ...editingTask,
                    task: { ...editingTask.task, description: e.target.value }
                  })}
                  placeholder="Instruções detalhadas, critérios de execução, orientações para a equipe..."
                  className="w-full px-3.5 py-2 rounded-xl bg-[#12100e] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)] resize-none disabled:opacity-60"
                />
              </div>

              {/* Duração e Cronograma Section */}
              <div className="p-4 bg-[#12100e] border border-[#302722] rounded-xl space-y-3">
                <span className="text-xs font-bold text-[var(--theme-primary)] block">
                  Duração e cronograma
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[#a89c93] block mb-1">
                      Duração estimada (0 = sem data)
                    </label>
                    <input
                      type="number"
                      min={0}
                      disabled={editingTask.isReadOnly}
                      value={editingTask.task.estimatedDays ?? 0}
                      onChange={e => setEditingTask({
                        ...editingTask,
                        task: { ...editingTask.task, estimatedDays: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#1c1815] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)] disabled:opacity-60"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[#a89c93] block mb-1">
                      Contagem
                    </label>
                    <select
                      disabled={editingTask.isReadOnly}
                      value={editingTask.task.dayType || 'business'}
                      onChange={e => setEditingTask({
                        ...editingTask,
                        task: { ...editingTask.task, dayType: e.target.value as 'business' | 'calendar' }
                      })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#1c1815] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)] disabled:opacity-60"
                    >
                      <option value="business">Dias úteis</option>
                      <option value="calendar">Dias corridos</option>
                    </select>
                  </div>
                </div>

                {/* Modo de Início Toggle */}
                <div>
                  <label className="text-[11px] font-semibold text-[#a89c93] block mb-1.5">
                    Modo de início
                  </label>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={editingTask.isReadOnly}
                      onClick={() => setEditingTask({
                        ...editingTask,
                        task: { ...editingTask.task, startMode: 'automatic' }
                      })}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                        editingTask.task.startMode === 'automatic' || !editingTask.task.startMode
                          ? 'bg-[var(--theme-primary)]/20 border-[var(--theme-primary)] text-[var(--theme-primary)]'
                          : 'bg-[#1c1815] border-[#3d342f] text-[#a89c93]'
                      }`}
                    >
                      Automático (início do projeto)
                    </button>
                    <button
                      type="button"
                      disabled={editingTask.isReadOnly}
                      onClick={() => setEditingTask({
                        ...editingTask,
                        task: { ...editingTask.task, startMode: 'manual' }
                      })}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                        editingTask.task.startMode === 'manual'
                          ? 'bg-[var(--theme-primary)]/20 border-[var(--theme-primary)] text-[var(--theme-primary)]'
                          : 'bg-[#1c1815] border-[#3d342f] text-[#a89c93]'
                      }`}
                    >
                      Manual
                    </button>
                  </div>
                  <p className="text-[10px] text-[#a89c93] mt-1.5 leading-tight flex items-start gap-1">
                    <Info className="w-3 h-3 text-[var(--theme-primary)] shrink-0 mt-0.5" />
                    Automático: a data de início é calculada a partir do início do projeto. Manual: a data é definida após a criação do projeto.
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#302722]">
              <button
                onClick={() => setEditingTask(null)}
                className="px-4 py-2 rounded-xl border border-[#3d342f] text-xs font-bold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#25201d] transition-all cursor-pointer"
              >
                {editingTask.isReadOnly ? 'Fechar' : 'Cancelar'}
              </button>
              {!editingTask.isReadOnly && (
                <button
                  onClick={handleSaveTaskDetail}
                  className="px-4 py-2 rounded-xl bg-[var(--theme-primary)] text-black text-xs font-bold hover:opacity-90 transition-all cursor-pointer"
                >
                  Salvar alterações
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1c1815] border border-rose-500/30 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-[#fcf8f5] text-base">
                  {confirmDelete.title}
                </h3>
                <p className="text-xs text-rose-400/80 mt-0.5 font-medium">
                  Esta ação não pode ser desfeita
                </p>
              </div>
            </div>

            <p className="text-xs text-[#fcf8f5] leading-relaxed bg-[#12100e] p-3.5 rounded-xl border border-[#302722]">
              {confirmDelete.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#302722]">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 rounded-xl border border-[#3d342f] text-xs font-bold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#25201d] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-rose-900/30"
              >
                <Trash2 className="w-4 h-4" />
                Confirmar exclusão
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
