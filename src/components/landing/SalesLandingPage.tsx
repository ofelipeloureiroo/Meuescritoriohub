import React, { useState } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  CreditCard, 
  FolderKanban, 
  Users, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Check, 
  ChevronDown, 
  Smartphone, 
  Lock,
  TrendingUp,
  Clock,
  Briefcase,
  ShoppingBag,
  Scale,
  Compass,
  Activity,
  Layers,
  QrCode,
  Zap,
  Award,
  AlertTriangle,
  FileText,
  Target,
  UserCheck,
  CheckSquare,
  BarChart3,
  CalendarCheck2,
  ListTodo
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NicheType } from '../../types';
import { NICHES } from '../../utils/theme';

export const SalesLandingPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  
  // Interactive niche showcase selector on the landing page
  const [activeNicheKey, setActiveNicheKey] = useState<NicheType>('advocacia');
  const [previewTab, setPreviewTab] = useState<'projetos' | 'prazos' | 'crm'>('projetos');

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleSubscribeClick = () => {
    navigate('/checkout');
  };

  const currentNicheData = NICHES[activeNicheKey] || NICHES.advocacia;

  const showcasedNiches: { 
    key: NicheType; 
    label: string; 
    icon: React.ReactNode; 
    projectExample: string;
    deadlineExample: string;
    desc: string 
  }[] = [
    { 
      key: 'advocacia', 
      label: 'Advocacia & Jurídico', 
      icon: <Scale className="w-4 h-4" />,
      projectExample: 'Ação Cível de Indenização / Contrato Social',
      deadlineExample: 'Prazo Fatal para Contestação (03 dias)',
      desc: 'Gestão de processos por fases (Petição, Instrução, Sentença, Recurso), audiências e controle rigoroso de prazos processuais fatais.'
    },
    { 
      key: 'arquitetura', 
      label: 'Arquitetura & Design', 
      icon: <Compass className="w-4 h-4" />,
      projectExample: 'Projeto Residencial Alphaville 420m²',
      deadlineExample: 'Apresentação do 3D e Maquete Virtual (Quinta-feira)',
      desc: 'Etapas de entrega (Estudo Preliminar, Anteprojeto, Executivo e Obra), vistorias e aprovações com o cliente sem atrasos.'
    },
    { 
      key: 'engenharia', 
      label: 'Engenharia & Obras', 
      icon: <Building2 className="w-4 h-4" />,
      projectExample: 'Laudo Estrutural & Execução de Fundação',
      deadlineExample: 'Medição de Canteiro e Liberação de Etapa (15/10)',
      desc: 'Cronograma físico da obra, alocação de equipes técnicas, emissão de laudos e acompanhamento de marcos de engenharia.'
    },
    { 
      key: 'consultoria', 
      label: 'Consultoria & Gestão', 
      icon: <TrendingUp className="w-4 h-4" />,
      projectExample: 'Diagnóstico Organizacional & Reestruturação',
      deadlineExample: 'Sprint de Mapeamento de Processos (Em 48h)',
      desc: 'Organização de sprints, entregáveis por marcos, atas de reunião, planos de ação e acompanhamento estratégico de metas.'
    },
    { 
      key: 'vendas', 
      label: 'Vendas & Comércio', 
      icon: <ShoppingBag className="w-4 h-4" />,
      projectExample: 'Implantação Comercial & Fornecimento Corporativo',
      deadlineExample: 'Expedição do Lote e Faturamento (Amanhã 14h)',
      desc: 'Acompanhamento do ciclo de propostas, pedidos de clientes, prazos de entrega de mercadorias e cronograma de pós-venda.'
    },
    { 
      key: 'saude_estetica', 
      label: 'Saúde & Procedimentos', 
      icon: <Activity className="w-4 h-4" />,
      projectExample: 'Protocolo de Harmonização & Retorno Pós-Procedimento',
      deadlineExample: 'Sessão de Revisão e Retorno do Paciente (Sexta)',
      desc: 'Pacotes de atendimento, sessões programadas, evolução clínica e controle de retornos de pacientes sem desorganização.'
    },
    { 
      key: 'autonomo', 
      label: 'Serviços & Autônomos', 
      icon: <Briefcase className="w-4 h-4" />,
      projectExample: 'Prestação de Serviços Técnicos Especializados',
      deadlineExample: 'Entrega Final e Assinatura de Termo (Terça-feira)',
      desc: 'Ordens de serviço, cronograma de atendimento, alinhamento de expectativas e cumprimento dos prazos prometidos aos clientes.'
    },
  ];

  return (
    <div className="min-h-screen bg-[#12100e] text-[#fcf8f5] font-sans selection:bg-[var(--theme-primary)]/30 selection:text-[#fcf8f5]">
      
      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 bg-[#12100e]/90 backdrop-blur-md border-b border-[#3d342f]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: 'var(--theme-primary)',
              }}
            >
              <Building2 className="w-6 h-6 text-[#12100e]" />
            </div>
            <div className="flex flex-col">
              <span className="font-serif font-bold text-xl tracking-wide leading-none">
                Meu Escritório <span style={{ color: 'var(--theme-primary)' }}>Online</span>
              </span>
              <span className="text-[10px] text-[#a89c93] tracking-widest uppercase font-semibold mt-1">
                Gestão de Escritório & Projetos
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#a89c93]">
            <a href="#diferencial" className="hover:text-[#fcf8f5] transition-colors">Por Que Nós</a>
            <a href="#nichos" className="hover:text-[#fcf8f5] transition-colors">Seu Nicho</a>
            <a href="#recursos" className="hover:text-[#fcf8f5] transition-colors">Recursos do Gestor</a>
            <a href="#planos" className="hover:text-[#fcf8f5] transition-colors">Planos & Preços</a>
            <a href="#faq" className="hover:text-[#fcf8f5] transition-colors">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <button
                onClick={() => navigate('/app')}
                className="px-5 py-2.5 rounded-xl text-black font-bold text-sm transition-all shadow-lg hover:brightness-110 cursor-pointer"
                style={{ backgroundColor: 'var(--theme-primary)' }}
              >
                Acessar Meu Painel
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hidden sm:inline-block text-sm font-semibold text-[#a89c93] hover:text-[#fcf8f5] transition-colors px-3 py-2"
                >
                  Entrar
                </Link>
                <button
                  onClick={handleSubscribeClick}
                  className="px-5 py-2.5 rounded-xl text-black font-bold text-sm transition-all shadow-lg hover:brightness-110 cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-primary)' }}
                >
                  Assinar por R$ 50/mês
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-20 md:pt-18 md:pb-28 overflow-hidden">
        {/* Background Glows */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[850px] h-[500px] rounded-full blur-[150px] pointer-events-none -z-10 opacity-20"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          {/* Eyebrow Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 shadow-sm"
            style={{
              backgroundColor: 'var(--theme-badge-bg)',
              color: 'var(--theme-primary)',
              border: '1px solid var(--theme-badge-border)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>O Sistema Operacional Completo para Gestão de Escritório & Projetos</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-[#fcf8f5] tracking-tight leading-[1.1] mb-6">
            Chega de prazos perdidos. <br className="hidden sm:inline" />
            <span style={{ color: 'var(--theme-primary)' }}>Seus projetos e escritório</span> sob controle.
          </h1>

          {/* Subtitle */}
          <p className="text-lg md:text-xl text-[#a89c93] max-w-3xl mx-auto leading-relaxed mb-10">
            Mais do que finanças: o <strong>Meu Escritório Online</strong> é o gestor definitivo para organizar projetos por etapas, controlar prazos com precisão, gerenciar clientes e centralizar a rotina do seu negócio na nuvem.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto mb-12">
            <button
              onClick={handleSubscribeClick}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-black font-bold text-base flex items-center justify-center gap-2 shadow-xl transition-all cursor-pointer hover:brightness-110"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>Assinar Agora por R$ 50/mês</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="#interativo"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#1a1614] hover:bg-[#26201c] border border-[#3d342f] text-[#fcf8f5] font-semibold text-base flex items-center justify-center transition-colors"
            >
              Ver Como Funciona
            </a>
          </div>

          {/* Key Value Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-6 border-t border-[#3d342f]/40 text-left">
            <div className="bg-[#161210] border border-[#3d342f]/80 p-3.5 rounded-xl flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--theme-badge-bg)] text-[var(--theme-primary)] shrink-0">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#fcf8f5]">Gestão de Projetos</div>
                <div className="text-[11px] text-[#a89c93]">Kanban, fases e entregáveis</div>
              </div>
            </div>

            <div className="bg-[#161210] border border-[#3d342f]/80 p-3.5 rounded-xl flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--theme-badge-bg)] text-[var(--theme-primary)] shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#fcf8f5]">Controle de Prazos</div>
                <div className="text-[11px] text-[#a89c93]">Alertas e calendário ativo</div>
              </div>
            </div>

            <div className="bg-[#161210] border border-[#3d342f]/80 p-3.5 rounded-xl flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--theme-badge-bg)] text-[var(--theme-primary)] shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#fcf8f5]">CRM de Clientes</div>
                <div className="text-[11px] text-[#a89c93]">Histórico e contratos</div>
              </div>
            </div>

            <div className="bg-[#161210] border border-[#3d342f]/80 p-3.5 rounded-xl flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--theme-badge-bg)] text-[var(--theme-primary)] shrink-0">
                <QrCode className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <div className="text-xs font-bold text-[#fcf8f5]">PIX & Cartão</div>
                <div className="text-[11px] text-[#a89c93]">Liberação imediata</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Platform Preview Section */}
      <section id="interativo" className="py-16 md:py-24 bg-[#161210] border-y border-[#3d342f]/60">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--theme-primary)' }}
            >
              Visão Operacional
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#fcf8f5] mt-2 mb-3">
              O centro de comando do seu escritório
            </h2>
            <p className="text-[#a89c93] text-sm sm:text-base">
              Veja como o Meu Escritório Online organiza seus projetos e prazos de forma clara, intuitiva e sem complicação.
            </p>
          </div>

          {/* Preview Navigation Tabs */}
          <div className="flex justify-center gap-2 mb-8">
            <button
              onClick={() => setPreviewTab('projetos')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                previewTab === 'projetos'
                  ? 'bg-[var(--theme-primary)] text-black shadow-lg scale-105'
                  : 'bg-[#1a1614] border border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              <FolderKanban className="w-4 h-4" />
              <span>Projetos & Demandas</span>
            </button>

            <button
              onClick={() => setPreviewTab('prazos')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                previewTab === 'prazos'
                  ? 'bg-[var(--theme-primary)] text-black shadow-lg scale-105'
                  : 'bg-[#1a1614] border border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              <CalendarCheck2 className="w-4 h-4" />
              <span>Prazos & Cronogramas</span>
            </button>

            <button
              onClick={() => setPreviewTab('crm')}
              className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
                previewTab === 'crm'
                  ? 'bg-[var(--theme-primary)] text-black shadow-lg scale-105'
                  : 'bg-[#1a1614] border border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5]'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Clientes & Negócios</span>
            </button>
          </div>

          {/* Interactive Screen Display */}
          <div className="bg-[#1a1614] border border-[#3d342f] rounded-3xl p-6 sm:p-8 shadow-2xl">
            {/* Window bar */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#3d342f]">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
                <span className="text-xs text-[#a89c93] font-mono ml-2">meuescritorio.online/painel</span>
              </div>
              <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Operação ao vivo
              </span>
            </div>

            {/* Content for TAB 1: Projetos & Demandas */}
            {previewTab === 'projetos' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#fcf8f5]">Painel de Projetos em Execução</h3>
                    <p className="text-xs text-[#a89c93]">Acompanhamento por fases de entrega e checklists de qualidade</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#241e1b] px-3 py-1.5 rounded-lg border border-[#3d342f] text-[#a89c93]">
                      Total: <strong>14 Projetos Ativos</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Card 1 */}
                  <div className="bg-[#12100e] border border-[#3d342f] p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Fase 02: Desenvolvimento
                      </span>
                      <span className="text-[11px] text-[#a89c93] flex items-center gap-1">
                        <Clock className="w-3 h-3 text-amber-400" />
                        Entrega em 4 dias
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#fcf8f5]">Revisão Estrutural & Projeto Executivo</h4>
                    <p className="text-xs text-[#a89c93]">Cliente: Construtora Horizonte S/A</p>
                    <div>
                      <div className="flex justify-between text-[11px] text-[#a89c93] mb-1">
                        <span>Progresso da Etapa</span>
                        <span className="text-emerald-400 font-bold">75%</span>
                      </div>
                      <div className="w-full bg-[#241e1b] h-2 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full rounded-full" style={{ width: '75%' }} />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#3d342f]/60 flex items-center justify-between text-[11px] text-[#a89c93]">
                      <span>Checklist: 6/8 tarefas</span>
                      <span className="text-[var(--theme-primary)] font-semibold">Responsável: Carlos M.</span>
                    </div>
                  </div>

                  {/* Card 2 */}
                  <div className="bg-[#12100e] border border-[var(--theme-primary)]/40 p-4 rounded-2xl space-y-3 shadow-md">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        Fase 03: Revisão com Cliente
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        No Prazo
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#fcf8f5]">Planejamento Estratégico & Minuta</h4>
                    <p className="text-xs text-[#a89c93]">Cliente: Dra. Fernanda Vasconcelos</p>
                    <div>
                      <div className="flex justify-between text-[11px] text-[#a89c93] mb-1">
                        <span>Progresso da Etapa</span>
                        <span className="text-[var(--theme-primary)] font-bold">90%</span>
                      </div>
                      <div className="w-full bg-[#241e1b] h-2 rounded-full overflow-hidden">
                        <div className="bg-[var(--theme-primary)] h-full rounded-full" style={{ width: '90%' }} />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#3d342f]/60 flex items-center justify-between text-[11px] text-[#a89c93]">
                      <span>Checklist: 9/10 tarefas</span>
                      <span className="text-[var(--theme-primary)] font-semibold">Responsável: Amanda S.</span>
                    </div>
                  </div>

                  {/* Card 3 */}
                  <div className="bg-[#12100e] border border-[#3d342f] p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Fase 01: Briefing & Alinhamento
                      </span>
                      <span className="text-[11px] text-[#a89c93] flex items-center gap-1">
                        Iniciado hoje
                      </span>
                    </div>
                    <h4 className="text-sm font-bold text-[#fcf8f5]">Implantação de Nova Operação Comercial</h4>
                    <p className="text-xs text-[#a89c93]">Cliente: Studio Arte & Decoração</p>
                    <div>
                      <div className="flex justify-between text-[11px] text-[#a89c93] mb-1">
                        <span>Progresso da Etapa</span>
                        <span className="text-purple-400 font-bold">25%</span>
                      </div>
                      <div className="w-full bg-[#241e1b] h-2 rounded-full overflow-hidden">
                        <div className="bg-purple-500 h-full rounded-full" style={{ width: '25%' }} />
                      </div>
                    </div>
                    <div className="pt-2 border-t border-[#3d342f]/60 flex items-center justify-between text-[11px] text-[#a89c93]">
                      <span>Checklist: 2/8 tarefas</span>
                      <span className="text-[var(--theme-primary)] font-semibold">Responsável: Roberto L.</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Content for TAB 2: Prazos & Cronogramas */}
            {previewTab === 'prazos' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#fcf8f5]">Linha do Tempo de Prazos & Marcos</h3>
                    <p className="text-xs text-[#a89c93]">Nunca mais seja pego de surpresa por uma data fatal ou entrega de cliente</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-1.5 rounded-lg font-bold">
                      0 Prazos Atrasados
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-[#12100e] border border-red-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#fcf8f5]">Prazo Crítico / Entrega Final de Laudo</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400">
                            Amanhã às 17h
                          </span>
                        </div>
                        <p className="text-xs text-[#a89c93]">Projeto: Perícia Técnica Judicial - Caso Dr. Eduardo Ramos</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-[#241e1b] text-xs text-[#fcf8f5] hover:bg-[#322a26] transition-colors self-start sm:self-center">
                      Ver Detalhes do Prazo
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-[#12100e] border border-[#3d342f] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#fcf8f5]">Apresentação da Proposta Comercial</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300">
                            Em 3 dias (Sexta-feira)
                          </span>
                        </div>
                        <p className="text-xs text-[#a89c93]">Cliente: Grupo Alpha Logística</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-[#241e1b] text-xs text-[#fcf8f5] hover:bg-[#322a26] transition-colors self-start sm:self-center">
                      Ver Detalhes do Prazo
                    </button>
                  </div>

                  <div className="p-4 rounded-xl bg-[#12100e] border border-[#3d342f] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start sm:items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#fcf8f5]">Protocolo de Conclusão e Entrega da Obra</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                            Próxima semana (18/10)
                          </span>
                        </div>
                        <p className="text-xs text-[#a89c93]">Cliente: Condomínio Jardim das Flores</p>
                      </div>
                    </div>
                    <button className="px-3 py-1.5 rounded-lg bg-[#241e1b] text-xs text-[#fcf8f5] hover:bg-[#322a26] transition-colors self-start sm:self-center">
                      Ver Detalhes do Prazo
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Content for TAB 3: Clientes & Negócios */}
            {previewTab === 'crm' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-serif font-bold text-[#fcf8f5]">CRM & Gestão de Clientes</h3>
                    <p className="text-xs text-[#a89c93]">Centralize contratos, propostas, telefones e histórico completo em um só lugar</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-[#241e1b] px-3 py-1.5 rounded-lg border border-[#3d342f] text-[#a89c93]">
                      Base: <strong>38 Clientes Cadastrados</strong>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-[#12100e] border border-[#3d342f] p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--theme-badge-bg)] text-[var(--theme-primary)] flex items-center justify-center font-bold text-xs">
                          GV
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#fcf8f5]">Gustavo Viana</div>
                          <div className="text-[10px] text-[#a89c93]">Contrato de Assessoria Mensal</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        Ativo
                      </span>
                    </div>
                    <div className="bg-[#1a1614] p-2.5 rounded-xl text-xs space-y-1 text-[#a89c93]">
                      <div className="flex justify-between">
                        <span>Projetos em andamento:</span>
                        <strong className="text-[#fcf8f5]">2 demandas</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Próximo marco de entrega:</span>
                        <strong className="text-amber-400">14 de Outubro</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Honorários / Valor do Contrato:</span>
                        <strong className="text-emerald-400">R$ 6.800,00</strong>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#12100e] border border-[#3d342f] p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[var(--theme-badge-bg)] text-[var(--theme-primary)] flex items-center justify-center font-bold text-xs">
                          ML
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#fcf8f5]">Mariana Lima Arquitetura</div>
                          <div className="text-[10px] text-[#a89c93]">Projeto Executivo Completo</div>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400">
                        Ativo
                      </span>
                    </div>
                    <div className="bg-[#1a1614] p-2.5 rounded-xl text-xs space-y-1 text-[#a89c93]">
                      <div className="flex justify-between">
                        <span>Projetos em andamento:</span>
                        <strong className="text-[#fcf8f5]">1 projeto grande</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Próximo marco de entrega:</span>
                        <strong className="text-amber-400">22 de Outubro</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Honorários / Valor do Contrato:</span>
                        <strong className="text-emerald-400">R$ 14.500,00</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Comparison: O Caos vs O Meu Escritório Online */}
      <section id="diferencial" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--theme-primary)' }}
          >
            A Transformação
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#fcf8f5] mt-2 mb-4">
            Por que um gestor de escritório muda seu negócio?
          </h2>
          <p className="text-[#a89c93] text-base sm:text-lg">
            Planilhas de fluxo de caixa registram o passado. O <strong>Meu Escritório Online</strong> gerencia o seu presente e garante que as entregas do futuro aconteçam sem atraso.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Left: O Caos */}
          <div className="bg-[#1a1614]/80 border border-red-500/30 rounded-3xl p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-red-400">Como é trabalhar no improviso</h3>
                <p className="text-xs text-[#a89c93]">Planilhas desatualizadas, anotações perdidas e cobranças de clientes</p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-[#a89c93]">
              <div className="flex items-start gap-3">
                <span className="text-red-400 font-bold shrink-0 mt-0.5">✕</span>
                <span><strong>Prazos esquecidos:</strong> Lembrar de uma entrega em cima da hora e trabalhar na correria sob estresse.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-red-400 font-bold shrink-0 mt-0.5">✕</span>
                <span><strong>Projetos sem dono nem fase:</strong> Não saber exatamente o que já foi aprovado e o que ainda falta fazer.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-red-400 font-bold shrink-0 mt-0.5">✕</span>
                <span><strong>WhatsApp desordenado:</strong> Mensagens de clientes cobrando atualizações a toda hora.</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-red-400 font-bold shrink-0 mt-0.5">✕</span>
                <span><strong>Financeiro desconectado:</strong> Esquecer de cobrar parcelas ou honorários vinculados às fases do projeto.</span>
              </div>
            </div>
          </div>

          {/* Right: Meu Escritório Online */}
          <div className="bg-[#1a1614] border-2 rounded-3xl p-8 space-y-6 shadow-2xl relative" style={{ borderColor: 'var(--theme-primary)' }}>
            <div
              className="absolute -top-3.5 right-8 text-black font-bold text-[10px] uppercase tracking-wider py-1 px-3 rounded-full shadow-md"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              Com o Meu Escritório Online
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--theme-badge-bg)] text-[var(--theme-primary)] flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-serif font-bold text-[#fcf8f5]">Controle absoluto e paz mental</h3>
                <p className="text-xs text-[#a89c93]">Tudo centralizado, organizado e pronto para você faturar mais</p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-[#fcf8f5]">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
                <span><strong>Prazos cumpridos à risca:</strong> Visão clara de datas de entrega, alertas de prioridade e calendário operacional.</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
                <span><strong>Projetos estruturados por etapas:</strong> Do fechamento do contrato até a entrega final, acompanhe cada marco.</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
                <span><strong>CRM com histórico de clientes:</strong> Propostas, telefones, escopo contratado e registros sempre à mão.</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
                <span><strong>Negócio integrado:</strong> Honorários, parcelas de clientes e fluxo de trabalho caminhando juntos.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Multi-Niche Selector Section */}
      <section id="nichos" className="py-16 md:py-24 bg-[#161210] border-y border-[#3d342f]/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--theme-primary)' }}
            >
              Especialização por Nicho
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#fcf8f5] mt-2 mb-4">
              Feito sob medida para a dinâmica da sua profissão
            </h2>
            <p className="text-[#a89c93] text-sm sm:text-base">
              O sistema adapta automaticamente as etapas de projeto, tipos de prazos e terminologias operacionais para o seu segmento.
            </p>
          </div>

          {/* Niche Selector Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-4xl mx-auto mb-10">
            {showcasedNiches.map((item) => {
              const isSelected = activeNicheKey === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setActiveNicheKey(item.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'text-black shadow-lg scale-105'
                      : 'bg-[#1a1614] border border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5] hover:border-[#52443c]'
                  }`}
                  style={
                    isSelected
                      ? { backgroundColor: 'var(--theme-primary)' }
                      : undefined
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Niche Preview Card */}
          <div className="max-w-4xl mx-auto bg-[#1a1614] border border-[var(--theme-primary)]/40 rounded-3xl p-6 sm:p-10 shadow-2xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-md text-xs font-bold mb-3"
                  style={{
                    backgroundColor: 'var(--theme-badge-bg)',
                    color: 'var(--theme-primary)',
                  }}
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Modelo Configurado: {currentNicheData.label}</span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#fcf8f5] mb-2">
                  {currentNicheData.defaultTitle}
                </h3>
                <p className="text-xs text-[#a89c93] mb-6">
                  {showcasedNiches.find(n => n.key === activeNicheKey)?.desc}
                </p>

                <div className="space-y-3 mb-8 text-xs text-[#fcf8f5]">
                  <div className="bg-[#0e0c0b] p-3.5 rounded-xl border border-[#3d342f]">
                    <span
                      className="block text-[11px] font-bold uppercase tracking-wider mb-2"
                      style={{ color: 'var(--theme-primary)' }}
                    >
                      Etapas & Fases de Entrega:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentNicheData.statusOptions.map((s) => (
                        <span key={s.value} className="px-2 py-1 rounded bg-[#221c18] border border-[#3d342f] text-[11px] text-[#fcf8f5]">
                          ✓ {s.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0e0c0b] p-3.5 rounded-xl border border-[#3d342f]">
                    <span
                      className="block text-[11px] font-bold uppercase tracking-wider mb-2"
                      style={{ color: 'var(--theme-primary)' }}
                    >
                      Exemplo Prático de Demanda:
                    </span>
                    <div className="text-xs text-[#fcf8f5] font-semibold mb-1">
                      📁 {showcasedNiches.find(n => n.key === activeNicheKey)?.projectExample}
                    </div>
                    <div className="text-[11px] text-amber-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3" />
                      <span>{showcasedNiches.find(n => n.key === activeNicheKey)?.deadlineExample}</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubscribeClick}
                  className="px-6 py-3 rounded-xl text-black font-bold text-xs flex items-center gap-2 shadow-lg transition-all hover:brightness-110 cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-primary)' }}
                >
                  <span>Organizar Meu Escritório de {currentNicheData.label}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-[#0d0b0a] border border-[#3d342f] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#3d342f]">
                  <span className="text-xs font-bold text-[#fcf8f5]">Gestão de Escritório Ativa</span>
                  <span className="text-[11px] text-emerald-400 font-semibold">● Prazos em Dia</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1a1614] p-3 rounded-xl border border-[#3d342f]/80">
                    <span className="text-[10px] text-[#a89c93] block">Projetos em Curso</span>
                    <span className="text-base font-bold text-[#fcf8f5]">12 Ativos</span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">100% no prazo</span>
                  </div>
                  <div className="bg-[#1a1614] p-3 rounded-xl border border-[#3d342f]/80">
                    <span className="text-[10px] text-[#a89c93] block">Próxima Entrega</span>
                    <span
                      className="text-base font-bold"
                      style={{ color: 'var(--theme-primary)' }}
                    >
                      Amanhã
                    </span>
                    <span className="text-[10px] text-[#a89c93] block mt-0.5">Fase de Revisão</span>
                  </div>
                </div>

                <div className="bg-[#1a1614] p-3.5 rounded-xl border border-[#3d342f]/80 space-y-2.5">
                  <span className="text-[11px] font-bold text-[#fcf8f5] block">Checklist Operacional Diário:</span>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-[#fcf8f5]">Alinhamento de escopo com cliente</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="text-[#fcf8f5]">Entrega de documentação e relatórios</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 rounded-full border border-amber-400/80 flex items-center justify-center shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    </div>
                    <span className="text-[#a89c93]">Reunião de fechamento às 16h</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Main Features Section - The 6 Core Pillars */}
      <section id="recursos" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--theme-primary)' }}
          >
            6 Pilares de Gestão
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#fcf8f5] mt-2 mb-4">
            Tudo o que seu escritório precisa para funcionar como um relógio
          </h2>
          <p className="text-[#a89c93] text-base sm:text-lg">
            Criado para profissionais e escritórios que exigem alto padrão de entrega, cumprimento de prazos e excelência no atendimento.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Pillar 1 */}
          <div className="bg-[#1a1614] border border-[#3d342f] p-8 rounded-2xl hover:border-[var(--theme-primary)]/40 transition-colors">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-primary)',
              }}
            >
              <FolderKanban className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#fcf8f5] mb-2">Gestão de Projetos & Fases</h3>
            <p className="text-sm text-[#a89c93] leading-relaxed">
              Visualize cada projeto por etapas personalizadas da sua área. Do briefing inicial até a entrega final, com checklists, anexos e status em tempo real.
            </p>
          </div>

          {/* Pillar 2 */}
          <div className="bg-[#1a1614] border border-[#3d342f] p-8 rounded-2xl hover:border-[var(--theme-primary)]/40 transition-colors">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-primary)',
              }}
            >
              <Clock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#fcf8f5] mb-2">Controle Rigoroso de Prazos</h3>
            <p className="text-sm text-[#a89c93] leading-relaxed">
              Calendário operacional com visão diária, semanal e mensal de entregas. Saiba exatamente quais são os prazos fatais e evite qualquer atraso.
            </p>
          </div>

          {/* Pillar 3 */}
          <div className="bg-[#1a1614] border border-[#3d342f] p-8 rounded-2xl hover:border-[var(--theme-primary)]/40 transition-colors">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-primary)',
              }}
            >
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#fcf8f5] mb-2">CRM de Clientes & Contratos</h3>
            <p className="text-sm text-[#a89c93] leading-relaxed">
              Histórico unificado de cada cliente, dados de contato, contratos firmados, escopo acordado e demandas ativas em um único perfil centralizado.
            </p>
          </div>

          {/* Pillar 4 */}
          <div className="bg-[#1a1614] border border-[#3d342f] p-8 rounded-2xl hover:border-[var(--theme-primary)]/40 transition-colors">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-primary)',
              }}
            >
              <ListTodo className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#fcf8f5] mb-2">Meu Dia & Agenda Operacional</h3>
            <p className="text-sm text-[#a89c93] leading-relaxed">
              Comece o dia com clareza absoluta: uma tela dedicada que lista suas prioridades imediatas, compromissos agendados e prazos que vencem hoje.
            </p>
          </div>

          {/* Pillar 5 */}
          <div className="bg-[#1a1614] border border-[#3d342f] p-8 rounded-2xl hover:border-[var(--theme-primary)]/40 transition-colors">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-primary)',
              }}
            >
              <BarChart3 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#fcf8f5] mb-2">Honorários & Negócios Conectados</h3>
            <p className="text-sm text-[#a89c93] leading-relaxed">
              O faturamento decorre diretamente dos projetos: controle parcelas de contratos, honorários recebidos e metas de receita sem planilhas separadas.
            </p>
          </div>

          {/* Pillar 6 */}
          <div className="bg-[#1a1614] border border-[#3d342f] p-8 rounded-2xl hover:border-[var(--theme-primary)]/40 transition-colors">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-primary)',
              }}
            >
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#fcf8f5] mb-2">Acesso Nuvem & Mobile</h3>
            <p className="text-sm text-[#a89c93] leading-relaxed">
              Consulte seu escritório no celular em visitas a clientes ou obras. Seus dados contam com backup automático diário e proteção de alto nível no Google Cloud.
            </p>
          </div>

        </div>
      </section>

      {/* Pricing Section (Planos e Preços - R$ 50/mês & R$ 550/ano) */}
      <section id="planos" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--theme-primary)' }}
          >
            Investimento Inteligente
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#fcf8f5] mt-2 mb-4">
            Gestão profissional ao alcance do seu negócio
          </h2>
          <p className="text-[#a89c93] text-base sm:text-lg">
            Um único prazo que você deixa de perder ou um cliente fidelizado já paga anos de assinatura. Pague com <strong>PIX Instantâneo</strong> ou <strong>Cartão</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Plano Mensal */}
          <div
            className="bg-[#1a1614] border border-[#3d342f] rounded-3xl p-8 sm:p-10 shadow-2xl relative flex flex-col justify-between"
          >
            <div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-serif font-bold text-[#fcf8f5]">Plano Mensal Completo</h3>
                <p className="text-xs text-[#a89c93] mt-1">Acesso irrestrito a todos os módulos de gestão</p>
                
                <div className="flex items-baseline justify-center gap-1 mt-6 mb-2">
                  <span className="text-2xl font-bold text-[#a89c93]">R$</span>
                  <span className="text-5xl font-extrabold text-[#fcf8f5] tracking-tight">50</span>
                  <span className="text-xl font-bold text-[#fcf8f5]">,00</span>
                  <span className="text-[#a89c93] font-medium text-sm">/mês</span>
                </div>
                <p className="text-xs text-emerald-400 font-medium">Sem fidelidade, cancele quando desejar</p>
              </div>

              <div className="space-y-4 mb-8 pt-6 border-t border-[#3d342f]">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm text-[#fcf8f5]">Gestor Completo de Projetos & Demandas</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm text-[#fcf8f5]">Controle de Prazos, Alertas e Calendário</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm text-[#fcf8f5]">CRM de Clientes, Contratos e Honorários</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm text-[#fcf8f5]">Backup diário em nuvem e acesso mobile</span>
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={() => navigate('/checkout?plan=monthly')}
                className="w-full py-3.5 px-6 rounded-xl text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:brightness-110"
                style={{ backgroundColor: 'var(--theme-primary)' }}
              >
                <span>Assinar Mensal (R$ 50/mês)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Plano Anual - BEST VALUE */}
          <div
            className="bg-[#1a1614] border-2 rounded-3xl p-8 sm:p-10 shadow-2xl relative flex flex-col justify-between"
            style={{ borderColor: 'var(--theme-primary)' }}
          >
            <div
              className="absolute -top-4 left-1/2 -translate-x-1/2 text-black font-bold text-[10px] uppercase tracking-wider py-1.5 px-4 rounded-full shadow-md"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              Melhor Custo-Benefício (Economize R$ 50)
            </div>

            <div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-serif font-bold text-[#fcf8f5]">Plano Anual do Escritório</h3>
                <p className="text-xs text-yellow-500 mt-1 font-medium">12 meses de gestão contínua e tranquilidade</p>
                
                <div className="flex items-baseline justify-center gap-1 mt-6 mb-2">
                  <span className="text-2xl font-bold text-[#a89c93]">R$</span>
                  <span className="text-5xl font-extrabold text-[#fcf8f5] tracking-tight">550</span>
                  <span className="text-xl font-bold text-[#fcf8f5]">,00</span>
                  <span className="text-[#a89c93] font-medium text-sm">/ano</span>
                </div>
                <p className="text-xs text-emerald-400 font-medium">Garantia incondicional de 7 dias</p>
              </div>

              <div className="space-y-4 mb-8 pt-6 border-t border-[#3d342f]">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm text-[#fcf8f5]">Tudo do Plano Mensal incluso</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm text-[#fcf8f5]">Gestão de Projetos, Prazos & Equipe</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm text-[#fcf8f5]">Suporte prioritário e onboarding facilitado</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm text-[#fcf8f5]">Economia direta de R$ 50 no ano</span>
                </div>
              </div>
            </div>

            <div>
              <button
                onClick={() => navigate('/checkout?plan=annual')}
                className="w-full py-3.5 px-6 rounded-xl text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:brightness-110"
                style={{ backgroundColor: 'var(--theme-primary)' }}
              >
                <span>Assinar Anual (R$ 550/ano)</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-6 max-w-3xl mx-auto mt-12 text-[#a89c93] text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>PIX Instantâneo com liberação automática</span>
          </div>
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span>Cartão de Crédito via Stripe</span>
          </div>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
            <span>Ambiente 100% Criptografado</span>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-[#161210] border-t border-[#3d342f]/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span
              className="text-xs font-bold uppercase tracking-widest"
              style={{ color: 'var(--theme-primary)' }}
            >
              Tire suas dúvidas
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#fcf8f5] mt-2">
              Perguntas Frequentes sobre o Gestor
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "O Meu Escritório Online é só para controle financeiro?",
                a: "Não! O Meu Escritório Online é um gestor completo de negócios. Ele foi projetado para gerenciar projetos do início ao fim, controlar prazos de entrega e marcos importantes, gerenciar clientes (CRM), organizar a rotina diária da equipe e conectar o faturamento e honorários de forma natural ao trabalho executado."
              },
              {
                q: "Como o sistema me ajuda a não perder prazos?",
                a: "Você conta com um painel visual de prazos com categorização de urgência (urgentes, próximos e concluídos), visão em calendário operacional e notificações na tela inicial do seu dia. Você sabe exatamente o que precisa ser entregue hoje e nos próximos dias."
              },
              {
                q: "O sistema se adapta ao meu tipo de profissão ou escritório?",
                a: "Sim! Ele possui modelos pré-configurados com nomenclaturas, categorias e fases específicas para Advocacia (processos e prazos judiciais), Arquitetura e Engenharia (etapas de projetos e obras), Consultorias (sprints e entregáveis), Vendas (pedidos e cronogramas) e Prestadores de Serviços em geral."
              },
              {
                q: "Como funciona a assinatura de R$ 50/mês e o pagamento?",
                a: "Você pode assinar mensalmente por R$ 50,00 ou no plano anual por R$ 550,00. O pagamento é realizado diretamente na plataforma via PIX (liberação imediata) ou Cartão de Crédito. Não há taxas ocultas nem taxa de adesão."
              },
              {
                q: "Posso acessar pelo celular quando estiver em visitas a clientes?",
                a: "Com certeza! A plataforma é totalmente responsiva e foi otimizada para smartphones (iPhone e Android), tablets e computadores. Você pode cadastrar demandas, consultar prazos e atualizar status de qualquer lugar com internet."
              },
              {
                q: "Meus dados e os dados dos meus clientes ficam seguros?",
                a: "Sim! O Meu Escritório Online opera em infraestrutura Google Cloud com criptografia de ponta a ponta e backups automáticos diários. Seus dados e documentos permanecem confidenciais e sob total segurança."
              },
            ].map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-[#1a1614] border border-[#3d342f] rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-6 text-left flex items-center justify-between gap-4 font-serif font-bold text-base sm:text-lg text-[#fcf8f5] hover:text-[var(--theme-primary)] transition-colors cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`w-5 h-5 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}
                      style={{ color: 'var(--theme-primary)' }}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 text-sm text-[#a89c93] leading-relaxed border-t border-[#3d342f]/40 pt-4">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#12100e] border-t border-[#3d342f] py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)' }}>
              <Building2 className="w-5 h-5 text-[#12100e]" />
            </div>
            <div>
              <span className="font-serif font-bold text-base block leading-none">
                Meu Escritório <span style={{ color: 'var(--theme-primary)' }}>Online</span>
              </span>
              <span className="text-[10px] text-[#a89c93]">Gestão de Escritório, Projetos & Prazos</span>
            </div>
          </div>
          <div className="text-xs text-[#a89c93] text-center sm:text-left">
            © {new Date().getFullYear()} Meu Escritório Online. Todos os direitos reservados.
          </div>
          <div className="flex items-center gap-4 text-xs text-[#a89c93]">
            <Link to="/login" className="hover:text-[#fcf8f5] transition-colors">Acessar Conta</Link>
            <span>•</span>
            <Link
              to="/checkout"
              className="hover:text-[#fcf8f5] transition-colors font-bold"
              style={{ color: 'var(--theme-primary)' }}
            >
              Assinar R$ 50/mês
            </Link>
          </div>
        </div>
      </footer>

    </div>
  );
};
