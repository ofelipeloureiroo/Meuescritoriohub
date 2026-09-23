import React, { useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  DollarSign,
  Download,
  ExternalLink,
  FileCheck,
  FileSignature,
  FileText,
  Layers,
  Mail,
  MessageCircle,
  PenTool,
  Phone,
  Printer,
  QrCode,
  Send,
  Share2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ContractStatus, DigitalSignature, WorkContract } from '../../types';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { DigitalSignatureModal } from './DigitalSignatureModal';

interface WorkContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: WorkContract | null;
  onSelectAnotherContract?: (contract: WorkContract) => void;
  onDelete?: () => void;
}

export const WorkContractModal: React.FC<WorkContractModalProps> = ({
  isOpen,
  onClose,
  contract,
  onDelete,
}) => {
  const {
    architectProfile,
    bankAccounts,
    architectureProjects,
    freelanceProjects,
    sendContractForSignature,
    signWorkContract,
    markContractAwaitingPayment,
    confirmContractPayment,
    markContractCompleted,
    updateWorkContract,
    deleteWorkContract,
  } = useFinance();

  // Tab order: 1. Visualizar Contrato, 2. Editar Cláusulas, 3. Enviar & Assinatura
  const [activeTab, setActiveTab] = useState<'view' | 'edit' | 'share'>('view');
  const [isSignModalOpen, setIsSignModalOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPix, setCopiedPix] = useState(false);
  const [selectedBankAccountId, setSelectedBankAccountId] = useState(
    bankAccounts[0]?.id || ''
  );
  const [isConfirmingPayment, setIsConfirmingPayment] = useState(false);
  const [paymentAmountToConfirm, setPaymentAmountToConfirm] = useState<number>(0);
  const [emailNotificationSent, setEmailNotificationSent] = useState(false);

  // Editable fields
  const [editTitle, setEditTitle] = useState(contract?.title || '');
  const [editProjectId, setEditProjectId] = useState(contract?.projectId || '');
  const [editProjectTitle, setEditProjectTitle] = useState(contract?.projectTitle || '');
  const [editClientName, setEditClientName] = useState(contract?.clientName || '');
  const [editClientDocument, setEditClientDocument] = useState(contract?.clientDocument || '');
  const [editClientEmail, setEditClientEmail] = useState(contract?.clientEmail || '');
  const [editClientPhone, setEditClientPhone] = useState(contract?.clientPhone || '');
  const [editScope, setEditScope] = useState(contract?.serviceScope || '');
  const [editTotal, setEditTotal] = useState(contract?.totalAmount || 0);
  const [editDownPayment, setEditDownPayment] = useState(contract?.downPaymentAmount || 0);
  const [editTerms, setEditTerms] = useState(contract?.paymentTerms || '');
  const [editPixKey, setEditPixKey] = useState(contract?.pixKey || architectProfile.pixKey || '');
  const [editDeadline, setEditDeadline] = useState(contract?.deadline || '');

  const effectiveStatus: ContractStatus = React.useMemo(() => {
    if (!contract) return 'draft';
    if (contract.status === 'completed') return 'completed';
    if (contract.status === 'cancelled') return 'cancelled';

    const pTitle = contract.projectTitle?.trim().toLowerCase();
    const pClient = contract.clientName?.trim().toLowerCase();
    const linkedArch = architectureProjects.find((p) => {
      if (contract.projectId && p.id === contract.projectId) return true;
      if (pTitle && p.title && p.title.trim().toLowerCase() === pTitle) {
        if (!pClient || !p.clientName || p.clientName.trim().toLowerCase() === pClient) return true;
      }
      return false;
    });

    if (linkedArch && (linkedArch.status === 'entregue' || linkedArch.completed)) {
      return 'completed';
    }

    const linkedFreela = freelanceProjects.find((p) => {
      if (contract.projectId && p.id === contract.projectId) return true;
      if (pTitle && p.title && p.title.trim().toLowerCase() === pTitle) return true;
      return false;
    });

    if (linkedFreela && (linkedFreela.status === 'delivered' || linkedFreela.status === 'completed')) {
      return 'completed';
    }

    return contract.status;
  }, [contract, architectureProjects, freelanceProjects]);

  React.useEffect(() => {
    if (contract) {
      setEditTitle(contract.title || '');
      setEditProjectId(contract.projectId || '');
      setEditProjectTitle(contract.projectTitle || '');
      setEditClientName(contract.clientName || '');
      setEditClientDocument(contract.clientDocument || '');
      setEditClientEmail(contract.clientEmail || '');
      setEditClientPhone(contract.clientPhone || '');
      setEditScope(contract.serviceScope || '');
      setEditTotal(contract.totalAmount || 0);
      setEditDownPayment(contract.downPaymentAmount || contract.totalAmount * 0.5);
      setEditTerms(contract.paymentTerms || '');
      setEditPixKey(contract.pixKey || architectProfile.pixKey || '');
      setEditDeadline(contract.deadline || '');
      setPaymentAmountToConfirm(contract.downPaymentAmount || contract.totalAmount);
    }
  }, [contract, architectProfile]);

  if (!isOpen || !contract) return null;

  const getStatusBadge = (status: ContractStatus) => {
    switch (status) {
      case 'draft':
        return {
          label: 'Minuta / Em Elaboração',
          color: 'bg-stone-100 text-stone-700 border-stone-300',
          icon: FileText,
        };
      case 'sent_for_signature':
        return {
          label: 'Enviado para Assinatura',
          color: 'bg-amber-50 text-amber-700 border-amber-300',
          icon: Send,
        };
      case 'signed':
        return {
          label: 'Contrato Assinado',
          color: 'bg-emerald-50 text-emerald-700 border-emerald-300 font-semibold',
          icon: FileCheck,
        };
      case 'awaiting_payment':
        return {
          label: 'Aguardando Pagamento do Cliente',
          color: 'bg-purple-50 text-purple-700 border-purple-300 font-semibold animate-pulse',
          icon: Clock,
        };
      case 'paid':
        return {
          label: 'Pago & Em Execução',
          color: 'bg-teal-50 text-teal-700 border-teal-300 font-semibold',
          icon: CheckCircle2,
        };
      case 'completed':
        return {
          label: 'Pago & Entregue',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-400 font-bold',
          icon: CheckCircle2,
        };
      case 'cancelled':
        return {
          label: 'Cancelado',
          color: 'bg-rose-50 text-rose-700 border-rose-300',
          icon: X,
        };
      default:
        return {
          label: status,
          color: 'bg-stone-100 text-stone-700 border-stone-300',
          icon: FileText,
        };
    }
  };

  const statusInfo = getStatusBadge(effectiveStatus);
  const StatusIcon = statusInfo.icon;

  // WhatsApp sharing message
  const generateWhatsAppMessage = () => {
    const profName = architectProfile?.name || 'Profissional';
    const clientFirstName = (contract.clientName || 'Cliente').split(' ')[0];
    const formattedValue = formatCurrency(contract.totalAmount);
    const formattedDownPayment = formatCurrency(contract.downPaymentAmount || contract.totalAmount * 0.5);
    const pix = contract.pixKey || architectProfile.pixKey || architectProfile.email || 'lfquadrosdecorativos@gmail.com';

    if (effectiveStatus === 'awaiting_payment') {
      return `Olá ${clientFirstName}! Tudo bem? Aqui é ${profName} 📐✨\n\n` +
        `Recebemos com sucesso a assinatura do seu contrato para o projeto "${contract.projectTitle}".\n\n` +
        `⏳ Para darmos início oficial às etapas de execução, segue a chave PIX para pagamento da entrada no valor de ${formattedDownPayment}:\n\n` +
        `💳 Chave PIX: ${pix}\n` +
        `Favorecido: ${profName}\n\n` +
        `Assim que realizar o pagamento, por gentileza nos envie o comprovante por aqui. Muito obrigado(a)!`;
    }

    if (effectiveStatus === 'signed') {
      return `Olá ${clientFirstName}! Tudo bem? Aqui é ${profName} 📐✨\n\n` +
        `Confirmamos a assinatura digital do seu Contrato de Prestação de Serviços para o projeto "${contract.projectTitle}".\n\n` +
        `O documento foi devidamente autenticado com carimbo digital e código de verificação.\n\n` +
        `Estamos muito felizes em iniciar este trabalho com você!`;
    }

    return `Olá ${clientFirstName}! Tudo bem? Aqui é ${profName} 📐✨\n\n` +
      `Estou enviando o Contrato de Prestação de Serviços referente ao projeto "${contract.projectTitle}".\n\n` +
      `📋 Resumo do Contrato:\n` +
      `• Serviço: ${contract.title}\n` +
      `• Valor Total: ${formattedValue}\n` +
      `• Condições: ${contract.paymentTerms || 'Conforme combinado'}\n` +
      `• Prazo Estimado: ${contract.deadline ? formatDate(contract.deadline) : 'A combinar'}\n\n` +
      `Por favor, revise os termos e realize a assinatura digital para que possamos iniciar o cronograma. Qualquer dúvida, estou à total disposição!`;
  };

  const handleSendViaWhatsApp = () => {
    sendContractForSignature(contract.id);
    const rawPhone = (contract.clientPhone || '').replace(/\D/g, '');
    const fullPhone = rawPhone.length <= 11 ? `55${rawPhone}` : rawPhone;
    const msg = encodeURIComponent(generateWhatsAppMessage());
    window.open(`https://wa.me/${fullPhone}?text=${msg}`, '_blank');
  };

  const handleCopyShareLink = () => {
    const textToCopy = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS - ${contract.projectTitle}\nCliente: ${contract.clientName}\nValor: ${formatCurrency(contract.totalAmount)}\nCondições: ${contract.paymentTerms}\nStatus: ${statusInfo.label}\n\n${generateWhatsAppMessage()}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyPix = () => {
    const pix = contract.pixKey || architectProfile.pixKey || architectProfile.email || 'lfquadrosdecorativos@gmail.com';
    navigator.clipboard.writeText(pix);
    setCopiedPix(true);
    setTimeout(() => setCopiedPix(false), 2500);
  };

  // Envio de email com a via assinada para o email do profissional
  const handleSendEmailToArchitect = () => {
    const targetEmail = architectProfile.email || 'lfquadrosdecorativos@gmail.com';
    const subject = encodeURIComponent(`[Contrato] ${contract.title} - ${contract.clientName}`);
    const statusLabel = effectiveStatus === 'signed' ? 'ASSINADO DIGITALMENTE' : effectiveStatus === 'completed' ? 'PAGO & ENTREGUE' : effectiveStatus === 'paid' ? 'PAGO & EM EXECUÇÃO' : 'EM ELABORAÇÃO';
    
    const body = `Prezado(a) ${architectProfile.name},\n\n` +
      `Segue a via autenticada do Contrato de Prestação de Serviços:\n\n` +
      `===================================================\n` +
      `INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS\n` +
      `===================================================\n\n` +
      `• TÍTULO DO CONTRATO: ${contract.title}\n` +
      `• PROJETO VINCULADO: ${contract.projectTitle}\n` +
      `• CONTRATANTE (CLIENTE): ${contract.clientName}\n` +
      `• DOCUMENTO CLIENTE: ${contract.clientDocument || 'Não informado'}\n` +
      `• EMAIL CLIENTE: ${contract.clientEmail || 'Não informado'}\n` +
      `• TELEFONE CLIENTE: ${contract.clientPhone || 'Não informado'}\n\n` +
      `• CONTRATADO(A): ${architectProfile.name} (${architectProfile.title || 'Escritório'})\n` +
      `• CHAVE PIX: ${contract.pixKey || architectProfile.pixKey || 'Não cadastrada'}\n\n` +
      `--- DADOS FINANCEIROS & PRAZOS ---\n` +
      `• VALOR TOTAL: ${formatCurrency(contract.totalAmount)}\n` +
      `• VALOR DO SINAL / ENTRADA: ${formatCurrency(contract.downPaymentAmount || contract.totalAmount * 0.5)}\n` +
      `• CONDIÇÃO DE PAGAMENTO: ${contract.paymentTerms || 'A combinar'}\n` +
      `• PRAZO ESTIMADO DE ENTREGA: ${contract.deadline ? formatDate(contract.deadline) : 'Conforme cronograma'}\n` +
      `• STATUS: ${statusLabel}\n\n` +
      (contract.clientSignature ? 
        `--- AUDITORIA DA ASSINATURA DIGITAL ---\n` +
        `• Signatário: ${contract.clientSignature.signerName}\n` +
        `• Código de Autenticação ICP: ${contract.clientSignature.verificationCode}\n` +
        `• Data e Hora da Assinatura: ${formatDate(contract.clientSignature.signedAt)}\n` +
        `• Conforme MP 2.200-2/2001 e Lei 14.063/2020\n\n` : '') +
      `--- ESCOPO DETALHADO DOS SERVIÇOS ---\n` +
      `${contract.serviceScope}\n\n` +
      `Documento autenticado digitalmente em Meu Escritório Online.`;

    window.open(`mailto:${targetEmail}?subject=${subject}&body=${encodeURIComponent(body)}`, '_blank');
    setEmailNotificationSent(true);
    setTimeout(() => setEmailNotificationSent(false), 4000);
  };

  // Envio de email para o cliente
  const handleSendEmailToClient = () => {
    const targetEmail = contract.clientEmail;
    if (!targetEmail) {
      alert('Por favor, cadastre o e-mail do cliente na aba "Editar Cláusulas" para enviar.');
      return;
    }
    const subject = encodeURIComponent(`Contrato de Prestação de Serviços - ${contract.projectTitle} - ${architectProfile.name}`);
    const body = `Olá ${contract.clientName},\n\n` +
      `Segue a via do seu Contrato de Prestação de Serviços referente ao projeto "${contract.projectTitle}".\n\n` +
      `• Profissional Responsável: ${architectProfile.name}\n` +
      `• Valor Total: ${formatCurrency(contract.totalAmount)}\n` +
      `• Condição de Pagamento: ${contract.paymentTerms}\n` +
      `• Prazo Estimado: ${contract.deadline ? formatDate(contract.deadline) : 'Conforme cronograma'}\n` +
      (contract.clientSignature ? `• Status: Assinado Digitalmente (Cód. ${contract.clientSignature.verificationCode})\n` : '') +
      `\nAtenciosamente,\n${architectProfile.name}\n${architectProfile.email || ''}`;

    window.open(`mailto:${targetEmail}?subject=${subject}&body=${encodeURIComponent(body)}`, '_blank');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    updateWorkContract(contract.id, {
      title: editTitle,
      projectId: editProjectId,
      projectTitle: editProjectTitle || editTitle,
      clientName: editClientName,
      clientDocument: editClientDocument,
      clientEmail: editClientEmail,
      clientPhone: editClientPhone,
      serviceScope: editScope,
      totalAmount: Number(editTotal),
      downPaymentAmount: Number(editDownPayment),
      paymentTerms: editTerms,
      pixKey: editPixKey,
      deadline: editDeadline,
    });
    setActiveTab('view');
  };

  const handleConfirmPaymentSubmit = () => {
    confirmContractPayment(contract.id, selectedBankAccountId);
    setIsConfirmingPayment(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#faf8f5] border border-stone-200 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 my-auto flex flex-col max-h-[92vh]">
        {/* Light Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm bg-amber-500/15 text-amber-700 border border-amber-500/30">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif font-bold text-lg text-stone-900">
                  {contract.title}
                </h2>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusInfo.color}`}
                >
                  <StatusIcon className="w-3.5 h-3.5" />
                  <span>{statusInfo.label}</span>
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Cliente: <strong className="text-stone-800">{contract.clientName}</strong> • Projeto:{' '}
                <strong className="text-stone-800">{contract.projectTitle}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSendEmailToArchitect}
              title="Receber no meu e-mail"
              className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-medium"
            >
              <Mail className="w-4 h-4 text-amber-700" />
              <span className="hidden sm:inline">Meu E-mail</span>
            </button>
            <button
              onClick={handlePrint}
              title="Imprimir Contrato"
              className="p-2 rounded-xl border border-stone-200 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsConfirmingDelete(true)}
              title="Excluir Contrato"
              className="p-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 hover:text-rose-800 hover:bg-rose-100 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl border border-stone-200 text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Workflow Stepper & Tabs Header */}
        <div className="bg-stone-50 border-b border-stone-200 px-6 py-3 shrink-0 flex flex-wrap items-center justify-between gap-3">
          {/* Status Pipeline Step Indicators */}
          <div className="flex items-center gap-1 text-[11px] overflow-x-auto py-1 max-w-full">
            <span
              className={`px-2 py-1 rounded-lg border font-medium ${
                effectiveStatus === 'draft'
                  ? 'bg-amber-600 text-white border-amber-600 font-bold shadow-2xs'
                  : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              1. Minuta
            </span>
            <span className="text-stone-400">→</span>
            <span
              className={`px-2 py-1 rounded-lg border font-medium ${
                effectiveStatus === 'sent_for_signature'
                  ? 'bg-amber-500 text-white border-amber-500 font-bold shadow-2xs'
                  : contract.sentAt
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
                  : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              2. Enviado
            </span>
            <span className="text-stone-400">→</span>
            <span
              className={`px-2 py-1 rounded-lg border font-medium ${
                effectiveStatus === 'signed'
                  ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                  : contract.signedAt
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
                  : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              3. Assinado
            </span>
            <span className="text-stone-400">→</span>
            <span
              className={`px-2 py-1 rounded-lg border font-medium ${
                effectiveStatus === 'awaiting_payment'
                  ? 'bg-purple-600 text-white border-purple-600 font-bold shadow-2xs'
                  : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              4. Aguardando Pagamento
            </span>
            <span className="text-stone-400">→</span>
            <span
              className={`px-2 py-1 rounded-lg border font-medium ${
                effectiveStatus === 'paid'
                  ? 'bg-teal-600 text-white border-teal-600 font-bold shadow-2xs'
                  : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              5. Pago & Execução
            </span>
            <span className="text-stone-400">→</span>
            <span
              className={`px-2 py-1 rounded-lg border font-medium ${
                effectiveStatus === 'completed'
                  ? 'bg-emerald-700 text-white border-emerald-700 font-bold shadow-2xs'
                  : 'bg-white text-stone-600 border-stone-200'
              }`}
            >
              6. Pago & Entregue
            </span>
          </div>

          {/* Quick Tabs in correct requested order: Visualizar -> Editar Cláusulas -> Enviar & Assinatura */}
          <div className="flex items-center gap-1 bg-stone-200/70 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('view')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'view'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Visualizar Contrato
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'edit'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Editar Cláusulas
            </button>
            <button
              onClick={() => setActiveTab('share')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'share'
                  ? 'bg-white text-stone-900 shadow-2xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Enviar para Assinatura
            </button>
          </div>
        </div>

        {/* Scrollable Light Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-[#faf8f5]">
          {emailNotificationSent && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-xs text-emerald-800 animate-in fade-in">
              <span className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Via assinada formatada com sucesso! Cliente de e-mail aberto para envio.
              </span>
            </div>
          )}

          {/* TAB 1: VIEW FORMAL CONTRACT */}
          {activeTab === 'view' && (
            <div className="space-y-6">
              {/* Highlight Notification Banner per Status */}
              {effectiveStatus === 'awaiting_payment' && (
                <div className="p-4 rounded-2xl bg-purple-50 border border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                      <Clock className="w-5 h-5 animate-spin" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-purple-900 font-serif">
                        Aguardando Pagamento do Cliente
                      </h4>
                      <p className="text-xs text-purple-700">
                        O contrato já foi assinado. Aguardando a confirmação do pagamento de{' '}
                        <strong className="text-purple-900 font-bold">
                          {formatCurrency(contract.downPaymentAmount || contract.totalAmount)}
                        </strong>.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={handleCopyPix}
                      className="px-3 py-1.5 rounded-xl bg-white border border-purple-200 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      {copiedPix ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedPix ? 'Pix Copiado!' : 'Copiar Chave Pix'}</span>
                    </button>
                    <button
                      onClick={() => setIsConfirmingPayment(true)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Confirmar Pagamento</span>
                    </button>
                  </div>
                </div>
              )}

              {effectiveStatus === 'signed' && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900 font-serif flex items-center gap-2">
                        <span>Contrato Assinado com Sucesso!</span>
                        <span className="text-[10px] bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full font-mono text-emerald-800">
                          {contract.clientSignature?.verificationCode || 'VALIDADO'}
                        </span>
                      </h4>
                      <p className="text-xs text-emerald-700">
                        Assinado por <strong>{contract.clientSignature?.signerName || contract.clientName}</strong> em{' '}
                        {contract.signedAt ? formatDate(contract.signedAt) : 'Data recente'}.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSendEmailToArchitect}
                      className="px-3 py-1.5 rounded-xl bg-white border border-emerald-300 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Mail className="w-3.5 h-3.5 text-emerald-700" />
                      <span>Receber no E-mail</span>
                    </button>
                    <button
                      onClick={() => markContractAwaitingPayment(contract.id)}
                      className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>Avançar p/ Aguardando Pagamento</span>
                    </button>
                  </div>
                </div>
              )}

              {effectiveStatus === 'paid' && (
                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-100 border border-teal-200 flex items-center justify-center text-teal-700 shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-teal-700" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-teal-900 font-serif">
                        Contrato Pago & Em Execução
                      </h4>
                      <p className="text-xs text-teal-700">
                        O pagamento foi confirmado e o projeto está em andamento. Quando o projeto for concluído, marque como pago e entregue.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => markContractCompleted(contract.id)}
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Marcar como Pago & Entregue</span>
                  </button>
                </div>
              )}

              {effectiveStatus === 'completed' && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900 font-serif">
                        Projeto Entregue & Contrato Concluído ✓
                      </h4>
                      <p className="text-xs text-emerald-700">
                        Este projeto vinculado e seu contrato estão 100% concluídos, pagos e entregues ao cliente.
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold shrink-0">
                    Pago & Entregue ✓
                  </span>
                </div>
              )}

              {/* The Formal Document Paper Sheet (Pure Luxury Light Mode) */}
              <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-10 space-y-6 text-stone-800 text-xs leading-relaxed shadow-sm font-sans relative">
                {/* Formal Seal Watermark in Top Right */}
                <div className="absolute top-6 right-6 text-right">
                  <span
                    className={`inline-block px-3.5 py-1 rounded-full text-[11px] font-bold border uppercase tracking-wider ${statusInfo.color}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                {/* Contract Header */}
                <div className="border-b border-stone-200 pb-5">
                  <h3 className="font-serif font-extrabold text-base text-stone-900 uppercase tracking-wide">
                    INSTRUMENTO PARTICULAR DE CONTRATO DE PRESTAÇÃO DE SERVIÇOS
                  </h3>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Regido pela legislação civil brasileira aplicável e pelas condições abaixo avençadas.
                  </p>
                </div>

                {/* Partes Contratantes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                  <div>
                    <h5 className="font-serif font-bold text-stone-900 text-xs mb-1 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-700" />
                      <span>CONTRATADO(A) (PROFISSIONAL):</span>
                    </h5>
                    <p className="font-semibold text-stone-900">{architectProfile.name}</p>
                    <p className="text-stone-600">{architectProfile.title}</p>
                    <p className="text-stone-600">{architectProfile.specialty}</p>
                    <p className="text-stone-600">Local: {architectProfile.location}</p>
                    {architectProfile.pixKey && (
                      <p className="text-amber-800 mt-1 font-mono text-[11px]">
                        Chave PIX: {architectProfile.pixKey}
                      </p>
                    )}
                  </div>

                  <div>
                    <h5 className="font-serif font-bold text-stone-900 text-xs mb-1 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-amber-700" />
                      <span>CONTRATANTE (CLIENTE):</span>
                    </h5>
                    <p className="font-semibold text-stone-900">{contract.clientName}</p>
                    {contract.clientDocument && (
                      <p className="text-stone-600">CPF/CNPJ: {contract.clientDocument}</p>
                    )}
                    {contract.clientPhone && (
                      <p className="text-stone-600">Telefone/WhatsApp: {contract.clientPhone}</p>
                    )}
                    {contract.clientEmail && (
                      <p className="text-stone-600">Email: {contract.clientEmail}</p>
                    )}
                    {contract.clientAddress && (
                      <p className="text-stone-600">Endereço: {contract.clientAddress}</p>
                    )}
                  </div>
                </div>

                {/* Cláusula 1: Objeto do Contrato */}
                <div className="space-y-1.5">
                  <h4 className="font-serif font-bold text-amber-800 text-xs uppercase tracking-wider">
                    CLÁUSULA 1ª — DO OBJETO E ESCOPO DOS SERVIÇOS
                  </h4>
                  <p className="text-stone-700">
                    O presente contrato tem por objeto a prestação de serviços profissionais referente ao projeto intitulado{' '}
                    <strong className="text-stone-900 font-semibold">"{contract.projectTitle}"</strong>, compreendendo o seguinte escopo detalhado:
                  </p>
                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-stone-700 italic">
                    {contract.serviceScope || 'Desenvolvimento completo dos serviços contratados conforme especificações acordadas.'}
                  </div>
                </div>

                {/* Cláusula 2: Honorários e Condições Financeiras */}
                <div className="space-y-1.5">
                  <h4 className="font-serif font-bold text-amber-800 text-xs uppercase tracking-wider">
                    CLÁUSULA 2ª — DOS HONORÁRIOS E FORMA DE PAGAMENTO
                  </h4>
                  <p className="text-stone-700">
                    Pelos serviços prestados, o CONTRATANTE pagará ao CONTRATADO o valor total de{' '}
                    <strong className="text-emerald-700 font-serif text-sm font-bold">
                      {formatCurrency(contract.totalAmount)}
                    </strong>
                    , estipulado nas seguintes condições:
                  </p>
                  <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <p className="text-stone-900 font-medium">
                      • Condição de Pagamento: <span className="text-stone-700 font-normal">{contract.paymentTerms || 'Conforme combinado'}</span>
                    </p>
                    {contract.downPaymentAmount ? (
                      <p className="text-stone-900 font-medium">
                        • Valor do Sinal / Entrada: <span className="text-emerald-700 font-bold">{formatCurrency(contract.downPaymentAmount)}</span>
                      </p>
                    ) : null}
                    <div className="pt-2 border-t border-stone-200 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-stone-600 text-xs">
                        💳 Chave PIX Oficial: <strong className="text-stone-900 font-mono">{contract.pixKey || architectProfile.pixKey || architectProfile.email || 'lfquadrosdecorativos@gmail.com'}</strong>
                      </span>
                      <button
                        onClick={handleCopyPix}
                        className="px-2.5 py-1 rounded-lg bg-white hover:bg-stone-100 text-stone-800 text-[11px] font-bold border border-stone-200 flex items-center gap-1 cursor-pointer shadow-2xs"
                      >
                        {copiedPix ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedPix ? 'Copiado' : 'Copiar Chave'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Cláusula 3: Prazos e Entregas */}
                <div className="space-y-1.5">
                  <h4 className="font-serif font-bold text-amber-800 text-xs uppercase tracking-wider">
                    CLÁUSULA 3ª — DOS PRAZOS E CRONOGRAMA
                  </h4>
                  <p className="text-stone-700">
                    Os trabalhos terão início oficial após a confirmação da assinatura deste instrumento e do pagamento da entrada/sinal acordado. O prazo estimado para a entrega final é{' '}
                    <strong className="text-stone-900">
                      {contract.deadline ? formatDate(contract.deadline) : 'conforme cronograma de etapas acordado entre as partes'}
                    </strong>
                    .
                  </p>
                </div>

                {/* Cláusula 4: Assinatura Digital e Validade Jurídica */}
                <div className="space-y-1.5">
                  <h4 className="font-serif font-bold text-amber-800 text-xs uppercase tracking-wider">
                    CLÁUSULA 4ª — DA ASSINATURA ELETRÔNICA E VALIDADE
                  </h4>
                  <p className="text-stone-700">
                    As partes reconhecem a validade jurídica de qualquer manifestação de vontade, aceite ou assinatura colhida de forma eletrônica neste ambiente, conferindo plena eficácia jurídica aos termos deste contrato nos moldes da MP 2.200-2/2001 e Lei nº 14.063/2020.
                  </p>
                </div>

                {/* Digital Signature Audit Box */}
                <div className="pt-6 border-t border-stone-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Professional Side */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-center space-y-1">
                    <span className="text-[10px] text-stone-500 block uppercase tracking-wider font-semibold">
                      CONTRATADO(A)
                    </span>
                    <p className="font-serif italic text-base text-amber-800 font-bold">
                      {architectProfile.name}
                    </p>
                    <p className="text-[11px] text-stone-700 font-medium">{architectProfile.name}</p>
                    <span className="text-[10px] text-emerald-700 font-medium flex items-center justify-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" /> Assinado pelo Emissor
                    </span>
                  </div>

                  {/* Client Side Signature */}
                  <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-center space-y-1">
                    <span className="text-[10px] text-stone-500 block uppercase tracking-wider font-semibold">
                      CONTRATANTE / CLIENTE
                    </span>
                    {contract.clientSignature ? (
                      <div className="space-y-1">
                        {contract.clientSignature.signatureDataUrl ? (
                          <img
                            src={contract.clientSignature.signatureDataUrl}
                            alt="Assinatura do Cliente"
                            className="h-12 mx-auto object-contain"
                          />
                        ) : (
                          <p className="font-serif italic text-lg text-emerald-700 font-bold">
                            {contract.clientSignature.signerName}
                          </p>
                        )}
                        <p className="text-[11px] text-stone-800 font-medium">
                          {contract.clientSignature.signerName}
                        </p>
                        <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-[10px] text-emerald-800 font-mono">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{contract.clientSignature.verificationCode}</span>
                        </div>
                        <p className="text-[10px] text-stone-500">
                          Assinado em {formatDate(contract.clientSignature.signedAt)}
                        </p>
                      </div>
                    ) : (
                      <div className="py-2 space-y-2">
                        <p className="text-xs text-amber-700 font-medium">
                          {effectiveStatus === 'sent_for_signature'
                            ? '📤 Enviado - Aguardando Assinatura do Cliente'
                            : 'Pendente de Assinatura'}
                        </p>
                        <button
                          onClick={() => setIsSignModalOpen(true)}
                          className="px-3 py-1.5 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                        >
                          <PenTool className="w-3.5 h-3.5" />
                          <span>Assinar Agora (Cliente)</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EDIT CLAUSES & LINK PROJECT */}
          {activeTab === 'edit' && (
            <form onSubmit={handleSaveEdit} className="space-y-5 max-w-2xl mx-auto">
              <div className="p-6 bg-white border border-stone-200 rounded-3xl space-y-4 shadow-xs">
                <div className="flex items-center gap-2.5 pb-2 border-b border-stone-100">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-stone-900">
                      Personalizar Dados e Cláusulas do Contrato
                    </h3>
                    <p className="text-xs text-stone-500">
                      Edite as informações das partes, valores e vincule a um projeto do seu escritório.
                    </p>
                  </div>
                </div>

                {/* Vínculo com Projeto do Escritório */}
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl space-y-2">
                  <label className="block text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-700" />
                    <span>Vincular a um Projeto do Escritório</span>
                  </label>
                  <select
                    value={editProjectId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      setEditProjectId(selId);
                      const found = architectureProjects.find((p) => p.id === selId);
                      if (found) {
                        setEditProjectTitle(found.title);
                        if (!editClientName && found.clientName) {
                          setEditClientName(found.clientName);
                        }
                      }
                    }}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 font-medium focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">(Sem vínculo específico — Contrato Avulso / Geral)</option>
                    {architectureProjects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        📁 {proj.title} {proj.clientName ? `(Cliente: ${proj.clientName})` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-stone-500">
                    Ao vincular o contrato ao projeto, os prazos, valores e conclusão ficam automaticamente sincronizados no seu painel.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Título do Contrato / Documento *
                    </label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Nome do Cliente
                    </label>
                    <input
                      type="text"
                      value={editClientName}
                      onChange={(e) => setEditClientName(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      CPF ou CNPJ do Cliente
                    </label>
                    <input
                      type="text"
                      value={editClientDocument}
                      onChange={(e) => setEditClientDocument(e.target.value)}
                      placeholder="000.000.000-00"
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Email do Cliente
                    </label>
                    <input
                      type="email"
                      value={editClientEmail}
                      onChange={(e) => setEditClientEmail(e.target.value)}
                      placeholder="cliente@email.com"
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Telefone / WhatsApp do Cliente
                    </label>
                    <input
                      type="text"
                      value={editClientPhone}
                      onChange={(e) => setEditClientPhone(e.target.value)}
                      placeholder="(21) 99999-9999"
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Escopo Detalhado dos Serviços (Cláusula 1ª)
                  </label>
                  <textarea
                    rows={4}
                    value={editScope}
                    onChange={(e) => setEditScope(e.target.value)}
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Valor Total dos Honorários (R$)
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      step="any"
                      value={editTotal}
                      onChange={(e) => setEditTotal(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 font-bold focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Valor do Sinal / Entrada (R$)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      value={editDownPayment}
                      onChange={(e) => setEditDownPayment(Number(e.target.value))}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 font-bold focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Condições de Pagamento (Cláusula 2ª)
                  </label>
                  <input
                    type="text"
                    value={editTerms}
                    onChange={(e) => setEditTerms(e.target.value)}
                    placeholder="Ex: 50% de entrada no ato + 50% na entrega final"
                    className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Chave PIX para Depósito
                    </label>
                    <input
                      type="text"
                      value={editPixKey}
                      onChange={(e) => setEditPixKey(e.target.value)}
                      placeholder="Chave Pix"
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Data Limite Estimada (Prazo Final de Entrega)
                    </label>
                    <input
                      type="date"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setActiveTab('view')}
                    className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 cursor-pointer"
                  >
                    Voltar para Visualização
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl text-xs font-bold text-stone-700 bg-stone-100 hover:bg-stone-200 border border-stone-300 cursor-pointer"
                    >
                      Salvar Alterações
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        handleSaveEdit(e);
                        setActiveTab('share');
                      }}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow-xs cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Salvar & Avançar para Enviar Assinatura</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: ENVIAR & ASSINATURA */}
          {activeTab === 'share' && (
            <div className="space-y-6 max-w-2xl mx-auto">
              {/* E-mail Delivery Option (Architect & Client) */}
              <div className="p-5 bg-white border border-stone-200 rounded-3xl space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800 shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-stone-900">
                      Receber ou Enviar Contrato por E-mail
                    </h3>
                    <p className="text-xs text-stone-500">
                      Receba a via completa e autenticada no seu e-mail ou envie diretamente ao cliente.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={handleSendEmailToArchitect}
                    className="p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 flex flex-col items-start gap-1 transition-all cursor-pointer text-left shadow-2xs group"
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-amber-800 group-hover:text-amber-900">
                      <Mail className="w-4 h-4" />
                      <span>Receber no Meu E-mail</span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Envia a via completa para <strong className="text-stone-700">{architectProfile.email || 'lfquadrosdecorativos@gmail.com'}</strong>
                    </p>
                  </button>

                  <button
                    onClick={handleSendEmailToClient}
                    className="p-3.5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 text-stone-800 flex flex-col items-start gap-1 transition-all cursor-pointer text-left shadow-2xs group"
                  >
                    <div className="flex items-center gap-2 font-bold text-xs text-stone-800 group-hover:text-stone-900">
                      <Send className="w-4 h-4 text-emerald-600" />
                      <span>Enviar p/ E-mail do Cliente</span>
                    </div>
                    <p className="text-[11px] text-stone-500">
                      Envia para <strong className="text-stone-700">{contract.clientEmail || 'e-mail do cliente'}</strong>
                    </p>
                  </button>
                </div>
              </div>

              {/* WhatsApp Share Card */}
              <div className="p-5 bg-white border border-stone-200 rounded-3xl space-y-4 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-700 shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-base text-stone-900">
                      Enviar Contrato no WhatsApp
                    </h3>
                    <p className="text-xs text-stone-500">
                      Mensagem formatada com resumo, valores, condições e instruções de assinatura.
                    </p>
                  </div>
                </div>

                {/* Pre-built message preview */}
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1.5">
                    Prévia da Mensagem para Envio:
                  </label>
                  <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl text-xs text-stone-800 whitespace-pre-wrap font-sans leading-relaxed">
                    {generateWhatsAppMessage()}
                  </div>
                </div>

                {/* Share Actions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={handleSendViaWhatsApp}
                    className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-xs transition-all"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Enviar no WhatsApp com 1 Clique</span>
                  </button>

                  <button
                    onClick={handleCopyShareLink}
                    className="py-3 px-4 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-800 font-bold text-xs border border-stone-300 flex items-center justify-center gap-2 cursor-pointer transition-all"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-stone-600" />}
                    <span>{copiedLink ? 'Texto Copiado!' : 'Copiar Texto da Proposta'}</span>
                  </button>
                </div>
              </div>

              {/* Status Update Quick Triggers */}
              <div className="p-5 bg-white border border-stone-200 rounded-3xl space-y-4 shadow-xs">
                <h4 className="font-serif font-bold text-sm text-stone-900">
                  Controle Manual do Status do Contrato
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  <button
                    onClick={() => sendContractForSignature(contract.id)}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                      effectiveStatus === 'sent_for_signature'
                        ? 'bg-amber-50 text-amber-800 border-amber-400 shadow-2xs font-bold'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Send className="w-4 h-4 text-amber-600" />
                    <span>Marcar como Enviado</span>
                  </button>

                  <button
                    onClick={() => setIsSignModalOpen(true)}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                      effectiveStatus === 'signed'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-2xs font-bold'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <PenTool className="w-4 h-4 text-emerald-600" />
                    <span>{effectiveStatus === 'signed' ? 'Contrato Assinado ✓' : 'Assinar Digitalmente'}</span>
                  </button>

                  <button
                    onClick={() => markContractAwaitingPayment(contract.id)}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                      effectiveStatus === 'awaiting_payment'
                        ? 'bg-purple-50 text-purple-800 border-purple-400 shadow-2xs font-bold'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <Clock className="w-4 h-4 text-purple-600" />
                    <span>Aguardando Pagamento</span>
                  </button>

                  <button
                    onClick={() => markContractCompleted(contract.id)}
                    className={`p-3 rounded-2xl border text-xs font-bold flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                      effectiveStatus === 'completed'
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-500 shadow-2xs font-bold'
                        : 'bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>{effectiveStatus === 'completed' ? 'Pago & Entregue ✓' : 'Marcar Pago & Entregue'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Light Modal Footer */}
        <div className="px-6 py-4 border-t border-stone-200 bg-white shrink-0 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-stone-600">
            <span>Valor Total:</span>
            <strong className="text-emerald-700 font-serif text-sm font-bold">
              {formatCurrency(contract.totalAmount)}
            </strong>
          </div>

          <div className="flex items-center gap-2">
            {effectiveStatus === 'draft' && (
              <button
                onClick={() => setActiveTab('edit')}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Editar Cláusulas</span>
              </button>
            )}

            {effectiveStatus === 'sent_for_signature' && (
              <>
                <button
                  onClick={handleSendViaWhatsApp}
                  className="px-3 py-2 rounded-xl bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-bold border border-stone-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Reenviar WhatsApp</span>
                </button>
                <button
                  onClick={() => setIsSignModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
                >
                  <PenTool className="w-3.5 h-3.5" />
                  <span>Assinar Contrato</span>
                </button>
              </>
            )}

            {effectiveStatus === 'signed' && (
              <button
                onClick={() => markContractAwaitingPayment(contract.id)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Marcar Aguardando Pagamento</span>
              </button>
            )}

            {effectiveStatus === 'awaiting_payment' && (
              <button
                onClick={() => setIsConfirmingPayment(true)}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs transition-all"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirmar Pagamento Recebido</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      </div>

      {/* Digital Signature Modal */}
      {isSignModalOpen && (
        <DigitalSignatureModal
          isOpen={isSignModalOpen}
          onClose={() => setIsSignModalOpen(false)}
          contract={contract}
          onSign={(signature) => {
            signWorkContract(contract.id, signature);
            // After signing, prompt sending email copy
            setTimeout(() => {
              handleSendEmailToArchitect();
            }, 500);
          }}
        />
      )}

      {/* Payment Confirmation Drawer/Modal */}
      {isConfirmingPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <h3 className="font-serif font-bold text-base text-stone-900">
                  Confirmar Pagamento do Contrato
                </h3>
              </div>
              <button
                onClick={() => setIsConfirmingPayment(false)}
                className="text-stone-400 hover:text-stone-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-600">
              Ao confirmar, o status será atualizado para <strong className="text-teal-700">Pago & Em Execução</strong> e o valor será creditado no seu fluxo de caixa.
            </p>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Valor Recebido (R$)
              </label>
              <input
                type="number"
                min={0}
                step="any"
                value={paymentAmountToConfirm}
                onChange={(e) => setPaymentAmountToConfirm(Number(e.target.value))}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-emerald-700 font-bold focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Conta Bancária de Destino
              </label>
              <select
                value={selectedBankAccountId}
                onChange={(e) => setSelectedBankAccountId(e.target.value)}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs text-stone-800 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
              >
                {bankAccounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} - {acc.accountType} ({formatCurrency(acc.balance)})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setIsConfirmingPayment(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPaymentSubmit}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Confirmar Recebimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="font-serif font-bold text-base text-stone-900">Excluir Contrato?</h3>
              <p className="text-xs text-stone-500 mt-1">
                Esta ação removerá o contrato de <strong>{contract.clientName}</strong>. Esta ação não poderá ser desfeita.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setIsConfirmingDelete(false)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-600 hover:text-stone-900 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteWorkContract(contract.id);
                  setIsConfirmingDelete(false);
                  if (onDelete) onDelete();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
