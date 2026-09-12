import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  Building2, 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  CheckCircle2, 
  KeyRound, 
  ExternalLink,
  MessageSquare,
  FileCheck
} from 'lucide-react';
import { loginClient, recoverClientPassword } from '../../services/clientPortalService';
import { ClientPortalAccess } from '../../types';

export const ClientLogin: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState(searchParams.get('email') || '');
  const [accessCode, setAccessCode] = useState(searchParams.get('codigo') || searchParams.get('code') || searchParams.get('token') || '');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Recovery modal state
  const [isRecoverOpen, setIsRecoverOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [recoverLoading, setRecoverLoading] = useState(false);
  const [recoverResult, setRecoverResult] = useState<{ success: boolean; message: string; code?: string } | null>(null);

  // Auto-login if token is present
  useEffect(() => {
    const token = searchParams.get('token');
    const paramEmail = searchParams.get('email');
    if (token && paramEmail) {
      handleDirectLogin(paramEmail, token);
    }
  }, []);

  const handleDirectLogin = async (e: string, code: string) => {
    setLoading(true);
    setErrorMessage(null);
    const res = await loginClient(e, code);
    setLoading(false);
    if (res.success && res.portal) {
      sessionStorage.setItem('client_portal_session', JSON.stringify(res.portal));
      navigate(`/cliente/dashboard`);
    } else {
      setErrorMessage(res.error || 'Não foi possível validar o acesso.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage('Por favor, informe seu e-mail cadastrado.');
      return;
    }
    if (!accessCode.trim()) {
      setErrorMessage('Por favor, digite seu código de acesso ou senha.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    const res = await loginClient(email, accessCode);
    setLoading(false);

    if (res.success && res.portal) {
      sessionStorage.setItem('client_portal_session', JSON.stringify(res.portal));
      navigate(`/cliente/dashboard`);
    } else {
      setErrorMessage(res.error || 'Credenciais inválidas.');
    }
  };

  const handleRecoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recoverEmail.trim()) return;
    setRecoverLoading(true);
    setRecoverResult(null);

    const res = await recoverClientPassword(recoverEmail);
    setRecoverLoading(false);
    setRecoverResult({
      success: res.success,
      message: res.message,
      code: res.codePreview
    });
  };

  return (
    <div className="min-h-screen bg-[#12100e] text-[#fcf8f5] flex flex-col justify-between selection:bg-[var(--theme-primary)]/30 font-sans">
      
      {/* Top Simple Header */}
      <header className="border-b border-[#3d342f]/60 bg-[#161210]/90 backdrop-blur-md px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-md"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              <Building2 className="w-5 h-5 text-black" />
            </div>
            <div>
              <span className="font-serif font-bold text-lg text-[#fcf8f5] tracking-wide block leading-none">
                Radar do Cliente
              </span>
              <span className="text-[10px] text-[#a89c93] tracking-wider uppercase font-semibold">
                Meu Escritório Online
              </span>
            </div>
          </div>

          <Link
            to="/login"
            className="text-xs text-[#a89c93] hover:text-[#fcf8f5] transition-colors border border-[#3d342f] px-3 py-1.5 rounded-lg"
          >
            Sou do Escritório (Acesso Equipe) →
          </Link>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
        <div className="w-full max-w-md bg-[#1a1614] border border-[#3d342f] rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          
          {/* Subtle Ambient Light */}
          <div 
            className="absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[90px] pointer-events-none opacity-20"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          />

          <div className="text-center mb-8">
            <div 
              className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-lg"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-primary)',
                border: '1px solid var(--theme-badge-border)'
              }}
            >
              <ShieldCheck className="w-7 h-7" />
            </div>
            <h1 className="text-2xl font-serif font-bold text-[#fcf8f5]">
              Acompanhe seu Projeto
            </h1>
            <p className="text-xs text-[#a89c93] mt-2 max-w-sm mx-auto leading-relaxed">
              Consulte em tempo real as etapas, cronograma de entregas, documentos e troque mensagens diretamente com a equipe do escritório.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#fcf8f5] mb-1.5">
                Seu E-mail Cadastrado
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#a89c93] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  required
                  className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl pl-10 pr-4 py-3 text-sm text-[#fcf8f5] placeholder-[#6b625b] focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-[#fcf8f5]">
                  Senha ou Código de Acesso
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRecoverEmail(email);
                    setIsRecoverOpen(true);
                  }}
                  className="text-[11px] text-[var(--theme-primary)] hover:underline cursor-pointer"
                >
                  Esqueci minha senha
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#a89c93] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Ex: MEO-8492"
                  required
                  className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl pl-10 pr-4 py-3 text-sm text-[#fcf8f5] placeholder-[#6b625b] focus:outline-none focus:border-[var(--theme-primary)] transition-colors tracking-wider uppercase font-mono"
                />
              </div>
              <span className="text-[10px] text-[#a89c93] mt-1.5 block">
                O código foi enviado pelo escritório no contrato ou via WhatsApp.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl text-black font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all hover:brightness-110 cursor-pointer mt-6 disabled:opacity-50"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Validando acesso...</span>
                </>
              ) : (
                <>
                  <span>Entrar no Radar do Cliente</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Help Footer */}
          <div className="mt-8 pt-6 border-t border-[#3d342f]/60 text-center">
            <div className="flex items-center justify-center gap-4 text-xs text-[#a89c93]">
              <span className="flex items-center gap-1.5">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                Contratos & Prazos
              </span>
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                Contato Direto
              </span>
            </div>
            <p className="text-[11px] text-[#a89c93] mt-3">
              Dúvidas sobre seu login? Entre em contato diretamente com o responsável pelo seu atendimento.
            </p>
          </div>

        </div>
      </main>

      {/* Recover Password Modal */}
      {isRecoverOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#1a1614] border border-[#3d342f] rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#3d342f] mb-4">
              <div className="flex items-center gap-2 text-[var(--theme-primary)] font-serif font-bold">
                <KeyRound className="w-5 h-5" />
                <span>Recuperar Acesso do Cliente</span>
              </div>
              <button
                onClick={() => {
                  setIsRecoverOpen(false);
                  setRecoverResult(null);
                }}
                className="text-[#a89c93] hover:text-[#fcf8f5] text-sm"
              >
                ✕
              </button>
            </div>

            {recoverResult ? (
              <div className="space-y-4 text-center py-4">
                <div className={`w-12 h-12 rounded-full mx-auto flex items-center justify-center ${recoverResult.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  {recoverResult.success ? <CheckCircle2 className="w-6 h-6" /> : <AlertCircle className="w-6 h-6" />}
                </div>
                <p className="text-xs text-[#fcf8f5] leading-relaxed">
                  {recoverResult.message}
                </p>
                {recoverResult.code && (
                  <div className="bg-[#12100e] border border-[var(--theme-primary)]/50 p-4 rounded-xl">
                    <span className="text-[10px] text-[#a89c93] uppercase tracking-wider block mb-1">
                      Sua nova chave de acesso:
                    </span>
                    <span className="text-xl font-mono font-bold tracking-widest text-[var(--theme-primary)]">
                      {recoverResult.code}
                    </span>
                  </div>
                )}
                <button
                  onClick={() => {
                    if (recoverResult.code) setAccessCode(recoverResult.code);
                    setIsRecoverOpen(false);
                    setRecoverResult(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-[var(--theme-primary)] text-black font-bold text-xs"
                >
                  Continuar para o Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleRecoverSubmit} className="space-y-4">
                <p className="text-xs text-[#a89c93] leading-relaxed">
                  Informe o e-mail que você forneceu ao escritório. Se o seu projeto estiver ativo, forneceremos a recuperação imediata.
                </p>

                <div>
                  <label className="block text-xs font-bold text-[#fcf8f5] mb-1.5">
                    E-mail do Cliente
                  </label>
                  <input
                    type="email"
                    value={recoverEmail}
                    onChange={(e) => setRecoverEmail(e.target.value)}
                    placeholder="seuemail@cliente.com"
                    required
                    className="w-full bg-[#12100e] border border-[#3d342f] rounded-xl px-4 py-2.5 text-sm text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRecoverOpen(false)}
                    className="w-1/2 py-2.5 rounded-xl bg-[#26201c] text-[#a89c93] hover:text-[#fcf8f5] font-bold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={recoverLoading}
                    className="w-1/2 py-2.5 rounded-xl bg-[var(--theme-primary)] text-black font-bold text-xs flex items-center justify-center gap-1.5"
                  >
                    {recoverLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Simple Footer */}
      <footer className="border-t border-[#3d342f]/40 py-6 text-center text-xs text-[#a89c93]">
        <p>© {new Date().getFullYear()} Meu Escritório Online • Ambiente Seguro e Isolado de Clientes</p>
      </footer>

    </div>
  );
};
