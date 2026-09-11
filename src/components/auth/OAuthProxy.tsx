import React, { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Calendar, CheckCircle2, AlertCircle, Loader2, ArrowRight, ShieldCheck, ShieldAlert } from 'lucide-react';

export const OAuthProxy: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'idle' | 'authorizing' | 'success' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>('lfquadrosdecorativos@gmail.com');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const getSessionId = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = urlParams.get('session');
    if (fromUrl) {
      try {
        sessionStorage.setItem('oauth_proxy_session', fromUrl);
        localStorage.setItem('oauth_proxy_session', fromUrl);
      } catch {}
      return fromUrl;
    }
    try {
      return sessionStorage.getItem('oauth_proxy_session') || localStorage.getItem('oauth_proxy_session');
    } catch {
      return null;
    }
  };

  const handleSuccess = async (token: string, email: string, currentSessionId: string | null) => {
    setStatus('success');
    setUserEmail(email);

    // 1. Send via postMessage to parent window if opener is present
    try {
      if (window.opener) {
        window.opener.postMessage({
          type: 'OAUTH_SUCCESS',
          token,
          email,
          session: currentSessionId
        }, '*');
      }
    } catch (e) {
      console.warn('postMessage falhou:', e);
    }

    // 2. Persist to Firestore session document for bulletproof cross-window/tab sync
    if (currentSessionId) {
      try {
        await setDoc(doc(db, 'oauth_sessions', currentSessionId), {
          status: 'success',
          token,
          email,
          updatedAt: Date.now()
        }, { merge: true });
      } catch (fsErr) {
        console.error('Erro ao registrar sessão no Firestore:', fsErr);
      }
    }

    // Cache locally
    try {
      localStorage.setItem('office_gcal_token', token);
      sessionStorage.setItem('office_gcal_token', token);
      localStorage.setItem('office_gcal_synced', 'true');
      localStorage.setItem('office_gcal_email', email);
    } catch {}

    // Persist to Firestore system_integrations doc for permanent cross-session recovery
    try {
      await setDoc(doc(db, 'system_integrations', 'google_calendar'), {
        token,
        email,
        updatedAt: Date.now(),
        synced: true,
      }, { merge: true });
    } catch (fsErr) {
      console.warn('Erro ao salvar no system_integrations:', fsErr);
    }

    // Auto-close popup after 2 seconds
    setTimeout(() => {
      try {
        window.close();
      } catch {}
    }, 2000);
  };

  const handleError = async (errorMsg: string, currentSessionId: string | null) => {
    setStatus('error');
    setErrorMessage(errorMsg);

    if (currentSessionId) {
      try {
        await setDoc(doc(db, 'oauth_sessions', currentSessionId), {
          status: 'error',
          error: errorMsg,
          updatedAt: Date.now()
        }, { merge: true });
      } catch {}
    }

    try {
      if (window.opener) {
        window.opener.postMessage({
          type: 'OAUTH_ERROR',
          error: errorMsg
        }, '*');
      }
    } catch {}
  };

  // Primary authorization flow triggered by explicit user click
  const handleAuthorize = async () => {
    setStatus('authorizing');
    setErrorMessage(null);
    const sid = sessionId || getSessionId();

    // Strategy 1: Google Identity Services (GIS) if available
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        const client = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: '720818316004-uhuvk0752n3nrqff0j96ja8cbgf8eqre.apps.googleusercontent.com',
          scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email',
          prompt: '',
          callback: async (response: any) => {
            if (response.error) {
              console.error('GIS Error:', response);
              // Fallback to Firebase popup
              fallbackFirebasePopup(sid);
              return;
            }
            if (response.access_token) {
              const email = 'lfquadrosdecorativos@gmail.com';
              await handleSuccess(response.access_token, email, sid);
            } else {
              fallbackFirebasePopup(sid);
            }
          }
        });
        client.requestAccessToken();
        return;
      } catch (gisErr) {
        console.warn('GIS init failed, falling back to Firebase popup:', gisErr);
      }
    }

    // Strategy 2: Firebase signInWithPopup
    fallbackFirebasePopup(sid);
  };

  const fallbackFirebasePopup = async (sid: string | null) => {
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      provider.setCustomParameters({ 
        login_hint: 'lfquadrosdecorativos@gmail.com'
      });

      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;
      const email = result.user?.email || 'lfquadrosdecorativos@gmail.com';

      if (token) {
        await handleSuccess(token, email, sid);
      } else {
        // If token wasn't in credential, try getIdToken or ask user
        const idToken = await result.user?.getIdToken();
        if (idToken) {
          // In some cases idToken works or we trigger redirect as last resort
          await handleSuccess(idToken, email, sid);
        } else {
          handleError('Não foi possível obter o token de acesso do Google. Tente novamente.', sid);
        }
      }
    } catch (err: any) {
      console.error('Erro ao conectar via popup:', err);
      // If popup was blocked or failed, give clear option
      if (err.code === 'auth/popup-blocked') {
        handleError('O navegador bloqueou a janela de autorização. Clique no botão abaixo para tentar com redirecionamento direto.', sid);
      } else {
        handleError(err.message || 'Erro ao autorizar com o Google.', sid);
      }
    }
  };

  const handleDirectRedirect = async () => {
    try {
      setStatus('authorizing');
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      provider.setCustomParameters({ prompt: 'consent' });

      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      handleError(err.message || 'Falha ao redirecionar para o Google.', sessionId);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const sid = getSessionId();
    setSessionId(sid);

    const checkRedirect = async () => {
      try {
        // Check if returning from a previous redirect
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const token = credential?.accessToken;
          const email = result.user.email || 'lfquadrosdecorativos@gmail.com';

          if (token && isMounted) {
            await handleSuccess(token, email, sid);
            return;
          }
        }
      } catch (err: any) {
        console.warn('getRedirectResult warning:', err);
      }

      // If no redirect result or on fresh open, set status to idle (never loop automatically!)
      if (isMounted) {
        setStatus('idle');
      }
    };

    checkRedirect();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#12100e] text-[#fcf8f5] p-4 sm:p-6 select-none font-sans">
      <div className="w-full max-w-md bg-[#1c1815] border border-[#3d342f] rounded-2xl p-6 sm:p-8 text-center shadow-2xl space-y-6">
        
        {/* Header Icon */}
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
          <Calendar className="w-8 h-8" />
        </div>

        {/* Checking Initial State */}
        {status === 'checking' && (
          <div className="space-y-3 py-4">
            <h2 className="text-xl font-serif font-bold text-[#fcf8f5]">Verificando Conexão...</h2>
            <p className="text-xs text-[#a89c93]">Carregando os serviços de autenticação do Google.</p>
            <div className="pt-2 flex justify-center">
              <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
            </div>
          </div>
        )}

        {/* Idle State: Ready to Connect */}
        {status === 'idle' && (
          <div className="space-y-5 text-left">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-serif font-bold text-[#fcf8f5]">Conectar Google Agenda</h2>
              <p className="text-xs text-[#a89c93]">
                Sincronize reuniões, audiências e prazos diretamente no seu painel.
              </p>
            </div>

            {/* Explanation of Google's Security Screen (Image 1 fix) */}
            <div className="p-3.5 bg-amber-950/25 border border-amber-500/30 rounded-xl space-y-2">
              <div className="flex items-start gap-2.5">
                <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-200/90 leading-relaxed">
                  <span className="font-semibold text-amber-300 block mb-0.5">Aviso de Segurança do Google:</span>
                  Como este é o sistema privativo do seu escritório, o Google exibirá a tela <em className="text-amber-100 font-medium">"O Google não verificou este app"</em>.
                  Basta clicar em <strong className="text-white bg-amber-500/20 px-1 py-0.5 rounded">Continuar</strong> para autorizar o acesso à sua agenda com segurança.
                </div>
              </div>
            </div>

            <div className="text-xs text-[#8c7f76] flex items-center gap-1.5 px-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Conta recomendada: <strong className="text-[#d8cec5]">{userEmail}</strong></span>
            </div>

            <button
              onClick={handleAuthorize}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/20 transition-all cursor-pointer transform active:scale-98"
            >
              <span>Autorizar Acesso ao Google</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Authorizing in Progress */}
        {status === 'authorizing' && (
          <div className="space-y-4 py-4">
            <h2 className="text-xl font-serif font-bold text-[#fcf8f5]">Aguardando Autorização</h2>
            <p className="text-xs text-[#a89c93] leading-relaxed max-w-xs mx-auto">
              Conclua o login na janela do Google. Se aparecer o aviso de teste, clique em <strong className="text-amber-300">Continuar</strong>.
            </p>
            <div className="pt-2 flex justify-center">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
            </div>
            <button
              onClick={handleAuthorize}
              className="mt-4 text-xs text-amber-400/80 hover:text-amber-300 underline cursor-pointer"
            >
              Janela não abriu? Clique aqui para tentar novamente
            </button>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="space-y-4 py-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-serif font-bold text-emerald-400">Agenda Conectada!</h2>
              <p className="text-xs text-[#a89c93] leading-relaxed">
                Conta <span className="text-[#fcf8f5] font-semibold">{userEmail}</span> sincronizada com sucesso.
              </p>
            </div>
            <p className="text-[11px] text-emerald-400/80 bg-emerald-950/20 py-1.5 px-3 rounded-lg border border-emerald-500/20">
              Esta janela será fechada automaticamente em instantes...
            </p>
            <button
              onClick={() => {
                try { window.close(); } catch {
                  window.location.href = 'https://meuescritoriohub.com.br/app';
                }
              }}
              className="w-full py-2.5 px-4 bg-[#2a221d] hover:bg-[#382d27] text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 transition-all cursor-pointer"
            >
              Fechar Janela e Voltar ao Escritório
            </button>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="space-y-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center shrink-0 border border-red-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base font-bold text-[#fcf8f5]">Atenção na Conexão</h2>
                <p className="text-xs text-red-300/90">{errorMessage || 'Não foi possível concluir a autenticação.'}</p>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={handleAuthorize}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Tentar Conectar Novamente</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleDirectRedirect}
                className="w-full py-2 px-4 bg-[#231e1a] hover:bg-[#2e2722] text-[#d8cec5] text-xs font-medium rounded-xl border border-[#3d342f] transition-all cursor-pointer"
              >
                Conectar via Redirecionamento Direto
              </button>

              <button
                onClick={() => { try { window.close(); } catch {} }}
                className="w-full py-1.5 px-4 text-[#8c7f76] hover:text-[#fcf8f5] text-xs transition-all cursor-pointer text-center block"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
