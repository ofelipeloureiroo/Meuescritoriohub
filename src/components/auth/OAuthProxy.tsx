import React, { useEffect } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export const OAuthProxy: React.FC = () => {
  useEffect(() => {
    const performAuth = async () => {
      try {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/calendar');
        provider.addScope('https://www.googleapis.com/auth/calendar.events');
        
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        
        if (credential?.accessToken) {
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_SUCCESS',
              token: credential.accessToken,
              email: result.user.email
            }, '*');
            window.close();
          } else {
             document.body.innerHTML = '<h2>Autenticação concluída. Pode fechar esta janela.</h2>';
          }
        }
      } catch (err: any) {
        if (window.opener) {
          window.opener.postMessage({
            type: 'OAUTH_ERROR',
            error: err.message
          }, '*');
          window.close();
        } else {
           document.body.innerHTML = `<h2>Erro na autenticação: ${err.message}</h2>`;
        }
      }
    };
    
    performAuth();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1a1614] text-[#fcf8f5]">
      <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4" />
      <h2 className="text-xl font-serif font-bold">Conectando ao Google...</h2>
      <p className="text-[#a89c93] text-sm mt-2">Por favor, aguarde e não feche esta janela.</p>
    </div>
  );
};
