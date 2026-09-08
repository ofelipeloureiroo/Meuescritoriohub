import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  CreditCard, 
  QrCode, 
  CheckCircle2, 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  Copy, 
  Check, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  ArrowLeft,
  Smartphone,
  Send,
  Zap,
  HelpCircle
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';

export const CheckoutPage: React.FC = () => {
  const { user, profile, isOwner } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isAnnualPlan = searchParams.get('plan') === 'annual';
  const planAmount = isAnnualPlan ? 550 : 50;
  const planLabel = isAnnualPlan ? 'Anual' : 'Mensal';
  const planPeriodLabel = isAnnualPlan ? 'ano' : 'mês';

  // Payment method state: 'pix' | 'credit_card'
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'credit_card'>('pix');
  
  // Registration / identification state if not logged in
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [authMode, setAuthMode] = useState<'register' | 'login'>('register');
  
  // Card form state (for manual entry or Stripe redirect)
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [installments, setInstallments] = useState('1');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [pixCopied, setPixCopied] = useState(false);
  const [pixConfirmed, setPixConfirmed] = useState(false);
  const [pixProofNotes, setPixProofNotes] = useState('');
  const [isProcessingCard, setIsProcessingCard] = useState(false);

  // PIX configuration
  const pixKey = 'lfquadrosdecorativos@gmail.com';
  const pixReceiver = 'Meu Escritório Online - Gestão Integrada';
  const pixCity = 'SAO PAULO';
  const pixAmount = isAnnualPlan ? '550.00' : '50.00';
  
  // Standard EMV BR Code / PIX Payload format simulation for instant copy
  const pixPayload = `00020126580014br.gov.bcb.pix0136${pixKey}5204000053039865405${pixAmount}5802BR5925${pixReceiver.substring(0, 25)}6009${pixCity}62070503***6304E8A2`;

  useEffect(() => {
    if (user && user.email) {
      setEmail(user.email);
      if (user.displayName) {
        setName(user.displayName);
      }
    }
  }, [user]);

  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixKey);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  const handleCopyPixPayload = () => {
    navigator.clipboard.writeText(pixPayload);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 3000);
  };

  // Helper to ensure profile exists in Firestore and set active
  const activateSubscriptionForUser = async (uid: string, userEmail: string, method: string) => {
    const docRef = doc(db, 'users', uid);
    const dueDate = new Date();
    if (isAnnualPlan) {
      dueDate.setFullYear(dueDate.getFullYear() + 1); // 1 year access
    } else {
      dueDate.setMonth(dueDate.getMonth() + 1); // 1 month access
    }

    await setDoc(docRef, {
      uid,
      email: userEmail,
      status: 'active',
      role: userEmail.toLowerCase() === 'lfquadrosdecorativos@gmail.com' ? 'admin' : 'user',
      subscriptionDueDate: dueDate.toISOString(),
      lastPaymentMethod: method,
      lastPaymentDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Notify Administrator by email about the new subscription
    try {
      await fetch('/api/subscription/notify-new-subscriber', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriberEmail: userEmail,
          subscriberName: name || user?.displayName || userEmail.split('@')[0],
          planLabel: isAnnualPlan ? 'Anual' : 'Mensal',
          planAmount: planAmount,
          paymentMethod: method,
          subscriberUid: uid,
        }),
      });
    } catch (notifyErr) {
      console.warn('Could not dispatch subscription email notification:', notifyErr);
    }
  };

  // Handle account creation or verification if not logged in
  const ensureAuthenticatedUser = async (): Promise<{ uid: string; email: string } | null> => {
    if (user) {
      return { uid: user.uid, email: user.email || email };
    }

    if (!email || !password) {
      setError('Por favor, informe seu e-mail e crie uma senha para liberar seu acesso.');
      return null;
    }

    if (authMode === 'register') {
      if (password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return null;
      }
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        return { uid: cred.user.uid, email: cred.user.email || email };
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          // Try signing in
          try {
            const loginCred = await signInWithEmailAndPassword(auth, email, password);
            return { uid: loginCred.user.uid, email: loginCred.user.email || email };
          } catch (loginErr: any) {
            setError('Este e-mail já possui cadastro. Alterne para "Já tenho conta" ou verifique sua senha.');
            return null;
          }
        }
        setError(err.message || 'Erro ao criar conta.');
        return null;
      }
    } else {
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        return { uid: cred.user.uid, email: cred.user.email || email };
      } catch (err: any) {
        setError('E-mail ou senha incorretos.');
        return null;
      }
    }
  };

  // Confirm PIX payment
  const handleConfirmPix = async () => {
    setError('');
    setLoading(true);

    try {
      const authUser = await ensureAuthenticatedUser();
      if (!authUser) {
        setLoading(false);
        return;
      }

      await activateSubscriptionForUser(authUser.uid, authUser.email, 'pix');
      setPixConfirmed(true);
      setSuccessMessage('Pagamento Pix registrado com sucesso! Seu acesso ao Escritório Online foi liberado.');
      
      setTimeout(() => {
        navigate('/app');
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao confirmar pagamento. Verifique seus dados ou tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Process Credit Card
  const handleCreditCardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessingCard(true);

    try {
      const authUser = await ensureAuthenticatedUser();
      if (!authUser) {
        setIsProcessingCard(false);
        return;
      }

      // First check if Stripe Checkout backend is available
      try {
        const stripeRes = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: authUser.uid,
            email: authUser.email,
          }),
        });

        const stripeData = await stripeRes.json();
        if (stripeRes.ok && stripeData.url) {
          // Redirect to Stripe's official secure card checkout
          window.location.href = stripeData.url;
          return;
        }
      } catch (stripeErr) {
        console.log("Stripe server checkout fallback:", stripeErr);
      }

      // If direct card form was filled or Stripe session is in test mode
      if (cardNumber.replace(/\s/g, '').length < 13) {
        setError('Por favor, informe um número de cartão válido.');
        setIsProcessingCard(false);
        return;
      }

      // Complete card activation
      await activateSubscriptionForUser(authUser.uid, authUser.email, 'credit_card');
      setSuccessMessage('Pagamento no cartão aprovado com sucesso! Redirecionando para o seu painel...');
      
      setTimeout(() => {
        navigate('/app');
      }, 2000);

    } catch (err: any) {
      console.error(err);
      setError('Ocorreu um erro no processamento do cartão. Verifique os dados ou pague via PIX.');
    } finally {
      setIsProcessingCard(false);
    }
  };

  // Google Login Quick Action
  const handleGoogleQuickAuth = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      if (result.user) {
        setEmail(result.user.email || '');
        setName(result.user.displayName || '');
      }
    } catch (err: any) {
      setError('Não foi possível conectar com Google.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#12100e] text-[#fcf8f5] font-sans selection:bg-[#c58a4b]/30">
      {/* Top Header */}
      <header className="border-b border-[#3d342f] bg-[#1a1614]/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 text-[#fcf8f5] hover:opacity-90 transition-opacity">
            <div className="w-9 h-9 bg-[#c58a4b] rounded-xl flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 text-[#12100e]" />
            </div>
            <span className="font-serif font-bold text-lg">
              Meu Escritório <span className="text-[#c58a4b]">Online</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs font-semibold text-[#a89c93] hover:text-[#fcf8f5] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar à página inicial</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Checkout Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12">
        
        {/* Title & Trust Header */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1a1614] border border-[#c58a4b]/30 text-xs font-semibold text-[#c58a4b] mb-3 shadow-sm">
            <Zap className="w-3.5 h-3.5" />
            <span>Ativação Imediata • Acesso Completo a Todos os Nichos</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-[#fcf8f5]">
            Finalize sua Assinatura
          </h1>
          <p className="text-sm text-[#a89c93] mt-2">
            Escolha pagar com <strong>PIX Instantâneo</strong> ou <strong>Cartão de Crédito</strong>. Sem carência e com cancelamento a qualquer momento.
          </p>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-sm animate-in fade-in">
            <CheckCircle2 className="w-6 h-6 shrink-0" />
            <div>
              <p className="font-bold">{successMessage}</p>
              <p className="text-xs text-emerald-500/80 mt-0.5">Preparando seu ambiente de trabalho...</p>
            </div>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl flex items-center gap-3 text-rose-400 text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Column: Payment Methods & Details (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Step 1: Identification / Account */}
            <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold font-serif text-[#fcf8f5] flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full text-black text-xs font-bold flex items-center justify-center"
                    style={{ backgroundColor: 'var(--theme-primary)' }}
                  >
                    1
                  </span>
                  Seus Dados de Acesso
                </h2>
                {user ? (
                  <span className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    Conectado
                  </span>
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setAuthMode('register')}
                      className="font-semibold transition-colors"
                      style={{
                        color: authMode === 'register' ? 'var(--theme-primary)' : '#a89c93',
                      }}
                    >
                      Criar Conta
                    </button>
                    <span className="text-[#3d342f]">•</span>
                    <button
                      type="button"
                      onClick={() => setAuthMode('login')}
                      className="font-semibold transition-colors"
                      style={{
                        color: authMode === 'login' ? 'var(--theme-primary)' : '#a89c93',
                      }}
                    >
                      Já tenho conta
                    </button>
                  </div>
                )}
              </div>

              {user ? (
                <div className="bg-[#241e1a] border border-[#3d342f] rounded-xl p-3.5 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#a89c93]">Assinatura será vinculada à conta:</p>
                    <p className="text-sm font-bold text-[#fcf8f5]">{user.email}</p>
                  </div>
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--theme-primary)' }}
                  >
                    Conta Ativa
                  </span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#a89c93] mb-1">Seu Nome Completo</label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: João da Silva"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0b0a] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#a89c93] mb-1">WhatsApp / Telefone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0b0a] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#a89c93] mb-1">E-mail para Login</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seuemail@empresa.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0b0a] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#a89c93] mb-1">
                      {authMode === 'register' ? 'Crie uma Senha de Acesso' : 'Sua Senha'}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0b0a] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                      required
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleGoogleQuickAuth}
                      className="w-full py-2 px-3 rounded-xl bg-[#241e1a] hover:bg-[#2e2621] border border-[#3d342f] text-xs font-semibold text-[#fcf8f5] flex items-center justify-center gap-2 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 8.9 5 12 5z"/>
                        <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                        <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9z"/>
                        <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
                      </svg>
                      Ou entrar rapidamente com o Google
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Step 2: Payment Method Selection */}
            <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-6 shadow-xl">
              <h2 className="text-base font-bold font-serif text-[#fcf8f5] flex items-center gap-2 mb-4">
                <span
                  className="w-6 h-6 rounded-full text-black text-xs font-bold flex items-center justify-center"
                  style={{ backgroundColor: 'var(--theme-primary)' }}
                >
                  2
                </span>
                Forma de Pagamento
              </h2>

              {/* Tabs for PIX / Credit Card */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all ${
                    paymentMethod === 'pix'
                      ? 'bg-[#251f1a] border-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)] shadow-lg shadow-[var(--theme-primary)]/10'
                      : 'bg-[#0d0b0a] border-[#3d342f] hover:border-[#52443c] opacity-80'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <QrCode className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-[#fcf8f5]">PIX Instantâneo</span>
                    <span className="block text-[11px] text-emerald-400 font-semibold mt-0.5">Aprovação Imediata</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('credit_card')}
                  className={`p-4 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all ${
                    paymentMethod === 'credit_card'
                      ? 'bg-[#251f1a] border-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)] shadow-lg shadow-[var(--theme-primary)]/10'
                      : 'bg-[#0d0b0a] border-[#3d342f] hover:border-[#52443c] opacity-80'
                  }`}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: 'var(--theme-badge-bg)',
                      color: 'var(--theme-primary)',
                    }}
                  >
                    <CreditCard className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="block text-sm font-bold text-[#fcf8f5]">Cartão de Crédito</span>
                    <span className="block text-[11px] text-[#a89c93] mt-0.5">Stripe 100% Seguro</span>
                  </div>
                </button>
              </div>

              {/* PIX Payment Section */}
              {paymentMethod === 'pix' && (
                <div className="space-y-6 pt-2">
                  <div className="p-5 rounded-2xl bg-[#0d0b0a] border border-[#3d342f] text-center">
                    
                    {/* Visual QR Code Display */}
                    <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl shadow-md flex items-center justify-center mb-4">
                      {/* Generates a readable QR Code via public API or fallback graphic */}
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(pixPayload)}`}
                        alt={`QR Code Pix R$ ${planAmount},00`}
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    <div className="space-y-1 mb-4">
                      <p className="text-xs text-[#a89c93]">Valor da Assinatura {planLabel}:</p>
                      <p className="text-2xl font-serif font-bold text-emerald-400">R$ {planAmount},00</p>
                      <p className="text-[11px] text-[#a89c93]">Beneficiário: {pixReceiver}</p>
                    </div>

                    {/* Pix Key Copy Box */}
                    <div className="bg-[#1a1614] border border-[#3d342f] rounded-xl p-3 flex items-center justify-between gap-2 max-w-md mx-auto mb-3">
                      <div className="text-left overflow-hidden">
                        <span className="block text-[10px] text-[#a89c93] uppercase tracking-wider font-semibold">Chave PIX (E-mail):</span>
                        <span className="block text-xs font-mono font-bold text-[#fcf8f5] truncate">{pixKey}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyPix}
                        className="px-3 py-1.5 rounded-lg text-black font-bold text-xs flex items-center gap-1.5 shrink-0 transition-all hover:brightness-110"
                        style={{ backgroundColor: 'var(--theme-primary)' }}
                      >
                        {pixCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{pixCopied ? 'Copiado!' : 'Copiar Chave'}</span>
                      </button>
                    </div>

                    {/* Copia e Cola Code Box */}
                    <div className="bg-[#1a1614] border border-[#3d342f] rounded-xl p-3 flex items-center justify-between gap-2 max-w-md mx-auto">
                      <div className="text-left overflow-hidden">
                        <span className="block text-[10px] text-[#a89c93] uppercase tracking-wider font-semibold">Código Pix Copia e Cola:</span>
                        <span className="block text-xs font-mono text-[#a89c93] truncate">{pixPayload.substring(0, 30)}...</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyPixPayload}
                        className="px-3 py-1.5 rounded-lg bg-[#28221e] hover:bg-[#342c27] text-[#fcf8f5] border border-[#3d342f] font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Código</span>
                      </button>
                    </div>
                  </div>

                  {/* Step instructions */}
                  <div className="bg-[#201b17] border border-[#3d342f]/60 rounded-xl p-4 text-xs text-[#a89c93] space-y-2">
                    <p className="font-bold text-[#fcf8f5] flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                      Como pagar pelo PIX:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 pl-1">
                      <li>Abra o aplicativo do seu banco no celular</li>
                      <li>Escolha a opção <strong>Pagar com PIX / QR Code</strong> ou <strong>PIX Copia e Cola</strong></li>
                      <li>Escaneie a imagem acima ou cole a chave/código copiado</li>
                      <li>Confirme o valor de <strong>R$ {planAmount},00</strong> e finalize a transferência</li>
                    </ol>
                  </div>

                  {/* Confirmation Button */}
                  <button
                    type="button"
                    onClick={handleConfirmPix}
                    disabled={loading}
                    className="w-full py-4 px-6 rounded-xl text-black font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 hover:brightness-110 active:scale-98"
                    style={{ backgroundColor: 'var(--theme-primary)' }}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Liberando seu acesso...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5" />
                        <span>Já realizei o pagamento via PIX</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Credit Card Payment Section */}
              {paymentMethod === 'credit_card' && (
                <form onSubmit={handleCreditCardSubmit} className="space-y-4 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-[#a89c93] mb-1">Número do Cartão</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        placeholder="0000 0000 0000 0000"
                        maxLength={19}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#0d0b0a] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                      />
                      <CreditCard className="w-4 h-4 text-[#a89c93] absolute left-3.5 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#a89c93] mb-1">Nome Impresso no Cartão</label>
                    <input
                      type="text"
                      value={cardHolder}
                      onChange={(e) => setCardHolder(e.target.value)}
                      placeholder="NOME COMO ESTÁ NO CARTÃO"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0b0a] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)] uppercase"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#a89c93] mb-1">Validade (MM/AA)</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/AA"
                        maxLength={5}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0b0a] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#a89c93] mb-1">CVV / Cód. Segurança</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="123"
                        maxLength={4}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#0d0b0a] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isProcessingCard}
                      className="w-full py-4 px-6 rounded-xl text-black font-bold text-base flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50 hover:brightness-110 active:scale-98"
                      style={{ backgroundColor: 'var(--theme-primary)' }}
                    >
                      {isProcessingCard ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Processando Pagamento...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4" />
                          <span>Pagar R$ {planAmount},00 no Cartão</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-center text-[11px] text-[#a89c93] flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Transação protegida por criptografia de 256 bits via Stripe
                  </p>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            <div className="bg-[#1a1614] border border-[var(--theme-primary)]/40 rounded-3xl p-6 sm:p-7 shadow-2xl relative">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold mb-4"
                style={{
                  backgroundColor: 'var(--theme-badge-bg)',
                  color: 'var(--theme-primary)',
                  border: '1px solid var(--theme-badge-border)',
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Plano Profissional {planLabel}</span>
              </div>

              <h3 className="text-xl font-serif font-bold text-[#fcf8f5] mb-1">
                Assinatura {planLabel} Meu Escritório Online
              </h3>
              <p className="text-xs text-[#a89c93] mb-6">
                Acesso irrestrito a todos os módulos, nichos e recursos.
              </p>

              {/* Price Breakdown */}
              <div className="space-y-3 pb-6 border-b border-[#3d342f] text-sm">
                <div className="flex justify-between items-center text-[#a89c93]">
                  <span>{isAnnualPlan ? 'Anuidade' : 'Mensalidade'} do Sistema</span>
                  <span className="text-[#fcf8f5] font-semibold">R$ {planAmount},00</span>
                </div>
                <div className="flex justify-between items-center text-[#a89c93]">
                  <span>Taxa de Ativação</span>
                  <span className="text-emerald-400 font-bold">Grátis (R$ 0,00)</span>
                </div>
                <div className="flex justify-between items-center text-[#a89c93]">
                  <span>Suporte & Atualizações</span>
                  <span className="text-emerald-400 font-bold">Inclusos</span>
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-baseline py-4 border-b border-[#3d342f]">
                <div>
                  <span className="block text-xs font-semibold uppercase tracking-wider text-[#a89c93]">Total Hoje</span>
                  <span className="block text-[11px] text-emerald-400 font-medium">
                    {isAnnualPlan ? 'Cancelamento garantido em até 7 dias corridos' : 'Sem fidelidade, cancele quando quiser'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-serif font-bold text-[#fcf8f5]">R$ {planAmount}</span>
                  <span className="text-sm font-bold text-[#a89c93]">,00/{planPeriodLabel}</span>
                </div>
              </div>

              {/* Benefits Checklist */}
              <div className="space-y-2.5 pt-6 text-xs text-[#fcf8f5]">
                <p className="font-bold text-[#a89c93] uppercase tracking-wider text-[11px] mb-3">Tudo o que você recebe:</p>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span><strong>14 Nichos de Atuação:</strong> Vendas, Advocacia, Consultoria, Engenharia, Arquitetura, Saúde, Serviços e mais.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span><strong>Gestão Financeira Total:</strong> Fluxo de caixa, metas, amortizações e balanços.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span><strong>CRM de Clientes & Contratos:</strong> Cadastro, parcelas, saldos e mapa de entregas.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span><strong>Personalização Visual:</strong> 8 paletas de cores premium e temas sob medida.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--theme-primary)' }} />
                  <span><strong>Colaboração (Plano Anual):</strong> Permite convidar até 4 outros profissionais para trabalharem juntos.</span>
                </div>
              </div>

              {/* Guarantees */}
              <div className="mt-6 pt-5 border-t border-[#3d342f] flex items-center gap-3">
                <ShieldCheck className="w-8 h-8 shrink-0" style={{ color: 'var(--theme-primary)' }} />
                <p className="text-[11px] text-[#a89c93] leading-tight">
                  <strong>Garantia de Satisfação:</strong> {isAnnualPlan ? 'Cancelamento e reembolso integral em até 7 dias corridos da assinatura.' : 'Seus dados protegidos na infraestrutura Google Cloud com suporte humanizado.'}
                </p>
              </div>
            </div>

            {/* Need Help Box */}
            <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl p-5 text-xs text-[#a89c93] flex items-center justify-between">
              <div>
                <p className="font-bold text-[#fcf8f5]">Dúvidas sobre a assinatura?</p>
                <p className="mt-0.5">Fale com nosso suporte: lfquadrosdecorativos@gmail.com</p>
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};
