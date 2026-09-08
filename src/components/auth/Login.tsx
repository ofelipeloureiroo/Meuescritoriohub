import React, { useState, useEffect } from 'react';
import { 
  signInWithRedirect, 
  getRedirectResult, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  signInAnonymously
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Building2, Lock, Loader2, ArrowLeft, Mail, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export const Login: React.FC = () => {
  const { user, profile, loading, isOwner, joinWithInviteCode } = useAuth();
  const navigate = useNavigate();
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [showInviteAuth, setShowInviteAuth] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [guestNameInput, setGuestNameInput] = useState('');
  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const handleInviteCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = inviteCodeInput.trim().toUpperCase();
    if (!cleanCode) {
      setError('Por favor, informe seu código de convite.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      let activeUser = auth.currentUser;

      if (!activeUser) {
        // Store pending invite code in localStorage to survive auth popups / redirects
        localStorage.setItem('pendingInviteCode', cleanCode);
        if (guestNameInput.trim()) {
          localStorage.setItem('pendingGuestName', guestNameInput.trim());
        }

        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });

        try {
          const userCredential = await signInWithPopup(auth, provider);
          activeUser = userCredential.user;
        } catch (popupErr: any) {
          if (
            popupErr.code === 'auth/popup-blocked' ||
            popupErr.code === 'auth/popup-closed-by-user' ||
            popupErr.code === 'auth/cancelled-popup-request' ||
            popupErr.message?.includes('popup')
          ) {
            console.log("Popup blocked or closed, redirecting to Google auth...");
            await signInWithRedirect(auth, provider);
            return;
          } else {
            throw popupErr;
          }
        }
      }

      if (activeUser) {
        const guestName = guestNameInput.trim() || activeUser.displayName || 'Convidado';
        const res = await joinWithInviteCode(cleanCode, activeUser, guestName);
        
        localStorage.removeItem('pendingInviteCode');
        localStorage.removeItem('pendingGuestName');

        if (res.success) {
          navigate('/');
        } else {
          setError(res.message);
        }
      }
    } catch (err: any) {
      console.error("Invite code login error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('O login com Google foi fechado antes da conclusão. Tente novamente.');
      } else {
        setError(err.message || 'Erro ao processar convite. Verifique o código e tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const processPendingInvite = async () => {
      const pendingCode = localStorage.getItem('pendingInviteCode');
      const pendingName = localStorage.getItem('pendingGuestName') || '';
      if (pendingCode && user) {
        const res = await joinWithInviteCode(pendingCode, user, pendingName);
        localStorage.removeItem('pendingInviteCode');
        localStorage.removeItem('pendingGuestName');
        if (!res.success) {
          setError(res.message);
          return false;
        }
      }
      return true;
    };

    if (user && profile) {
      processPendingInvite().then((success) => {
        if (success) {
          navigate('/');
        }
      });
    }
  }, [user, profile, navigate, joinWithInviteCode]);

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          await createOrUpdateUserProfile(result.user);
          navigate('/');
        }
      } catch (err: any) {
        console.error("Redirect auth error:", err);
        setError(err.message || 'Erro ao processar o retorno de login.');
      }
    };

    handleRedirect();
  }, [navigate]);

  const createOrUpdateUserProfile = async (firebaseUser: any) => {
    const email = firebaseUser.email || '';
    const isOwnerAccount = email.toLowerCase() === 'lfquadrosdecorativos@gmail.com';
    const docRef = doc(db, 'users', firebaseUser.uid);
    
    try {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);

        await setDoc(docRef, {
          uid: firebaseUser.uid,
          email: email,
          role: isOwnerAccount ? 'admin' : 'user',
          status: isOwnerAccount ? 'active' : 'pending',
          subscriptionDueDate: isOwnerAccount ? null : dueDate.toISOString(),
          createdAt: new Date().toISOString()
        }, { merge: true });
      } else if (isOwnerAccount) {
        await setDoc(docRef, { role: 'admin', status: 'active' }, { merge: true });
      }
    } catch (dbErr) {
      console.warn("Firestore profile sync notice:", dbErr);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsSubmitting(true);

    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      
      // Try popup first
      try {
        const userCredential = await signInWithPopup(auth, provider);
        if (userCredential.user) {
          await createOrUpdateUserProfile(userCredential.user);
          navigate('/');
        }
      } catch (popupErr: any) {
        // If popup was blocked or iframe restriction, try redirect as fallback
        if (
          popupErr.code === 'auth/popup-blocked' ||
          popupErr.code === 'auth/popup-closed-by-user' ||
          popupErr.code === 'auth/cancelled-popup-request' ||
          popupErr.message?.includes('popup')
        ) {
          console.log("Popup unavailable, initiating redirect sign-in...");
          await signInWithRedirect(auth, provider);
          return;
        }
        throw popupErr;
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`O domínio deste site (${window.location.hostname}) precisa ser liberado no Firebase Auth Console -> Domínios Autorizados.`);
      } else if (err.code === 'auth/network-request-failed') {
        setError('Falha de conexão com os servidores do Google. Verifique sua internet ou tente novamente.');
      } else {
        setError(err.message || 'Ocorreu um erro ao conectar com o Google.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput || !passwordInput) {
      setError('Preencha seu e-mail e senha.');
      return;
    }
    setError('');
    setIsSubmitting(true);

    try {
      let userCredential;
      if (isRegisterMode) {
        userCredential = await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      }
      if (userCredential.user) {
        await createOrUpdateUserProfile(userCredential.user);
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado. Tente entrar em vez de criar conta.');
      } else if (err.code === 'auth/weak-password') {
        setError('A senha deve conter no mínimo 6 caracteres.');
      } else {
        setError(err.message || 'Erro ao autenticar com e-mail.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100e] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#c58a4b] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12100e] flex flex-col md:flex-row font-sans text-[#fcf8f5]">
      {/* Left Side - Brand Presentation */}
      <div className="hidden md:flex w-1/2 bg-[#1a1614] border-r border-[#3d342f] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#c58a4b]/5 rounded-full blur-3xl translate-x-1/3 -translate-y-1/3" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#c58a4b]/5 rounded-full blur-3xl -translate-x-1/3 translate-y-1/3" />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#c58a4b] rounded-xl flex items-center justify-center shadow-lg shadow-[#c58a4b]/20">
              <Building2 className="w-6 h-6 text-[#12100e]" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#fcf8f5] tracking-wide">
              Meu Escritório <span className="text-[#c58a4b]">Online</span>
            </h1>
          </div>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-sm text-[#a89c93] hover:text-[#fcf8f5] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Ver Apresentação
          </Link>
        </div>

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#c58a4b]/10 border border-[#c58a4b]/20 rounded-full text-xs font-bold text-[#c58a4b] uppercase tracking-wider">
            Plataforma para Arquitetos & Designers
          </div>
          <h2 className="text-4xl md:text-5xl font-serif text-[#fcf8f5] leading-tight">
            Gestão Financeira<br/>
            e Controle de Obras<br/>
            <span className="text-[#c58a4b]">Profissional</span>
          </h2>
          <p className="text-lg text-[#a89c93] max-w-md leading-relaxed">
            Acesse seu painel completo para gerenciar projetos, clientes, parcelas e fluxo de caixa com praticidade e elegância.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[#3d342f]/50">
            <div className="flex items-center gap-2 text-sm text-[#a89c93]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>100% na Nuvem</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#a89c93]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Acesso Seguro</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#a89c93]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Suporte Dedicado</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-[#a89c93]">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Backup Automático</span>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-xs text-[#a89c93]">
            Meu Escritório Online &copy; {new Date().getFullYear()} - Todos os direitos reservados.
          </p>
        </div>
      </div>

      {/* Right Side - Login Box */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-6">
          <div className="flex items-center justify-between md:hidden mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-[#c58a4b] rounded-xl flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[#12100e]" />
              </div>
              <h1 className="text-xl font-serif font-bold text-[#fcf8f5]">
                Meu Escritório <span className="text-[#c58a4b]">Online</span>
              </h1>
            </div>
            <Link to="/" className="text-xs text-[#a89c93] hover:text-[#fcf8f5] flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Apresentação
            </Link>
          </div>

          <div>
            <h2 className="text-3xl font-serif font-bold text-[#fcf8f5]">
              {showInviteAuth 
                ? 'Acessar como Convidado' 
                : showEmailAuth 
                  ? (isRegisterMode ? 'Criar Conta' : 'Entrar com E-mail') 
                  : 'Acessar Plataforma'}
            </h2>
            <p className="text-[#a89c93] mt-2 text-sm">
              {showInviteAuth
                ? 'Digite o código de convite do escritório. A conexão será realizada com a sua conta Google.'
                : showEmailAuth 
                  ? 'Insira suas credenciais para acessar o sistema.' 
                  : 'Conecte-se de forma rápida e segura com sua conta Google.'}
            </p>
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-2">
              <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!showEmailAuth && !showInviteAuth ? (
            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-3 bg-[#fcf8f5] hover:bg-white text-black font-bold py-3.5 px-4 rounded-xl transition-all shadow-[0_0_20px_rgba(252,248,245,0.08)] hover:shadow-[0_0_25px_rgba(252,248,245,0.15)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                      <path d="M1 1h22v22H1z" fill="none" />
                    </svg>
                    Entrar com o Google
                  </>
                )}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#3d342f]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#12100e] px-2 text-[#a89c93]">Ou acesse com e-mail / convite</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setShowEmailAuth(true); setShowInviteAuth(false); setError(''); }}
                className="w-full flex items-center justify-center gap-2 bg-[#1a1614] hover:bg-[#25201d] border border-[#3d342f] text-[#fcf8f5] font-semibold py-3 px-4 rounded-xl transition-colors text-sm cursor-pointer"
              >
                <Mail className="w-4 h-4 text-[#c58a4b]" />
                Entrar com E-mail e Senha
              </button>

              <button
                type="button"
                onClick={() => { setShowInviteAuth(true); setShowEmailAuth(false); setError(''); }}
                className="w-full flex items-center justify-center gap-2 bg-[#c58a4b]/10 hover:bg-[#c58a4b]/20 border border-[#c58a4b]/30 text-[#c58a4b] font-semibold py-3 px-4 rounded-xl transition-colors text-sm cursor-pointer"
              >
                <Building2 className="w-4 h-4 text-[#c58a4b]" />
                Sou Convidado do Escritório (Digitar Código)
              </button>
            </div>
          ) : showInviteAuth ? (
            <form onSubmit={handleInviteCodeLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#a89c93] mb-1">Seu Nome / Apelido (Opcional)</label>
                <input
                  type="text"
                  value={guestNameInput}
                  onChange={(e) => setGuestNameInput(e.target.value)}
                  placeholder="Ex: Mariana Arquiteta"
                  className="w-full bg-[#1a1614] border border-[#3d342f] rounded-xl px-4 py-2.5 text-[#fcf8f5] text-sm focus:outline-none focus:border-[#c58a4b] transition-colors placeholder-[#3d342f] mb-3"
                />

                <label className="block text-xs font-medium text-[#a89c93] mb-1">Código de Convite</label>
                <input
                  type="text"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                  placeholder="EX: 4D8F3A"
                  required
                  maxLength={10}
                  className="w-full bg-[#1a1614] border border-[#3d342f] rounded-xl px-4 py-3 text-[#fcf8f5] text-center font-mono font-bold tracking-widest text-lg focus:outline-none focus:border-[#c58a4b] transition-colors placeholder-[#3d342f]"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-[#c58a4b] hover:bg-[#d49454] text-black font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-[#c58a4b]/20 cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Conectar com Google e Acessar'
                )}
              </button>

              <div className="flex items-center justify-center text-xs pt-2">
                <button
                  type="button"
                  onClick={() => { setShowInviteAuth(false); setError(''); }}
                  className="text-[#a89c93] hover:text-[#fcf8f5] flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Opções
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#a89c93] mb-1">Seu E-mail</label>
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="exemplo@arquitetura.com"
                  required
                  className="w-full bg-[#1a1614] border border-[#3d342f] rounded-xl px-4 py-3 text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#a89c93] mb-1">Sua Senha</label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-[#1a1614] border border-[#3d342f] rounded-xl px-4 py-3 text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b] transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-[#c58a4b] hover:bg-[#d49454] text-black font-bold py-3.5 px-4 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-[#c58a4b]/20"
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  isRegisterMode ? 'Criar Minha Conta' : 'Entrar no Sistema'
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => setIsRegisterMode(!isRegisterMode)}
                  className="text-[#c58a4b] hover:underline"
                >
                  {isRegisterMode ? 'Já tem uma conta? Entrar' : 'Não tem conta? Cadastre-se'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEmailAuth(false); setError(''); }}
                  className="text-[#a89c93] hover:text-[#fcf8f5]"
                >
                  Voltar ao Google
                </button>
              </div>
            </form>
          )}

          <div className="pt-6 border-t border-[#3d342f]/50 text-center">
            <Link to="/" className="text-sm font-semibold text-[#c58a4b] hover:text-[#d49454] transition-colors">
              &larr; Voltar para a Página de Vendas & Planos
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

