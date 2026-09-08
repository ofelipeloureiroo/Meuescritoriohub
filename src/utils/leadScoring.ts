import { Client } from '../types';

export interface ScoreBreakdown {
  totalScore: number;
  fechamentoScore: number;
  lucratividadeScore: number;
  status: 'frio' | 'morno' | 'quente';
  statusLabel: string;
  badgeClass: string;
  factors: {
    serviceType: { points: number; max: number; label: string };
    proposalValue: { points: number; max: number; label: string };
    stage: { points: number; max: number; label: string };
    urgency: { points: number; max: number; label: string };
    profile: { points: number; max: number; label: string };
  };
}

/**
 * Calculates dynamic Lead Score (0-100), Fechamento Probability (0-100%),
 * and Profitability/Ticket Potential (0-100%) based on Service Type,
 * Proposal Value, Pipeline Stage, Urgency, and Client Profile.
 */
export function calculateLeadScore(lead: {
  serviceType?: string;
  projectType?: string;
  proposalValue?: number;
  estimatedValue?: number;
  internalCostEstimate?: number;
  pipelineStage?: string;
  urgency?: string;
  clientProfile?: string;
  proposalsList?: Array<{ value?: number }>;
}): ScoreBreakdown {
  const service = (lead.projectType || lead.serviceType || '').toLowerCase();
  
  // Resolve effective proposal value
  let proposalVal = lead.proposalValue || lead.estimatedValue || 0;
  if (!proposalVal && lead.proposalsList && lead.proposalsList.length > 0) {
    proposalVal = Math.max(...lead.proposalsList.map((p) => p.value || 0));
  }

  // 1. SERVICE TYPE POINTS (Max 30 pts)
  // Higher complexity / high-ticket architectural services get higher baseline score
  let servicePoints = 15;
  let serviceLabel = 'Serviço Padrão';
  if (
    service.includes('completo') ||
    service.includes('residencial') ||
    service.includes('comercial') ||
    service.includes('corporativo') ||
    service.includes('edificação') ||
    service.includes('construção')
  ) {
    servicePoints = 30;
    serviceLabel = 'Alto Valor / Escopo Amplo (+30 pts)';
  } else if (
    service.includes('interiores') ||
    service.includes('reforma') ||
    service.includes('layout') ||
    service.includes('executivo')
  ) {
    servicePoints = 25;
    serviceLabel = 'Interiores / Reforma (+25 pts)';
  } else if (
    service.includes('consultoria') ||
    service.includes('ambientação') ||
    service.includes('paisagismo') ||
    service.includes('produção')
  ) {
    servicePoints = 18;
    serviceLabel = 'Consultoria / Rápido Giro (+18 pts)';
  } else if (service.includes('laudo') || service.includes('visita') || service.includes('express')) {
    servicePoints = 12;
    serviceLabel = 'Serviço Pontual (+12 pts)';
  } else if (!service) {
    servicePoints = 10;
    serviceLabel = 'Tipo não especificado (+10 pts)';
  }

  // 2. PROPOSAL VALUE POINTS (Max 30 pts)
  let valPoints = 5;
  let valLabel = 'Sem valor definido';
  if (proposalVal >= 50000) {
    valPoints = 30;
    valLabel = 'Ticket Muito Alto (≥ R$ 50k) (+30 pts)';
  } else if (proposalVal >= 25000) {
    valPoints = 25;
    valLabel = 'Ticket Alto (≥ R$ 25k) (+25 pts)';
  } else if (proposalVal >= 12000) {
    valPoints = 20;
    valLabel = 'Ticket Médio-Alto (≥ R$ 12k) (+20 pts)';
  } else if (proposalVal >= 6000) {
    valPoints = 15;
    valLabel = 'Ticket Médio (≥ R$ 6k) (+15 pts)';
  } else if (proposalVal >= 2000) {
    valPoints = 10;
    valLabel = 'Ticket de Entrada (≥ R$ 2k) (+10 pts)';
  } else if (proposalVal > 0) {
    valPoints = 8;
    valLabel = 'Ticket Inicial (< R$ 2k) (+8 pts)';
  }

  // 3. PIPELINE STAGE POINTS (Max 20 pts)
  const stage = (lead.pipelineStage || 'novo').toLowerCase();
  let stagePoints = 5;
  let stageLabel = 'Contato Inicial';
  if (stage === 'contratado') {
    stagePoints = 20;
    stageLabel = 'Contrato Fechado (+20 pts)';
  } else if (stage === 'negociacao') {
    stagePoints = 18;
    stageLabel = 'Em Negociação Final (+18 pts)';
  } else if (stage === 'proposta') {
    stagePoints = 14;
    stageLabel = 'Proposta Apresentada (+14 pts)';
  } else if (stage === 'diagnostico') {
    stagePoints = 10;
    stageLabel = 'Diagnóstico / Briefing (+10 pts)';
  } else if (stage === 'perdido') {
    stagePoints = 0;
    stageLabel = 'Oportunidade Perdida (0 pts)';
  }

  // 4. URGENCY POINTS (Max 10 pts)
  const urgency = (lead.urgency || 'Média').toLowerCase();
  let urgencyPoints = 5;
  let urgencyLabel = 'Urgência Média';
  if (urgency.includes('imediata') || urgency.includes('alta') || urgency.includes('urgente')) {
    urgencyPoints = 10;
    urgencyLabel = 'Alta Urgência (+10 pts)';
  } else if (urgency.includes('baixa') || urgency.includes('futuro')) {
    urgencyPoints = 2;
    urgencyLabel = 'Baixa Urgência (+2 pts)';
  }

  // 5. CLIENT PROFILE (Max 10 pts)
  const profile = (lead.clientProfile || 'Médio').toLowerCase();
  let profilePoints = 5;
  let profileLabel = 'Perfil Médio';
  if (profile.includes('premium') || profile.includes('luxo')) {
    profilePoints = 10;
    profileLabel = 'Perfil Premium (+10 pts)';
  } else if (profile.includes('alto')) {
    profilePoints = 8;
    profileLabel = 'Perfil Alto Padrão (+8 pts)';
  } else if (profile.includes('econ')) {
    profilePoints = 3;
    profileLabel = 'Perfil Econômico (+3 pts)';
  }

  // TOTAL SCORE
  let totalScore = servicePoints + valPoints + stagePoints + urgencyPoints + profilePoints;
  if (stage === 'perdido') {
    totalScore = Math.min(totalScore, 20);
  }
  totalScore = Math.min(100, Math.max(1, Math.round(totalScore)));

  // FECHAMENTO PROBABILITY (%)
  // Strongly correlated with Stage + Urgency + Proposal Presence
  let fechamentoProb = 20;
  if (stage === 'contratado') fechamentoProb = 100;
  else if (stage === 'negociacao') fechamentoProb = 75 + (urgencyPoints >= 8 ? 10 : 0);
  else if (stage === 'proposta') fechamentoProb = 50 + (valPoints >= 15 ? 15 : 5);
  else if (stage === 'diagnostico') fechamentoProb = 35 + (urgencyPoints >= 8 ? 10 : 0);
  else if (stage === 'novo') fechamentoProb = 15 + (urgencyPoints >= 8 ? 10 : 0);
  else if (stage === 'perdido') fechamentoProb = 0;
  fechamentoProb = Math.min(100, Math.max(5, Math.round(fechamentoProb)));

  // LUCRATIVIDADE / MARGEM POTENTIAL (%)
  // Calculated using Proposal Value vs Estimated Internal Cost, or standard margin based on ticket & service
  let lucratividadeProb = 50;
  if (proposalVal > 0 && lead.internalCostEstimate && lead.internalCostEstimate > 0) {
    const margin = ((proposalVal - lead.internalCostEstimate) / proposalVal) * 100;
    lucratividadeProb = Math.min(95, Math.max(10, Math.round(margin)));
  } else {
    // Synthetic profitability score based on proposal value weight + service margin
    const baseMargin = servicePoints >= 25 ? 65 : 45;
    const valueBonus = Math.min(30, (valPoints / 30) * 30);
    lucratividadeProb = Math.min(95, Math.max(15, Math.round(baseMargin + valueBonus - 15)));
  }

  // STATUS CLASSIFICATION
  let status: 'frio' | 'morno' | 'quente' = 'frio';
  let statusLabel = 'Lead Frio';
  let badgeClass = 'bg-zinc-100 text-zinc-600 border-zinc-200';

  if (totalScore >= 60) {
    status = 'quente';
    statusLabel = 'Lead Quente';
    badgeClass = 'bg-amber-500/10 text-amber-700 border-amber-500/30';
  } else if (totalScore >= 45) {
    status = 'morno';
    statusLabel = 'Lead Morno';
    badgeClass = 'bg-orange-500/10 text-orange-600 border-orange-500/30';
  }

  return {
    totalScore,
    fechamentoScore: fechamentoProb,
    lucratividadeScore: lucratividadeProb,
    status,
    statusLabel,
    badgeClass,
    factors: {
      serviceType: { points: servicePoints, max: 30, label: serviceLabel },
      proposalValue: { points: valPoints, max: 30, label: valLabel },
      stage: { points: stagePoints, max: 20, label: stageLabel },
      urgency: { points: urgencyPoints, max: 10, label: urgencyLabel },
      profile: { points: profilePoints, max: 10, label: profileLabel },
    },
  };
}
