import React, { useMemo } from 'react';
import {
  TrendingUp,
  Users,
  FileText,
  Briefcase,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  Activity,
  Award,
  Zap,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency } from '../../utils/formatters';

export const BusinessDashboardTab: React.FC = () => {
  const {
    clients,
    freelanceProjects,
    workContracts,
    overdueInstallments,
    overdueMilestones,
    projectInstallments,
  } = useFinance();

  // 1. Calculations
  const leads = useMemo(() => clients.filter((c) => c.status === 'lead'), [clients]);
  const activeClients = useMemo(() => clients.filter((c) => c.status === 'active'), [clients]);
  const completedClients = useMemo(() => clients.filter((c) => c.status === 'completed'), [clients]);

  const proposals = useMemo(
    () => freelanceProjects.filter((p) => p.status === 'prospect'),
    [freelanceProjects]
  );
  
  const totalProposalsValue = useMemo(
    () => proposals.reduce((sum, p) => sum + (p.totalValue || 0), 0),
    [proposals]
  );

  const activeContracts = useMemo(
    () => workContracts.filter((c) => c.status === 'signed' || c.status === 'completed'),
    [workContracts]
  );

  const totalContractsValue = useMemo(
    () => activeContracts.reduce((sum, c) => sum + (c.totalAmount || 0), 0),
    [activeContracts]
  );

  // Conversion rate (customers / total contacts)
  const totalContacts = clients.length;
  const convertedCount = activeClients.length + completedClients.length;
  const conversionRate = totalContacts > 0 ? (convertedCount / totalContacts) * 100 : 0;

  // 2. Business Health Score Calculation (Mathematical Logic)
  const healthScore = useMemo(() => {
    let score = 20; // Base score

    // Add points for active contracts
    score += Math.min(activeContracts.length * 8, 30);

    // Add points for leads pipeline
    score += Math.min(leads.length * 5, 20);

    // Add points for conversion rate
    score += Math.min(Math.round(conversionRate * 0.3), 30);

    // Penalize for overdue installments/tasks
    score -= Math.min(overdueInstallments.length * 5, 15);
    score -= Math.min(overdueMilestones.length * 5, 10);

    // Keep between 0 and 100
    return Math.max(0, Math.min(100, score));
  }, [activeContracts, leads, conversionRate, overdueInstallments, overdueMilestones]);

  const healthStatus = useMemo(() => {
    if (healthScore >= 75) return { label: 'Excelente / Saudável', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
    if (healthScore >= 50) return { label: 'Estável', color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    return { label: 'Atenção / Crítica', color: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
  }, [healthScore]);

  // 3. Priorities / What to Attack First
  const priorities = useMemo(() => {
    const list = [];

    // Prioridade 1: Parcelas vencidas
    if (overdueInstallments.length > 0) {
      list.push({
        id: 'prio-overdue-tx',
        title: `Cobranças Vencidas (${overdueInstallments.length} parcelas)`,
        desc: 'Clientes com pagamento em atraso. Entre em contato para cobrar e regularizar.',
        type: 'danger',
        action: 'Cobrar agora',
      });
    }

    // Prioridade 2: Prazos/Milestones vencidos
    if (overdueMilestones.length > 0) {
      list.push({
        id: 'prio-overdue-ms',
        title: `Prazos de Entrega Atrasados (${overdueMilestones.length} itens)`,
        desc: 'Projetos com etapas vencidas sem conclusão. Regularize o andamento ou renegocie prazos.',
        type: 'warning',
        action: 'Ver prazos',
      });
    }

    // Prioridade 3: Contratos rascunho ou pendentes de assinatura
    const pendingSignatures = workContracts.filter((c) => c.status === 'sent');
    if (pendingSignatures.length > 0) {
      list.push({
        id: 'prio-signatures',
        title: `Contratos Aguardando Assinatura (${pendingSignatures.length} contratos)`,
        desc: 'Propostas aceitas enviadas para assinatura. Faça um follow-up com o cliente.',
        type: 'info',
        action: 'Ver contratos',
      });
    }

    // Prioridade 4: Leads antigos sem contato recente
    if (leads.length > 0) {
      list.push({
        id: 'prio-leads',
        title: `Leads em Aberto (${leads.length} contatos)`,
        desc: 'Contatos comerciais interessados que ainda não fecharam. Envie um lembrete ou nova oferta.',
        type: 'success',
        action: 'Ver leads',
      });
    }

    return list;
  }, [overdueInstallments, overdueMilestones, workContracts, leads]);

  return (
    <div className="space-y-6 pb-12">
      {/* Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#18181b] border border-[#27272a]">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
              <Activity className="w-4 h-4" />
            </span>
            <h2 className="text-lg font-bold text-[#fafafa] tracking-tight">
              Saúde do Negócio
            </h2>
          </div>
          <p className="text-xs text-[#a1a1aa] mt-1 max-w-2xl">
            Visão geral inteligente de propostas, leads, conversão de vendas e os principais focos de atenção operacional para o seu escritório.
          </p>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Leads */}
        <div className="p-5 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#a1a1aa]">Leads Comercial</span>
            <h3 className="text-2xl font-bold text-[#fafafa] mt-1">{leads.length}</h3>
            <span className="text-[10px] text-yellow-500/80 flex items-center gap-1 mt-1">
              <Zap className="w-3 h-3" /> Oportunidades ativas
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Proposals */}
        <div className="p-5 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#a1a1aa]">Propostas (Prospect)</span>
            <h3 className="text-2xl font-bold text-[#fafafa] mt-1">{proposals.length}</h3>
            <span className="text-[10px] text-purple-400 flex items-center gap-1 mt-1">
              {formatCurrency(totalProposalsValue)} em pipeline
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* Active Contracts */}
        <div className="p-5 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#a1a1aa]">Contratos Ativos</span>
            <h3 className="text-2xl font-bold text-[#fafafa] mt-1">{activeContracts.length}</h3>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
              {formatCurrency(totalContractsValue)} em carteira
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="p-5 rounded-2xl bg-[#18181b] border border-[#27272a] flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-[#a1a1aa]">Taxa de Conversão</span>
            <h3 className="text-2xl font-bold text-[#fafafa] mt-1">
              {conversionRate.toFixed(1)}%
            </h3>
            <span className="text-[10px] text-indigo-400 flex items-center gap-1 mt-1">
              Contatos que viraram clientes
            </span>
          </div>
          <div className="p-3.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Section Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Side: Score & Performance (7 Columns) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-6 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-6">
          <div className="text-center">
            <h3 className="text-base font-bold text-[#fafafa]">Índice de Saúde Operacional</h3>
            <p className="text-xs text-[#a1a1aa] mt-1">Sua nota com base em contratos, leads e pontualidade.</p>
          </div>

          {/* Graphical Circle Gauge */}
          <div className="flex flex-col items-center justify-center py-4 relative">
            <div className="relative w-44 h-44 flex items-center justify-center">
              {/* Outer SVG Circle */}
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="88"
                  cy="88"
                  r="74"
                  className="stroke-[#27272a]"
                  strokeWidth="12"
                  fill="transparent"
                />
                <circle
                  cx="88"
                  cy="88"
                  r="74"
                  style={{
                    strokeDasharray: `${2 * Math.PI * 74}`,
                    strokeDashoffset: `${2 * Math.PI * 74 * (1 - healthScore / 100)}`,
                    transition: 'stroke-dashoffset 0.8s ease-in-out',
                  }}
                  className="stroke-yellow-500"
                  strokeWidth="12"
                  strokeLinecap="round"
                  fill="transparent"
                />
              </svg>
              {/* Inner score overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-serif font-black text-[#fafafa]">{healthScore}</span>
                <span className="text-[10px] text-[#a1a1aa] uppercase tracking-wider font-bold">pontos</span>
              </div>
            </div>

            <div className={`mt-5 px-4 py-1.5 rounded-full text-xs font-semibold ${healthStatus.bg} ${healthStatus.color} border ${healthStatus.border}`}>
              Estado: {healthStatus.label}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#27272a]/40 border border-[#27272a] text-xs text-[#a1a1aa] space-y-2">
            <div className="flex justify-between items-center border-b border-[#27272a]/50 pb-2">
              <span>Conversão Comercial</span>
              <span className="text-[#fafafa] font-semibold">{conversionRate.toFixed(0)} / 100</span>
            </div>
            <div className="flex justify-between items-center border-b border-[#27272a]/50 pb-2">
              <span>Propostas em Prospecção</span>
              <span className="text-[#fafafa] font-semibold">{proposals.length} pendentes</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Alertas de Atrasos</span>
              <span className={`${overdueInstallments.length > 0 ? 'text-rose-400' : 'text-emerald-400'} font-semibold`}>
                {overdueInstallments.length} cobranças
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: What to Attack / Actionable Priorities (7 Columns) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[#18181b] border border-[#27272a] space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#fafafa]">O que atacar primeiro</h3>
            <p className="text-xs text-[#a1a1aa] mt-1">Ações recomendadas com base nas pendências comerciais e financeiras.</p>
          </div>

          <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
            {priorities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#fafafa]">Tudo excelente por aqui!</h4>
                  <p className="text-[11px] text-[#a1a1aa] mt-0.5">Nenhuma pendência crítica ou atraso operacional identificado.</p>
                </div>
              </div>
            ) : (
              priorities.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-start justify-between gap-4 transition-colors bg-[#27272a]/20 hover:bg-[#27272a]/40 border-[#27272a]"
                >
                  <div className="flex gap-3">
                    <span className={`p-2 rounded-lg mt-0.5 shrink-0 h-fit ${
                      item.type === 'danger'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : item.type === 'warning'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : item.type === 'info'
                        ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {item.type === 'danger' && <AlertCircle className="w-4 h-4" />}
                      {item.type === 'warning' && <AlertTriangle className="w-4 h-4" />}
                      {item.type === 'info' && <FileText className="w-4 h-4" />}
                      {item.type === 'success' && <Award className="w-4 h-4" />}
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-[#fafafa]">{item.title}</h4>
                      <p className="text-[11px] text-[#a1a1aa] mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
