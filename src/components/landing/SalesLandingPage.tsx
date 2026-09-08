import React, { useState } from 'react';
import { 
  Building2, 
  CheckCircle2, 
  CreditCard, 
  DollarSign, 
  FolderKanban, 
  PieChart, 
  Users, 
  MapPin, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  Check, 
  HelpCircle, 
  ChevronDown, 
  Smartphone, 
  Lock,
  FileSpreadsheet,
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
  Award
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
  const [activeNicheKey, setActiveNicheKey] = useState<NicheType>('vendas');

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const handleSubscribeClick = () => {
    navigate('/checkout');
  };

  const currentNicheData = NICHES[activeNicheKey] || NICHES.vendas;

  const showcasedNiches: { key: NicheType; label: string; icon: React.ReactNode; desc: string }[] = [
    { 
      key: 'vendas', 
      label: 'Vendas & Comércio', 
      icon: <ShoppingBag className="w-4 h-4" />,
      desc: 'Controle pedidos atacado e varejo, comissões de representação comercial e fluxo de vendas.'
    },
    { 
      key: 'advocacia', 
      label: 'Advocacia & Jurídico', 
      icon: <Scale className="w-4 h-4" />,
      desc: 'Gestão de casos cíveis, trabalhistas, prazos processuais, honorários e consultoria preventiva.'
    },
    { 
      key: 'consultoria', 
      label: 'Consultoria & Gestão', 
      icon: <TrendingUp className="w-4 h-4" />,
      desc: 'Mapeamento de processos, mentorias executivas, diagnósticos e planos estratégicos.'
    },
    { 
      key: 'arquitetura', 
      label: 'Arquitetura & Design', 
      icon: <Compass className="w-4 h-4" />,
      desc: 'Projetos residenciais, interiores 3D, especificações, evolução de obras e vistorias.'
    },
    { 
      key: 'engenharia', 
      label: 'Engenharia & Obras', 
      icon: <Building2 className="w-4 h-4" />,
      desc: 'Cálculo estrutural, instalações elétricas/hidráulicas, laudos técnicos e medições de canteiro.'
    },
    { 
      key: 'saude_estetica', 
      label: 'Saúde & Estética', 
      icon: <Activity className="w-4 h-4" />,
      desc: 'Protocolos de atendimento, pacotes de procedimentos estéticos, consultas e evolução de pacientes.'
    },
    { 
      key: 'autonomo', 
      label: 'Serviços & Autônomos', 
      icon: <Briefcase className="w-4 h-4" />,
      desc: 'Ordens de serviço, contratos recorrentes e atendimentos presenciais ou remotos.'
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
            <span className="font-serif font-bold text-xl tracking-wide">
              Meu Escritório <span style={{ color: 'var(--theme-primary)' }}>Online</span>
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#a89c93]">
            <a href="#nichos" className="hover:text-[#fcf8f5] transition-colors">Nichos Atendidos</a>
            <a href="#recursos" className="hover:text-[#fcf8f5] transition-colors">Recursos</a>
            <a href="#planos" className="hover:text-[#fcf8f5] transition-colors">Preços</a>
            <a href="#faq" className="hover:text-[#fcf8f5] transition-colors">Dúvidas</a>
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <button
                onClick={() => navigate('/app')}
                className="px-5 py-2.5 rounded-xl text-black font-bold text-sm transition-all shadow-lg hover:brightness-110"
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
                  Assinar (PIX & Cartão)
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-14 pb-20 md:pt-20 md:pb-28 overflow-hidden">
        {/* Background Glows */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[450px] rounded-full blur-[140px] pointer-events-none -z-10 opacity-20"
          style={{ backgroundColor: 'var(--theme-primary)' }}
        />
        
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 shadow-sm"
            style={{
              backgroundColor: 'var(--theme-badge-bg)',
              color: 'var(--theme-primary)',
              border: '1px solid var(--theme-badge-border)',
            }}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gestão Completa para Vendas, Advocacia, Consultoria, Serviços & Escritórios</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-serif font-bold text-[#fcf8f5] tracking-tight leading-[1.1] mb-6">
            O seu negócio e finanças <br className="hidden sm:inline" />
            <span style={{ color: 'var(--theme-primary)' }}>100% organizados e lucrativos</span>
          </h1>

          <p className="text-lg md:text-xl text-[#a89c93] max-w-3xl mx-auto leading-relaxed mb-10">
            Abandone as planilhas manuais. Controle seu fluxo de caixa, parcelas de clientes, pedidos, prazos de contratos, metas de faturamento e relatórios em um único painel elegante e na nuvem.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-lg mx-auto mb-14">
            <button
              onClick={handleSubscribeClick}
              className="w-full sm:w-auto px-8 py-4 rounded-xl text-black font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer hover:brightness-110"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              <span>Assinar por R$ 50/mês</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <Link
              to="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-xl bg-[#1a1614] hover:bg-[#26201c] border border-[#3d342f] text-[#fcf8f5] font-semibold text-base flex items-center justify-center transition-colors"
            >
              Já sou Assinante
            </Link>
          </div>

          {/* Payment Badges (PIX + Cartão) */}
          <div className="flex flex-wrap items-center justify-center gap-6 max-w-3xl mx-auto pt-6 border-t border-[#3d342f]/40 text-[#a89c93] text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span>Aceitamos <strong>PIX Instantâneo</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
              <span>Cartão de Crédito via Stripe</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
              <span>Sem fidelidade, cancele quando quiser</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
              <span>Ambiente 100% Seguro</span>
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
              Flexibilidade Total
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#fcf8f5] mt-2 mb-4">
              Feito sob medida para o seu nicho
            </h2>
            <p className="text-[#a89c93] text-sm sm:text-base">
              O sistema adapta automaticamente as categorias, fases de trabalho e terminologias para a realidade da sua profissão.
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
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
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
                  <span>Configuração Pronta: {currentNicheData.label}</span>
                </div>
                <h3 className="text-2xl font-serif font-bold text-[#fcf8f5] mb-2">
                  {currentNicheData.defaultTitle}
                </h3>
                <p className="text-xs text-[#a89c93] mb-6">
                  {currentNicheData.defaultSpecialty}
                </p>

                <div className="space-y-3 mb-8 text-xs text-[#fcf8f5]">
                  <div className="bg-[#0e0c0b] p-3 rounded-xl border border-[#3d342f]">
                    <span
                      className="block text-[11px] font-bold uppercase tracking-wider mb-1"
                      style={{ color: 'var(--theme-primary)' }}
                    >
                      Categorias Dinâmicas:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentNicheData.categories.slice(1, 6).map((c) => (
                        <span key={c.id} className="px-2 py-0.5 rounded bg-[#221c18] border border-[#3d342f] text-[11px] text-[#a89c93]">
                          {c.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="bg-[#0e0c0b] p-3 rounded-xl border border-[#3d342f]">
                    <span
                      className="block text-[11px] font-bold uppercase tracking-wider mb-1"
                      style={{ color: 'var(--theme-primary)' }}
                    >
                      Fases do Contrato / Pedido:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {currentNicheData.statusOptions.map((s) => (
                        <span key={s.value} className="px-2 py-0.5 rounded bg-[#221c18] border border-[#3d342f] text-[11px] text-[#fcf8f5]">
                          ✓ {s.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubscribeClick}
                  className="px-6 py-3 rounded-xl text-black font-bold text-xs flex items-center gap-2 shadow-lg transition-all hover:brightness-110"
                  style={{ backgroundColor: 'var(--theme-primary)' }}
                >
                  <span>Começar no nicho de {currentNicheData.label}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-[#0d0b0a] border border-[#3d342f] rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#3d342f]">
                  <span className="text-xs font-bold text-[#fcf8f5]">Painel de Controle Ativo</span>
                  <span className="text-[11px] text-emerald-400 font-semibold">● Sincronizado na Nuvem</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#1a1614] p-3 rounded-xl border border-[#3d342f]/80">
                    <span className="text-[10px] text-[#a89c93] block">Faturamento Mensal</span>
                    <span className="text-base font-bold text-[#fcf8f5]">R$ 18.500,00</span>
                    <span className="text-[10px] text-emerald-400 block mt-0.5">+15% este mês</span>
                  </div>
                  <div className="bg-[#1a1614] p-3 rounded-xl border border-[#3d342f]/80">
                    <span className="text-[10px] text-[#a89c93] block">A Receber / Parcelas</span>
                    <span
                      className="text-base font-bold"
                      style={{ color: 'var(--theme-primary)' }}
                    >
                      R$ 12.800,00
                    </span>
                    <span className="text-[10px] text-[#a89c93] block mt-0.5">8 clientes ativos</span>
                  </div>
                </div>

                <div className="bg-[#1a1614] p-3 rounded-xl border border-[#3d342f]/80 space-y-2">
                  <span className="text-[11px] font-bold text-[#fcf8f5] block">Últimos Lançamentos:</span>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a89c93]">Contrato de Assessoria / Venda</span>
                    <span className="text-emerald-400 font-bold">+ R$ 4.500,00</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#a89c93]">Parcela 02/05 Recebida (PIX)</span>
                    <span className="text-emerald-400 font-bold">+ R$ 2.800,00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Main Features Section */}
      <section id="recursos" className="py-20 md:py-28 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--theme-primary)' }}
          >
            Recursos Completos
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#fcf8f5] mt-2 mb-4">
            Tudo o que seu negócio precisa
          </h2>
          <p className="text-[#a89c93] text-base sm:text-lg">
            Projetado para simplificar sua rotina financeira, gerenciar seus clientes e garantir maior lucratividade.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Feature 1 */}
          <div className="bg-[#1a1614] border border-[#3d342f] p-8 rounded-2xl hover:border-[var(--theme-primary)]/40 transition-colors">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-primary)',
              }}
            >
              <PieChart className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#fcf8f5] mb-2">Fluxo de Caixa & Finanças</h3>
            <p className="text-sm text-[#a89c93] leading-relaxed">
              Monitore receitas, despesas, centros de custo, contas bancárias e conciliação de caixa físico em tempo real.
            </p>
          </div>

          {/* Feature 2 */}
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
              Cadastro centralizado de clientes, valores contratados, parcelas pagas, saldos pendentes e histórico de negociações.
            </p>
          </div>

          {/* Feature 3 */}
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
            <h3 className="text-xl font-serif font-bold text-[#fcf8f5] mb-2">Gestão de Projetos, Casos & Vendas</h3>
            <p className="text-sm text-[#a89c93] leading-relaxed">
              Acompanhe todas as etapas de entrega, pedidos em andamento, fotos de antes & depois e relatórios detalhados.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-[#1a1614] border border-[#3d342f] p-8 rounded-2xl hover:border-[var(--theme-primary)]/40 transition-colors">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-primary)',
              }}
            >
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#fcf8f5] mb-2">Prazos & Parcelamento</h3>
            <p className="text-sm text-[#a89c93] leading-relaxed">
              Calendário com visão unificada de vencimentos de clientes, parcelas a receber e marcos importantes do cronograma.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-[#1a1614] border border-[#3d342f] p-8 rounded-2xl hover:border-[var(--theme-primary)]/40 transition-colors">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center mb-6"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-primary)',
              }}
            >
              <DollarSign className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold text-[#fcf8f5] mb-2">Metas & Amortizações</h3>
            <p className="text-sm text-[#a89c93] leading-relaxed">
              Defina metas de faturamento, simule amortizações extras de financiamentos e acompanhe suas reservas financeiras.
            </p>
          </div>

          {/* Feature 6 */}
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
            <h3 className="text-xl font-serif font-bold text-[#fcf8f5] mb-2">Acesso Mobile & Nuvem</h3>
            <p className="text-sm text-[#a89c93] leading-relaxed">
              Acesse pelo celular ou computador em qualquer lugar. Seus dados contam com backup automático diário e segurança de ponta.
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
            Investimento Acessível
          </span>
          <h2 className="text-3xl sm:text-5xl font-serif font-bold text-[#fcf8f5] mt-2 mb-4">
            Preços simples e transparentes
          </h2>
          <p className="text-[#a89c93] text-base sm:text-lg">
            Escolha o formato ideal para o seu negócio. Pague de forma segura via <strong>PIX Instantâneo</strong> ou <strong>Cartão de Crédito</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Plano Mensal */}
          <div
            className="bg-[#1a1614] border border-[#3d342f] rounded-3xl p-8 sm:p-10 shadow-2xl relative flex flex-col justify-between"
          >
            <div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-serif font-bold text-[#fcf8f5]">Plano Mensal Recorrente</h3>
                <p className="text-xs text-[#a89c93] mt-1">Acesso completo ao Meu Escritório Online</p>
                
                <div className="flex items-baseline justify-center gap-1 mt-6 mb-2">
                  <span className="text-2xl font-bold text-[#a89c93]">R$</span>
                  <span className="text-5xl font-extrabold text-[#fcf8f5] tracking-tight">50</span>
                  <span className="text-xl font-bold text-[#fcf8f5]">,00</span>
                  <span className="text-[#a89c93] font-medium text-sm">/mês</span>
                </div>
                <p className="text-xs text-emerald-400 font-medium">Cancele quando quiser, sem taxas</p>
              </div>

              <div className="space-y-4 mb-8 pt-6 border-t border-[#3d342f]">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm text-[#fcf8f5]">Faturamento e Fluxo de Caixa Completo</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm text-[#fcf8f5]">CRM de Clientes & Controle de Parcelas</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm text-[#fcf8f5]">Suporte humanizado e backups em nuvem</span>
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
              Melhor Custo-Benefício
            </div>

            <div>
              <div className="text-center mb-8">
                <h3 className="text-xl font-serif font-bold text-[#fcf8f5]">Plano Anual Exclusivo</h3>
                <p className="text-xs text-yellow-500 mt-1 font-medium">Economize R$ 50 por ano!</p>
                
                <div className="flex items-baseline justify-center gap-1 mt-6 mb-2">
                  <span className="text-2xl font-bold text-[#a89c93]">R$</span>
                  <span className="text-5xl font-extrabold text-[#fcf8f5] tracking-tight">550</span>
                  <span className="text-xl font-bold text-[#fcf8f5]">,00</span>
                  <span className="text-[#a89c93] font-medium text-sm">/ano</span>
                </div>
                <p className="text-xs text-emerald-400 font-medium">Cancelamento em até 7 dias sem custos</p>
              </div>

              <div className="space-y-4 mb-8 pt-6 border-t border-[#3d342f]">
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm text-[#fcf8f5]">Gestão de Projetos e Fluxo Integrado</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm text-[#fcf8f5]">Convite de colaboradores (até 4 pessoas)</span>
                </div>
                <div className="flex items-start gap-3">
                  <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span className="text-sm text-[#fcf8f5]">Reembolso total garantido em até 7 dias corridos</span>
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

        <p className="text-center text-xs text-[#a89c93] mt-8 flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          Pagamento Seguro via PIX ou Stripe com liberação automática de licença
        </p>
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
              Perguntas Frequentes
            </h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "Como posso realizar o pagamento da assinatura de R$ 50/mês?",
                a: "Você pode pagar instantaneamente via PIX (com QR Code e código copia e cola) ou por Cartão de Crédito através do Stripe. A liberação do acesso é imediata."
              },
              {
                q: "O sistema serve para quais tipos de profissionais e empresas?",
                a: "O Meu Escritório Online foi construído para múltiplos nichos: Vendas em Geral, Representação Comercial, Advocacia, Consultoria, Arquitetura, Engenharia, Saúde & Estética, Tecnologia, Design, Prestadores de Serviços e Autônomos em geral."
              },
              {
                q: "Existe taxa de adesão ou fidelidade?",
                a: "Não há nenhuma taxa de adesão. A assinatura é mensal no valor de R$ 50,00 e você tem total liberdade para cancelar a qualquer momento sem multa."
              },
              {
                q: "Preciso instalar algum programa no computador?",
                a: "Não! O sistema é 100% web e fica salvo na nuvem. Você pode acessar do seu celular (iPhone ou Android), tablet, notebook ou computador de mesa diretamente pelo navegador."
              },
              {
                q: "Meus dados de clientes e financeiro ficam seguros?",
                a: "Sim, todos os dados ficam salvos com criptografia em nuvem de alta segurança nos servidores do Google, com backups automáticos constantes."
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
                    className="w-full p-6 text-left flex items-center justify-between gap-4 font-serif font-bold text-base sm:text-lg text-[#fcf8f5] hover:text-[var(--theme-primary)] transition-colors"
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
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5" style={{ color: 'var(--theme-primary)' }} />
            <span className="font-serif font-bold text-base">Meu Escritório <span style={{ color: 'var(--theme-primary)' }}>Online</span></span>
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
