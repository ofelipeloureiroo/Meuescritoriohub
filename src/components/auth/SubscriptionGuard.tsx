import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { 
  Loader2, 
  Clock, 
  CreditCard, 
  ShieldAlert, 
  CheckCircle2, 
  Smartphone, 
  RotateCw, 
  LogOut, 
  Sparkles,
  Building2,
  ExternalLink,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SubscriptionGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading, isOwner, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [localStatusOverride, setLocalStatusOverride] = useState<'active' | 'pending' | 'inactive' | null>(null);

  const cleanEmail = (user?.email || profile?.email || '').toLowerCase().trim();
  const isSuperAdmin = isOwner || isAdmin || cleanEmail === 'lfquadrosdecorativos@gmail.com';
  const isTeamCollaborator = !!profile?.joinedOwnerUid;

  // Real-time check on mount or when requested
  const verifyLatestStatus = async () => {
    if (!user) return;
    setCheckingStatus(true);
    setCheckMessage(null);

    try {
      // 1. Check server canonical subscribers API
      const serverRes = await fetch('/api/subscribers')
        .then(r => r.json())
        .catch(() => null);

      if (serverRes && Array.isArray(serverRes.subscribers)) {
        const found = serverRes.subscribers.find((u: any) => 
          (cleanEmail && u.email?.toLowerCase().trim() === cleanEmail) || 
          (user.uid && u.uid === user.uid)
        );
        if (found && found.status === 'active') {
          setLocalStatusOverride('active');
          setCheckMessage('✅ Seu acesso foi liberado! Entrando no sistema...');
          setTimeout(() => {
            window.location.reload();
          }, 1200);
          return;
        }
      }

      // 2. Check Firestore users collection
      if (user.uid) {
        const userSnap = await getDoc(doc(db, 'users', user.uid)).catch(() => null);
        if (userSnap && userSnap.exists()) {
          const data = userSnap.data();
          if (data?.status === 'active') {
            setLocalStatusOverride('active');
            setCheckMessage('✅ Seu acesso foi liberado pelo administrador! Entrando...');
            setTimeout(() => {
              window.location.reload();
            }, 1200);
            return;
          }
        }
      }

      setCheckMessage('⏳ Seu acesso ainda está aguardando liberação. O administrador foi avisado e irá liberar em instantes.');
    } catch (err) {
      console.warn('Status verification error:', err);
      setCheckMessage('Não foi possível verificar no momento. Tente novamente em instantes.');
    } finally {
      setCheckingStatus(false);
    }
  };

  // If superadmin or collaborator in another office, grant immediate access
  if (isSuperAdmin || isTeamCollaborator) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100e] flex flex-col items-center justify-center p-6 text-[#ded5cc]">
        <Loader2 className="w-8 h-8 text-[#c58a4b] animate-spin mb-3" />
        <p className="text-xs text-[#a89c93]">Carregando credenciais...</p>
      </div>
    );
  }

  const effectiveStatus = localStatusOverride || profile?.status || 'active';

  // If status is active, grant access
  if (effectiveStatus === 'active') {
    return <>{children}</>;
  }

  // If subscriber is pending approval (e.g. indicated payment via PIX)
  if (effectiveStatus === 'pending' || effectiveStatus === 'pending_payment') {
    const subscriberName = profile?.name || user?.displayName || cleanEmail.split('@')[0] || 'Assinante';
    const whatsappText = `Olá Carlos Felipe! Realizei meu cadastro no Meu Escritório Online com o e-mail ${cleanEmail} e informei o pagamento via PIX. Segue meu comprovante para liberação do acesso!`;

    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center p-4 sm:p-6 text-[#fcf8f5]">
        <div className="w-full max-w-lg bg-[#1a1614] border border-[#3d342f] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
          {/* Background Ambient Glow */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#c58a4b]/5 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Header */}
          <div className="flex items-center justify-between border-b border-[#2d2520] pb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#c58a4b] flex items-center justify-center text-[#12100e]">
                <Building2 className="w-5 h-5" />
              </div>
              <span className="font-serif font-bold text-lg text-[#fcf8f5]">
                Meu Escritório <span className="text-[#c58a4b]">Online</span>
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>Aguardando Liberação</span>
            </span>
          </div>

          {/* Icon & Title */}
          <div className="text-center space-y-2 pt-2">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-inner">
              <Clock className="w-7 h-7" />
            </div>
            <h2 className="text-xl font-serif font-bold text-[#fcf8f5]">
              Acesso em Processo de Liberação
            </h2>
            <p className="text-xs text-[#a89c93] leading-relaxed max-w-sm mx-auto">
              Olá, <strong className="text-white">{subscriberName}</strong>! Seu cadastro foi recebido com sucesso. Como você informou o pagamento via PIX, o administrador foi avisado para conferir e liberar sua conta.
            </p>
          </div>

          {/* Details Card */}
          <div className="bg-[#14110f] border border-[#2d2520] rounded-2xl p-4 text-xs space-y-2 text-[#ded5cc]">
            <div className="flex justify-between items-center py-1 border-b border-[#241e1a]">
              <span className="text-[#8c827a]">E-mail da Conta:</span>
              <span className="font-mono font-bold text-white">{cleanEmail}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-[#241e1a]">
              <span className="text-[#8c827a]">Forma de Pagamento:</span>
              <span className="font-semibold text-amber-300">PIX / Transferência (Informado)</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[#8c827a]">Status:</span>
              <span className="font-bold text-amber-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping inline-block" />
                Aguardando Liberação do Administrador
              </span>
            </div>
          </div>

          {/* Status Feedback Notice */}
          {checkMessage && (
            <div className="p-3 rounded-xl bg-[#201b17] border border-amber-500/40 text-xs text-amber-200 text-center animate-in fade-in">
              {checkMessage}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2.5 pt-1">
            <button
              type="button"
              onClick={verifyLatestStatus}
              disabled={checkingStatus}
              className="w-full py-3 px-4 rounded-xl bg-[#c58a4b] hover:bg-[#b57a3b] text-[#12100e] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98"
            >
              {checkingStatus ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Consultando servidor...</span>
                </>
              ) : (
                <>
                  <RotateCw className="w-4 h-4" />
                  <span>Verificar se já Fui Liberado</span>
                </>
              )}
            </button>

            <a
              href={`https://wa.me/5521998213069?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              <span>Enviar Comprovante no WhatsApp (21 99821-3069)</span>
              <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70" />
            </a>

            <div className="pt-2 text-center border-t border-[#2d2520]">
              <p className="text-[11px] text-[#8c827a] mb-2">
                Não quer aguardar a conferência manual?
              </p>
              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="w-full py-2.5 px-4 rounded-xl bg-[#28221e] hover:bg-[#342c27] text-white border border-[#3d342f] font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CreditCard className="w-4 h-4 text-[#c58a4b]" />
                <span>Pagar com Cartão (Liberação Imediata)</span>
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-[#c58a4b]" />
              </button>
            </div>
          </div>

          {/* Sign out */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                signOut(auth).then(() => {
                  localStorage.removeItem('office_local_session');
                  navigate('/login', { replace: true });
                });
              }}
              className="text-xs text-[#8c827a] hover:text-[#ded5cc] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair da conta ou trocar de e-mail</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // If status is inactive or expired
  return (
    <div className="min-h-screen bg-[#12100e] flex items-center justify-center p-4 sm:p-6 text-[#fcf8f5]">
      <div className="w-full max-w-lg bg-[#1a1614] border border-[#3d342f] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-serif font-bold text-[#fcf8f5]">
            Assinatura Inativa ou Expirada
          </h2>
          <p className="text-xs text-[#a89c93] leading-relaxed max-w-sm mx-auto">
            Sua assinatura do <strong>Meu Escritório Online</strong> está inativa no momento. Para continuar utilizando todos os recursos de gestão, projetos, memoriais e inteligência artificial, renove seu plano.
          </p>
        </div>

        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={() => navigate('/checkout')}
            className="w-full py-3.5 px-4 rounded-xl bg-[#c58a4b] hover:bg-[#b57a3b] text-[#12100e] font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Renovar Assinatura (Cartão ou PIX)</span>
          </button>

          <a
            href="https://wa.me/5521998213069?text=Ol%C3%A1%20Carlos%20Felipe!%20Gostaria%20de%20reativar%20minha%20assinatura%20no%20Meu%20Escrit%C3%B3rio%20Online."
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-[#28221e] hover:bg-[#342c27] text-white border border-[#3d342f] font-semibold text-xs transition-all flex items-center justify-center gap-2"
          >
            <Smartphone className="w-4 h-4 text-emerald-400" />
            <span>Falar com o Administrador no WhatsApp</span>
          </a>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => {
              signOut(auth).then(() => {
                localStorage.removeItem('office_local_session');
                navigate('/login', { replace: true });
              });
            }}
            className="text-xs text-[#8c827a] hover:text-[#ded5cc] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair da conta</span>
          </button>
        </div>
      </div>
    </div>
  );
};
