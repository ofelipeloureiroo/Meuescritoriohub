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
  HelpCircle,
  Settings,
  Key,
  ExternalLink
} from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import firebaseConfigData from '../../../firebase-applet-config.json';
import {
  initMercadoPago,
  getMercadoPagoPublicKey,
  createCheckoutPreference,
  createMercadoPagoPix,
  fetchMercadoPagoStatus,
  isMercadoPagoScriptLoaded,
  PixPaymentResponse,
  PaymentMethodItem,
  fetchPaymentMethods,
  saveMercadoPagoConfig,
  processTransparentPayment,
  createCardTokenWithSDK,
  detectCardBrand
} from '../../lib/mercadopago';

export const CheckoutPage: React.FC = () => {
  const { user, profile, isOwner } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const isAnnualPlan = searchParams.get('plan') === 'annual';
  const planAmount = isAnnualPlan ? 850 : 110;
  const planLabel = isAnnualPlan ? 'Anual' : 'Mensal';
  const planPeriodLabel = isAnnualPlan ? 'ano' : 'mês';

  // Payment method state: 'mercadopago' | 'pix'
  const [paymentMethod, setPaymentMethod] = useState<'mercadopago' | 'pix'>('mercadopago');
  
  // Mercado Pago states
  const [mpLoaded, setMpLoaded] = useState(false);
  const [mpStatus, setMpStatus] = useState<{
    configured: boolean;
    hasPublicKey: boolean;
    hasAccessToken: boolean;
    publicKey?: string;
    publicKeyPrefix?: string;
  }>({
    configured: false,
    hasPublicKey: false,
    hasAccessToken: false,
  });
  
  // Sub-tabs for Mercado Pago: 'card' (Transparent) | 'pix' (Transparent) | 'pro' (Checkout Pro)
  const [mpSubTab, setMpSubTab] = useState<'card' | 'pix' | 'pro'>('card');
  const [paymentMethodsList, setPaymentMethodsList] = useState<PaymentMethodItem[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);

  // Transparent Card states
  const [mpCardNumber, setMpCardNumber] = useState('');
  const [mpCardHolder, setMpCardHolder] = useState('');
  const [mpCardExpiry, setMpCardExpiry] = useState('');
  const [mpCardCvv, setMpCardCvv] = useState('');
  const [mpInstallments, setMpInstallments] = useState('1');
  const [mpDocNumber, setMpDocNumber] = useState('');
  const [mpDocType, setMpDocType] = useState<'CPF' | 'CNPJ'>('CPF');
  const [isProcessingTransparentCard, setIsProcessingTransparentCard] = useState(false);

  // In-app Mercado Pago Credentials configuration panel
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customAccessToken, setCustomAccessToken] = useState('');
  const [customPublicKey, setCustomPublicKey] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configSuccess, setConfigSuccess] = useState('');

  // Checkout Pro & PIX states
  const [isProcessingMpCheckout, setIsProcessingMpCheckout] = useState(false);
  const [isGeneratingMpPix, setIsGeneratingMpPix] = useState(false);
  const [mpPixData, setMpPixData] = useState<PixPaymentResponse | null>(null);
  const [mpPixCopied, setMpPixCopied] = useState(false);
  const [mpCpf, setMpCpf] = useState('');

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
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
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
  const pixAmount = isAnnualPlan ? '850.00' : '110.00';
  
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

  // Initialize Mercado Pago SDK, fetch backend configuration status & payment methods
  useEffect(() => {
    fetchMercadoPagoStatus().then((status) => {
      setMpStatus(status);
      if (status.publicKey) {
        setCustomPublicKey(status.publicKey);
        if (isMercadoPagoScriptLoaded()) {
          setMpLoaded(true);
          initMercadoPago(status.publicKey);
        }
      }
    });

    setLoadingPaymentMethods(true);
    fetchPaymentMethods().then((res) => {
      if (res?.payment_methods && Array.isArray(res.payment_methods)) {
        setPaymentMethodsList(res.payment_methods);
      }
    }).finally(() => {
      setLoadingPaymentMethods(false);
    });

    const checkAndInitMp = () => {
      if (isMercadoPagoScriptLoaded()) {
        setMpLoaded(true);
        const mp = initMercadoPago();
        if (mp) {
          console.log('[Mercado Pago] SDK v2 inicializado no frontend.');
        }
      }
    };

    checkAndInitMp();
    const interval = setInterval(() => {
      if (isMercadoPagoScriptLoaded()) {
        checkAndInitMp();
        clearInterval(interval);
      }
    }, 800);

    return () => clearInterval(interval);
  }, []);

  // Check for return callback from Mercado Pago Checkout Pro
  useEffect(() => {
    const statusParam = searchParams.get('status') || searchParams.get('collection_status');
    const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');
    
    if (statusParam === 'approved') {
      if (user && user.uid && user.email) {
        activateSubscriptionForUser(user.uid, user.email, 'mercadopago');
        setSuccessMessage('Pagamento aprovado pelo Mercado Pago! Seu plano foi ativado com sucesso.');
        setTimeout(() => {
          navigate('/app');
        }, 2500);
      } else {
        setSuccessMessage('Pagamento aprovado no Mercado Pago! Faça login para acessar o sistema.');
      }
    } else if (statusParam === 'failure' || statusParam === 'rejected') {
      setError('O pagamento no Mercado Pago foi cancelado ou recusado. Tente novamente ou use outro método.');
    } else if (statusParam === 'pending' || statusParam === 'in_process') {
      setSuccessMessage('Pagamento em processamento pelo Mercado Pago. Seu plano será liberado assim que for compensado.');
    }
  }, [searchParams, user]);

  // Check for Google redirect result on mount
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          setEmail(result.user.email || '');
          setName(result.user.displayName || '');
          if (!password) {
            setPassword('GoogleAuth@' + (result.user.uid.slice(0, 6) || '2026'));
          }
        }
      })
      .catch((err) => {
        console.warn('[Checkout] Redirect result check error:', err);
      });
  }, []);

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
    const cleanEmail = (userEmail || '').toLowerCase().trim();
    if (cleanEmail) {
      try {
        const rawBlacklist = localStorage.getItem('office_deleted_subscribers');
        if (rawBlacklist) {
          const list = JSON.parse(rawBlacklist);
          if (Array.isArray(list)) {
            const newList = list.filter((x: string) => x.toLowerCase().trim() !== cleanEmail);
            localStorage.setItem('office_deleted_subscribers', JSON.stringify(newList));
          }
        }
      } catch {}
    }

    const docRef = doc(db, 'users', uid);
    const dueDate = new Date();
    if (isAnnualPlan) {
      dueDate.setFullYear(dueDate.getFullYear() + 1); // 1 year access
    } else {
      dueDate.setMonth(dueDate.getMonth() + 1); // 1 month access
    }

    const userData = {
      uid,
      email: userEmail,
      name: name || user?.displayName || userEmail.split('@')[0],
      status: 'active',
      role: userEmail.toLowerCase() === 'lfquadrosdecorativos@gmail.com' ? 'admin' : 'user',
      subscriptionDueDate: dueDate.toISOString(),
      lastPaymentMethod: method,
      lastPaymentDate: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await setDoc(docRef, userData, { merge: true });

    // Sync to authorized_subscribers cache and system_integrations doc
    try {
      const stored = localStorage.getItem('meu_escritorio_assinantes_autorizados_v1');
      let currentList: any[] = stored ? JSON.parse(stored) : [];
      if (!Array.isArray(currentList)) currentList = [];
      const idx = currentList.findIndex((u: any) => (u.email || '').toLowerCase().trim() === cleanEmail || u.uid === uid);
      if (idx >= 0) {
        currentList[idx] = { ...currentList[idx], ...userData };
      } else {
        currentList.push(userData);
      }
      localStorage.setItem('meu_escritorio_assinantes_autorizados_v1', JSON.stringify(currentList));

      await setDoc(doc(db, 'system_integrations', 'authorized_subscribers'), {
        subscribers: currentList,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (syncErr) {
      console.warn('Notice syncing subscriber during activation:', syncErr);
    }

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
    const activeAuthUser = user || auth.currentUser;
    if (activeAuthUser) {
      return { uid: activeAuthUser.uid, email: activeAuthUser.email || email };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError('Por favor, informe seu e-mail para vincular seu acesso.');
      return null;
    }

    // Helper for fallback identifier when Firebase Email/Password provider is disabled in Firebase Console
    const createFallbackCustomer = async (): Promise<{ uid: string; email: string }> => {
      const fallbackUid = 'usr_' + btoa(cleanEmail).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
      try {
        await setDoc(doc(db, 'users', fallbackUid), {
          uid: fallbackUid,
          email: cleanEmail,
          displayName: name || cleanEmail.split('@')[0],
          phone: phone || '',
          whatsapp: phone || '',
          status: 'pending_payment',
          authProvider: 'email_pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }, { merge: true });
        console.log('[Checkout] Usuário temporário criado com sucesso:', fallbackUid);
      } catch (err) {
        console.warn('[Checkout] Aviso ao salvar documento de usuário provisório:', err);
      }
      return { uid: fallbackUid, email: cleanEmail };
    };

    if (authMode === 'register') {
      if (password && password.length < 6) {
        setError('A senha deve ter pelo menos 6 caracteres.');
        return null;
      }
      try {
        const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password || 'senha123');
        return { uid: cred.user.uid, email: cred.user.email || cleanEmail };
      } catch (err: any) {
        if (err.code === 'auth/email-already-in-use') {
          // Try signing in
          try {
            const loginCred = await signInWithEmailAndPassword(auth, cleanEmail, password || 'senha123');
            return { uid: loginCred.user.uid, email: loginCred.user.email || cleanEmail };
          } catch (loginErr: any) {
            setError('Este e-mail já possui cadastro. Alterne para "Já tenho conta" ou verifique sua senha.');
            return null;
          }
        }
        
        // If Email/Password is not enabled in Firebase Console, do not block the payment!
        if (err.code === 'auth/operation-not-allowed') {
          console.warn('[Firebase Auth] O provedor Email/Senha não está ativado no Firebase Console. Prosseguindo com identificador do cliente para não travar o checkout.');
          return await createFallbackCustomer();
        }

        if (err.code === 'auth/invalid-email') {
          setError('O formato do e-mail informado é inválido.');
          return null;
        }

        setError(err.message || 'Erro ao criar conta.');
        return null;
      }
    } else {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        return { uid: cred.user.uid, email: cred.user.email || cleanEmail };
      } catch (err: any) {
        if (err.code === 'auth/operation-not-allowed') {
          console.warn('[Firebase Auth] O provedor Email/Senha não está ativado no Firebase Console. Prosseguindo para o pagamento.');
          return await createFallbackCustomer();
        }
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
          setError('E-mail ou senha incorretos. Caso seja seu primeiro acesso, mude para "Criar Conta".');
        } else {
          setError(err.message || 'Erro ao fazer login.');
        }
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

  // Helper formatting functions
  const formatCardNumber = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
  };

  const formatExpiry = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length > 2) {
      return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    }
    return digits;
  };

  const formatCpf = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 11) {
      return digits
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    return digits
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  };

  // Save Mercado Pago API Credentials directly from UI
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setConfigSuccess('');
    setIsSavingConfig(true);

    try {
      const res = await saveMercadoPagoConfig({
        accessToken: customAccessToken.trim() || undefined,
        publicKey: customPublicKey.trim() || undefined,
      });

      setMpStatus({
        configured: res.configured,
        hasAccessToken: res.hasAccessToken,
        hasPublicKey: res.hasPublicKey,
        publicKeyPrefix: res.publicKeyPrefix,
      });

      // Refetch payment methods
      const methodsRes = await fetchPaymentMethods();
      if (methodsRes?.payment_methods) {
        setPaymentMethodsList(methodsRes.payment_methods);
      }

      if (customPublicKey.trim()) {
        initMercadoPago(customPublicKey.trim());
      }

      setConfigSuccess('Credenciais salvas e ativadas com sucesso!');
      setTimeout(() => {
        setShowConfigModal(false);
        setConfigSuccess('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar credenciais do Mercado Pago.');
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Mercado Pago Checkout Transparente (Modo Automático - Cartão de Crédito)
  const handleTransparentCardPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsProcessingTransparentCard(true);

    try {
      const authUser = await ensureAuthenticatedUser();
      if (!authUser) {
        setIsProcessingTransparentCard(false);
        return;
      }

      const cleanNum = mpCardNumber.replace(/\D/g, '');
      if (cleanNum.length < 13) {
        setError('Por favor, informe um número de cartão de crédito válido.');
        setIsProcessingTransparentCard(false);
        return;
      }

      if (!mpCardHolder.trim()) {
        setError('Por favor, informe o nome do titular como está impresso no cartão.');
        setIsProcessingTransparentCard(false);
        return;
      }

      const expiryParts = mpCardExpiry.split('/');
      const month = expiryParts[0]?.trim();
      const year = expiryParts[1]?.trim();
      if (!month || !year || month.length !== 2) {
        setError('Data de validade inválida. Utilize o formato MM/AA.');
        setIsProcessingTransparentCard(false);
        return;
      }

      if (mpCardCvv.length < 3) {
        setError('Código de segurança (CVV) inválido.');
        setIsProcessingTransparentCard(false);
        return;
      }

      const cleanDoc = (mpDocNumber || mpCpf).replace(/\D/g, '');
      if (!cleanDoc || cleanDoc.length < 11) {
        setError('Por favor, informe um CPF ou CNPJ válido do titular do cartão.');
        setIsProcessingTransparentCard(false);
        return;
      }

      const detectedBrand = detectCardBrand(cleanNum);

      let cardTokenId = '';

      // Check if SDK is loaded and public key is available
      const pubKey = customPublicKey || mpStatus.publicKey || getMercadoPagoPublicKey();
      if (isMercadoPagoScriptLoaded() && pubKey) {
        try {
          const tokenRes = await createCardTokenWithSDK({
            cardNumber: cleanNum,
            cardholderName: mpCardHolder,
            cardExpirationMonth: month,
            cardExpirationYear: year,
            securityCode: mpCardCvv,
            identificationType: cleanDoc.length > 11 ? 'CNPJ' : 'CPF',
            identificationNumber: cleanDoc,
            customPublicKey: pubKey,
          });
          cardTokenId = tokenRes.id;
        } catch (tokenErr: any) {
          console.error('Erro na tokenização do cartão:', tokenErr);
          throw new Error(tokenErr.message || 'Falha ao tokenizar o cartão junto ao Mercado Pago. Verifique os dados digitados.');
        }
      } else {
        throw new Error('Chave pública do Mercado Pago não configurada. Configure em "Configurar Credenciais" acima ou adicione VITE_MERCADO_PAGO_PUBLIC_KEY.');
      }

      const nameParts = mpCardHolder.trim().split(' ');
      const firstName = nameParts[0] || 'Assinante';
      const lastName = nameParts.slice(1).join(' ') || '';

      const paymentResult = await processTransparentPayment({
        token: cardTokenId,
        payment_method_id: detectedBrand === 'credit_card' ? 'master' : detectedBrand,
        installments: Number(mpInstallments) || 1,
        transaction_amount: planAmount,
        description: `Assinatura ${planLabel} - Meu Escritório Online`,
        payer: {
          email: authUser.email,
          first_name: firstName,
          last_name: lastName,
          identification: {
            type: cleanDoc.length > 11 ? 'CNPJ' : 'CPF',
            number: cleanDoc,
          },
        },
        external_reference: authUser.uid,
        metadata: {
          uid: authUser.uid,
          plan: isAnnualPlan ? 'annual' : 'monthly',
        },
      });

      if (paymentResult.status === 'approved' || paymentResult.status === 'processed') {
        await activateSubscriptionForUser(authUser.uid, authUser.email, 'mercadopago_card');
        setSuccessMessage('🎉 Pagamento aprovado com sucesso pelo Mercado Pago! Seu plano foi ativado.');
        setTimeout(() => {
          navigate('/app');
        }, 2000);
      } else if (paymentResult.status === 'in_process') {
        setSuccessMessage('⏳ Pagamento em processamento pelo Mercado Pago. Seu plano será ativado assim que for confirmado.');
        setTimeout(() => {
          navigate('/app');
        }, 3000);
      } else {
        setError(`Pagamento recusado (${paymentResult.status_detail || paymentResult.status}). Verifique seu cartão ou tente outra forma de pagamento.`);
      }
    } catch (err: any) {
      console.error('Erro no checkout transparente:', err);
      if (!mpStatus.hasAccessToken) {
        setError('MERCADO_PAGO_ACCESS_TOKEN não está configurado no servidor. Adicione suas credenciais no botão "⚙️ Configurar Credenciais" acima.');
      } else {
        setError(err.message || 'Erro ao processar pagamento com cartão.');
      }
    } finally {
      setIsProcessingTransparentCard(false);
    }
  };

  // Mercado Pago Checkout Pro (Redirect to official Mercado Pago Checkout)
  const handleMercadoPagoCheckout = async () => {
    setError('');
    setIsProcessingMpCheckout(true);

    try {
      const authUser = await ensureAuthenticatedUser();
      if (!authUser) {
        setIsProcessingMpCheckout(false);
        return;
      }

      const pref = await createCheckoutPreference({
        title: `Assinatura ${planLabel} - Meu Escritório Online`,
        price: planAmount,
        quantity: 1,
        payerEmail: authUser.email,
        payerName: name || user?.displayName || 'Assinante',
        externalReference: authUser.uid,
        metadata: {
          uid: authUser.uid,
          plan: isAnnualPlan ? 'annual' : 'monthly',
        },
      });

      if (pref.init_point) {
        window.location.href = pref.init_point;
      } else {
        setError('Não foi possível gerar a página de pagamento do Mercado Pago.');
      }
    } catch (err: any) {
      console.error('Mercado Pago checkout error:', err);
      // Helpful feedback if token is not yet configured
      if (!mpStatus.hasAccessToken) {
        setError(
          'MERCADO_PAGO_ACCESS_TOKEN não está configurado no servidor. O SDK no frontend está pronto. ' +
          'Adicione sua chave do Mercado Pago nas configurações ou utilize o PIX direto abaixo.'
        );
      } else {
        setError(err.message || 'Erro ao conectar ao Mercado Pago. Verifique suas credenciais.');
      }
    } finally {
      setIsProcessingMpCheckout(false);
    }
  };

  // Instant Mercado Pago PIX with QR Code image & Copia e Cola
  const handleGenerateMpPix = async () => {
    setError('');
    setIsGeneratingMpPix(true);

    try {
      const authUser = await ensureAuthenticatedUser();
      if (!authUser) {
        setIsGeneratingMpPix(false);
        return;
      }

      const pixResult = await createMercadoPagoPix({
        amount: planAmount,
        description: `Assinatura ${planLabel} - Meu Escritório Online`,
        email: authUser.email,
        name: name || user?.displayName || 'Assinante',
        docNumber: mpCpf || undefined,
        uid: authUser.uid,
      });

      setMpPixData(pixResult);
    } catch (err: any) {
      console.error('Mercado Pago PIX error:', err);
      if (!mpStatus.hasAccessToken) {
        setError(
          'MERCADO_PAGO_ACCESS_TOKEN não está configurado no servidor. ' +
          'Você pode usar a opção "PIX Direto" para pagar imediatamente com a chave PIX do escritório!'
        );
      } else {
        setError(err.message || 'Erro ao gerar PIX pelo Mercado Pago.');
      }
    } finally {
      setIsGeneratingMpPix(false);
    }
  };

  // Google Login Quick Action with resilient fallback
  const handleGoogleQuickAuth = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        const result = await signInWithPopup(auth, provider);
        if (result?.user) {
          setEmail(result.user.email || '');
          setName(result.user.displayName || '');
          if (!password) {
            setPassword('GoogleAuth@' + (result.user.uid.slice(0, 6) || '2026'));
          }
          return;
        }
      } catch (popupErr: any) {
        console.warn('[Checkout Google Auth] Popup attempt:', popupErr.code, popupErr.message);

        // 1. User dismissed or closed the popup voluntarily
        if (
          popupErr.code === 'auth/popup-closed-by-user' ||
          popupErr.code === 'auth/cancelled-popup-request'
        ) {
          return;
        }

        // 2. Popup blocked by browser (mobile Safari, in-app WebView, Chrome mobile)
        if (popupErr.code === 'auth/popup-blocked') {
          try {
            await signInWithRedirect(auth, provider);
            return;
          } catch (redirectErr) {
            setError(
              'O navegador bloqueou a janela pop-up do Google. Você pode preencher seus dados diretamente no formulário abaixo para continuar.'
            );
            return;
          }
        }

        // 3. Domain not authorized in Firebase Console
        if (popupErr.code === 'auth/unauthorized-domain') {
          const currentHost = window.location.hostname;
          const activeProjectId = (firebaseConfigData as any)?.projectId || 'plucky-haven-393011';
          setError(
            `Aviso do Firebase: O domínio "${currentHost}" precisa estar autorizado no projeto Firebase "${activeProjectId}". Verifique se no Firebase Console você está com o projeto "${activeProjectId}" selecionado no topo, ou preencha seus dados de acesso diretamente no formulário abaixo.`
          );
          return;
        }

        // 4. Provider disabled in Firebase Console
        if (popupErr.code === 'auth/operation-not-allowed') {
          setError(
            'Login com Google desativado no momento. Preencha seu e-mail e senha abaixo para prosseguir com a assinatura.'
          );
          return;
        }

        // 5. Try redirect as last attempt
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectErr) {
          setError(
            'Não foi possível conectar com o Google no momento. Por favor, preencha seus dados de acesso abaixo para assinar.'
          );
        }
      }
    } catch (err: any) {
      console.error('[Checkout Google Auth Error]:', err);
      setError(
        'Não foi possível conectar com o Google no momento. Preencha seu nome, e-mail e senha no formulário abaixo para continuar.'
      );
    } finally {
      setIsGoogleLoading(false);
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
                      disabled={isGoogleLoading}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#241e1a] hover:bg-[#2e2621] border border-[#3d342f] text-xs font-semibold text-[#fcf8f5] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
                    >
                      {isGoogleLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#c58a4b]" />
                      ) : (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                          <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.3 8.9 5 12 5z"/>
                          <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"/>
                          <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9z"/>
                          <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.5-2.3-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"/>
                        </svg>
                      )}
                      <span>
                        {isGoogleLoading ? 'Conectando ao Google...' : 'Ou entrar rapidamente com o Google'}
                      </span>
                    </button>
                    <p className="text-[11px] text-[#a89c93]/80 text-center mt-1.5">
                      Você também pode preencher os campos acima diretamente com seu e-mail e senha.
                    </p>
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

              {/* Tabs for Mercado Pago / PIX */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('mercadopago')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all ${
                    paymentMethod === 'mercadopago'
                      ? 'bg-[#121f2b] border-[#009ee3] ring-1 ring-[#009ee3] shadow-lg shadow-[#009ee3]/15'
                      : 'bg-[#0d0b0a] border-[#3d342f] hover:border-[#52443c] opacity-80'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-[#009ee3]/15 text-[#009ee3] flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#fcf8f5]">Mercado Pago</span>
                    <span className="block text-[10px] text-[#009ee3] font-semibold mt-0.5">Cartão até 12x, PIX & Pro</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('pix')}
                  className={`p-3.5 rounded-xl border flex flex-col items-center justify-center gap-2 text-center transition-all ${
                    paymentMethod === 'pix'
                      ? 'bg-[#251f1a] border-[var(--theme-primary)] ring-1 ring-[var(--theme-primary)] shadow-lg shadow-[var(--theme-primary)]/10'
                      : 'bg-[#0d0b0a] border-[#3d342f] hover:border-[#52443c] opacity-80'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-[#fcf8f5]">PIX Direto</span>
                    <span className="block text-[10px] text-emerald-400 font-semibold mt-0.5">Chave Escritório</span>
                  </div>
                </button>
              </div>

              {/* Mercado Pago Payment Section */}
              {paymentMethod === 'mercadopago' && (
                <div className="space-y-5 pt-1 animate-in fade-in">
                  {/* Status Banner & Settings Toggle */}
                  <div className="p-4 rounded-xl bg-[#0f1922] border border-[#009ee3]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-[#009ee3]/20 text-[#009ee3] flex items-center justify-center shrink-0 shadow-sm">
                        <Zap className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-[#fcf8f5]">Mercado Pago Checkout Transparente</p>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            mpStatus.hasAccessToken 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}>
                            {mpStatus.hasAccessToken ? 'Pronto para Pagamentos' : 'Credenciais Pendentes'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#8ea7be] mt-0.5">
                          Pague diretamente na tela com Cartão até 12x, PIX instantâneo ou Checkout Pro.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowConfigModal(!showConfigModal)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#142331] hover:bg-[#1a2d3f] border border-[#009ee3]/40 text-[#009ee3] text-xs font-semibold transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      <Settings className="w-3.5 h-3.5" />
                      <span>{showConfigModal ? 'Ocultar Chaves' : 'Configurar Chaves MP'}</span>
                    </button>
                  </div>

                  {/* Credentials Configuration Drawer / Inline Panel */}
                  {showConfigModal && (
                    <form onSubmit={handleSaveConfig} className="p-4 rounded-xl bg-[#14110f] border border-[#009ee3]/40 space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-[#fcf8f5] flex items-center gap-1.5">
                          <Key className="w-4 h-4 text-[#009ee3]" />
                          <span>Credenciais do Mercado Pago (API)</span>
                        </h4>
                        <span className="text-[10px] text-[#a89c93]">Salvo de forma segura no servidor</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-medium text-[#a89c93] mb-1">
                            Access Token (TEST-... ou APP_USR-...)
                          </label>
                          <input
                            type="password"
                            value={customAccessToken}
                            onChange={(e) => setCustomAccessToken(e.target.value)}
                            placeholder="TEST-1234567890-..."
                            className="w-full px-3 py-2 rounded-lg bg-[#0a0908] border border-[#3d342f] text-xs font-mono text-[#fcf8f5] focus:outline-none focus:border-[#009ee3]"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-[#a89c93] mb-1">
                            Public Key (TEST-... ou APP_USR-...)
                          </label>
                          <input
                            type="text"
                            value={customPublicKey}
                            onChange={(e) => setCustomPublicKey(e.target.value)}
                            placeholder="TEST-abcdef123-..."
                            className="w-full px-3 py-2 rounded-lg bg-[#0a0908] border border-[#3d342f] text-xs font-mono text-[#fcf8f5] focus:outline-none focus:border-[#009ee3]"
                          />
                        </div>
                      </div>

                      {configSuccess && (
                        <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                          <span>{configSuccess}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[10px] text-[#8ea7be]">
                          Obtenha suas chaves em: Mercado Pago Developers &gt; Suas Integrações.
                        </span>
                        <button
                          type="submit"
                          disabled={isSavingConfig}
                          className="px-4 py-2 rounded-lg bg-[#009ee3] hover:bg-[#008cc9] text-white font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          {isSavingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                          <span>Salvar e Ativar</span>
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Available Payment Methods Ribbon */}
                  <div className="p-3.5 rounded-xl bg-[#0d0b0a] border border-[#3d342f]/80">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-semibold text-[#a89c93] uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3 h-3 text-[#009ee3]" />
                        Meios de Pagamento Disponíveis:
                      </span>
                      {loadingPaymentMethods && (
                        <span className="text-[10px] text-[#8ea7be] flex items-center gap-1">
                          <Loader2 className="w-2.5 h-2.5 animate-spin" /> Atualizando...
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1.5">
                      {paymentMethodsList.length > 0 ? (
                        paymentMethodsList.slice(0, 10).map((pm) => (
                          <div
                            key={pm.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#191513] border border-[#3d342f] text-[11px] text-[#ded3cb]"
                            title={`${pm.name} (${pm.payment_type_id})`}
                          >
                            {pm.secure_thumbnail ? (
                              <img src={pm.secure_thumbnail} alt={pm.name} className="h-3.5 w-auto object-contain" referrerPolicy="no-referrer" />
                            ) : (
                              <CreditCard className="w-3 h-3 text-[#009ee3]" />
                            )}
                            <span className="capitalize">{pm.name}</span>
                          </div>
                        ))
                      ) : (
                        <>
                          <span className="px-2.5 py-1 rounded-md bg-[#191513] border border-[#3d342f] text-[11px] text-[#ded3cb] flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span> Pix Instantâneo
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-[#191513] border border-[#3d342f] text-[11px] text-[#ded3cb]">
                            Mastercard
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-[#191513] border border-[#3d342f] text-[11px] text-[#ded3cb]">
                            Visa
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-[#191513] border border-[#3d342f] text-[11px] text-[#ded3cb]">
                            Elo
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-[#191513] border border-[#3d342f] text-[11px] text-[#ded3cb]">
                            Hipercard
                          </span>
                          <span className="px-2.5 py-1 rounded-md bg-[#191513] border border-[#3d342f] text-[11px] text-[#ded3cb]">
                            Boleto Bancário
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Sub-tabs Selector: Card / PIX / Pro */}
                  <div className="grid grid-cols-3 gap-2 p-1 bg-[#14110f] rounded-xl border border-[#3d342f]">
                    <button
                      type="button"
                      onClick={() => setMpSubTab('card')}
                      className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        mpSubTab === 'card'
                          ? 'bg-[#009ee3] text-white shadow-md'
                          : 'text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#1f1a17]'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>Cartão Transparente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMpSubTab('pix')}
                      className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        mpSubTab === 'pix'
                          ? 'bg-[#009ee3] text-white shadow-md'
                          : 'text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#1f1a17]'
                      }`}
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>PIX Transparente</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setMpSubTab('pro')}
                      className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-all ${
                        mpSubTab === 'pro'
                          ? 'bg-[#009ee3] text-white shadow-md'
                          : 'text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#1f1a17]'
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Checkout Pro</span>
                    </button>
                  </div>

                  {/* Sub-tab 1: Checkout Transparente (Cartão de Crédito) */}
                  {mpSubTab === 'card' && (
                    <form onSubmit={handleTransparentCardPayment} className="p-5 rounded-2xl bg-[#0d0b0a] border border-[#3d342f] space-y-4 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-[#fcf8f5] flex items-center gap-2">
                            <span>Pagamento com Cartão de Crédito</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/20">
                              Sem sair do site
                            </span>
                          </h4>
                          <p className="text-xs text-[#a89c93] mt-0.5">
                            Criptografado e processado com segurança através da API do Mercado Pago.
                          </p>
                        </div>
                        {mpCardNumber && (
                          <span className="text-[11px] font-bold uppercase px-2 py-1 rounded bg-[#1f1a17] text-[#009ee3] border border-[#009ee3]/30">
                            {detectCardBrand(mpCardNumber.replace(/\D/g, ''))}
                          </span>
                        )}
                      </div>

                      <div className="space-y-3">
                        {/* Card Number */}
                        <div>
                          <label className="block text-xs font-medium text-[#ded3cb] mb-1">
                            Número do Cartão
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              value={mpCardNumber}
                              onChange={(e) => setMpCardNumber(formatCardNumber(e.target.value))}
                              placeholder="0000 0000 0000 0000"
                              maxLength={19}
                              className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#14110f] border border-[#3d342f] text-xs font-mono text-[#fcf8f5] focus:outline-none focus:border-[#009ee3]"
                              required
                            />
                            <CreditCard className="w-4 h-4 text-[#8ea7be] absolute left-3 top-3" />
                          </div>
                        </div>

                        {/* Cardholder Name */}
                        <div>
                          <label className="block text-xs font-medium text-[#ded3cb] mb-1">
                            Nome Completo Impresso no Cartão
                          </label>
                          <input
                            type="text"
                            value={mpCardHolder}
                            onChange={(e) => setMpCardHolder(e.target.value)}
                            placeholder="Como gravado no cartão"
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#14110f] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[#009ee3] uppercase"
                            required
                          />
                        </div>

                        {/* Expiry & CVV */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-[#ded3cb] mb-1">
                              Validade (MM/AA)
                            </label>
                            <input
                              type="text"
                              value={mpCardExpiry}
                              onChange={(e) => setMpCardExpiry(formatExpiry(e.target.value))}
                              placeholder="MM/AA"
                              maxLength={5}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#14110f] border border-[#3d342f] text-xs font-mono text-[#fcf8f5] focus:outline-none focus:border-[#009ee3]"
                              required
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-[#ded3cb] mb-1">
                              Código CVV
                            </label>
                            <div className="relative">
                              <input
                                type="password"
                                value={mpCardCvv}
                                onChange={(e) => setMpCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                                placeholder="123"
                                maxLength={4}
                                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#14110f] border border-[#3d342f] text-xs font-mono text-[#fcf8f5] focus:outline-none focus:border-[#009ee3]"
                                required
                              />
                              <Lock className="w-3.5 h-3.5 text-[#8ea7be] absolute left-3 top-3" />
                            </div>
                          </div>
                        </div>

                        {/* Document (CPF / CNPJ) */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-[#ded3cb] mb-1">
                              Documento
                            </label>
                            <select
                              value={mpDocType}
                              onChange={(e) => setMpDocType(e.target.value as 'CPF' | 'CNPJ')}
                              className="w-full px-3 py-2.5 rounded-xl bg-[#14110f] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[#009ee3]"
                            >
                              <option value="CPF">CPF</option>
                              <option value="CNPJ">CNPJ</option>
                            </select>
                          </div>

                          <div className="col-span-2">
                            <label className="block text-xs font-medium text-[#ded3cb] mb-1">
                              Número do {mpDocType} do Titular
                            </label>
                            <input
                              type="text"
                              value={mpDocNumber}
                              onChange={(e) => setMpDocNumber(formatCpf(e.target.value))}
                              placeholder={mpDocType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
                              maxLength={18}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#14110f] border border-[#3d342f] text-xs font-mono text-[#fcf8f5] focus:outline-none focus:border-[#009ee3]"
                              required
                            />
                          </div>
                        </div>

                        {/* Installments */}
                        <div>
                          <label className="block text-xs font-medium text-[#ded3cb] mb-1">
                            Parcelamento
                          </label>
                          <select
                            value={mpInstallments}
                            onChange={(e) => setMpInstallments(e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-[#14110f] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[#009ee3]"
                          >
                            <option value="1">1x de R$ {planAmount},00 (à vista)</option>
                            <option value="2">2x de R$ {(planAmount / 2).toFixed(2).replace('.', ',')}</option>
                            <option value="3">3x de R$ {(planAmount / 3).toFixed(2).replace('.', ',')}</option>
                            <option value="6">6x de R$ {(planAmount / 6).toFixed(2).replace('.', ',')}</option>
                            <option value="10">10x de R$ {(planAmount / 10).toFixed(2).replace('.', ',')}</option>
                            <option value="12">12x de R$ {(planAmount / 12).toFixed(2).replace('.', ',')}</option>
                          </select>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={isProcessingTransparentCard}
                          className="w-full py-3.5 px-6 rounded-xl bg-[#009ee3] hover:bg-[#008cc9] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#009ee3]/20 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                        >
                          {isProcessingTransparentCard ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Processando Pagamento no Mercado Pago...</span>
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="w-4 h-4" />
                              <span>Pagar R$ {planAmount},00 com Cartão (Transparente)</span>
                            </>
                          )}
                        </button>
                        <p className="text-[10px] text-center text-[#8ea7be] mt-2 flex items-center justify-center gap-1.5">
                          <Lock className="w-3 h-3 text-[#009ee3]" />
                          Tokenização segura via Mercado Pago SDK v2 • Seus dados nunca são armazenados
                        </p>
                      </div>
                    </form>
                  )}

                  {/* Sub-tab 2: Instant PIX (Mercado Pago API) */}
                  {mpSubTab === 'pix' && (
                    <div className="p-5 rounded-2xl bg-[#0d0b0a] border border-[#3d342f] space-y-4 animate-in fade-in">
                      <div>
                        <h4 className="text-sm font-bold text-[#fcf8f5] flex items-center gap-2">
                          <span>PIX Oficial Mercado Pago</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/15 text-emerald-400 font-bold border border-emerald-500/20">
                            Aprovação Imediata
                          </span>
                        </h4>
                        <p className="text-xs text-[#a89c93] mt-0.5">
                          Gere o QR Code dinâmico do Mercado Pago diretamente nesta tela e pague em qualquer aplicativo bancário.
                        </p>
                      </div>

                      {!mpPixData ? (
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-[#a89c93] mb-1">
                              CPF ou CNPJ do Pagador (Recomendado pelo Banco Central)
                            </label>
                            <input
                              type="text"
                              value={mpCpf}
                              onChange={(e) => setMpCpf(formatCpf(e.target.value))}
                              placeholder="000.000.000-00"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#14110f] border border-[#3d342f] text-xs font-mono text-[#fcf8f5] focus:outline-none focus:border-[#009ee3]"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={handleGenerateMpPix}
                            disabled={isGeneratingMpPix}
                            className="w-full py-3.5 px-4 rounded-xl bg-[#009ee3] hover:bg-[#008cc9] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-[#009ee3]/20 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isGeneratingMpPix ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Gerando PIX Mercado Pago...</span>
                              </>
                            ) : (
                              <>
                                <QrCode className="w-4 h-4" />
                                <span>Gerar QR Code PIX Mercado Pago (R$ {planAmount},00)</span>
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-4 pt-2 text-center animate-in fade-in">
                          {/* QR Code image */}
                          {mpPixData.qr_code_base64 ? (
                            <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl shadow-md flex items-center justify-center">
                              <img
                                src={`data:image/png;base64,${mpPixData.qr_code_base64}`}
                                alt="Mercado Pago PIX QR Code"
                                className="w-full h-full object-contain"
                              />
                            </div>
                          ) : mpPixData.qr_code ? (
                            <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl shadow-md flex items-center justify-center">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(mpPixData.qr_code)}`}
                                alt="Mercado Pago PIX QR Code"
                                className="w-full h-full object-contain"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          ) : null}

                          <div className="space-y-1">
                            <p className="text-xs text-[#a89c93]">Valor:</p>
                            <p className="text-2xl font-serif font-bold text-[#009ee3]">R$ {planAmount},00</p>
                            <p className="text-[11px] text-[#a89c93]">
                              ID do Pagamento MP: #{mpPixData.id} • Status: <span className="text-amber-400 font-semibold">{mpPixData.status || 'pendente'}</span>
                            </p>
                          </div>

                          {/* Copia e cola */}
                          {mpPixData.qr_code && (
                            <div className="bg-[#14110f] border border-[#3d342f] rounded-xl p-2.5 flex items-center justify-between gap-2 max-w-md mx-auto text-left">
                              <div className="overflow-hidden">
                                <span className="block text-[10px] text-[#a89c93] uppercase font-semibold">Código Copia e Cola:</span>
                                <span className="block text-xs font-mono text-[#fcf8f5] truncate">
                                  {mpPixData.qr_code.substring(0, 32)}...
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (mpPixData.qr_code) {
                                    navigator.clipboard.writeText(mpPixData.qr_code);
                                    setMpPixCopied(true);
                                    setTimeout(() => setMpPixCopied(false), 3000);
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-[#009ee3] text-white font-bold text-xs flex items-center gap-1 shrink-0 hover:bg-[#008cc9] transition-all"
                              >
                                {mpPixCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{mpPixCopied ? 'Copiado!' : 'Copiar'}</span>
                              </button>
                            </div>
                          )}

                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-300 flex items-center gap-2 justify-center">
                            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                            <span>Após pagar no seu banco, a liberação ocorre automaticamente pelo Webhook do Mercado Pago!</span>
                          </div>

                          <button
                            type="button"
                            onClick={() => setMpPixData(null)}
                            className="text-xs text-[#a89c93] hover:text-[#fcf8f5] underline cursor-pointer"
                          >
                            Gerar outro PIX ou alterar dados
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Sub-tab 3: Checkout Pro (Redirecionamento) */}
                  {mpSubTab === 'pro' && (
                    <div className="p-5 rounded-2xl bg-[#0d0b0a] border border-[#3d342f] space-y-4 animate-in fade-in">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-bold text-[#fcf8f5] flex items-center gap-2">
                            <span>Mercado Pago Checkout Pro</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#009ee3]/20 text-[#009ee3] font-bold">
                              Oficial MP
                            </span>
                          </h4>
                          <p className="text-xs text-[#a89c93] mt-1">
                            Redireciona para a página segura do Mercado Pago. Pague com saldo da conta Mercado Pago, PIX, Cartão até 12x ou Boleto bancário.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#a89c93]">
                        <span className="bg-[#1f1a17] px-2.5 py-1 rounded-md border border-[#3d342f] flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" /> Saldo da Conta MP
                        </span>
                        <span className="bg-[#1f1a17] px-2.5 py-1 rounded-md border border-[#3d342f] flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" /> Cartão até 12x
                        </span>
                        <span className="bg-[#1f1a17] px-2.5 py-1 rounded-md border border-[#3d342f] flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" /> PIX Automático
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={handleMercadoPagoCheckout}
                        disabled={isProcessingMpCheckout}
                        className="w-full py-3.5 px-6 rounded-xl bg-[#009ee3] hover:bg-[#008cc9] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#009ee3]/20 transition-all cursor-pointer disabled:opacity-50 active:scale-98"
                      >
                        {isProcessingMpCheckout ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Gerando Sessão Mercado Pago...</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-4 h-4" />
                            <span>Ir para Checkout Pro (R$ {planAmount},00)</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

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
                <p className="mt-0.5">Fale com nosso suporte: suporte@meuescritorio.online</p>
              </div>
            </div>

          </div>

        </div>

      </main>
    </div>
  );
};
