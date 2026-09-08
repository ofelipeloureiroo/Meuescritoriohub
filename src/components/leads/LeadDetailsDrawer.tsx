import React, { useState } from 'react';
import {
  X,
  Edit2,
  ArrowRight,
  Zap,
  Phone,
  MapPin,
  Mail,
  Instagram,
  Calendar,
  DollarSign,
  User,
  Info,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  MessageSquare,
} from 'lucide-react';
import { Client } from '../../types';
import { calculateLeadScore, ScoreBreakdown } from '../../utils/leadScoring';
import { formatCurrency } from '../../utils/formatters';

interface LeadDetailsDrawerProps {
  lead: Client | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (lead: Client) => void;
  onConvert: (lead: Client) => void;
  onUpdateStage?: (leadId: string, stage: Client['pipelineStage']) => void;
}

export const LeadDetailsDrawer: React.FC<LeadDetailsDrawerProps> = ({
  lead,
  isOpen,
  onClose,
  onEdit,
  onConvert,
  onUpdateStage,
}) => {
  const [activeTab, setActiveTab] = useState<'contexto' | 'atividades'>('contexto');
  const [showScoreBreakdown, setShowScoreBreakdown] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [timelineNotes, setTimelineNotes] = useState<
    Array<{ id: string; text: string; date: string; author: string }>
  >([]);

  if (!isOpen || !lead) return null;

  // Auto calculate scoring breakdown based on Service Type & Proposal Value
  const scoreInfo: ScoreBreakdown = calculateLeadScore(lead);

  // Proposal display
  const effectiveProposalVal =
    lead.proposalValue ||
    lead.estimatedValue ||
    (lead.proposalsList && lead.proposalsList.length > 0
      ? Math.max(...lead.proposalsList.map((p) => p.value || 0))
      : 0);

  const getStageBadgeColor = (stage?: string) => {
    switch (stage) {
      case 'novo':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'diagnostico':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'proposta':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'negociacao':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'contratado':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'perdido':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-zinc-100 text-zinc-700 border-zinc-200';
    }
  };

  const getStageLabel = (stage?: string) => {
    switch (stage) {
      case 'novo':
        return 'Novo';
      case 'diagnostico':
        return 'Diagnóstico';
      case 'proposta':
        return 'Proposta';
      case 'negociacao':
        return 'Negociação';
      case 'contratado':
        return 'Contratado';
      case 'perdido':
        return 'Perdido';
      default:
        return 'Novo';
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setTimelineNotes([
      {
        id: Date.now().toString(),
        text: newNote.trim(),
        date: new Date().toLocaleString('pt-BR'),
        author: 'Você',
      },
      ...timelineNotes,
    ]);
    setNewNote('');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-xs transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-over Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl flex flex-col animate-slide-in-right border-l border-zinc-200">
          {/* Top Header */}
          <div className="p-6 border-b border-zinc-100 bg-white">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-zinc-900 truncate tracking-tight">
                    {lead.name}
                  </h2>
                  {lead.company && (
                    <span className="text-xs text-zinc-500 font-normal">
                      • {lead.company}
                    </span>
                  )}
                </div>

                <div className="flex items-center flex-wrap gap-2 text-xs">
                  {/* Pipeline Stage Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-semibold border ${getStageBadgeColor(
                      lead.pipelineStage
                    )}`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {getStageLabel(lead.pipelineStage)}
                  </span>

                  {lead.subStatus && lead.subStatus !== 'Nenhum' && (
                    <span className="text-zinc-500 font-medium">
                      · {lead.subStatus}
                    </span>
                  )}

                  {/* Next Action Indicator */}
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-md">
                    <Zap className="w-3 h-3 text-zinc-400" />
                    Sem próxima ação
                  </span>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onEdit(lead)}
                  className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Edit2 className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  onClick={() => onConvert(lead)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#b8986d] hover:bg-[#a6865c] transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Converter</span>
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* ---------------- SCORE CARD (MATCHING USER SCREENSHOT) ---------------- */}
            <div className="mt-5 p-4 rounded-2xl bg-[#faf7f2] border border-[#eee6dc] shadow-2xs">
              <div className="flex items-center justify-between gap-4">
                {/* Thermometer & Total Score */}
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white border border-[#e8ded0] flex items-center justify-center text-amber-600 shadow-2xs">
                    <span className="text-xl">🌡️</span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                        Score
                      </span>
                      <span className="text-2xl font-black text-amber-800 leading-none">
                        {scoreInfo.totalScore}
                      </span>
                    </div>
                    <div className="mt-0.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${scoreInfo.badgeClass}`}
                      >
                        {scoreInfo.statusLabel}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress bars: Fechamento & Lucratividade */}
                <div className="flex-1 grid grid-cols-2 gap-4 max-w-xs pl-2 border-l border-[#e8ded0]">
                  {/* Fechamento */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-semibold text-zinc-600 mb-1">
                      <span>Fechamento</span>
                      <span className="font-bold text-blue-600">
                        {scoreInfo.fechamentoScore}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-200 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${scoreInfo.fechamentoScore}%` }}
                      />
                    </div>
                  </div>

                  {/* Lucratividade */}
                  <div>
                    <div className="flex justify-between items-center text-[10px] font-semibold text-zinc-600 mb-1">
                      <span>Lucratividade</span>
                      <span className="font-bold text-emerald-600">
                        {scoreInfo.lucratividadeScore}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-zinc-200 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${scoreInfo.lucratividadeScore}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Toggle Score Breakdown Explanation */}
              <div className="mt-3 pt-2.5 border-t border-[#eee6dc]/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowScoreBreakdown(!showScoreBreakdown)}
                  className="text-[11px] font-semibold text-[#8c7255] hover:text-[#725a41] flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>
                    {showScoreBreakdown
                      ? 'Ocultar detalhes do cálculo'
                      : 'Ver cálculo automático por Tipo de Serviço & Valor'}
                  </span>
                  {showScoreBreakdown ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>

              {/* Expanded Breakdown Box */}
              {showScoreBreakdown && (
                <div className="mt-3 p-3 rounded-xl bg-white border border-[#e8ded0] space-y-2 text-xs text-zinc-700 animate-fade-in">
                  <div className="flex items-center justify-between pb-1.5 border-b border-zinc-100 font-semibold text-zinc-900 text-[11px]">
                    <span>Fator de Pontuação</span>
                    <span>Pontos Obtidos</span>
                  </div>

                  {/* 1. Tipo de Serviço */}
                  <div className="flex items-center justify-between py-1 border-b border-zinc-50">
                    <div>
                      <span className="font-medium text-zinc-800 block">
                        🛠️ Tipo de Serviço ({lead.serviceType || lead.projectType || 'Interiores'})
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {scoreInfo.factors.serviceType.label}
                      </span>
                    </div>
                    <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                      +{scoreInfo.factors.serviceType.points} / {scoreInfo.factors.serviceType.max} pts
                    </span>
                  </div>

                  {/* 2. Valor da Proposta */}
                  <div className="flex items-center justify-between py-1 border-b border-zinc-50">
                    <div>
                      <span className="font-medium text-zinc-800 block">
                        💰 Valor da Proposta ({effectiveProposalVal ? formatCurrency(effectiveProposalVal) : 'Sem valor'})
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {scoreInfo.factors.proposalValue.label}
                      </span>
                    </div>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      +{scoreInfo.factors.proposalValue.points} / {scoreInfo.factors.proposalValue.max} pts
                    </span>
                  </div>

                  {/* 3. Etapa do Pipeline */}
                  <div className="flex items-center justify-between py-1 border-b border-zinc-50">
                    <div>
                      <span className="font-medium text-zinc-800 block">
                        📊 Etapa do Pipeline ({getStageLabel(lead.pipelineStage)})
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {scoreInfo.factors.stage.label}
                      </span>
                    </div>
                    <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
                      +{scoreInfo.factors.stage.points} / {scoreInfo.factors.stage.max} pts
                    </span>
                  </div>

                  {/* 4. Urgência & Perfil */}
                  <div className="flex items-center justify-between py-1">
                    <div>
                      <span className="font-medium text-zinc-800 block">
                        ⚡ Urgência ({lead.urgency || 'Média'}) & Perfil ({lead.clientProfile || 'Médio'})
                      </span>
                      <span className="text-[10px] text-zinc-500">
                        {scoreInfo.factors.urgency.label} • {scoreInfo.factors.profile.label}
                      </span>
                    </div>
                    <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                      +{scoreInfo.factors.urgency.points + scoreInfo.factors.profile.points} / 20 pts
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Segmented Tabs: Contexto | Atividades */}
            <div className="flex items-center gap-2 mt-5 border-b border-zinc-200">
              <button
                type="button"
                onClick={() => setActiveTab('contexto')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer ${
                  activeTab === 'contexto'
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-400 hover:text-zinc-700'
                }`}
              >
                Contexto
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('atividades')}
                className={`pb-2 px-3 text-xs font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'atividades'
                    ? 'border-zinc-900 text-zinc-900'
                    : 'border-transparent text-zinc-400 hover:text-zinc-700'
                }`}
              >
                <span>Atividades</span>
                {timelineNotes.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-zinc-200 text-zinc-700 text-[10px] flex items-center justify-center font-bold">
                    {timelineNotes.length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {activeTab === 'contexto' ? (
              <div className="space-y-6">
                {/* 1. PRÓXIMA AÇÃO */}
                <div>
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    PRÓXIMA AÇÃO
                  </h4>
                  <div className="p-3.5 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-zinc-500 text-xs">
                      <Zap className="w-4 h-4 text-zinc-400" />
                      <span>Nenhuma próxima ação definida</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onEdit(lead)}
                      className="text-xs font-semibold text-zinc-700 hover:text-amber-800 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Definir agora</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* 2. CONTATO */}
                <div>
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                    CONTATO
                  </h4>
                  <div className="space-y-2">
                    {/* Telefone / WhatsApp */}
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5 text-zinc-800 font-medium">
                        <Phone className="w-4 h-4 text-zinc-400" />
                        <span>{lead.whatsapp || lead.phone || 'Sem telefone informado'}</span>
                      </div>
                      {(lead.whatsapp || lead.phone) && (
                        <a
                          href={`https://wa.me/55${(lead.whatsapp || lead.phone || '').replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                        >
                          Chamar no WhatsApp
                        </a>
                      )}
                    </div>

                    {/* Email */}
                    {lead.email && (
                      <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center gap-2.5 text-xs text-zinc-800">
                        <Mail className="w-4 h-4 text-zinc-400" />
                        <span>{lead.email}</span>
                      </div>
                    )}

                    {/* Localização */}
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center gap-2.5 text-xs text-zinc-800">
                      <MapPin className="w-4 h-4 text-zinc-400" />
                      <span>
                        {lead.city || 'Cidade não informada'}
                        {lead.state ? `, ${lead.state}` : ''}
                        {lead.neighborhood ? ` (${lead.neighborhood})` : ''}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. PROJETO & PIPELINE (Grid matching screenshot) */}
                <div className="grid grid-cols-2 gap-6 pt-2 border-t border-zinc-100">
                  {/* PROJETO */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      PROJETO
                    </h4>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Tipo</span>
                      <span className="text-xs font-bold text-zinc-800">
                        {lead.projectType || lead.serviceType || 'Projeto de Interiores'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Valor Estimado / Proposta</span>
                      <span className="text-xs font-bold text-emerald-700">
                        {effectiveProposalVal > 0
                          ? formatCurrency(effectiveProposalVal)
                          : 'A definir'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Urgência</span>
                      <span className="text-xs font-bold text-zinc-800">
                        {lead.urgency || 'Alta'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Perfil</span>
                      <span className="text-xs font-bold text-zinc-800">
                        {lead.clientProfile || 'Médio'}
                      </span>
                    </div>

                    {lead.approximateArea && (
                      <div>
                        <span className="text-[11px] text-zinc-400 block font-medium">Área</span>
                        <span className="text-xs font-bold text-zinc-800">
                          {lead.approximateArea} m²
                        </span>
                      </div>
                    )}
                  </div>

                  {/* PIPELINE */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      PIPELINE
                    </h4>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Entrada</span>
                      <span className="text-xs font-bold text-zinc-800">
                        {lead.entryDate || lead.createdAt || '07/07/2026'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Canal</span>
                      <span className="text-xs font-bold text-zinc-800">
                        {lead.acquisitionChannel || lead.originChannel || 'Instagram'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-zinc-400 block font-medium">Responsável</span>
                      <span className="text-xs font-bold text-zinc-800">
                        {lead.responsibleName || 'Arquiteto Titular'}
                      </span>
                    </div>

                    {lead.subStatus && (
                      <div>
                        <span className="text-[11px] text-zinc-400 block font-medium">Substatus</span>
                        <span className="text-xs font-bold text-zinc-800">
                          {lead.subStatus}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Observações */}
                {lead.notes && (
                  <div className="pt-2 border-t border-zinc-100">
                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">
                      OBSERVAÇÕES
                    </h4>
                    <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-100 text-xs text-zinc-700 leading-relaxed whitespace-pre-wrap">
                      {lead.notes}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Atividades / Histórico Tab */
              <div className="space-y-4">
                {/* Add note form */}
                <form onSubmit={handleAddNote} className="space-y-2">
                  <label className="text-xs font-semibold text-zinc-700 block">
                    Registrar nova interação ou nota
                  </label>
                  <textarea
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Ex: Liguei para o cliente, solicitou proposta revisada até sexta..."
                    className="w-full p-3 rounded-xl border border-zinc-300 text-xs focus:outline-none focus:border-amber-600 resize-none shadow-2xs"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!newNote.trim()}
                      className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-amber-700 hover:bg-amber-800 disabled:opacity-50 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Registrar</span>
                    </button>
                  </div>
                </form>

                {/* Activity List */}
                <div className="space-y-3 pt-4 border-t border-zinc-100">
                  <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                    Histórico Recente
                  </h5>

                  {timelineNotes.length === 0 ? (
                    <div className="text-center py-8 text-zinc-400 text-xs">
                      Nenhuma atividade registrada ainda. Use o campo acima para adicionar anotações de contato.
                    </div>
                  ) : (
                    timelineNotes.map((act) => (
                      <div
                        key={act.id}
                        className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1"
                      >
                        <div className="flex justify-between items-center text-[10px] text-zinc-500 font-semibold">
                          <span>{act.author}</span>
                          <span>{act.date}</span>
                        </div>
                        <p className="text-zinc-800">{act.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer ID & Meta */}
          <div className="p-4 px-6 border-t border-zinc-100 bg-zinc-50/50 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="truncate">
              # ID: {lead.id}
            </span>
            <span className="shrink-0">
              Criado em {lead.createdAt || lead.entryDate || 'Hoje'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
