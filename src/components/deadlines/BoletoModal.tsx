import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertCircle,
  Barcode,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Copy,
  DollarSign,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Printer,
  QrCode,
  RefreshCw,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  User,
  X,
  Zap,
} from 'lucide-react';
import { ProjectInstallment, Client } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import {
  POPULAR_BANKS,
  BankInfo,
  generateBoletoCodes,
  buildBoletoWhatsAppMessage,
  getBankInfo,
  formatCpfCnpj,
} from '../../utils/boletoGenerator';
import { BankAccountsModal } from '../banks/BankAccountsModal';
import {
  createMercadoPagoBoleto,
  fetchMercadoPagoPaymentStatus,
} from '../../lib/mercadopago';

interface BoletoModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment: ProjectInstallment | null;
  onUpdateInstallment?: (id: string, updates: Partial<ProjectInstallment>) => void;
}

export const BoletoModal: React.FC<BoletoModalProps> = ({
  isOpen,
  onClose,
  installment,
  onUpdateInstallment,
}) => {
  const {
    architectProfile,
    profile,
    user,
    bankAccounts,
    officeSettings,
    clients,
    architectureProjects,
    freelanceProjects,
    updateProjectInstallment,
    receiveInstallmentPayment,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'mercadopago' | 'preview' | 'send' | 'traditional'>('mercadopago');

  // Reactive local installment state to immediately reflect generated boleto data
  const [localInstallment, setLocalInstallment] = useState<ProjectInstallment | null>(installment);

  useEffect(() => {
    setLocalInstallment(installment);
  }, [installment]);

  const activeInstallment = localInstallment || installment;

  // Mercado Pago Boleto Form State
  const [payerName, setPayerName] = useState<string>('');
  const [payerEmail, setPayerEmail] = useState<string>('');
  const [payerDoc, setPayerDoc] = useState<string>('');
  const [payerPhone, setPayerPhone] = useState<string>('');
  const [payerZip, setPayerZip] = useState<string>('');
  const [payerStreet, setPayerStreet] = useState<string>('');
  const [payerNumber, setPayerNumber] = useState<string>('');
  const [payerNeighborhood, setPayerNeighborhood] = useState<string>('');
  const [payerCity, setPayerCity] = useState<string>('');
  const [payerState, setPayerState] = useState<string>('SP');
  const [boletoAmount, setBoletoAmount] = useState<number>(0);
  const [boletoDueDate, setBoletoDueDate] = useState<string>('');
  const [boletoDescription, setBoletoDescription] = useState<string>('');

  // Loading & Action States
  const [isGeneratingMP, setIsGeneratingMP] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [isSearchingCep, setIsSearchingCep] = useState<boolean>(false);
  const [mpError, setMpError] = useState<string>('');
  const [mpSuccess, setMpSuccess] = useState<string>('');
  const [syncStatusResult, setSyncStatusResult] = useState<string>('');

  // Email sending state
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailSuccess, setEmailSuccess] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');

  // Traditional Boleto State
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedBankCode, setSelectedBankCode] = useState<string>('341'); // Itaú default
  const [isManageAccountsOpen, setIsManageAccountsOpen] = useState<boolean>(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [clientDocument, setClientDocument] = useState<string>('');
  const [customInstructions, setCustomInstructions] = useState<string>(
    'Após o vencimento cobrar multa de 2,00% e juros de mora de 1,00% ao mês. Não receber após 30 dias do vencimento.'
  );
  const [customNotes, setCustomNotes] = useState<string>('');
  const [showPixQr, setShowPixQr] = useState<boolean>(true);

  // Copy feedbacks
  const [copiedLinha, setCopiedLinha] = useState<boolean>(false);
  const [copiedPix, setCopiedPix] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [showWhatsAppPreview, setShowWhatsAppPreview] = useState<boolean>(false);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const printRef = useRef<HTMLDivElement>(null);

  // Find matching client from database to auto-fill data
  const matchedClient: Client | null = useMemo(() => {
    if (!installment) return null;
    if (installment.clientId) {
      const found = clients.find((c) => c.id === installment.clientId);
      if (found) return found;
    }
    if (installment.clientName) {
      const term = installment.clientName.trim().toLowerCase();
      const found = clients.find(
        (c) => c.name?.trim().toLowerCase() === term || term.includes(c.name?.trim().toLowerCase() || '___')
      );
      if (found) return found;
    }
    const archProj = architectureProjects.find(
      (p) => p.id === installment.projectId || p.title === installment.projectTitle
    );
    if (archProj?.clientName) {
      const term = archProj.clientName.trim().toLowerCase();
      const found = clients.find((c) => c.name?.trim().toLowerCase() === term);
      if (found) return found;
    }
    const freeProj = freelanceProjects.find(
      (p) => p.id === installment.projectId || p.title === installment.projectTitle
    );
    if (freeProj?.clientId) {
      const found = clients.find((c) => c.id === freeProj.clientId);
      if (found) return found;
    }
    return null;
  }, [installment, clients, architectureProjects, freelanceProjects]);

  // Populate data from Client
  const applyClientData = (client: Client | null) => {
    if (!installment) return;

    const doc = client?.document || installment.clientDocument || '';
    const email = client?.email || installment.clientEmail || `${(client?.name || installment.clientName || 'cliente').toLowerCase().replace(/\s+/g, '')}@email.com`;
    const phone = client?.phone || client?.whatsapp || installment.clientPhone || '';
    const name = client?.name || installment.clientName || '';

    let street = installment.clientAddress?.street || '';
    let number = installment.clientAddress?.number || '';
    let neighborhood = installment.clientAddress?.neighborhood || client?.neighborhood || '';
    let city = installment.clientAddress?.city || client?.city || '';
    let state = installment.clientAddress?.state || client?.state || 'SP';
    let zip = installment.clientAddress?.zipCode || '';

    if (client?.address && !street) {
      street = client.address;
    }

    setPayerName(name);
    setPayerEmail(email);
    setPayerDoc(doc);
    setPayerPhone(phone);
    setPayerZip(zip);
    setPayerStreet(street);
    setPayerNumber(number);
    setPayerNeighborhood(neighborhood);
    setPayerCity(city);
    setPayerState(state);
    setClientDocument(doc);
  };

  // Auto-fill states on installment open
  useEffect(() => {
    if (installment && isOpen) {
      applyClientData(matchedClient);

      setBoletoAmount(installment.amount || 0);
      setBoletoDueDate(installment.dueDate || new Date().toISOString().split('T')[0]);
      setBoletoDescription(
        `Honorários: ${installment.projectTitle} - Parcela ${installment.installmentNumber}/${installment.totalInstallments} (${installment.description || 'Serviços Prestados'})`
      );

      // Traditional account selection
      let matchedAcc = bankAccounts.find((a) => a.id === installment.boletoBankAccountId);
      if (!matchedAcc && installment.bankAccountId) {
        matchedAcc = bankAccounts.find((a) => a.id === installment.bankAccountId);
      }
      if (!matchedAcc && bankAccounts.length > 0) {
        matchedAcc =
          bankAccounts.find((a) => a.isDefault && a.type !== 'physical_cash') ||
          bankAccounts.find((a) => a.type !== 'physical_cash') ||
          bankAccounts[0];
      }

      if (matchedAcc) {
        setSelectedAccountId(matchedAcc.id);
        const code = matchedAcc.bankCode || getBankInfo(matchedAcc.name).code;
        setSelectedBankCode(code || '341');
      } else if (installment.boletoBank && POPULAR_BANKS[installment.boletoBank]) {
        setSelectedAccountId('');
        setSelectedBankCode(installment.boletoBank);
      } else {
        setSelectedAccountId('');
        setSelectedBankCode('341');
      }

      setCustomNotes(installment.description || '');

      // If installment already has an official Mercado Pago boleto, default to mercadopago tab
      if (installment.boletoExternalUrl || installment.boletoProvider === 'mercadopago') {
        setActiveTab('mercadopago');
      }
    }
  }, [installment, isOpen, matchedClient, bankAccounts]);

  // Handle ViaCEP search
  const handleCepLookup = async (cepValue: string) => {
    const cleanCep = cepValue.replace(/\D/g, '');
    setPayerZip(cepValue);
    if (cleanCep.length === 8) {
      try {
        setIsSearchingCep(true);
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          if (data.logradouro) setPayerStreet(data.logradouro);
          if (data.bairro) setPayerNeighborhood(data.bairro);
          if (data.localidade) setPayerCity(data.localidade);
          if (data.uf) setPayerState(data.uf);
        }
      } catch (err) {
        console.warn('ViaCEP search failed:', err);
      } finally {
        setIsSearchingCep(false);
      }
    }
  };

  // Selected registered account object for traditional slip
  const selectedAccount = useMemo(() => {
    return bankAccounts.find((a) => a.id === selectedAccountId) || null;
  }, [bankAccounts, selectedAccountId]);

  const effectiveBankCode = useMemo(() => {
    if (selectedAccount) {
      const codeFromAccount = selectedAccount.bankCode || getBankInfo(selectedAccount.name).code;
      if (codeFromAccount && POPULAR_BANKS[codeFromAccount]) {
        return codeFromAccount;
      }
    }
    return selectedBankCode || '341';
  }, [selectedAccount, selectedBankCode]);

  const currentBank: BankInfo = useMemo(() => {
    return POPULAR_BANKS[effectiveBankCode] || POPULAR_BANKS['341'];
  }, [effectiveBankCode]);

  const effectiveAgency = selectedAccount?.agency || currentBank.agencyDefault;
  const effectiveAccountNumber = selectedAccount?.accountNumber || currentBank.accountDefault;
  const effectiveWallet = selectedAccount?.wallet || currentBank.walletDefault || '109';

  const traditionalBoletoData = useMemo(() => {
    if (!installment) return null;

    const effectiveBeneficiary =
      selectedAccount?.holderName ||
      officeSettings?.officeName ||
      architectProfile?.officeName ||
      architectProfile?.name ||
      profile?.companyName ||
      user?.displayName ||
      'Nosso Escritório';

    const effectiveBeneficiaryDoc =
      selectedAccount?.holderDocument ||
      architectProfile?.cpfCnpj ||
      '00.000.000/0001-00';

    const codes = generateBoletoCodes(
      effectiveBankCode,
      boletoAmount || installment.amount,
      boletoDueDate || installment.dueDate,
      `PARC-${installment.installmentNumber}`,
      effectiveAgency,
      effectiveAccountNumber,
      effectiveWallet
    );

    const isSameAccountAsSaved = installment.boletoBankAccountId === selectedAccountId;

    const linhaDigitavel = isSameAccountAsSaved && installment.boletoBarcode
      ? installment.boletoBarcode
      : codes.linhaDigitavel;

    const barcodeRaw = isSameAccountAsSaved && installment.boletoBarcodeRaw
      ? installment.boletoBarcodeRaw
      : codes.barcodeRaw;

    const nossoNumero = isSameAccountAsSaved && installment.boletoOurNumber
      ? installment.boletoOurNumber
      : codes.nossoNumero;

    return {
      linhaDigitavel,
      barcodeRaw,
      nossoNumero,
      fatorVencimento: codes.fatorVencimento,
      beneficiario: effectiveBeneficiary,
      beneficiarioDoc: effectiveBeneficiaryDoc,
      beneficiarioEndereco: architectProfile?.city
        ? `${architectProfile.city} - ${architectProfile.state || 'Brasil'}`
        : 'Brasil',
      documentoNumero: `PARC-${String(installment.installmentNumber).padStart(2, '0')}/${installment.totalInstallments}`,
      dataDocumento: new Date().toLocaleDateString('pt-BR'),
      agenciaCodigo: `${effectiveAgency} / ${effectiveAccountNumber}`,
      carteira: effectiveWallet,
    };
  }, [
    installment,
    selectedAccount,
    selectedAccountId,
    effectiveBankCode,
    effectiveAgency,
    effectiveAccountNumber,
    effectiveWallet,
    architectProfile,
    profile,
    user,
    officeSettings,
    boletoAmount,
    boletoDueDate,
  ]);

  // Build WhatsApp Message based on active boleto data
  useEffect(() => {
    if (installment) {
      const isMP = Boolean(installment.boletoExternalUrl);
      const linha = installment.boletoBarcode || traditionalBoletoData?.linhaDigitavel || '';
      const officeName = officeSettings?.officeName || architectProfile?.officeName || architectProfile?.name || profile?.companyName || user?.displayName || 'Nosso Escritório';

      let msg = '';
      if (isMP && installment.boletoExternalUrl) {
        msg =
          `Olá *${payerName || installment.clientName}*, tudo bem?\n\n` +
          `Segue o *Boleto Bancário Registrado* referente à parcela *${installment.installmentNumber}/${installment.totalInstallments}* do seu projeto *${installment.projectTitle}*:\n\n` +
          `💰 *Valor:* ${formatCurrency(boletoAmount || installment.amount)}\n` +
          `📅 *Vencimento:* ${formatDate(boletoDueDate || installment.dueDate)}\n\n` +
          `📄 *Visualizar e Imprimir Boleto Oficial (PDF):*\n${installment.boletoExternalUrl}\n\n` +
          `🔢 *Linha Digitável (Copiar e Colar no App do seu Banco):*\n\`\`\`${linha}\`\`\`\n\n` +
          `_Pague pelo aplicativo do seu banco, internet banking ou em qualquer agência/lotérica até o vencimento._\n\n` +
          `Atenciosamente,\n*${officeName}*`;
      } else {
        msg = buildBoletoWhatsAppMessage({
          clientName: payerName || installment.clientName || 'Cliente',
          projectTitle: installment.projectTitle || 'Projeto',
          installmentNumber: installment.installmentNumber,
          totalInstallments: installment.totalInstallments,
          description: boletoDescription || installment.description || 'Honorários',
          amount: boletoAmount || installment.amount,
          dueDate: boletoDueDate || installment.dueDate,
          linhaDigitavel: linha,
          bankName: currentBank.fullName,
          agency: effectiveAgency,
          accountNumber: effectiveAccountNumber,
          beneficiaryName: traditionalBoletoData?.beneficiario,
          beneficiaryDoc: traditionalBoletoData?.beneficiarioDoc,
          pixKey: architectProfile?.pixKey,
          architectName: officeName,
        });
      }
      setCustomMessage(msg);
    }
  }, [
    installment,
    traditionalBoletoData,
    currentBank,
    effectiveAgency,
    effectiveAccountNumber,
    architectProfile,
    profile,
    user,
    officeSettings,
    payerName,
    boletoAmount,
    boletoDueDate,
    boletoDescription,
  ]);

  if (!isOpen || !installment) return null;

  // Generate Official Boleto via Mercado Pago API
  const handleGenerateMercadoPagoBoleto = async () => {
    if (!payerDoc.trim()) {
      setMpError('Por exigência do Banco Central e FEBRABAN, o CPF ou CNPJ do pagador é obrigatório.');
      return;
    }
    if (!payerEmail.trim()) {
      setMpError('O e-mail do cliente é obrigatório para emissão do boleto registrado.');
      return;
    }

    try {
      setIsGeneratingMP(true);
      setMpError('');
      setMpSuccess('');

      const customAccessToken = officeSettings?.mercadopagoConfig?.accessToken;

      const rawDoc = payerDoc.replace(/\D/g, '');
      let rawZip = payerZip.replace(/\D/g, '');
      if (rawZip.length > 0 && rawZip.length < 8) {
        rawZip = rawZip.padEnd(8, '0');
      }

      const cleanState = (payerState || 'RJ').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);

      const response = await createMercadoPagoBoleto({
        amount: boletoAmount || installment.amount,
        description: boletoDescription || `Honorários: ${installment.projectTitle} - Parcela ${installment.installmentNumber}/${installment.totalInstallments}`,
        dueDate: boletoDueDate || installment.dueDate,
        payer: {
          name: payerName.trim() || installment.clientName,
          email: payerEmail.trim(),
          docType: rawDoc.length > 11 ? 'CNPJ' : 'CPF',
          docNumber: rawDoc,
          address: {
            zipCode: rawZip || '01310100',
            street: payerStreet.trim() || 'Avenida Principal',
            number: payerNumber.trim() || '100',
            neighborhood: payerNeighborhood.trim() || 'Centro',
            city: payerCity.trim() || 'Rio de Janeiro',
            state: cleanState || 'RJ',
          },
        },
        externalReference: `inst-${installment.id}`,
        metadata: {
          installmentId: installment.id,
          projectId: installment.projectId,
          projectTitle: installment.projectTitle,
          clientName: installment.clientName,
          installmentNumber: installment.installmentNumber,
        },
        customAccessToken,
      });

      // Update Installment state and database
      const updates: Partial<ProjectInstallment> = {
        boletoBarcode: response.digitable_line || response.barcode_raw,
        boletoBarcodeRaw: response.barcode_raw,
        boletoExternalUrl: response.external_resource_url || response.pdf_url,
        boletoPaymentId: response.id,
        boletoProvider: 'mercadopago',
        boletoStatus: 'pending',
        boletoBank: 'Mercado Pago (Santander/Bradesco)',
        boletoGeneratedAt: new Date().toISOString(),
        clientDocument: payerDoc,
        clientEmail: payerEmail,
        clientAddress: {
          zipCode: payerZip,
          street: payerStreet,
          number: payerNumber,
          neighborhood: payerNeighborhood,
          city: payerCity,
          state: payerState,
        },
      };

      // Immediately reflect generated boleto data in local modal state
      setLocalInstallment((prev) => (prev ? { ...prev, ...updates } : ({ ...installment, ...updates } as ProjectInstallment)));

      if (onUpdateInstallment) {
        onUpdateInstallment(installment.id, updates);
      } else {
        updateProjectInstallment(installment.id, updates);
      }

      setMpSuccess('Boleto registrado com sucesso na FEBRABAN via Mercado Pago!');
      // Switch to preview tab so user can immediately view and print the boleto
      setActiveTab('preview');
      setTimeout(() => setMpSuccess(''), 6000);
    } catch (err: any) {
      console.error('Error generating Mercado Pago Boleto:', err);
      setMpError(err.message || 'Erro ao emitir boleto no Mercado Pago.');
    } finally {
      setIsGeneratingMP(false);
    }
  };

  // Sync / Verify payment status in real time
  const handleCheckPaymentStatus = async () => {
    const paymentId = activeInstallment?.boletoPaymentId;
    if (!paymentId) {
      setSyncStatusResult('Nenhum ID de pagamento do Mercado Pago associado a esta parcela.');
      return;
    }

    try {
      setIsCheckingStatus(true);
      setSyncStatusResult('');
      const customToken = officeSettings?.mercadopagoConfig?.accessToken;
      const statusData = await fetchMercadoPagoPaymentStatus(paymentId, customToken);

      if (statusData.status === 'approved') {
        const defaultAcc = bankAccounts.find((a) => a.isDefault)?.id || bankAccounts[0]?.id || 'acc-main';
        receiveInstallmentPayment(
          activeInstallment.id,
          activeInstallment.bankAccountId || defaultAcc,
          statusData.date_approved ? statusData.date_approved.split('T')[0] : new Date().toISOString().split('T')[0],
          statusData.transaction_amount || activeInstallment.amount
        );

        const paidUpdates: Partial<ProjectInstallment> = {
          status: 'paid',
          boletoStatus: 'approved',
          paidDate: new Date().toISOString().split('T')[0],
        };

        setLocalInstallment((prev) => (prev ? { ...prev, ...paidUpdates } : null));

        if (onUpdateInstallment) {
          onUpdateInstallment(activeInstallment.id, paidUpdates);
        }

        setSyncStatusResult('🎉 Pagamento Confirmado! Parcela baixada e saldo atualizado no sistema!');
      } else if (statusData.status === 'pending' || statusData.status === 'in_process') {
        setSyncStatusResult('⏳ Boleto registrado e aguardando compensação bancária pelo cliente.');
      } else {
        setSyncStatusResult(`Status retornado pelo Mercado Pago: ${statusData.status} (${statusData.status_detail})`);
      }
    } catch (err: any) {
      setSyncStatusResult(err.message || 'Erro ao consultar status no Mercado Pago.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Send Boleto via Email API
  const handleSendEmail = async () => {
    if (!activeInstallment) return;
    const targetEmail = payerEmail.trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setEmailError('Por favor informe um e-mail válido para o cliente.');
      return;
    }

    try {
      setIsSendingEmail(true);
      setEmailError('');
      setEmailSuccess('');

      const res = await fetch('/api/send-boleto-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: targetEmail,
          clientName: payerName.trim() || activeInstallment.clientName,
          projectTitle: activeInstallment.projectTitle,
          installmentNumber: activeInstallment.installmentNumber,
          totalInstallments: activeInstallment.totalInstallments,
          amount: boletoAmount || activeInstallment.amount,
          dueDate: boletoDueDate || activeInstallment.dueDate,
          linhaDigitavel: activeInstallment.boletoBarcode || traditionalBoletoData?.linhaDigitavel,
          boletoUrl: activeInstallment.boletoExternalUrl,
          officeName: officeSettings?.officeName || architectProfile?.officeName || architectProfile?.name || 'Meu Escritório Online',
          officeEmail: officeSettings?.contactEmail || architectProfile?.email || user?.email,
          customNote: customNotes || boletoDescription,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar e-mail.');
      }

      setEmailSuccess(data.message || `E-mail enviado com sucesso para ${targetEmail}!`);
      setTimeout(() => setEmailSuccess(''), 6000);
    } catch (err: any) {
      setEmailError(err.message || 'Erro ao enviar e-mail.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Open native mail app fallback
  const handleOpenMailClient = () => {
    if (!activeInstallment) return;
    const subject = encodeURIComponent(
      `Boleto Bancário: Parcela ${activeInstallment.installmentNumber}/${activeInstallment.totalInstallments} - ${activeInstallment.projectTitle}`
    );
    const body = encodeURIComponent(
      `Olá ${payerName || activeInstallment.clientName},\n\n` +
      `Segue o boleto bancário referente ao projeto ${activeInstallment.projectTitle}:\n\n` +
      `• Parcela: ${activeInstallment.installmentNumber}/${activeInstallment.totalInstallments}\n` +
      `• Valor: ${formatCurrency(boletoAmount || activeInstallment.amount)}\n` +
      `• Vencimento: ${formatDate(boletoDueDate || activeInstallment.dueDate)}\n\n` +
      (activeInstallment.boletoBarcode ? `Linha Digitável:\n${activeInstallment.boletoBarcode}\n\n` : '') +
      (activeInstallment.boletoExternalUrl ? `Link do Boleto em PDF:\n${activeInstallment.boletoExternalUrl}\n\n` : '') +
      `Atenciosamente,\n${officeSettings?.officeName || architectProfile?.name || 'Meu Escritório'}`
    );
    window.open(`mailto:${payerEmail}?subject=${subject}&body=${body}`, '_blank');
  };

  // Save traditional slip data to installment
  const handleSaveTraditionalToInstallment = () => {
    if (!activeInstallment) return;
    if (traditionalBoletoData) {
      const updates: Partial<ProjectInstallment> = {
        boletoBarcode: traditionalBoletoData.linhaDigitavel,
        boletoBarcodeRaw: traditionalBoletoData.barcodeRaw,
        boletoOurNumber: traditionalBoletoData.nossoNumero,
        boletoBank: effectiveBankCode,
        boletoBankAccountId: selectedAccountId || undefined,
        bankAccountId: selectedAccountId || activeInstallment.bankAccountId,
        boletoGeneratedAt: new Date().toISOString(),
        clientDocument: clientDocument || payerDoc || undefined,
        boletoProvider: 'simulated',
      };

      setLocalInstallment((prev) => (prev ? { ...prev, ...updates } : null));

      if (onUpdateInstallment) {
        onUpdateInstallment(activeInstallment.id, updates);
      } else {
        updateProjectInstallment(activeInstallment.id, updates);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleCopyLinha = async (codeToCopy?: string) => {
    const text = codeToCopy || activeInstallment?.boletoBarcode || traditionalBoletoData?.linhaDigitavel || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLinha(true);
      setTimeout(() => setCopiedLinha(false), 2500);
    } catch {}
  };

  const handleCopyPdfUrl = async () => {
    if (!activeInstallment?.boletoExternalUrl) return;
    try {
      await navigator.clipboard.writeText(activeInstallment.boletoExternalUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {}
  };

  const handleCopyPix = async () => {
    const pix = architectProfile?.pixKey || 'contato@meuescritorio.online';
    try {
      await navigator.clipboard.writeText(pix);
      setCopiedPix(true);
      setTimeout(() => setCopiedPix(false), 2500);
    } catch {}
  };

  const handleSendWhatsApp = () => {
    const rawPhone = (payerPhone || activeInstallment?.clientPhone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
    const encodedMsg = encodeURIComponent(customMessage);
    const url = rawPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;
    window.open(url, '_blank');
  };

  // Robust print method that ensures the preview tab and ID are active
  const handlePrint = () => {
    if (activeTab === 'traditional') {
      handleSaveTraditionalToInstallment();
    }
    if (activeTab !== 'preview') {
      setActiveTab('preview');
      setTimeout(() => {
        window.print();
      }, 250);
      return;
    }
    window.print();
  };

  // Dedicated Popup Window Print helper for zero iframe blank page issues
  const handlePrintDedicatedWindow = () => {
    if (activeTab === 'traditional') {
      handleSaveTraditionalToInstallment();
    }

    const printEl = document.getElementById('printable-boleto');
    if (!printEl) {
      handlePrint();
      return;
    }

    try {
      const printWindow = window.open('', '_blank', 'width=920,height=960');
      if (!printWindow) {
        window.print();
        return;
      }

      printWindow.document.open();
      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <title>Boleto Bancário - ${activeInstallment?.projectTitle || 'Cobrança'}</title>
          <style>
            @page { size: A4 portrait; margin: 10mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              background-color: #ffffff;
              color: #000000;
              padding: 20px;
              margin: 0 auto;
              max-width: 800px;
            }
            .border-black { border-color: #000 !important; }
            .bg-black { background-color: #000 !important; color: #fff !important; }
            .bg-gray-50 { background-color: #f9fafb !important; }
            .bg-gray-100 { background-color: #f3f4f6 !important; }
            .text-gray-900 { color: #111827 !important; }
            .text-gray-700 { color: #374151 !important; }
            .text-gray-600 { color: #4b5563 !important; }
            .text-gray-500 { color: #6b7280 !important; }
            .text-emerald-700 { color: #047857 !important; }
            .text-rose-700 { color: #be123c !important; }
            .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
            .col-span-3 { grid-column: span 3 / span 3; }
            .flex { display: flex; }
            .items-center { align-items: center; }
            .items-end { align-items: flex-end; }
            .justify-between { justify-content: space-between; }
            .gap-1 { gap: 4px; }
            .gap-2 { gap: 8px; }
            .gap-4 { gap: 16px; }
            .p-1\\.5 { padding: 6px; }
            .p-2 { padding: 8px; }
            .p-4 { padding: 16px; }
            .p-6 { padding: 24px; }
            .pb-2 { padding-bottom: 8px; }
            .pb-4 { padding-bottom: 16px; }
            .pt-1 { padding-top: 4px; }
            .pt-2 { padding-top: 8px; }
            .mb-0\\.5 { margin-bottom: 2px; }
            .mb-1 { margin-bottom: 4px; }
            .mb-2 { margin-bottom: 8px; }
            .mb-3 { margin-bottom: 12px; }
            .mb-4 { margin-bottom: 16px; }
            .mt-0\\.5 { margin-top: 2px; }
            .mt-1 { margin-top: 4px; }
            .ml-2 { margin-left: 8px; }
            .border { border: 1px solid #000; }
            .border-gray-300 { border-color: #d1d5db !important; }
            .border-gray-400 { border-color: #9ca3af !important; }
            .border-b { border-bottom: 1px solid #000; }
            .border-b-2 { border-bottom: 2px solid #000; }
            .border-r { border-right: 1px solid #000; }
            .border-t { border-top: 1px solid #000; }
            .border-dashed { border-style: dashed; }
            .rounded { border-radius: 4px; }
            .rounded-lg { border-radius: 8px; }
            .rounded-xl { border-radius: 12px; }
            .text-xs { font-size: 12px; }
            .text-sm { font-size: 14px; }
            .text-\\[9px\\] { font-size: 9px; }
            .text-\\[10px\\] { font-size: 10px; }
            .text-\\[11px\\] { font-size: 11px; }
            .font-medium { font-weight: 500; }
            .font-bold { font-weight: 700; }
            .font-extrabold { font-weight: 800; }
            .font-black { font-weight: 900; }
            .uppercase { text-transform: uppercase; }
            .tracking-widest { letter-spacing: 0.1em; }
            .tracking-tight { letter-spacing: -0.025em; }
            .leading-relaxed { line-height: 1.625; }
            .h-14 { height: 56px; }
            .w-8 { width: 32px; }
            .h-8 { height: 32px; }
            .w-10 { width: 40px; }
            .h-10 { height: 40px; }
            .w-12 { width: 48px; }
            .h-12 { height: 48px; }
            .w-full { width: 100%; }
            .max-w-md { max-width: 448px; }
            .block { display: block; }
            .inline-block { display: inline-block; }
            .shrink-0 { flex-shrink: 0; }
          </style>
        </head>
        <body>
          ${printEl.outerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 300);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.warn('Dedicated print window failed, using fallback:', err);
      window.print();
    }
  };

  // Barcode pattern for traditional display
  const barcodePattern = [
    2, 1, 2, 2, 1, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 1, 2, 3, 1, 2,
    1, 2, 2, 1, 3, 1, 1, 2, 2, 3, 1, 1, 2, 1, 2, 3, 1, 2, 1, 1,
    2, 2, 1, 3, 1, 2, 1, 2, 3, 1, 1, 2, 2, 1, 3, 1, 2, 1, 2, 2,
    1, 3, 1, 1, 2, 2, 3, 1, 1, 2, 1, 2, 3, 1, 2, 1, 1, 2, 2, 1,
  ];

  const hasGeneratedMP = Boolean(activeInstallment?.boletoExternalUrl || activeInstallment?.boletoPaymentId);
  const activeLinhaDigitavel = activeInstallment?.boletoBarcode || traditionalBoletoData?.linhaDigitavel || '';

  if (!installment || !activeInstallment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#1a1614] border border-[#3d342f] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[94vh] my-auto">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#14110f] border-b border-[#3d342f] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Barcode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#fcf8f5]">
                  Emissão de Boleto Bancário
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Parcela {activeInstallment.installmentNumber}/{activeInstallment.totalInstallments}
                </span>
                {activeInstallment.status === 'paid' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Pago
                  </span>
                )}
              </div>
              <p className="text-xs text-[#a89c93] mt-0.5">
                {activeInstallment.projectTitle} • Cliente: <strong className="text-[#fcf8f5]">{payerName || activeInstallment.clientName}</strong> • Valor: <strong className="text-emerald-400">{formatCurrency(boletoAmount || activeInstallment.amount)}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#241e1b] rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#1e1916] border-b border-[#3d342f] flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('mercadopago')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'mercadopago'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-[#14110f] text-[#a89c93] hover:text-[#fcf8f5] border border-[#3d342f]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Boleto Mercado Pago (Registrado)</span>
            </button>

            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-[#14110f] text-[#a89c93] hover:text-[#fcf8f5] border border-[#3d342f]'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Visualizar & Imprimir</span>
            </button>

            <button
              onClick={() => setActiveTab('send')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'send'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-[#14110f] text-[#a89c93] hover:text-[#fcf8f5] border border-[#3d342f]'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Enviar ao Cliente (WhatsApp & E-mail)</span>
            </button>

            <button
              onClick={() => setActiveTab('traditional')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'traditional'
                  ? 'bg-[#c58a4b] text-black shadow-md'
                  : 'bg-[#14110f] text-[#a89c93] hover:text-[#fcf8f5] border border-[#3d342f]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Carnê Tradicional</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setActiveTab('preview');
                setTimeout(() => window.print(), 200);
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#14110f] hover:bg-[#241e1b] text-[#fcf8f5] border border-[#3d342f] flex items-center gap-1.5 transition-all cursor-pointer"
              title="Imprimir boleto"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              onClick={() => setActiveTab('send')}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>E-mail</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* TAB 1: MERCADO PAGO OFFICIAL BOLETO */}
          {activeTab === 'mercadopago' && (
            <div className="space-y-5">
              {/* Feedback messages */}
              {mpSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{mpSuccess}</span>
                </div>
              )}

              {mpError && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{mpError}</span>
                </div>
              )}

              {syncStatusResult && (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />
                    <span>{syncStatusResult}</span>
                  </div>
                  <button
                    onClick={() => setSyncStatusResult('')}
                    className="text-xs text-blue-400 hover:underline cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* If Boleto is Already Generated */}
              {hasGeneratedMP && (
                <div className="p-5 rounded-2xl bg-[#12100e] border-2 border-emerald-500/40 space-y-4 shadow-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#302722] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-[#fcf8f5]">
                            Boleto Registrado & Válido no Mercado Pago
                          </h4>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            {installment.status === 'paid' ? 'Pago & Liquidado' : 'Registrado na FEBRABAN'}
                          </span>
                        </div>
                        <p className="text-xs text-[#a89c93] mt-0.5">
                          ID: <code className="text-[#fcf8f5] font-mono">{installment.boletoPaymentId || 'N/A'}</code> • Aceito em qualquer banco, lotérica ou internet banking
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCheckPaymentStatus}
                        disabled={isCheckingStatus}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#1e1916] hover:bg-[#28221e] text-[#fcf8f5] border border-[#3d342f] flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Verifica se o cliente já realizou o pagamento"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-[#c58a4b] ${isCheckingStatus ? 'animate-spin' : ''}`} />
                        <span>{isCheckingStatus ? 'Verificando...' : 'Sincronizar Pagamento'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Linha Digitável Box */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#a89c93] uppercase tracking-wider block">
                      Linha Digitável Oficial (Código de Barras):
                    </label>
                    <div className="flex items-center gap-2 p-3 bg-[#1c1815] border border-[#3d342f] rounded-xl">
                      <code className="text-xs sm:text-sm text-emerald-300 font-mono font-bold select-all flex-1 break-all">
                        {installment.boletoBarcode}
                      </code>
                      <button
                        onClick={() => handleCopyLinha(installment.boletoBarcode)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                          copiedLinha
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#241e1b] hover:bg-[#2d2520] text-[#fcf8f5] border border-[#3d342f]'
                        }`}
                      >
                        {copiedLinha ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-[#c58a4b]" />}
                        <span>{copiedLinha ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2">
                    {/* View and Print Visualizer */}
                    <button
                      onClick={() => setActiveTab('preview')}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>Visualizar e Imprimir Boleto</span>
                    </button>

                    {/* Open External MP PDF */}
                    {installment.boletoExternalUrl && (
                      <a
                        href={installment.boletoExternalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Abrir PDF Oficial Mercado Pago</span>
                      </a>
                    )}

                    {installment.boletoExternalUrl && (
                      <button
                        onClick={handleCopyPdfUrl}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#1c1815] hover:bg-[#241e1b] text-[#fcf8f5] border border-[#3d342f] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#c58a4b]" />
                        <span>{copiedUrl ? 'Link Copiado!' : 'Copiar Link do PDF'}</span>
                      </button>
                    )}

                    <button
                      onClick={handleSendWhatsApp}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      onClick={() => setActiveTab('send')}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Enviar por E-mail</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Form to Issue or Re-issue Official Boleto */}
              <div className="p-5 rounded-2xl bg-[#14110f] border border-[#3d342f] space-y-4">
                <div className="flex items-center justify-between border-b border-[#302722] pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h4 className="font-serif font-bold text-[#fcf8f5] text-sm">
                      {hasGeneratedMP ? 'Reemitir / Atualizar Boleto Mercado Pago' : 'Dados para Emissão de Boleto Registrado'}
                    </h4>
                  </div>

                  {/* Customer Auto-fill Badge */}
                  {matchedClient ? (
                    <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg">
                      <span className="text-[11px] text-amber-300 font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        Cadastro de: <strong>{matchedClient.name}</strong>
                      </span>
                      <button
                        onClick={() => applyClientData(matchedClient)}
                        className="text-[10px] text-amber-400 hover:underline font-bold cursor-pointer"
                        title="Recarregar dados do cliente do cadastro"
                      >
                        Recarregar
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-[#a89c93]">
                      Normas FEBRABAN: CPF/CNPJ e Endereço obrigatórios
                    </span>
                  )}
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {/* Nome Completo / Razão Social */}
                  <div>
                    <label className="text-[11px] font-medium text-[#a89c93] block mb-1">
                      Nome Completo / Razão Social *
                    </label>
                    <input
                      type="text"
                      value={payerName}
                      onChange={(e) => setPayerName(e.target.value)}
                      placeholder="Nome do cliente sacado"
                      className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* CPF / CNPJ */}
                  <div>
                    <label className="text-[11px] font-medium text-[#a89c93] block mb-1">
                      CPF ou CNPJ (Obrigatório) *
                    </label>
                    <input
                      type="text"
                      value={payerDoc}
                      onChange={(e) => setPayerDoc(e.target.value)}
                      placeholder="000.000.000-00 ou 00.000.000/0001-00"
                      className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>

                  {/* E-mail */}
                  <div>
                    <label className="text-[11px] font-medium text-[#a89c93] block mb-1">
                      E-mail do Cliente (Cadastrado) *
                    </label>
                    <input
                      type="email"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Telefone / WhatsApp */}
                  <div>
                    <label className="text-[11px] font-medium text-[#a89c93] block mb-1">
                      Telefone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={payerPhone}
                      onChange={(e) => setPayerPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Valor do Boleto */}
                  <div>
                    <label className="text-[11px] font-medium text-[#a89c93] block mb-1">
                      Valor da Cobrança (R$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={boletoAmount || ''}
                      onChange={(e) => setBoletoAmount(Number(e.target.value))}
                      placeholder="0.00"
                      className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-emerald-400 font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  {/* Data de Vencimento */}
                  <div>
                    <label className="text-[11px] font-medium text-[#a89c93] block mb-1">
                      Data de Vencimento *
                    </label>
                    <input
                      type="date"
                      value={boletoDueDate}
                      onChange={(e) => setBoletoDueDate(e.target.value)}
                      className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Endereço do Sacado (FEBRABAN requirement) */}
                <div className="pt-2 border-t border-[#302722]/60">
                  <span className="text-[11px] font-bold text-amber-400/90 flex items-center gap-1 mb-2.5">
                    <MapPin className="w-3.5 h-3.5" />
                    Endereço do Sacado (Preenchimento Rápido com CEP)
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {/* CEP */}
                    <div className="sm:col-span-1">
                      <label className="text-[10px] text-[#a89c93] block mb-1">
                        CEP (Auto-busca)
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={payerZip}
                          onChange={(e) => handleCepLookup(e.target.value)}
                          placeholder="00000-000"
                          className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-amber-500 font-mono"
                        />
                        {isSearchingCep && (
                          <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin absolute right-2.5 top-2.5" />
                        )}
                      </div>
                    </div>

                    {/* Rua */}
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-[#a89c93] block mb-1">Logradouro / Rua</label>
                      <input
                        type="text"
                        value={payerStreet}
                        onChange={(e) => setPayerStreet(e.target.value)}
                        placeholder="Rua, Avenida, etc."
                        className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Número */}
                    <div className="sm:col-span-1">
                      <label className="text-[10px] text-[#a89c93] block mb-1">Número</label>
                      <input
                        type="text"
                        value={payerNumber}
                        onChange={(e) => setPayerNumber(e.target.value)}
                        placeholder="123"
                        className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Bairro */}
                    <div className="sm:col-span-1">
                      <label className="text-[10px] text-[#a89c93] block mb-1">Bairro</label>
                      <input
                        type="text"
                        value={payerNeighborhood}
                        onChange={(e) => setPayerNeighborhood(e.target.value)}
                        placeholder="Bairro"
                        className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Cidade e UF */}
                    <div className="sm:col-span-1 flex gap-1.5">
                      <div className="flex-1">
                        <label className="text-[10px] text-[#a89c93] block mb-1">Cidade</label>
                        <input
                          type="text"
                          value={payerCity}
                          onChange={(e) => setPayerCity(e.target.value)}
                          placeholder="Cidade"
                          className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-2.5 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="w-14">
                        <label className="text-[10px] text-[#a89c93] block mb-1">UF</label>
                        <input
                          type="text"
                          maxLength={2}
                          value={payerState}
                          onChange={(e) => setPayerState(e.target.value.toUpperCase())}
                          placeholder="SP"
                          className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-2 py-2 text-xs text-[#fcf8f5] text-center focus:outline-none focus:border-amber-500 font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Descrição */}
                <div>
                  <label className="text-[11px] font-medium text-[#a89c93] block mb-1">
                    Descrição do Serviço / Honorários
                  </label>
                  <input
                    type="text"
                    value={boletoDescription}
                    onChange={(e) => setBoletoDescription(e.target.value)}
                    placeholder="Honorários e Serviços Prestados"
                    className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl px-3 py-2 text-xs text-[#fcf8f5] focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Submit Button */}
                <div className="pt-2 flex items-center justify-between flex-wrap gap-3">
                  <span className="text-[11px] text-[#a89c93]">
                    O Mercado Pago registrará o boleto no sistema bancário central da FEBRABAN.
                  </span>

                  <button
                    onClick={handleGenerateMercadoPagoBoleto}
                    disabled={isGeneratingMP}
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isGeneratingMP ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Emitindo Boleto Registrado...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 fill-current" />
                        <span>{hasGeneratedMP ? 'Reemitir Boleto Mercado Pago' : '⚡ Emitir Boleto Oficial Mercado Pago'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: FULL PREVIEW & PRINT VISUALIZER (FEBRABAN STANDARD) */}
          {activeTab === 'preview' && (
            <div className="space-y-4">
              {/* Preview Control Header */}
              <div className="p-4 bg-[#14110f] border border-[#3d342f] rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Printer className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#fcf8f5]">Visualizador de Boleto Bancário</h4>
                    <p className="text-[11px] text-[#a89c93]">Layout compatível com impressão A4 e compensação bancária FEBRABAN</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                    title="Imprime diretamente esta página formatada para A4"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir Boleto (A4)</span>
                  </button>

                  <button
                    onClick={handlePrintDedicatedWindow}
                    className="px-3.5 py-2 bg-[#241e1b] hover:bg-[#2d2622] text-[#fcf8f5] border border-[#3d342f] font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                    title="Abre o boleto em janela limpa dedicada para impressão perfeita"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                    <span>Imprimir em Nova Janela</span>
                  </button>

                  {activeInstallment.boletoExternalUrl && (
                    <a
                      href={activeInstallment.boletoExternalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>PDF Oficial MP</span>
                    </a>
                  )}

                  <button
                    onClick={handleSendWhatsApp}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Printable Standard Boleto Slip */}
              <div
                id="printable-boleto"
                ref={printRef}
                className="bg-white text-black p-4 sm:p-6 rounded-xl border border-gray-300 shadow-xl print:shadow-none print:border-none print:m-0 print:p-0 print:rounded-none max-w-3xl mx-auto font-sans"
              >
                {/* 1. RECIBO DO PAGADOR */}
                <div className="border-b-2 border-dashed border-gray-400 pb-4 mb-4">
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-amber-500 text-black font-black text-xs flex items-center justify-center rounded">
                        MP
                      </div>
                      <span className="font-bold text-sm text-gray-900">
                        {activeInstallment.boletoProvider === 'mercadopago' ? 'Mercado Pago / Santander / Bradesco' : currentBank.fullName}
                      </span>
                    </div>
                    <div className="font-mono font-bold text-xs bg-gray-100 px-2 py-1 border border-gray-400">
                      {activeInstallment.boletoProvider === 'mercadopago' ? '033-7' : `${currentBank.code}-${currentBank.digit}`}
                    </div>
                    <div className="text-[11px] font-bold text-gray-700 uppercase">
                      Recibo do Pagador
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] border border-gray-300 p-2 bg-gray-50/50 mb-2">
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-bold">Beneficiário</span>
                      <strong className="text-gray-900 block truncate">
                        {officeSettings?.officeName || architectProfile?.officeName || architectProfile?.name || 'Meu Escritório'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-bold">CPF/CNPJ Beneficiário</span>
                      <span className="font-mono text-gray-800 block">
                        {architectProfile?.cpfCnpj || '00.000.000/0001-00'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-bold">Vencimento</span>
                      <strong className="text-rose-700 font-bold block">
                        {formatDate(boletoDueDate || activeInstallment.dueDate)}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-gray-500 block uppercase font-bold">Valor Cobrado</span>
                      <strong className="text-emerald-700 font-extrabold text-xs block">
                        {formatCurrency(boletoAmount || activeInstallment.amount)}
                      </strong>
                    </div>
                  </div>

                  <div className="text-[10px] text-gray-600 border border-gray-300 p-2">
                    <span className="text-[9px] text-gray-500 uppercase font-bold block mb-0.5">Pagador (Sacado)</span>
                    <strong className="text-gray-900">{payerName || activeInstallment.clientName}</strong>
                    {payerDoc && <span className="font-mono text-gray-700 ml-2">({payerDoc})</span>}
                    {(payerStreet || payerCity) && (
                      <div className="text-gray-600 text-[9px] mt-0.5">
                        {payerStreet} {payerNumber && `, Nº ${payerNumber}`} {payerNeighborhood && `- ${payerNeighborhood}`} • {payerCity}/{payerState} {payerZip && `• CEP: ${payerZip}`}
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. FICHA DE COMPENSAÇÃO (FEBRABAN) */}
                <div>
                  {/* Bank header and Linha Digitavel */}
                  <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-black text-white font-black text-xs flex items-center justify-center rounded">
                        {activeInstallment.boletoProvider === 'mercadopago' ? 'MP' : currentBank.code}
                      </div>
                      <span className="font-bold text-sm text-gray-900">
                        {activeInstallment.boletoProvider === 'mercadopago' ? 'Mercado Pago' : currentBank.fullName}
                      </span>
                    </div>
                    <div className="font-mono font-bold text-sm bg-gray-100 px-2 py-0.5 border border-gray-400">
                      {activeInstallment.boletoProvider === 'mercadopago' ? '033-7' : `${currentBank.code}-${currentBank.digit}`}
                    </div>
                    <div className="font-mono text-xs sm:text-sm font-bold text-gray-900 tracking-tight">
                      {activeLinhaDigitavel || '00000.00000 00000.000000 00000.000000 0 00000000000000'}
                    </div>
                  </div>

                  {/* Boleto Grid */}
                  <div className="border border-black text-[11px] mb-3">
                    <div className="grid grid-cols-4 border-b border-black">
                      <div className="col-span-3 border-r border-black p-1.5">
                        <span className="text-[9px] text-gray-500 uppercase font-bold block">Local de Pagamento</span>
                        <span className="text-gray-900 font-medium">Pagável em qualquer agência bancária, internet banking ou casas lotéricas até o vencimento.</span>
                      </div>
                      <div className="p-1.5 bg-gray-50">
                        <span className="text-[9px] text-gray-500 uppercase font-bold block">Vencimento</span>
                        <strong className="text-gray-900 font-bold text-xs">{formatDate(boletoDueDate || activeInstallment.dueDate)}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 border-b border-black">
                      <div className="col-span-3 border-r border-black p-1.5">
                        <span className="text-[9px] text-gray-500 uppercase font-bold block">Beneficiário</span>
                        <strong className="text-gray-900">{officeSettings?.officeName || architectProfile?.officeName || architectProfile?.name || 'Meu Escritório'}</strong>
                        <span className="text-gray-600 font-mono text-[10px] ml-2">CNPJ/CPF: {architectProfile?.cpfCnpj || '00.000.000/0001-00'}</span>
                      </div>
                      <div className="p-1.5 bg-gray-50">
                        <span className="text-[9px] text-gray-500 uppercase font-bold block">Agência / Código Beneficiário</span>
                        <span className="font-mono text-gray-800">{traditionalBoletoData?.agenciaCodigo || '0001 / 12345-6'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 border-b border-black">
                      <div className="border-r border-black p-1.5">
                        <span className="text-[9px] text-gray-500 uppercase font-bold block">Data do Documento</span>
                        <span>{traditionalBoletoData?.dataDocumento || new Date().toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="border-r border-black p-1.5">
                        <span className="text-[9px] text-gray-500 uppercase font-bold block">Número do Documento</span>
                        <span className="font-mono">{traditionalBoletoData?.documentoNumero || `PARC-${activeInstallment.installmentNumber}`}</span>
                      </div>
                      <div className="border-r border-black p-1.5">
                        <span className="text-[9px] text-gray-500 uppercase font-bold block">Espécie Doc.</span>
                        <span>DM (Duplicata Mercantil)</span>
                      </div>
                      <div className="p-1.5 bg-gray-50">
                        <span className="text-[9px] text-gray-500 uppercase font-bold block">(=) Valor do Documento</span>
                        <strong className="text-gray-900 text-xs font-bold">{formatCurrency(boletoAmount || activeInstallment.amount)}</strong>
                      </div>
                    </div>

                    <div className="grid grid-cols-4">
                      <div className="col-span-3 border-r border-black p-2 min-h-[90px]">
                        <span className="text-[9px] text-gray-500 uppercase font-bold block mb-1">
                          Instruções (Texto de Responsabilidade do Beneficiário)
                        </span>
                        <p className="text-[10px] text-gray-700 leading-relaxed">
                          • {customInstructions}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-1">
                          • Referente a: {boletoDescription || activeInstallment.projectTitle}
                        </p>
                      </div>
                      <div className="p-1.5 bg-gray-50 space-y-2">
                        <div>
                          <span className="text-[9px] text-gray-500 uppercase font-bold block">(-) Desconto / Abatimento</span>
                          <span className="text-gray-600 font-mono text-[10px]">R$ 0,00</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-gray-500 uppercase font-bold block">(+) Mora / Multa</span>
                          <span className="text-gray-600 font-mono text-[10px]">R$ 0,00</span>
                        </div>
                        <div className="border-t border-gray-300 pt-1">
                          <span className="text-[9px] text-gray-500 uppercase font-bold block">(=) Valor Cobrado</span>
                          <strong className="text-gray-900 font-extrabold text-xs">{formatCurrency(boletoAmount || activeInstallment.amount)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Pagador Info */}
                    <div className="border-t border-black p-2 bg-gray-50/70">
                      <span className="text-[9px] text-gray-500 uppercase font-bold block mb-0.5">Pagador (Sacado)</span>
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[10px]">
                        <div>
                          <strong className="text-gray-900">{payerName || activeInstallment.clientName}</strong>
                          {payerDoc && <span className="font-mono text-gray-700 ml-2">CPF/CNPJ: {payerDoc}</span>}
                        </div>
                        {payerPhone && <span className="text-gray-600">Tel: {payerPhone}</span>}
                      </div>
                      {(payerStreet || payerCity) && (
                        <div className="text-gray-600 text-[9px] mt-0.5">
                          {payerStreet} {payerNumber && `, Nº ${payerNumber}`} {payerNeighborhood && `- ${payerNeighborhood}`} • {payerCity}/{payerState} {payerZip && `• CEP: ${payerZip}`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Graphic Barcode & Pix */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <div className="flex-1">
                      <div className="flex items-end h-14 w-full max-w-md bg-white overflow-hidden py-1">
                        {barcodePattern.map((width, idx) => (
                          <div
                            key={idx}
                            className="bg-black h-full"
                            style={{
                              width: `${width * 2}px`,
                              marginRight: `${idx % 3 === 0 ? 2 : 1.2}px`,
                            }}
                          />
                        ))}
                      </div>
                      <div className="font-mono text-[9px] tracking-widest text-gray-600 mt-1">
                        {traditionalBoletoData?.barcodeRaw || '2379105840000000100009876543217405912109'}
                      </div>
                    </div>

                    {showPixQr && (
                      <div className="flex items-center gap-2 p-2 bg-gray-50 border border-gray-300 rounded-lg shrink-0">
                        <div className="w-12 h-12 bg-white border border-gray-300 p-0.5 flex items-center justify-center shrink-0">
                          <QrCode className="w-10 h-10 text-black" />
                        </div>
                        <div className="text-left text-[9px]">
                          <span className="font-bold text-emerald-800 bg-emerald-100 px-1 py-0.5 rounded block mb-0.5">
                            BolePix Instantâneo
                          </span>
                          <span className="text-gray-600 truncate max-w-[120px] block">
                            {architectProfile?.pixKey || 'Chave Pix'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DISPATCH / SEND TO CLIENT (WHATSAPP & EMAIL) */}
          {activeTab === 'send' && (
            <div className="space-y-5">
              {/* WhatsApp Dispatch Section */}
              <div className="p-5 rounded-2xl bg-[#121c15] border border-emerald-600/30 space-y-4">
                <div className="flex items-center justify-between border-b border-emerald-600/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-300">Enviar Cobrança por WhatsApp</h4>
                      <p className="text-[11px] text-emerald-400/70">Disparo com 1 clique para o número do cliente</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-emerald-300 bg-emerald-950/60 px-2 py-1 rounded border border-emerald-500/30">
                      {payerPhone || installment.clientPhone || 'Sem telefone informado'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-emerald-300/90 block">
                    Mensagem Formatada (com link do PDF e linha digitável):
                  </label>
                  <textarea
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={6}
                    className="w-full bg-[#0a120d] border border-emerald-500/30 rounded-xl p-3 text-xs text-emerald-100 font-mono focus:outline-none focus:border-emerald-400 leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <span className="text-[11px] text-emerald-400/70">
                    O link do boleto e o código de barras já estão incluídos na mensagem.
                  </span>
                  <button
                    onClick={handleSendWhatsApp}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
                  >
                    <Send className="w-4 h-4" />
                    <span>Abrir WhatsApp e Enviar Cobrança</span>
                  </button>
                </div>
              </div>

              {/* Email Dispatch Section */}
              <div className="p-5 rounded-2xl bg-[#0f1722] border border-sky-600/30 space-y-4">
                <div className="flex items-center justify-between border-b border-sky-600/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-sky-300">Enviar Boleto por E-mail</h4>
                      <p className="text-[11px] text-sky-400/70">Envia para o e-mail cadastrado do cliente com layout profissional</p>
                    </div>
                  </div>

                  {matchedClient?.email && (
                    <span className="text-[11px] text-sky-300/80 bg-sky-950/60 px-2.5 py-1 rounded border border-sky-500/30">
                      Cadastrado: <strong>{matchedClient.email}</strong>
                    </span>
                  )}
                </div>

                {emailSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{emailSuccess}</span>
                  </div>
                )}

                {emailError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{emailError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-sky-300/90 block mb-1">
                      Destinatário (E-mail do Cliente) *
                    </label>
                    <input
                      type="email"
                      value={payerEmail}
                      onChange={(e) => setPayerEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className="w-full bg-[#09101a] border border-sky-500/30 rounded-xl px-3 py-2 text-xs text-sky-100 focus:outline-none focus:border-sky-400"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-sky-300/90 block mb-1">
                      Assunto do E-mail
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={`Boleto Bancário: Parcela ${installment.installmentNumber}/${installment.totalInstallments} - ${installment.projectTitle}`}
                      className="w-full bg-[#09101a] border border-sky-500/30 rounded-xl px-3 py-2 text-xs text-sky-300/80 font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#09101a] border border-sky-500/20 text-[11px] text-sky-200/80 space-y-1">
                  <span className="font-bold text-sky-300 block">Resumo do E-mail a ser enviado:</span>
                  <p>• <strong>Projeto:</strong> {installment.projectTitle}</p>
                  <p>• <strong>Valor:</strong> {formatCurrency(boletoAmount || installment.amount)} • <strong>Vencimento:</strong> {formatDate(boletoDueDate || installment.dueDate)}</p>
                  <p>• <strong>Botão de Ação:</strong> Visualizar e Imprimir Boleto Bancário (PDF)</p>
                  <p>• <strong>Linha Digitável:</strong> {activeLinhaDigitavel || 'Disponível no boleto'}</p>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
                  <button
                    onClick={handleOpenMailClient}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-[#141f2d] hover:bg-[#1a283b] text-sky-200 border border-sky-500/30 flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir no meu Aplicativo de E-mail</span>
                  </button>

                  <button
                    onClick={handleSendEmail}
                    disabled={isSendingEmail}
                    className="px-5 py-2.5 bg-sky-500 hover:bg-sky-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSendingEmail ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Enviando E-mail...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Disparar E-mail para o Cliente</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TRADITIONAL BOLETO SLIP & PRINT */}
          {activeTab === 'traditional' && traditionalBoletoData && (
            <div className="space-y-4">
              {savedSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Dados do boleto registrados com sucesso nesta parcela!</span>
                </div>
              )}

              {/* Control Bar: Bank Account Selector */}
              <div className="px-4 py-3 bg-[#1e1916] border border-[#3d342f] rounded-xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-[#a89c93] flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-[#c58a4b]" />
                    Conta Bancária:
                  </span>

                  <select
                    value={selectedAccountId}
                    onChange={(e) => {
                      const accId = e.target.value;
                      setSelectedAccountId(accId);
                      const found = bankAccounts.find((a) => a.id === accId);
                      if (found) {
                        const code = found.bankCode || getBankInfo(found.name).code;
                        setSelectedBankCode(code || '341');
                      }
                    }}
                    className="bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#c58a4b]"
                  >
                    {bankAccounts
                      .filter((a) => a.type !== 'physical_cash')
                      .map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} ({acc.bankCode || getBankInfo(acc.name).code}) • {acc.agency}/{acc.accountNumber}
                        </option>
                      ))}
                    <option value="">-- Configuração Manual de Banco --</option>
                  </select>

                  {!selectedAccountId && (
                    <select
                      value={selectedBankCode}
                      onChange={(e) => setSelectedBankCode(e.target.value)}
                      className="bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#c58a4b]"
                    >
                      {Object.values(POPULAR_BANKS).map((bank) => (
                        <option key={bank.code} value={bank.code}>
                          {bank.fullName} ({bank.code})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsManageAccountsOpen(true)}
                    className="text-xs text-[#c58a4b] hover:text-[#d4a373] hover:underline font-medium cursor-pointer"
                  >
                    Gerenciar Contas
                  </button>
                </div>
              </div>

              {/* Instructions and notes editor */}
              <div className="p-4 bg-[#14110f] border border-[#3d342f] rounded-xl space-y-3 text-xs">
                <span className="font-bold text-[#fcf8f5] block">Instruções Personalizadas do Boleto:</span>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  rows={2}
                  className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl p-2.5 text-xs text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#14110f] border-t border-[#3d342f] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#a89c93]">
            <Calendar className="w-4 h-4 text-[#c58a4b]" />
            <span>
              Vencimento: <strong className="text-[#fcf8f5]">{formatDate(boletoDueDate || installment.dueDate)}</strong> • Valor:{' '}
              <strong className="text-emerald-400 font-bold">{formatCurrency(boletoAmount || installment.amount)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#241e1b] transition-colors cursor-pointer"
            >
              Fechar
            </button>

            {/* Quick View and Print */}
            <button
              onClick={() => setActiveTab('preview')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Visualizar / Imprimir</span>
            </button>

            {/* Send to client */}
            <button
              onClick={() => setActiveTab('send')}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Enviar para o Cliente</span>
            </button>
          </div>
        </div>
      </div>

      <BankAccountsModal
        isOpen={isManageAccountsOpen}
        onClose={() => {
          setIsManageAccountsOpen(false);
          setEditingAccountId(null);
        }}
        initialEditingAccountId={editingAccountId}
      />
    </div>
  );
};
