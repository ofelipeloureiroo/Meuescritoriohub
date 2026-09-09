import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { Loader2, CreditCard, Lock, Building2, CheckCircle2, PieChart, FolderKanban, Users, LogOut } from 'lucide-react';

export const SubscriptionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!user || !profile || profile.role === 'admin') {
    return <>{children}</>;
  }

  // Check if user is pending owner release or inactive or overdue
  const isPending = profile.status === 'pending';
  const isInactive = profile.status === 'inactive';
  const isOverdue = profile.subscriptionDueDate ? new Date(profile.subscriptionDueDate) < new Date() : false;

  const handleLogout = () => {
    signOut(auth).catch(console.error);
  };

  // 1. Pending Approval Screen (Waiting for Owner to Release Access)
  if (isPending) {
    return (
      <div className="min-h-screen bg-[#12100e] text-[#fcf8f5] flex flex-col justify-center items-center p-6">
        <div className="max-w-md w-full bg-[#1a1614] border border-amber-500/30 rounded-3xl p-8 text-center space-y-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-serif font-bold text-[#fcf8f5]">Aguardando Liberação de Acesso</h2>
            <p className="text-xs text-[#a89c93] leading-relaxed">
              O seu cadastro <strong className="text-[#fcf8f5]">({user.email})</strong> foi recebido com sucesso. O proprietário do sistema verificará a confirmação do seu pagamento para liberar o seu acesso completo.
            </p>
          </div>

          <div className="bg-[#12100e] border border-[#3d342f] rounded-2xl p-4 text-left space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              Status: Pendente de Liberação
            </div>
            <p className="text-[11px] text-[#a89c93]">
              Assim que o administrador aprovar o pagamento no Painel Financeiro, seu login será liberado automaticamente.
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <a
              href={`https://wa.me/?text=Olá!%20Fiz%20o%20cadastro%20no%20Meu%20Escritório%20Online%20com%20o%20email%20${encodeURIComponent(user.email || '')}%20e%20gostaria%20de%20solicitar%20a%20liberação%20do%20meu%20acesso.`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
            >
              <span>Avisar Administrador via WhatsApp</span>
            </a>
            <button
              onClick={handleLogout}
              className="w-full py-2.5 px-4 rounded-xl bg-[#241e1b] hover:bg-[#322a26] text-[#a89c93] hover:text-[#fcf8f5] font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> Sair da Conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. Inactive or Overdue Subscription Screen
  if (isInactive || isOverdue) {
    return (
      <div className="min-h-screen bg-[#12100e] text-[#fcf8f5] flex flex-col">
        {/* Simple Navbar */}
        <header className="border-b border-[#3d342f] bg-[#1a1614]/80 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#c58a4b]" />
            <h1 className="font-serif font-bold text-lg">Meu Escritório <span className="text-[#c58a4b]">Online</span></h1>
          </div>
          <button onClick={handleLogout} className="text-sm text-[#a89c93] hover:text-[#fcf8f5] flex items-center gap-2 transition-colors">
            <LogOut className="w-4 h-4" /> Sair
          </button>
        </header>

        {/* Hero Section */}
        <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-12 md:py-20 flex flex-col items-center">
          <div className="text-center max-w-3xl mb-16">
            <div className="inline-flex items-center justify-center p-3 bg-[#c58a4b]/10 border border-[#c58a4b]/20 rounded-full mb-6">
              <Lock className="w-6 h-6 text-[#c58a4b]" />
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6 tracking-tight">
              Acesso Exclusivo à <span className="text-[#c58a4b]">Gestão Profissional</span>
            </h2>
            <p className="text-lg text-[#a89c93] leading-relaxed">
              O seu período de testes terminou ou a sua assinatura está inativa. O Meu Escritório Online é a plataforma definitiva para profissionais de vendas, advocacia, consultoria, engenharia, arquitetura e serviços gerenciarem seus projetos, clientes e finanças em um só lugar.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-16">
            <div className="bg-[#1a1614] border border-[#3d342f] p-6 rounded-2xl flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#2a2420] rounded-xl flex items-center justify-center mb-4">
                <PieChart className="w-6 h-6 text-[#c58a4b]" />
              </div>
              <h3 className="font-bold text-lg mb-2">Controle Financeiro</h3>
              <p className="text-sm text-[#a89c93]">
                Monitore receitas, despesas, gere gráficos de fluxo de caixa e saiba exatamente a rentabilidade do seu negócio.
              </p>
            </div>
            <div className="bg-[#1a1614] border border-[#3d342f] p-6 rounded-2xl flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#2a2420] rounded-xl flex items-center justify-center mb-4">
                <FolderKanban className="w-6 h-6 text-[#c58a4b]" />
              </div>
              <h3 className="font-bold text-lg mb-2">Projetos & Pedidos</h3>
              <p className="text-sm text-[#a89c93]">
                Acompanhe o cronograma de entregas, histórico de contratos e fotos/relatórios de cada cliente.
              </p>
            </div>
            <div className="bg-[#1a1614] border border-[#3d342f] p-6 rounded-2xl flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-[#2a2420] rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-[#c58a4b]" />
              </div>
              <h3 className="font-bold text-lg mb-2">CRM de Clientes</h3>
              <p className="text-sm text-[#a89c93]">
                Mantenha o cadastro dos seus clientes organizado, parcelas contratadas e canais de contato rápido.
              </p>
            </div>
          </div>

          {/* Pricing CTA */}
          <div className="w-full max-w-md bg-[#1a1614] border border-[#c58a4b]/30 rounded-2xl p-8 text-center shadow-2xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#c58a4b] to-transparent"></div>
            
            <h3 className="text-xl font-serif font-bold mb-2">Assinatura Mensal</h3>
            <div className="flex items-baseline justify-center gap-1 mb-6">
              <span className="text-4xl font-bold">R$ 50,00</span>
              <span className="text-[#a89c93]">/mês</span>
            </div>

            <ul className="text-left text-sm text-[#a89c93] space-y-3 mb-8">
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Acesso ilimitado a todos os 14 nichos e ferramentas</span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Pagamento via <strong>PIX</strong> ou <strong>Cartão de Crédito</strong></span>
              </li>
              <li className="flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <span>Cancele a qualquer momento sem multa</span>
              </li>
            </ul>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm mb-6 text-left">
                {error}
              </div>
            )}

            <a
              href="/checkout"
              className="w-full flex items-center justify-center gap-2 bg-[#c58a4b] hover:bg-[#d49454] text-black font-bold py-4 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(197,138,75,0.2)] hover:shadow-[0_0_25px_rgba(197,138,75,0.3)] text-center cursor-pointer mb-3"
            >
              <CreditCard className="w-5 h-5" /> Pagar com PIX ou Cartão (R$ 50)
            </a>
          </div>
        </main>
      </div>
    );
  }

  return <>{children}</>;
};
