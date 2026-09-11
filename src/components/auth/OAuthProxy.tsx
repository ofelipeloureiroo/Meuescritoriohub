import React, { useEffect, useState } from 'react';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { Calendar, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export const OAuthProxy: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'redirecting' | 'success' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  const triggerRedirect = async () => {
    try {
      setStatus('redirecting');
      const provider = new GoogleAuthProvider();
      provider.addScope('https://www.googleapis.com/auth/calendar');
      provider.addScope('https://www.googleapis.com/auth/calendar.events');
      provider.addScope('https://www.googleapis.com/auth/userinfo.email');
      provider.setCustomParameters({ prompt: 'consent' });

      await signInWithRedirect(auth, provider);
    } catch (err: any) {
      console.error('Erro ao redirecionar para o Google:', err);
      setStatus('error');
      setErrorMessage(err.message || 'Falha ao iniciar conexão com o Google.');
    }
  };

  useEffect(() => {
    let isMounted = true;

    const processAuth = async () => {
      const sessionId = getSessionId();

      try {
        // 1. Verificamos se estamos retornando do redirecionamento do Google
        const result = await getRedirectResult(auth);

        if (result && result.user) {
          const credential = GoogleAuthProvider.credentialFromResult(result);
          const token = credential?.accessToken;
          const email = result.user.email || 'lfquadrosdecorativos@gmail.com';

          if (token) {
            if (isMounted) setStatus('success');

            // 1. Envia via postMessage caso a janela mãe ainda esteja vinculada
            try {
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_SUCCESS',
                  token,
                  email,
                  session: sessionId
                }, '*');
              }
            } catch (e) {
              console.warn('postMessage falhou:', e);
            }

            // 2. Salva na sessão do Firestore para garantir comunicação no celular / abas isoladas
            if (sessionId) {
              try {
                await setDoc(doc(db, 'oauth_sessions', sessionId), {
                  status: 'success',
                  token,
                  email,
                  updatedAt: Date.now()
                });
              } catch (fsErr) {
                console.error('Erro ao registrar sessão no Firestore:', fsErr);
              }
            }

            // Tenta fechar a janela após 1.5s
            setTimeout(() => {
              try {
                window.close();
              } catch {}
            }, 1500);

            return;
          }
        }

        // 2. Se não há resultado de redirecionamento, é o primeiro acesso à janela
        // Iniciamos o redirecionamento para o Google de forma direta (sem pop-ups bloqueados)
        if (isMounted) {
          triggerRedirect();
        }
      } catch (err: any) {
        console.error('Erro ao processar autenticação OAuth:', err);
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err.message || 'Erro durante a autenticação.');
        }

        if (sessionId) {
          try {
            await setDoc(doc(db, 'oauth_sessions', sessionId), {
              status: 'error',
              error: err.message || 'Erro na autenticação.',
              updatedAt: Date.now()
            });
          } catch {}
        }

        try {
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_ERROR',
              error: err.message
            }, '*');
          }
        } catch {}
      }
    };

    processAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#14110f] text-[#fcf8f5] p-6">
      <div className="w-full max-w-sm bg-[#1c1815] border border-[#3d342f] rounded-2xl p-6 text-center shadow-2xl space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto shadow-inner">
          <Calendar className="w-7 h-7" />
        </div>

        {status === 'checking' && (
          <div className="space-y-2">
            <h2 className="text-lg font-serif font-bold text-[#fcf8f5]">Verificando Conexão...</h2>
            <p className="text-xs text-[#a89c93]">Carregando credenciais de acesso ao Google Agenda.</p>
            <div className="pt-2 flex justify-center">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
          </div>
        )}

        {status === 'redirecting' && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-serif font-bold text-[#fcf8f5]">Conectando com o Google</h2>
              <p className="text-xs text-[#a89c93]">
                Você será redirecionado para a página oficial do Google para autorizar o acesso à sua agenda.
              </p>
            </div>
            <div className="pt-1 flex justify-center">
              <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            </div>
            <button
              onClick={triggerRedirect}
              className="w-full mt-3 py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
            >
              <span>Clique para continuar no Google</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-serif font-bold text-[#fcf8f5]">Agenda Conectada!</h2>
            <p className="text-xs text-[#a89c93] leading-relaxed">
              Sua conta Google foi sincronizada com sucesso. Esta janela será fechada automaticamente.
            </p>
            <button
              onClick={() => {
                try {
                  window.close();
                } catch {
                  window.location.href = 'https://meuescritoriohub.com.br/app';
                }
              }}
              className="w-full mt-2 py-2 px-4 bg-[#2a221d] hover:bg-[#382d27] text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 transition-all cursor-pointer"
            >
              Voltar ao Meu Escritório
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-serif font-bold text-[#fcf8f5]">Erro na Conexão</h2>
            <p className="text-xs text-red-300/90 leading-relaxed break-words">
              {errorMessage || 'Não foi possível completar a conexão com o Google Agenda.'}
            </p>
            <div className="pt-2 space-y-2">
              <button
                onClick={triggerRedirect}
                className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Tentar Novamente
              </button>
              <button
                onClick={() => {
                  try { window.close(); } catch {}
                }}
                className="w-full py-2 px-4 bg-transparent text-[#a89c93] hover:text-white text-xs transition-all cursor-pointer"
              >
                Fechar Janela
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
