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
import { ProjectInstallment } from '../../types';
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
    updateProjectInstallment,
    receiveInstallmentPayment,
  } = useFinance();

  // Mode: 'mercadopago' (Official FEBRABAN registered) vs 'traditional' (Local / Printable slip)
  const [activeTab, setActiveTab] = useState<'mercadopago' | 'traditional'>('mercadopago');

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

  // Auto-fill states on installment open
  useEffect(() => {
    if (installment && isOpen) {
      setPayerName(installment.clientName || '');
      setPayerEmail(installment.clientEmail || `${(installment.clientName || 'cliente').toLowerCase().replace(/\s+/g, '')}@email.com`);
      setPayerDoc(installment.clientDocument || '');
      setPayerPhone(installment.clientPhone || '');
      setBoletoAmount(installment.amount || 0);
      setBoletoDueDate(installment.dueDate || new Date().toISOString().split('T')[0]);
      setBoletoDescription(
        `Honorários: ${installment.projectTitle} - Parcela ${installment.installmentNumber}/${installment.totalInstallments} (${installment.description || 'Serviços'})`
      );

      if (installment.clientAddress) {
        setPayerZip(installment.clientAddress.zipCode || '');
        setPayerStreet(installment.clientAddress.street || '');
        setPayerNumber(installment.clientAddress.number || '');
        setPayerNeighborhood(installment.clientAddress.neighborhood || '');
        setPayerCity(installment.clientAddress.city || '');
        setPayerState(installment.clientAddress.state || 'SP');
      }

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

      setClientDocument(installment.clientDocument || '');
      setCustomNotes(installment.description || '');

      // If installment already has an official Mercado Pago boleto, default to mercadopago tab
      if (installment.boletoExternalUrl || installment.boletoProvider === 'mercadopago') {
        setActiveTab('mercadopago');
      }
    }
  }, [installment, isOpen, bankAccounts]);

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
      selectedAccount?.beneficiaryName?.trim() ||
      architectProfile?.name ||
      profile?.companyName ||
      user?.displayName ||
      'Meu Escritório Online';

    const effectiveBeneficiaryDoc =
      selectedAccount?.beneficiaryDocument?.trim() ||
      architectProfile?.cnpj ||
      architectProfile?.cpf ||
      '';

    const codes = generateBoletoCodes(
      effectiveBankCode,
      installment.amount,
      installment.dueDate,
      `${installment.installmentNumber}`,
      effectiveAgency,
      effectiveAccountNumber,
      effectiveWallet
    );

    const isSameAccountAsSaved =
      Boolean(installment.boletoBarcode) &&
      installment.boletoBankAccountId === selectedAccountId &&
      installment.boletoBank === effectiveBankCode;

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
  ]);

  // Build WhatsApp Message based on active boleto data
  useEffect(() => {
    if (installment) {
      const isMP = Boolean(installment.boletoExternalUrl);
      const linha = installment.boletoBarcode || traditionalBoletoData?.linhaDigitavel || '';
      const officeName = architectProfile?.name || profile?.companyName || user?.displayName || 'Nosso Escritório';

      let msg = '';
      if (isMP && installment.boletoExternalUrl) {
        msg =
          `Olá *${installment.clientName}*, tudo bem?\n\n` +
          `Segue o *Boleto Bancário Registrado* referente à parcela *${installment.installmentNumber}/${installment.totalInstallments}* do seu projeto *${installment.projectTitle}*:\n\n` +
          `💰 *Valor:* ${formatCurrency(installment.amount)}\n` +
          `📅 *Vencimento:* ${formatDate(installment.dueDate)}\n\n` +
          `📄 *Visualizar e Imprimir Boleto Oficial (PDF):*\n${installment.boletoExternalUrl}\n\n` +
          `🔢 *Linha Digitável (Copiar e Colar no App do seu Banco):*\n\`\`\`${linha}\`\`\`\n\n` +
          `_Pague pelo aplicativo do seu banco, internet banking ou em qualquer agência/lotérica até o vencimento._\n\n` +
          `Atenciosamente,\n*${officeName}*`;
      } else {
        msg = buildBoletoWhatsAppMessage({
          clientName: installment.clientName || 'Cliente',
          projectTitle: installment.projectTitle || 'Projeto',
          installmentNumber: installment.installmentNumber,
          totalInstallments: installment.totalInstallments,
          description: installment.description || 'Honorários',
          amount: installment.amount,
          dueDate: installment.dueDate,
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

      // Custom access token configured in officeSettings, if any
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

      if (onUpdateInstallment) {
        onUpdateInstallment(installment.id, updates);
      } else {
        updateProjectInstallment(installment.id, updates);
      }

      setMpSuccess('Boleto registrado com sucesso na FEBRABAN via Mercado Pago!');
      setTimeout(() => setMpSuccess(''), 5000);
    } catch (err: any) {
      console.error('Error generating Mercado Pago Boleto:', err);
      setMpError(err.message || 'Erro ao emitir boleto no Mercado Pago.');
    } finally {
      setIsGeneratingMP(false);
    }
  };

  // Sync / Verify payment status in real time
  const handleCheckPaymentStatus = async () => {
    if (!installment.boletoPaymentId) {
      setSyncStatusResult('Nenhum ID de pagamento do Mercado Pago associado a esta parcela.');
      return;
    }

    try {
      setIsCheckingStatus(true);
      setSyncStatusResult('');
      const customToken = officeSettings?.mercadopagoConfig?.accessToken;
      const statusData = await fetchMercadoPagoPaymentStatus(installment.boletoPaymentId, customToken);

      if (statusData.status === 'approved') {
        // Mark installment as paid!
        const defaultAcc = bankAccounts.find((a) => a.isDefault)?.id || bankAccounts[0]?.id || 'acc-main';
        receiveInstallmentPayment(
          installment.id,
          installment.bankAccountId || defaultAcc,
          statusData.date_approved ? statusData.date_approved.split('T')[0] : new Date().toISOString().split('T')[0],
          statusData.transaction_amount || installment.amount
        );

        if (onUpdateInstallment) {
          onUpdateInstallment(installment.id, {
            status: 'paid',
            boletoStatus: 'approved',
            paidDate: new Date().toISOString().split('T')[0],
          });
        }

        setSyncStatusResult('🎉 Pagamento Confirmado! Parcela baixada e saldo atualizado no sistema!');
      } else if (statusData.status === 'pending' || statusData.status === 'in_process') {
        setSyncStatusResult('⏳ Boleto aguardando compensação bancária pelo cliente.');
      } else {
        setSyncStatusResult(`Status retornado pelo Mercado Pago: ${statusData.status} (${statusData.status_detail})`);
      }
    } catch (err: any) {
      setSyncStatusResult(err.message || 'Erro ao consultar status no Mercado Pago.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Save traditional slip data to installment
  const handleSaveTraditionalToInstallment = () => {
    if (traditionalBoletoData) {
      const updates: Partial<ProjectInstallment> = {
        boletoBarcode: traditionalBoletoData.linhaDigitavel,
        boletoBarcodeRaw: traditionalBoletoData.barcodeRaw,
        boletoOurNumber: traditionalBoletoData.nossoNumero,
        boletoBank: effectiveBankCode,
        boletoBankAccountId: selectedAccountId || undefined,
        bankAccountId: selectedAccountId || installment.bankAccountId,
        boletoGeneratedAt: new Date().toISOString(),
        clientDocument: clientDocument || undefined,
        boletoProvider: 'simulated',
      };

      if (onUpdateInstallment) {
        onUpdateInstallment(installment.id, updates);
      } else {
        updateProjectInstallment(installment.id, updates);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  const handleCopyLinha = async (codeToCopy?: string) => {
    const text = codeToCopy || installment.boletoBarcode || traditionalBoletoData?.linhaDigitavel || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLinha(true);
      setTimeout(() => setCopiedLinha(false), 2500);
    } catch {}
  };

  const handleCopyPdfUrl = async () => {
    if (!installment.boletoExternalUrl) return;
    try {
      await navigator.clipboard.writeText(installment.boletoExternalUrl);
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
    const rawPhone = (installment.clientPhone || payerPhone || '').replace(/\D/g, '');
    const cleanPhone = rawPhone.startsWith('55') ? rawPhone : `55${rawPhone}`;
    const encodedMsg = encodeURIComponent(customMessage);
    const url = rawPhone
      ? `https://wa.me/${cleanPhone}?text=${encodedMsg}`
      : `https://wa.me/?text=${encodedMsg}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    handleSaveTraditionalToInstallment();
    window.print();
  };

  // Barcode pattern for traditional display
  const barcodePattern = [
    2, 1, 2, 2, 1, 3, 1, 2, 1, 1, 3, 1, 2, 2, 1, 1, 2, 3, 1, 2,
    1, 2, 2, 1, 3, 1, 1, 2, 2, 3, 1, 1, 2, 1, 2, 3, 1, 2, 1, 1,
    2, 2, 1, 3, 1, 2, 1, 2, 3, 1, 1, 2, 2, 1, 3, 1, 2, 1, 2, 2,
    1, 3, 1, 1, 2, 2, 3, 1, 1, 2, 1, 2, 3, 1, 2, 1, 1, 2, 2, 1,
  ];

  const hasGeneratedMP = Boolean(installment.boletoExternalUrl);

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
                  Parcela {installment.installmentNumber}/{installment.totalInstallments}
                </span>
                {installment.status === 'paid' && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Pago
                  </span>
                )}
              </div>
              <p className="text-xs text-[#a89c93] mt-0.5">
                {installment.projectTitle} • Cliente: <strong className="text-[#fcf8f5]">{installment.clientName}</strong> • Valor: <strong className="text-emerald-400">{formatCurrency(installment.amount)}</strong>
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

        {/* Tab Selection: Mercado Pago (Official) vs Traditional */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#1e1916] border-b border-[#3d342f] flex items-center justify-between gap-3 shrink-0 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('mercadopago')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'mercadopago'
                  ? 'bg-amber-500 text-black shadow-md'
                  : 'bg-[#14110f] text-[#a89c93] hover:text-[#fcf8f5] border border-[#3d342f]'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Boleto Oficial Mercado Pago (Válido & Registrado)</span>
            </button>

            <button
              onClick={() => setActiveTab('traditional')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                activeTab === 'traditional'
                  ? 'bg-[#c58a4b] text-black shadow-md'
                  : 'bg-[#14110f] text-[#a89c93] hover:text-[#fcf8f5] border border-[#3d342f]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Carnê / Impressão Tradicional</span>
            </button>
          </div>

          {/* Quick WhatsApp Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWhatsAppPreview(!showWhatsAppPreview)}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-md transition-all cursor-pointer active:scale-95"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Enviar no WhatsApp</span>
            </button>
          </div>
        </div>

        {/* Optional WhatsApp Preview Bar */}
        {showWhatsAppPreview && (
          <div className="px-4 sm:px-6 py-3 bg-[#13231a] border-b border-emerald-600/30 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-emerald-300">
                  Mensagem Pronta para Envio do Boleto a {installment.clientName}
                </span>
                {installment.clientPhone && (
                  <span className="text-[11px] text-emerald-400/80">({installment.clientPhone})</span>
                )}
              </div>
              <button
                onClick={() => setShowWhatsAppPreview(false)}
                className="text-xs text-[#a89c93] hover:text-white cursor-pointer"
              >
                Fechar
              </button>
            </div>

            <textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={4}
              className="w-full bg-[#0e1913] border border-emerald-500/30 rounded-xl p-2.5 text-xs text-[#ded5cc] font-mono focus:outline-none focus:border-emerald-400"
            />

            <div className="flex items-center justify-between mt-2 pt-1 flex-wrap gap-2">
              <span className="text-[11px] text-emerald-400/70">
                A mensagem já inclui o link direto para download do boleto em PDF e a linha digitável para pagamento.
              </span>
              <button
                onClick={handleSendWhatsApp}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Disparar WhatsApp com 1 Clique</span>
              </button>
            </div>
          </div>
        )}

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
                          ID do Pagamento MP: <code className="text-[#fcf8f5] font-mono">{installment.boletoPaymentId || 'N/A'}</code> • Aceito em qualquer banco, lotérica ou app
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

                  {/* Official PDF & Fast Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    {installment.boletoExternalUrl && (
                      <a
                        href={installment.boletoExternalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 shadow-lg transition-all cursor-pointer"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Abrir / Imprimir Boleto Oficial (PDF)</span>
                      </a>
                    )}

                    {installment.boletoExternalUrl && (
                      <button
                        onClick={handleCopyPdfUrl}
                        className="px-3.5 py-2.5 rounded-xl text-xs font-bold bg-[#1c1815] hover:bg-[#241e1b] text-[#fcf8f5] border border-[#3d342f] flex items-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5 text-[#c58a4b]" />
                        <span>{copiedUrl ? 'Link Copiado!' : 'Copiar Link do PDF'}</span>
                      </button>
                    )}

                    <button
                      onClick={handleSendWhatsApp}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Enviar pelo WhatsApp</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Form to Issue or Re-issue Official Boleto */}
              <div className="p-5 rounded-2xl bg-[#14110f] border border-[#3d342f] space-y-4">
                <div className="flex items-center justify-between border-b border-[#302722] pb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h4 className="font-serif font-bold text-[#fcf8f5] text-sm">
                      {hasGeneratedMP ? 'Reemitir / Gerar Novo Boleto Mercado Pago' : 'Dados para Emissão de Boleto Registrado'}
                    </h4>
                  </div>
                  <span className="text-[11px] text-[#a89c93]">
                    Normas FEBRABAN: CPF/CNPJ e Endereço obrigatórios
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {/* Nome do Cliente */}
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
                      E-mail do Cliente *
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

          {/* TAB 2: TRADITIONAL BOLETO SLIP & PRINT */}
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
                    value={selectedAccountId || `bank_${effectiveBankCode}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val.startsWith('bank_')) {
                        setSelectedAccountId('');
                        setSelectedBankCode(val.replace('bank_', ''));
                      } else {
                        setSelectedAccountId(val);
                        const acc = bankAccounts.find((a) => a.id === val);
                        if (acc) {
                          const code = acc.bankCode || getBankInfo(acc.name).code;
                          setSelectedBankCode(code || '341');
                        }
                      }
                    }}
                    className="bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs font-semibold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#c58a4b] cursor-pointer max-w-[280px] sm:max-w-[340px] truncate"
                  >
                    {bankAccounts.length > 0 && (
                      <optgroup label="Minhas Contas Cadastradas">
                        {bankAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} — Ag: {acc.agency || '0000'} CC: {acc.accountNumber || '00000'}
                          </option>
                        ))}
                      </optgroup>
                    )}
                    <optgroup label="Bancos Emissores">
                      {Object.values(POPULAR_BANKS).map((bank) => (
                        <option key={bank.code} value={`bank_${bank.code}`}>
                          {bank.code} - {bank.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>

                  <button
                    type="button"
                    onClick={() => setIsManageAccountsOpen(true)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#14110f] hover:bg-[#28221e] border border-[#3d342f] text-amber-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#c58a4b]" />
                    <span>Gerenciar Contas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPixQr(!showPixQr)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      showPixQr
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                        : 'bg-[#14110f] border-[#3d342f] text-[#a89c93] hover:text-[#fcf8f5]'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>BolePix (QR Code)</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyLinha(traditionalBoletoData.linhaDigitavel)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                      copiedLinha
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#241e1b] hover:bg-[#2d2520] text-[#fcf8f5] border border-[#3d342f]'
                    }`}
                  >
                    {copiedLinha ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-[#c58a4b]" />}
                    <span>{copiedLinha ? 'Copiada!' : 'Copiar Linha'}</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#241e1b] hover:bg-[#2d2520] text-[#fcf8f5] border border-[#3d342f] flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-[#c58a4b]" />
                    <span>Imprimir</span>
                  </button>
                </div>
              </div>

              {/* Printable White Slip */}
              <div
                id="printable-boleto"
                ref={printRef}
                className="bg-white text-black p-5 sm:p-7 rounded-xl shadow-lg font-sans text-xs border border-gray-300"
                style={{ color: '#000', backgroundColor: '#fff' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-lg tracking-tight font-serif flex items-center gap-1.5 text-black">
                      <Building2 className="w-5 h-5 text-black" />
                      <span>{currentBank.name.toUpperCase()}</span>
                    </div>
                    <div className="border-l-2 border-r-2 border-black px-3 py-0.5 text-lg font-black tracking-wider text-black">
                      {currentBank.code}-{currentBank.digit}
                    </div>
                  </div>

                  <div className="font-mono text-xs sm:text-sm font-bold tracking-tight text-right text-black select-all">
                    {traditionalBoletoData.linhaDigitavel}
                  </div>
                </div>

                {/* Slip Table */}
                <div className="border border-black divide-y divide-black text-[11px]">
                  <div className="grid grid-cols-12 divide-x divide-black">
                    <div className="col-span-8 p-1.5">
                      <div className="text-[9px] uppercase font-bold text-gray-700">Local de Pagamento</div>
                      <div className="font-semibold text-black uppercase">
                        Pagável em qualquer agência bancária ou internet banking até o vencimento
                      </div>
                    </div>
                    <div className="col-span-4 p-1.5 bg-gray-100">
                      <div className="text-[9px] uppercase font-bold text-gray-700">Vencimento</div>
                      <div className="font-bold text-sm text-black">
                        {formatDate(installment.dueDate)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 divide-x divide-black">
                    <div className="col-span-8 p-1.5">
                      <div className="text-[9px] uppercase font-bold text-gray-700">Beneficiário</div>
                      <div className="font-bold text-black uppercase">
                        {traditionalBoletoData.beneficiario}
                      </div>
                      <div className="text-[10px] text-gray-700">
                        CNPJ/CPF: {traditionalBoletoData.beneficiarioDoc} • {traditionalBoletoData.beneficiarioEndereco}
                      </div>
                    </div>
                    <div className="col-span-4 p-1.5">
                      <div className="text-[9px] uppercase font-bold text-gray-700">Agência / Código Beneficiário</div>
                      <div className="font-semibold text-black">
                        {traditionalBoletoData.agenciaCodigo}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 divide-x divide-black">
                    <div className="col-span-2 p-1.5">
                      <div className="text-[9px] uppercase font-bold text-gray-700">Data Doc.</div>
                      <div className="font-medium text-black">{traditionalBoletoData.dataDocumento}</div>
                    </div>
                    <div className="col-span-3 p-1.5">
                      <div className="text-[9px] uppercase font-bold text-gray-700">Nº do Documento</div>
                      <div className="font-medium text-black">{traditionalBoletoData.documentoNumero}</div>
                    </div>
                    <div className="col-span-2 p-1.5">
                      <div className="text-[9px] uppercase font-bold text-gray-700">Espécie Doc.</div>
                      <div className="font-medium text-black">DS - Serviços</div>
                    </div>
                    <div className="col-span-1 p-1.5">
                      <div className="text-[9px] uppercase font-bold text-gray-700">Aceite</div>
                      <div className="font-medium text-black">N</div>
                    </div>
                    <div className="col-span-4 p-1.5 bg-gray-50">
                      <div className="text-[9px] uppercase font-bold text-gray-700">Nosso Número</div>
                      <div className="font-bold text-black font-mono">{traditionalBoletoData.nossoNumero}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 divide-x divide-black">
                    <div className="col-span-2 p-1.5">
                      <div className="text-[9px] uppercase font-bold text-gray-700">Uso do Banco</div>
                      <div className="font-medium text-black">000</div>
                    </div>
                    <div className="col-span-2 p-1.5">
                      <div className="text-[9px] uppercase font-bold text-gray-700">Carteira</div>
                      <div className="font-medium text-black">{traditionalBoletoData.carteira}</div>
                    </div>
                    <div className="col-span-2 p-1.5">
                      <div className="text-[9px] uppercase font-bold text-gray-700">Espécie</div>
                      <div className="font-medium text-black">R$</div>
                    </div>
                    <div className="col-span-2 p-1.5">
                      <div className="text-[9px] uppercase font-bold text-gray-700">Quantidade</div>
                      <div className="font-medium text-black">-</div>
                    </div>
                    <div className="col-span-4 p-1.5 bg-gray-100">
                      <div className="text-[9px] uppercase font-bold text-gray-700">(=) Valor do Documento</div>
                      <div className="font-bold text-base text-black">
                        {formatCurrency(installment.amount)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-12 divide-x divide-black">
                    <div className="col-span-8 p-2.5 space-y-2">
                      <div className="text-[9px] uppercase font-bold text-gray-700">
                        Instruções (Texto de Responsabilidade do Beneficiário)
                      </div>
                      <p className="text-[10px] leading-relaxed text-black font-medium">
                        {customInstructions}
                      </p>
                      <p className="text-[10px] leading-relaxed text-gray-800">
                        • Projeto: <strong>{installment.projectTitle}</strong>
                        <br />• Descrição: <strong>{customNotes || installment.description}</strong> (Parcela {installment.installmentNumber} de {installment.totalInstallments})
                      </p>
                    </div>

                    <div className="col-span-4 divide-y divide-black">
                      <div className="p-1.5">
                        <div className="text-[9px] uppercase text-gray-600">(-) Descontos</div>
                        <div className="text-right text-xs text-black">-</div>
                      </div>
                      <div className="p-1.5">
                        <div className="text-[9px] uppercase text-gray-600">(+) Juros / Multa</div>
                        <div className="text-right text-xs text-black">-</div>
                      </div>
                      <div className="p-1.5 bg-gray-100">
                        <div className="text-[9px] uppercase font-bold text-gray-700">(=) Valor Cobrado</div>
                        <div className="text-right font-bold text-xs text-black">
                          {formatCurrency(installment.amount)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-[9px] uppercase font-bold text-gray-700">Pagador (Sacado)</div>
                      <div className="text-[9px] text-gray-600">
                        CPF/CNPJ: <span className="font-semibold text-black">{clientDocument || installment.clientDocument || 'Não informado'}</span>
                      </div>
                    </div>
                    <div className="font-bold text-black uppercase text-xs">
                      {installment.clientName}
                    </div>
                    <div className="text-[10px] text-gray-700 flex flex-wrap items-center gap-4">
                      {installment.clientPhone && <span>Tel / WhatsApp: {installment.clientPhone}</span>}
                      <span>Referência: Projeto {installment.projectTitle}</span>
                    </div>
                  </div>
                </div>

                {/* Barcode Graphic & Pix */}
                <div className="mt-4 pt-3 border-t-2 border-dashed border-gray-400 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex-1 w-full flex flex-col items-start">
                    <div className="flex items-end h-16 w-full max-w-md bg-white overflow-hidden py-1">
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
                    <div className="font-mono text-[10px] tracking-widest text-gray-600 mt-1">
                      {traditionalBoletoData.barcodeRaw}
                    </div>
                  </div>

                  {showPixQr && (
                    <div className="flex items-center gap-3 p-2.5 bg-gray-50 border border-gray-300 rounded-lg shrink-0">
                      <div className="w-16 h-16 bg-white border border-gray-300 p-1 flex items-center justify-center shrink-0">
                        <QrCode className="w-14 h-14 text-black" />
                      </div>
                      <div className="text-left">
                        <div className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded inline-block">
                          BolePix Instantâneo
                        </div>
                        <div className="text-[10px] text-gray-600 mt-1 max-w-[150px] truncate">
                          Chave: {architectProfile?.pixKey || 'Chave Pix'}
                        </div>
                        <button
                          onClick={handleCopyPix}
                          className="text-[10px] text-blue-700 font-bold hover:underline mt-0.5 cursor-pointer block"
                        >
                          {copiedPix ? 'Copiado!' : 'Copiar Chave Pix'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#14110f] border-t border-[#3d342f] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-[#a89c93]">
            <Calendar className="w-4 h-4 text-[#c58a4b]" />
            <span>
              Vencimento: <strong className="text-[#fcf8f5]">{formatDate(installment.dueDate)}</strong> • Valor:{' '}
              <strong className="text-emerald-400 font-bold">{formatCurrency(installment.amount)}</strong>
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#241e1b] transition-colors cursor-pointer"
            >
              Fechar
            </button>

            {activeTab === 'traditional' && (
              <button
                onClick={handleSaveTraditionalToInstallment}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#241e1b] hover:bg-[#2d2520] text-[#c58a4b] border border-[#3d342f] transition-colors cursor-pointer"
              >
                Salvar Dados na Parcela
              </button>
            )}

            <button
              onClick={handleSendWhatsApp}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg transition-all cursor-pointer active:scale-95"
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
