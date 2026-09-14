import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  AlertCircle,
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
  Wallet,
  X,
  Zap,
} from 'lucide-react';
import { ProjectInstallment, Client, BankAccount } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { formatCpfCnpj } from '../../utils/boletoGenerator';
import { BankAccountsModal } from '../banks/BankAccountsModal';
import {
  createMercadoPagoBoleto,
  fetchMercadoPagoPaymentStatus,
} from '../../lib/mercadopago';
import {
  generatePixCopiaECola,
  generatePixQrCodeDataUrl,
  buildPixWhatsAppMessage,
} from '../../utils/pixGenerator';

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

  // Tab State: 'mercadopago' | 'pix'
  const [activeTab, setActiveTab] = useState<'mercadopago' | 'pix'>('mercadopago');

  // Reactive local installment state
  const [localInstallment, setLocalInstallment] = useState<ProjectInstallment | null>(installment);

  useEffect(() => {
    setLocalInstallment(installment);
  }, [installment]);

  const activeInstallment = localInstallment || installment;

  // Mercado Pago Form State
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

  // Loading & Feedback States
  const [isGeneratingMP, setIsGeneratingMP] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [isSearchingCep, setIsSearchingCep] = useState<boolean>(false);
  const [mpError, setMpError] = useState<string>('');
  const [mpSuccess, setMpSuccess] = useState<string>('');
  const [syncStatusResult, setSyncStatusResult] = useState<string>('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Email sending state
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [emailSuccess, setEmailSuccess] = useState<string>('');
  const [emailError, setEmailError] = useState<string>('');

  // PIX State
  const [selectedPixAccountId, setSelectedPixAccountId] = useState<string>('');
  const [isManageAccountsOpen, setIsManageAccountsOpen] = useState<boolean>(false);
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState<string>('');
  const [pixCopiaECola, setPixCopiaECola] = useState<string>('');
  const [isGeneratingPix, setIsGeneratingPix] = useState<boolean>(false);
  const [pixConfirmSuccess, setPixConfirmSuccess] = useState<string>('');

  // Matched Client and Project
  const matchedClient: Client | undefined = useMemo(() => {
    if (!activeInstallment) return undefined;
    if (activeInstallment.clientId) {
      return clients.find((c) => c.id === activeInstallment.clientId);
    }
    const allProjects = [...(architectureProjects || []), ...(freelanceProjects || [])];
    const proj = allProjects.find((p) => p.id === activeInstallment.projectId);
    if (proj && proj.clientId) {
      return clients.find((c) => c.id === proj.clientId);
    }
    if (activeInstallment.clientName) {
      return clients.find(
        (c) => c.name.toLowerCase().trim() === activeInstallment.clientName?.toLowerCase().trim()
      );
    }
    return undefined;
  }, [activeInstallment, clients, architectureProjects, freelanceProjects]);

  const matchedProject = useMemo(() => {
    if (!activeInstallment) return null;
    const allProjects = [...(architectureProjects || []), ...(freelanceProjects || [])];
    return allProjects.find((p) => p.id === activeInstallment.projectId) || null;
  }, [activeInstallment, architectureProjects, freelanceProjects]);

  // Find active PIX bank account
  const selectedPixAccount: BankAccount | undefined = useMemo(() => {
    if (selectedPixAccountId) {
      return bankAccounts.find((a) => a.id === selectedPixAccountId);
    }
    // Default to first account that has a pixKey or default bank account
    const withPix = bankAccounts.find((a) => Boolean(a.pixKey));
    if (withPix) return withPix;
    return bankAccounts.find((a) => a.isDefault) || bankAccounts[0];
  }, [selectedPixAccountId, bankAccounts]);

  // Auto-fill form when modal opens or installment changes
  useEffect(() => {
    if (!activeInstallment || !isOpen) return;

    setBoletoAmount(activeInstallment.amount || 0);
    setBoletoDueDate(activeInstallment.dueDate || new Date().toISOString().split('T')[0]);

    const projName = activeInstallment.projectTitle || matchedProject?.name || 'Projeto de Arquitetura';
    const instNum = activeInstallment.installmentNumber || 1;
    const totalInst = activeInstallment.totalInstallments || 1;
    setBoletoDescription(`Parcela ${instNum}/${totalInst} - ${projName}`);

    // Client Info
    const cName = activeInstallment.clientName || matchedClient?.name || '';
    const cEmail = activeInstallment.clientEmail || matchedClient?.email || '';
    const cDoc = activeInstallment.clientDocument || matchedClient?.document || '';
    const cPhone = activeInstallment.clientPhone || matchedClient?.phone || matchedClient?.whatsapp || '';

    setPayerName(cName);
    setPayerEmail(cEmail);
    setPayerDoc(formatCpfCnpj(cDoc));
    setPayerPhone(cPhone);

    // Address
    const address = matchedClient?.address;
    if (address) {
      if (typeof address === 'string') {
        setPayerStreet(address);
        if (matchedClient?.neighborhood) setPayerNeighborhood(matchedClient.neighborhood);
        if (matchedClient?.city) setPayerCity(matchedClient.city);
        if (matchedClient?.state) setPayerState(matchedClient.state);
      } else {
        const addrObj = address as any;
        setPayerZip(addrObj.zipCode || '');
        setPayerStreet(addrObj.street || '');
        setPayerNumber(addrObj.number || '');
        setPayerNeighborhood(addrObj.neighborhood || matchedClient?.neighborhood || '');
        setPayerCity(addrObj.city || matchedClient?.city || '');
        setPayerState(addrObj.state || matchedClient?.state || 'SP');
      }
    } else {
      if (matchedClient?.neighborhood) setPayerNeighborhood(matchedClient.neighborhood);
      if (matchedClient?.city) setPayerCity(matchedClient.city);
      if (matchedClient?.state) setPayerState(matchedClient.state);
    }

    setMpError('');
    setMpSuccess('');
    setEmailSuccess('');
    setEmailError('');
    setSyncStatusResult('');
    setPixConfirmSuccess('');

    // Default PIX account
    if (!selectedPixAccountId && bankAccounts.length > 0) {
      const withPix = bankAccounts.find((a) => Boolean(a.pixKey));
      if (withPix) {
        setSelectedPixAccountId(withPix.id);
      } else if (bankAccounts[0]) {
        setSelectedPixAccountId(bankAccounts[0].id);
      }
    }
  }, [activeInstallment, isOpen, matchedClient, matchedProject, bankAccounts]);

  // Generate PIX QR Code whenever selected account, amount or description changes
  useEffect(() => {
    if (!isOpen || !activeInstallment) return;

    const generatePix = async () => {
      const pixKey = selectedPixAccount?.pixKey || architectProfile?.pixKey || architectProfile?.cnpj || architectProfile?.cpf || '';
      const pixKeyType = selectedPixAccount?.pixKeyType || (architectProfile?.pixKeyType as any) || 'cnpj';
      const merchantName = selectedPixAccount?.beneficiaryName || architectProfile?.name || profile?.companyName || 'ESCRITORIO';
      const merchantCity = (selectedPixAccount?.agency ? 'SAO PAULO' : 'SAO PAULO');
      const amount = Number(boletoAmount || activeInstallment.amount || 0);
      const desc = boletoDescription || `Parcela ${activeInstallment.installmentNumber || 1}`;

      if (!pixKey) {
        setPixCopiaECola('');
        setPixQrCodeUrl('');
        return;
      }

      setIsGeneratingPix(true);
      try {
        const copiaECola = generatePixCopiaECola({
          pixKey,
          pixKeyType,
          merchantName,
          merchantCity,
          amount,
          description: desc,
          txId: `INST${(activeInstallment.id || '').replace(/\D/g, '').slice(-15) || '1'}`,
        });

        setPixCopiaECola(copiaECola);
        const qrUrl = await generatePixQrCodeDataUrl(copiaECola);
        setPixQrCodeUrl(qrUrl);
      } catch (err) {
        console.error('Error generating PIX payload:', err);
      } finally {
        setIsGeneratingPix(false);
      }
    };

    generatePix();
  }, [isOpen, activeInstallment, selectedPixAccount, boletoAmount, boletoDescription, architectProfile, profile]);

  if (!isOpen || !activeInstallment) return null;

  const copyToClipboard = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2500);
  };

  // ViaCEP address lookup
  const handleSearchCep = async () => {
    const cleanZip = payerZip.replace(/\D/g, '');
    if (cleanZip.length !== 8) {
      setMpError('Digite um CEP válido com 8 dígitos para consultar o endereço.');
      return;
    }

    setIsSearchingCep(true);
    setMpError('');
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanZip}/json/`);
      const data = await response.json();
      if (data.erro) {
        setMpError('CEP não encontrado na base dos Correios.');
      } else {
        setPayerStreet(data.logradouro || '');
        setPayerNeighborhood(data.bairro || '');
        setPayerCity(data.localidade || '');
        setPayerState(data.uf || 'SP');
      }
    } catch {
      setMpError('Não foi possível consultar o CEP automaticamente. Preencha manualmente.');
    } finally {
      setIsSearchingCep(false);
    }
  };

  // Handle Mercado Pago Boleto Generation
  const handleGenerateMercadoPagoBoleto = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!payerName.trim()) {
      setMpError('Nome do cliente pagador é obrigatório.');
      return;
    }
    if (!payerEmail.trim() || !payerEmail.includes('@')) {
      setMpError('E-mail válido do cliente é obrigatório para registrar o boleto.');
      return;
    }
    const cleanDoc = payerDoc.replace(/\D/g, '');
    if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
      setMpError('CPF (11 dígitos) ou CNPJ (14 dígitos) válido do cliente é obrigatório.');
      return;
    }
    if (!boletoAmount || boletoAmount <= 0) {
      setMpError('O valor do boleto deve ser maior que zero.');
      return;
    }

    setIsGeneratingMP(true);
    setMpError('');
    setMpSuccess('');
    setSyncStatusResult('');

    try {
      const customToken = officeSettings?.mercadopagoConfig?.accessToken?.trim() || officeSettings?.mercadoPagoAccessToken?.trim();

      const result = await createMercadoPagoBoleto({
        amount: Number(boletoAmount),
        description: boletoDescription || `Parcela ${activeInstallment.installmentNumber || 1} - ${activeInstallment.projectTitle || 'Honorários'}`,
        dueDate: boletoDueDate,
        payer: {
          name: payerName.trim(),
          email: payerEmail.trim(),
          docNumber: cleanDoc,
          docType: cleanDoc.length > 11 ? 'CNPJ' : 'CPF',
          address: {
            zipCode: (payerZip || '01310-100').replace(/\D/g, ''),
            street: payerStreet || 'Avenida Principal',
            number: payerNumber || '100',
            neighborhood: payerNeighborhood || 'Centro',
            city: payerCity || 'Rio de Janeiro',
            state: payerState || 'RJ',
          },
        },
        externalReference: `inst-${activeInstallment.id}-${Date.now()}`,
        customAccessToken: customToken,
        metadata: {
          installmentId: activeInstallment.id,
          projectId: activeInstallment.projectId,
          clientName: payerName.trim(),
        },
      });

      const updates: Partial<ProjectInstallment> = {
        mercadoPagoPaymentId: String(result.id),
        mercadoPagoStatus: result.status || 'pending',
        mercadoPagoTicketUrl: result.external_resource_url || result.pdf_url || '',
        mercadoPagoDigitableLine: result.digitable_line || '',
        mercadoPagoBarcode: result.barcode_raw || '',
        mercadoPagoExpirationDate: result.date_of_expiration || boletoDueDate,
        digitableLine: result.digitable_line || activeInstallment.digitableLine,
        barcode: result.barcode_raw || activeInstallment.barcode,
        boletoPdfUrl: result.external_resource_url || result.pdf_url || '',
        clientName: payerName.trim(),
        clientEmail: payerEmail.trim(),
        clientDocument: formatCpfCnpj(cleanDoc),
        clientPhone: payerPhone.trim(),
      };

      if (onUpdateInstallment) {
        onUpdateInstallment(activeInstallment.id, updates);
      } else {
        updateProjectInstallment(activeInstallment.id, updates);
      }

      setLocalInstallment((prev) => (prev ? { ...prev, ...updates } : null));
      setMpSuccess('Boleto Oficial Mercado Pago gerado e registrado com sucesso!');
    } catch (err: any) {
      console.error('Error generating Mercado Pago boleto:', err);
      setMpError(err.message || 'Erro ao comunicar com o Mercado Pago. Verifique as credenciais.');
    } finally {
      setIsGeneratingMP(false);
    }
  };

  // Check Mercado Pago Status
  const handleCheckPaymentStatus = async () => {
    const paymentId = activeInstallment.mercadoPagoPaymentId;
    if (!paymentId) {
      setMpError('Nenhum identificador de pagamento do Mercado Pago encontrado nesta parcela.');
      return;
    }

    setIsCheckingStatus(true);
    setSyncStatusResult('');
    setMpError('');

    try {
      const customToken = officeSettings?.mercadopagoConfig?.accessToken?.trim() || officeSettings?.mercadoPagoAccessToken?.trim();
      const statusInfo = await fetchMercadoPagoPaymentStatus(paymentId, customToken);

      let statusMsg = '';
      if (statusInfo.status === 'approved') {
        statusMsg = '🎉 Pagamento APROVADO e compensado no Mercado Pago! Baixa realizada.';
        const updates: Partial<ProjectInstallment> = {
          status: 'paid',
          mercadoPagoStatus: 'approved',
          paidDate: statusInfo.date_approved
            ? new Date(statusInfo.date_approved).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
        };
        if (onUpdateInstallment) {
          onUpdateInstallment(activeInstallment.id, updates);
        } else {
          updateProjectInstallment(activeInstallment.id, updates);
        }
        setLocalInstallment((prev) => (prev ? { ...prev, ...updates } : null));
      } else if (statusInfo.status === 'pending') {
        statusMsg = '⏳ Boleto PENDENTE de pagamento pelo cliente.';
      } else if (statusInfo.status === 'rejected') {
        statusMsg = '❌ Boleto rejeitado ou cancelado.';
      } else {
        statusMsg = `Status atual: ${statusInfo.status} (${statusInfo.status_detail || ''})`;
      }

      setSyncStatusResult(statusMsg);
    } catch (err: any) {
      setMpError(err.message || 'Erro ao consultar status no Mercado Pago.');
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // WhatsApp Message for Boleto
  const handleSendBoletoWhatsApp = () => {
    const phone = (payerPhone || activeInstallment.clientPhone || '').replace(/\D/g, '');
    const clientNameStr = payerName || activeInstallment.clientName || 'Cliente';
    const projName = activeInstallment.projectTitle || matchedProject?.name || 'Projeto';
    const instNum = activeInstallment.installmentNumber || 1;
    const totalInst = activeInstallment.totalInstallments || 1;
    const valorFmt = formatCurrency(boletoAmount || activeInstallment.amount);
    const vencFmt = formatDate(boletoDueDate || activeInstallment.dueDate);
    const pdfUrl = activeInstallment.mercadoPagoTicketUrl || activeInstallment.boletoPdfUrl;
    const linhaDig = activeInstallment.mercadoPagoDigitableLine || activeInstallment.digitableLine;
    const officeName = architectProfile?.name || profile?.companyName || 'Nosso Escritório';

    let msg = `Olá *${clientNameStr}*, tudo bem?\n\n`;
    msg += `Segue o *Boleto Bancário* referente à parcela *${instNum}/${totalInst}* do projeto *${projName}*:\n\n`;
    msg += `💰 *Valor:* ${valorFmt}\n`;
    msg += `📅 *Vencimento:* ${vencFmt}\n`;

    if (linhaDig) {
      msg += `\n🔢 *Linha Digitável (Código de Barras):*\n\`${linhaDig}\`\n`;
    }

    if (pdfUrl) {
      msg += `\n📄 *Visualizar / Imprimir Boleto em PDF:*\n${pdfUrl}\n`;
    }

    msg += `\n_Após realizar o pagamento, a compensação ocorre de forma automática._\n\n`;
    msg += `Atenciosamente,\n*${officeName}*`;

    const targetUrl = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(targetUrl, '_blank');
  };

  // WhatsApp Message for PIX
  const handleSendPixWhatsApp = () => {
    const phone = (payerPhone || activeInstallment.clientPhone || '').replace(/\D/g, '');
    const clientNameStr = payerName || activeInstallment.clientName || 'Cliente';
    const projName = activeInstallment.projectTitle || matchedProject?.name || 'Projeto';
    const instNum = activeInstallment.installmentNumber || 1;
    const totalInst = activeInstallment.totalInstallments || 1;
    const pixKey = selectedPixAccount?.pixKey || architectProfile?.pixKey || architectProfile?.cnpj || architectProfile?.cpf || '';
    const pixKeyType = selectedPixAccount?.pixKeyType || (architectProfile?.pixKeyType as any) || 'cnpj';
    const beneficiary = selectedPixAccount?.beneficiaryName || architectProfile?.name || profile?.companyName || 'Escritório';
    const bankName = selectedPixAccount?.name || 'Banco Cadastrado';
    const officeName = architectProfile?.name || profile?.companyName || 'Nosso Escritório';

    const msg = buildPixWhatsAppMessage({
      clientName: clientNameStr,
      projectTitle: projName,
      installmentNumber: instNum,
      totalInstallments: totalInst,
      amount: Number(boletoAmount || activeInstallment.amount || 0),
      dueDate: boletoDueDate || activeInstallment.dueDate,
      pixKey,
      pixKeyType,
      beneficiaryName: beneficiary,
      bankName,
      copiaECola: pixCopiaECola,
      officeName,
    });

    const targetUrl = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(targetUrl, '_blank');
  };

  // Send Email with Boleto or PIX
  const handleSendEmail = async (type: 'boleto' | 'pix') => {
    const targetEmail = payerEmail || activeInstallment.clientEmail;
    if (!targetEmail || !targetEmail.includes('@')) {
      setEmailError('Informe um e-mail válido para o cliente.');
      return;
    }

    setIsSendingEmail(true);
    setEmailError('');
    setEmailSuccess('');

    try {
      const projName = activeInstallment.projectTitle || matchedProject?.name || 'Projeto';
      const instNum = activeInstallment.installmentNumber || 1;
      const totalInst = activeInstallment.totalInstallments || 1;
      const valorFmt = formatCurrency(boletoAmount || activeInstallment.amount);
      const vencFmt = formatDate(boletoDueDate || activeInstallment.dueDate);
      const officeName = architectProfile?.name || profile?.companyName || 'Nosso Escritório';

      let subject = ``;
      let htmlBody = ``;

      if (type === 'boleto') {
        const pdfUrl = activeInstallment.mercadoPagoTicketUrl || activeInstallment.boletoPdfUrl;
        const linhaDig = activeInstallment.mercadoPagoDigitableLine || activeInstallment.digitableLine;

        subject = `Boleto Bancário - Parcela ${instNum}/${totalInst} - ${projName}`;
        htmlBody = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
            <h2 style="color: #c58a4b; border-bottom: 2px solid #c58a4b; padding-bottom: 8px;">Cobrança de Honorários - Boleto Bancário</h2>
            <p>Olá <strong>${payerName || 'Cliente'}</strong>,</p>
            <p>Segue a cobrança referente à <strong>parcela ${instNum}/${totalInst}</strong> do projeto <strong>${projName}</strong>.</p>
            <div style="background: #fdf8f3; border: 1px solid #ebd3be; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>Valor:</strong> <span style="font-size: 18px; color: #10b981;">${valorFmt}</span></p>
              <p style="margin: 4px 0;"><strong>Vencimento:</strong> ${vencFmt}</p>
              ${linhaDig ? `<p style="margin: 12px 0 4px 0;"><strong>Linha Digitável:</strong><br/><code style="background: #eee; padding: 4px 8px; border-radius: 4px; display: block; word-break: break-all;">${linhaDig}</code></p>` : ''}
            </div>
            ${pdfUrl ? `<p style="text-align: center; margin: 30px 0;"><a href="${pdfUrl}" target="_blank" style="background: #c58a4b; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">📄 Visualizar / Imprimir Boleto em PDF</a></p>` : ''}
            <p style="color: #666; font-size: 13px;">Após a realização do pagamento, a confirmação bancária será registrada automaticamente.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #888; font-size: 12px;">Atenciosamente,<br/><strong>${officeName}</strong></p>
          </div>
        `;
      } else {
        const pixKey = selectedPixAccount?.pixKey || architectProfile?.pixKey || architectProfile?.cnpj || architectProfile?.cpf || '';
        const beneficiary = selectedPixAccount?.beneficiaryName || architectProfile?.name || profile?.companyName || 'Escritório';
        const bankName = selectedPixAccount?.name || 'Banco do Escritório';

        subject = `Cobrança PIX - Parcela ${instNum}/${totalInst} - ${projName}`;
        htmlBody = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
            <h2 style="color: #10b981; border-bottom: 2px solid #10b981; padding-bottom: 8px;">Cobrança via PIX</h2>
            <p>Olá <strong>${payerName || 'Cliente'}</strong>,</p>
            <p>Segue a chave e instruções para pagamento via <strong>PIX</strong> da parcela <strong>${instNum}/${totalInst}</strong> do projeto <strong>${projName}</strong>.</p>
            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 4px 0;"><strong>Valor:</strong> <span style="font-size: 18px; color: #10b981;">${valorFmt}</span></p>
              <p style="margin: 4px 0;"><strong>Vencimento:</strong> ${vencFmt}</p>
              <p style="margin: 4px 0;"><strong>Favorecido:</strong> ${beneficiary}</p>
              <p style="margin: 4px 0;"><strong>Banco:</strong> ${bankName}</p>
              <p style="margin: 8px 0;"><strong>Chave PIX:</strong> <code style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px;">${pixKey}</code></p>
              ${pixCopiaECola ? `<p style="margin: 12px 0 4px 0;"><strong>PIX Copia e Cola:</strong><br/><code style="background: #eee; padding: 4px 8px; border-radius: 4px; display: block; word-break: break-all; font-size: 11px;">${pixCopiaECola}</code></p>` : ''}
            </div>
            <p style="color: #666; font-size: 13px;">Abra o aplicativo do seu banco, escolha a opção PIX > Copia e Cola e cole o código acima.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="color: #888; font-size: 12px;">Atenciosamente,<br/><strong>${officeName}</strong></p>
          </div>
        `;
      }

      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: targetEmail,
          subject,
          html: htmlBody,
          clientName: payerName || 'Cliente',
        }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Erro ao enviar e-mail.');
      }

      setEmailSuccess(`E-mail de cobrança enviado com sucesso para ${targetEmail}!`);
    } catch (err: any) {
      setEmailError(err.message || 'Falha no envio do e-mail. Verifique o servidor SMTP.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Confirm Manual Payment / PIX Payment received
  const handleConfirmPixPayment = () => {
    if (!selectedPixAccount) {
      setMpError('Selecione a conta bancária onde o PIX foi creditado.');
      return;
    }

    const updates: Partial<ProjectInstallment> = {
      status: 'paid',
      paidDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'pix',
      bankAccountId: selectedPixAccount.id,
    };

    if (receiveInstallmentPayment) {
      receiveInstallmentPayment(
        activeInstallment.id,
        selectedPixAccount.id,
        Number(boletoAmount || activeInstallment.amount),
        new Date().toISOString().split('T')[0],
        'pix'
      );
    } else if (onUpdateInstallment) {
      onUpdateInstallment(activeInstallment.id, updates);
    } else {
      updateProjectInstallment(activeInstallment.id, updates);
    }

    setLocalInstallment((prev) => (prev ? { ...prev, ...updates } : null));
    setPixConfirmSuccess(`Pagamento de ${formatCurrency(boletoAmount || activeInstallment.amount)} confirmado com sucesso e creditado na conta ${selectedPixAccount.name}!`);
  };

  // Print PIX Sheet
  const handlePrintPix = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const pixKey = selectedPixAccount?.pixKey || architectProfile?.pixKey || architectProfile?.cnpj || architectProfile?.cpf || '';
    const beneficiary = selectedPixAccount?.beneficiaryName || architectProfile?.name || profile?.companyName || 'Escritório';
    const bankName = selectedPixAccount?.name || 'Banco Cadastrado';
    const valorFmt = formatCurrency(boletoAmount || activeInstallment.amount);
    const vencFmt = formatDate(boletoDueDate || activeInstallment.dueDate);
    const projName = activeInstallment.projectTitle || matchedProject?.name || 'Projeto';
    const instNum = activeInstallment.installmentNumber || 1;
    const totalInst = activeInstallment.totalInstallments || 1;
    const officeName = architectProfile?.name || profile?.companyName || 'Escritório';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Guia de Pagamento PIX - ${projName}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; color: #1a1a1a; }
            .header { border-bottom: 2px solid #10b981; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: center; }
            .title { font-size: 20px; font-weight: bold; color: #10b981; margin: 0; }
            .badge { background: #d1fae5; color: #065f46; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 12px; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; }
            .box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; }
            .label { font-size: 11px; color: #6b7280; text-transform: uppercase; font-weight: bold; margin-bottom: 4px; }
            .value { font-size: 15px; font-weight: bold; color: #111827; }
            .amount { font-size: 24px; color: #10b981; font-weight: bold; }
            .qr-container { text-align: center; padding: 20px; background: #ffffff; border: 1px dashed #cbd5e1; border-radius: 8px; margin-bottom: 20px; }
            .qr-container img { max-width: 220px; height: auto; }
            .copia-cola { background: #f1f5f9; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 11px; word-break: break-all; border: 1px solid #cbd5e1; margin-top: 10px; }
            .footer { border-top: 1px solid #e5e7eb; padding-top: 15px; font-size: 12px; color: #6b7280; text-align: center; margin-top: 30px; }
            @media print { body { margin: 20px; } button { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Guia de Pagamento Instantâneo PIX</h1>
              <div style="font-size: 13px; color: #666; margin-top: 4px;">${officeName}</div>
            </div>
            <div class="badge">PIX BANCO CENTRAL</div>
          </div>

          <div class="grid">
            <div class="box">
              <div class="label">Projeto / Descrição</div>
              <div class="value">${projName} (Parcela ${instNum}/${totalInst})</div>
              
              <div class="label" style="margin-top: 12px;">Cliente / Pagador</div>
              <div class="value">${payerName || 'Cliente'}</div>
            </div>

            <div class="box">
              <div class="label">Valor a Pagar</div>
              <div class="amount">${valorFmt}</div>

              <div class="label" style="margin-top: 8px;">Vencimento</div>
              <div class="value">${vencFmt}</div>
            </div>
          </div>

          <div class="box" style="margin-bottom: 20px;">
            <div class="label">Dados do Favorecido</div>
            <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 13px;">
              <span><strong>Favorecido:</strong> ${beneficiary}</span>
              <span><strong>Banco:</strong> ${bankName}</span>
              <span><strong>Chave PIX:</strong> ${pixKey}</span>
            </div>
          </div>

          <div class="qr-container">
            <div style="font-size: 14px; font-weight: bold; margin-bottom: 10px;">Escaneie o QR Code abaixo no aplicativo do seu Banco:</div>
            ${pixQrCodeUrl ? `<img src="${pixQrCodeUrl}" alt="QR Code PIX" />` : '<p>Chave PIX direta</p>'}
            
            ${pixCopiaECola ? `
              <div style="margin-top: 15px; text-align: left;">
                <div class="label">Ou pague com o PIX Copia e Cola:</div>
                <div class="copia-cola">${pixCopiaECola}</div>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            Guia emitida eletronicamente por ${officeName}. O pagamento via PIX é identificado instantaneamente.
          </div>

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const hasGeneratedBoleto = Boolean(
    activeInstallment.mercadoPagoTicketUrl ||
    activeInstallment.boletoPdfUrl ||
    activeInstallment.mercadoPagoDigitableLine ||
    activeInstallment.digitableLine
  );

  const isPaid = activeInstallment.status === 'paid';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#1a1614] border border-[#3d342f] rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#3d342f] bg-gradient-to-r from-[#241e1b] to-[#1a1614] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-[#c58a4b]">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-serif font-bold text-[#fcf8f5]">
                  Cobrança da Parcela {activeInstallment.installmentNumber || 1}/{activeInstallment.totalInstallments || 1}
                </h3>
                {isPaid ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3" /> Paga
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    <Clock className="w-3 h-3" /> Pendente
                  </span>
                )}
              </div>
              <p className="text-xs text-[#a89c93]">
                {activeInstallment.projectTitle || matchedProject?.name || 'Projeto'} • Cliente:{' '}
                <strong className="text-[#fcf8f5]">{payerName || activeInstallment.clientName || 'Cliente'}</strong>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#2e2621] rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Simplified Two-Option Tabs Navigation */}
        <div className="px-4 sm:px-6 pt-3 border-b border-[#3d342f] bg-[#1f1a17] flex items-center gap-3 shrink-0">
          <button
            onClick={() => setActiveTab('mercadopago')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'mercadopago'
                ? 'border-[#c58a4b] text-[#c58a4b]'
                : 'border-transparent text-[#a89c93] hover:text-[#fcf8f5]'
            }`}
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Boleto Mercado Pago (Registrado)</span>
            {hasGeneratedBoleto && (
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('pix')}
            className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'pix'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-[#a89c93] hover:text-[#fcf8f5]'
            }`}
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Pagamento via PIX (Contas Bancárias)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">
              Instantâneo
            </span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: BOLETO MERCADO PAGO */}
          {activeTab === 'mercadopago' && (
            <div className="space-y-5">
              {/* Alert / Feedback messages */}
              {mpError && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <strong className="block text-red-300">Atenção ao emitir boleto:</strong>
                    <span>{mpError}</span>
                  </div>
                </div>
              )}

              {mpSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block text-emerald-300">Sucesso!</strong>
                    <span>{mpSuccess}</span>
                  </div>
                </div>
              )}

              {syncStatusResult && (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-200 text-xs flex items-center gap-2.5">
                  <RefreshCw className="w-4 h-4 text-blue-400 shrink-0 animate-spin" />
                  <span>{syncStatusResult}</span>
                </div>
              )}

              {emailSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  {emailSuccess}
                </div>
              )}

              {emailError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs">
                  {emailError}
                </div>
              )}

              {/* SECTION A: SE JÁ TEM BOLETO GERADO */}
              {hasGeneratedBoleto && (
                <div className="p-4 sm:p-5 rounded-2xl bg-[#241e1b] border border-amber-500/30 space-y-4 shadow-lg">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span className="text-sm font-bold text-[#fcf8f5]">
                        Boleto Oficial Emitido e Registrado
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCheckPaymentStatus}
                        disabled={isCheckingStatus}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#322924] hover:bg-[#3d342f] text-[#fcf8f5] border border-[#4d423b] transition-colors cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 text-[#c58a4b] ${isCheckingStatus ? 'animate-spin' : ''}`} />
                        {isCheckingStatus ? 'Consultando...' : 'Verificar se Cliente Pagou'}
                      </button>
                    </div>
                  </div>

                  {/* Linha Digitável */}
                  {(activeInstallment.mercadoPagoDigitableLine || activeInstallment.digitableLine) && (
                    <div className="p-3.5 rounded-xl bg-[#14110f] border border-[#3d342f] space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-[#a89c93]">
                        <span className="font-semibold text-amber-200">Linha Digitável (Código de Barras Oficial):</span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              activeInstallment.mercadoPagoDigitableLine || activeInstallment.digitableLine || '',
                              'linha'
                            )
                          }
                          className="text-[#c58a4b] hover:text-[#fcf8f5] flex items-center gap-1 font-bold cursor-pointer"
                        >
                          {copiedField === 'linha' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" /> Copiar Linha
                            </>
                          )}
                        </button>
                      </div>
                      <div className="font-mono text-xs sm:text-sm text-[#fcf8f5] break-all select-all font-semibold tracking-wide">
                        {activeInstallment.mercadoPagoDigitableLine || activeInstallment.digitableLine}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons: Visualizar PDF, WhatsApp, E-mail */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {/* Visualizar / Imprimir PDF Oficial */}
                    {(activeInstallment.mercadoPagoTicketUrl || activeInstallment.boletoPdfUrl) ? (
                      <a
                        href={activeInstallment.mercadoPagoTicketUrl || activeInstallment.boletoPdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#c58a4b] to-[#a36e3b] text-[#14110f] font-bold text-xs hover:brightness-110 shadow-md transition-all text-center"
                      >
                        <ExternalLink className="w-4 h-4" />
                        <span>Abrir / Imprimir Boleto PDF</span>
                      </a>
                    ) : (
                      <button
                        onClick={handleGenerateMercadoPagoBoleto}
                        disabled={isGeneratingMP}
                        className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#c58a4b] text-[#14110f] font-bold text-xs hover:brightness-110"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Gerar Link do Boleto</span>
                      </button>
                    )}

                    {/* Enviar WhatsApp */}
                    <button
                      type="button"
                      onClick={handleSendBoletoWhatsApp}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Enviar no WhatsApp</span>
                    </button>

                    {/* Enviar E-mail */}
                    <button
                      type="button"
                      onClick={() => handleSendEmail('boleto')}
                      disabled={isSendingEmail}
                      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#322924] hover:bg-[#3d342f] text-[#fcf8f5] border border-[#4d423b] font-bold text-xs transition-all cursor-pointer"
                    >
                      {isSendingEmail ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#c58a4b]" />
                      ) : (
                        <Mail className="w-4 h-4 text-[#c58a4b]" />
                      )}
                      <span>{isSendingEmail ? 'Enviando...' : 'Enviar por E-mail'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SECTION B: FORMULÁRIO DE EMISSÃO OU REEMISSÃO */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#241e1b] border border-[#3d342f] space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#c58a4b]" />
                    <h4 className="text-sm font-bold text-[#fcf8f5]">
                      {hasGeneratedBoleto ? 'Reemitir ou Atualizar Dados do Boleto' : 'Dados do Cliente para Emissão do Boleto'}
                    </h4>
                  </div>
                  <span className="text-[10px] text-[#a89c93]">
                    Preenchimento automático do cadastro do cliente
                  </span>
                </div>

                <form onSubmit={handleGenerateMercadoPagoBoleto} className="space-y-4">
                  {/* Valores e Vencimento */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#d49454] mb-1">
                        Valor da Cobrança (R$) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={boletoAmount}
                        onChange={(e) => setBoletoAmount(parseFloat(e.target.value) || 0)}
                        className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs font-mono rounded-xl p-2.5 focus:outline-none focus:border-[#c58a4b]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#d49454] mb-1">
                        Data de Vencimento *
                      </label>
                      <input
                        type="date"
                        required
                        value={boletoDueDate}
                        onChange={(e) => setBoletoDueDate(e.target.value)}
                        className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs font-mono rounded-xl p-2.5 focus:outline-none focus:border-[#c58a4b]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#c4b5a5] mb-1">
                        Descrição / Referência
                      </label>
                      <input
                        type="text"
                        value={boletoDescription}
                        onChange={(e) => setBoletoDescription(e.target.value)}
                        placeholder="ex: Parcela 1/3 - Projeto"
                        className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#c58a4b]"
                      />
                    </div>
                  </div>

                  {/* Dados do Sacado: Nome, Email, Documento, Telefone */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-[#c4b5a5] mb-1">
                        Nome Completo do Cliente *
                      </label>
                      <input
                        type="text"
                        required
                        value={payerName}
                        onChange={(e) => setPayerName(e.target.value)}
                        placeholder="Nome do Cliente ou Razão Social"
                        className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#c58a4b]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#c4b5a5] mb-1">
                        E-mail do Cliente (Obrigatório para Boleto) *
                      </label>
                      <input
                        type="email"
                        required
                        value={payerEmail}
                        onChange={(e) => setPayerEmail(e.target.value)}
                        placeholder="cliente@email.com"
                        className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#c58a4b]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#c4b5a5] mb-1">
                        CPF ou CNPJ do Cliente *
                      </label>
                      <input
                        type="text"
                        required
                        value={payerDoc}
                        onChange={(e) => setPayerDoc(formatCpfCnpj(e.target.value))}
                        placeholder="000.000.000-00 ou 00.000.000/0001-00"
                        className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] font-mono text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#c58a4b]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#c4b5a5] mb-1">
                        Celular / WhatsApp (Com DDD)
                      </label>
                      <input
                        type="text"
                        value={payerPhone}
                        onChange={(e) => setPayerPhone(e.target.value)}
                        placeholder="(21) 99999-9999"
                        className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs rounded-xl p-2.5 focus:outline-none focus:border-[#c58a4b]"
                      />
                    </div>
                  </div>

                  {/* Endereço Completo do Cliente */}
                  <div className="p-3.5 rounded-xl bg-[#14110f] border border-[#3d342f] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#c4b5a5] flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#c58a4b]" />
                        Endereço do Pagador (Obrigatório pela FEBRABAN)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#a89c93] mb-1">
                          CEP
                        </label>
                        <div className="flex gap-1">
                          <input
                            type="text"
                            value={payerZip}
                            onChange={(e) => setPayerZip(e.target.value)}
                            onBlur={handleSearchCep}
                            placeholder="00000-000"
                            className="w-full bg-[#1f1a17] border border-[#3d342f] text-[#fcf8f5] font-mono text-xs rounded-lg p-2 focus:outline-none focus:border-[#c58a4b]"
                          />
                          <button
                            type="button"
                            onClick={handleSearchCep}
                            disabled={isSearchingCep}
                            title="Buscar endereço pelo CEP"
                            className="px-2.5 py-1.5 bg-[#322924] hover:bg-[#3d342f] text-[#c58a4b] rounded-lg border border-[#4d423b] text-xs font-semibold cursor-pointer"
                          >
                            {isSearchingCep ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Buscar'}
                          </button>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-medium text-[#a89c93] mb-1">
                          Logradouro / Rua
                        </label>
                        <input
                          type="text"
                          value={payerStreet}
                          onChange={(e) => setPayerStreet(e.target.value)}
                          placeholder="ex: Av. Paulista"
                          className="w-full bg-[#1f1a17] border border-[#3d342f] text-[#fcf8f5] text-xs rounded-lg p-2 focus:outline-none focus:border-[#c58a4b]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#a89c93] mb-1">
                          Número
                        </label>
                        <input
                          type="text"
                          value={payerNumber}
                          onChange={(e) => setPayerNumber(e.target.value)}
                          placeholder="ex: 100 ou S/N"
                          className="w-full bg-[#1f1a17] border border-[#3d342f] text-[#fcf8f5] text-xs rounded-lg p-2 focus:outline-none focus:border-[#c58a4b]"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-medium text-[#a89c93] mb-1">
                          Bairro
                        </label>
                        <input
                          type="text"
                          value={payerNeighborhood}
                          onChange={(e) => setPayerNeighborhood(e.target.value)}
                          placeholder="ex: Centro"
                          className="w-full bg-[#1f1a17] border border-[#3d342f] text-[#fcf8f5] text-xs rounded-lg p-2 focus:outline-none focus:border-[#c58a4b]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#a89c93] mb-1">
                          Cidade
                        </label>
                        <input
                          type="text"
                          value={payerCity}
                          onChange={(e) => setPayerCity(e.target.value)}
                          placeholder="ex: Rio de Janeiro"
                          className="w-full bg-[#1f1a17] border border-[#3d342f] text-[#fcf8f5] text-xs rounded-lg p-2 focus:outline-none focus:border-[#c58a4b]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#a89c93] mb-1">
                          Estado (UF)
                        </label>
                        <input
                          type="text"
                          maxLength={2}
                          value={payerState}
                          onChange={(e) => setPayerState(e.target.value.toUpperCase())}
                          placeholder="RJ, SP, MG..."
                          className="w-full bg-[#1f1a17] border border-[#3d342f] text-[#fcf8f5] text-xs uppercase font-mono rounded-lg p-2 focus:outline-none focus:border-[#c58a4b]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isGeneratingMP}
                      className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#c58a4b] to-[#a36e3b] text-[#14110f] font-bold text-sm hover:brightness-110 flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
                    >
                      {isGeneratingMP ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Registrando Boleto Oficial no Mercado Pago...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4" />
                          <span>{hasGeneratedBoleto ? '⚡ Atualizar e Reemitir Boleto Mercado Pago' : '⚡ Gerar Boleto Registrado no Mercado Pago'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: PAGAMENTO VIA PIX */}
          {activeTab === 'pix' && (
            <div className="space-y-5">
              {/* Feedback messages */}
              {pixConfirmSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{pixConfirmSuccess}</span>
                </div>
              )}

              {emailSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs">
                  {emailSuccess}
                </div>
              )}

              {/* Bank Account Selection for PIX */}
              <div className="p-4 sm:p-5 rounded-2xl bg-[#241e1b] border border-emerald-500/30 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-sm font-bold text-[#fcf8f5]">
                      Conta Bancária de Recebimento do PIX
                    </h4>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsManageAccountsOpen(true)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>⚙️ Gerenciar / Cadastrar Chaves PIX</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-emerald-200 mb-1.5">
                      Selecione a Conta Bancária do Escritório
                    </label>
                    <select
                      value={selectedPixAccountId}
                      onChange={(e) => setSelectedPixAccountId(e.target.value)}
                      className="w-full bg-[#14110f] border border-[#3d342f] text-[#fcf8f5] text-xs font-medium rounded-xl p-2.5 focus:outline-none focus:border-emerald-500"
                    >
                      {bankAccounts.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} {acc.pixKey ? `(PIX: ${acc.pixKey})` : '(Sem Chave PIX)'}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Summary of Selected Account */}
                  <div className="p-3 rounded-xl bg-[#14110f] border border-[#3d342f] text-xs space-y-1">
                    <div className="text-[#a89c93] flex justify-between">
                      <span>Titular:</span>
                      <strong className="text-[#fcf8f5]">
                        {selectedPixAccount?.beneficiaryName || architectProfile?.name || profile?.companyName || 'Escritório'}
                      </strong>
                    </div>
                    <div className="text-[#a89c93] flex justify-between">
                      <span>Chave PIX:</span>
                      <strong className="text-emerald-300 font-mono">
                        {selectedPixAccount?.pixKey || architectProfile?.pixKey || 'Não cadastrada'}
                      </strong>
                    </div>
                  </div>
                </div>

                {!selectedPixAccount?.pixKey && !architectProfile?.pixKey && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between">
                    <span>Esta conta ainda não possui chave PIX cadastrada.</span>
                    <button
                      type="button"
                      onClick={() => setIsManageAccountsOpen(true)}
                      className="px-2.5 py-1 bg-amber-500/20 text-amber-300 rounded-lg font-bold hover:bg-amber-500/30"
                    >
                      Cadastrar Chave Agora
                    </button>
                  </div>
                )}
              </div>

              {/* PIX QR Code & Copia e Cola Card */}
              <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-[#241e1b] to-[#1a1614] border border-[#3d342f] space-y-5 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Left: QR Code */}
                  <div className="md:col-span-5 flex flex-col items-center justify-center p-4 bg-[#14110f] rounded-2xl border border-[#3d342f]">
                    <div className="p-3 bg-white rounded-xl shadow-md">
                      {isGeneratingPix ? (
                        <div className="w-48 h-48 flex items-center justify-center text-zinc-400">
                          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                        </div>
                      ) : pixQrCodeUrl ? (
                        <img
                          src={pixQrCodeUrl}
                          alt="QR Code PIX Oficial"
                          className="w-48 h-48 object-contain"
                        />
                      ) : (
                        <div className="w-48 h-48 flex items-center justify-center text-zinc-500 text-center text-xs p-4">
                          Cadastre a chave PIX da conta bancária para gerar o QR Code
                        </div>
                      )}
                    </div>
                    <span className="text-[11px] text-emerald-300 mt-2 font-mono flex items-center gap-1 font-semibold">
                      <QrCode className="w-3.5 h-3.5" /> Escanear no app do banco
                    </span>
                  </div>

                  {/* Right: Dados de Pagamento e Botões Rápidos */}
                  <div className="md:col-span-7 space-y-4">
                    <div className="space-y-1">
                      <span className="text-xs text-[#a89c93]">Valor da Parcela:</span>
                      <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400">
                        {formatCurrency(boletoAmount || activeInstallment.amount)}
                      </div>
                      <div className="text-xs text-[#a89c93]">
                        Vencimento: <strong className="text-[#fcf8f5]">{formatDate(boletoDueDate || activeInstallment.dueDate)}</strong>
                      </div>
                    </div>

                    {/* Copiar Chave Direta */}
                    {(selectedPixAccount?.pixKey || architectProfile?.pixKey) && (
                      <div className="p-3 rounded-xl bg-[#14110f] border border-[#3d342f] space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-[#a89c93]">
                          <span>Chave PIX Direta:</span>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                selectedPixAccount?.pixKey || architectProfile?.pixKey || '',
                                'pixKey'
                              )
                            }
                            className="text-emerald-400 hover:text-emerald-200 flex items-center gap-1 font-bold cursor-pointer"
                          >
                            {copiedField === 'pixKey' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copiar Chave
                              </>
                            )}
                          </button>
                        </div>
                        <div className="font-mono text-xs text-[#fcf8f5] break-all font-semibold">
                          {selectedPixAccount?.pixKey || architectProfile?.pixKey}
                        </div>
                      </div>
                    )}

                    {/* PIX Copia e Cola */}
                    {pixCopiaECola && (
                      <div className="p-3 rounded-xl bg-[#14110f] border border-emerald-500/30 space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-[#a89c93]">
                          <span className="text-emerald-300 font-semibold">PIX Copia e Cola (EMV Oficial):</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(pixCopiaECola, 'copiaECola')}
                            className="text-emerald-400 hover:text-emerald-200 flex items-center gap-1 font-bold cursor-pointer"
                          >
                            {copiedField === 'copiaECola' ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" /> Código Copiado!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" /> Copiar Código Copia e Cola
                              </>
                            )}
                          </button>
                        </div>
                        <div className="font-mono text-[11px] text-[#fcf8f5] break-all select-all max-h-16 overflow-y-auto bg-[#1a1614] p-2 rounded-lg border border-[#3d342f]">
                          {pixCopiaECola}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* PIX Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-2 border-t border-[#3d342f]">
                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={handleSendPixWhatsApp}
                    className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar no WhatsApp</span>
                  </button>

                  {/* E-mail */}
                  <button
                    type="button"
                    onClick={() => handleSendEmail('pix')}
                    disabled={isSendingEmail}
                    className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#322924] hover:bg-[#3d342f] text-[#fcf8f5] border border-[#4d423b] font-bold text-xs transition-all cursor-pointer"
                  >
                    {isSendingEmail ? (
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                    ) : (
                      <Mail className="w-4 h-4 text-emerald-400" />
                    )}
                    <span>{isSendingEmail ? 'Enviando...' : 'Enviar por E-mail'}</span>
                  </button>

                  {/* Imprimir Guia */}
                  <button
                    type="button"
                    onClick={handlePrintPix}
                    className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-[#322924] hover:bg-[#3d342f] text-[#fcf8f5] border border-[#4d423b] font-bold text-xs transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-[#c58a4b]" />
                    <span>Imprimir Guia PIX</span>
                  </button>

                  {/* Confirmar Pagamento */}
                  <button
                    type="button"
                    onClick={handleConfirmPixPayment}
                    className="flex items-center justify-center gap-2 py-3 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Dar Baixa PIX</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#3d342f] bg-[#1a1614] flex items-center justify-between shrink-0">
          <div className="text-xs text-[#a89c93] flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sistema Financeiro Integrado • Notificação e Baixa em Tempo Real</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#322924] hover:bg-[#3d342f] text-[#fcf8f5] text-xs font-semibold border border-[#4d423b] transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Nested Bank Accounts Modal for quick configuration */}
      <BankAccountsModal
        isOpen={isManageAccountsOpen}
        onClose={() => setIsManageAccountsOpen(false)}
        initialEditingAccountId={selectedPixAccountId}
      />
    </div>
  );
};

function Clock(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
