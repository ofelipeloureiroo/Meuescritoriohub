import React, { useState, useEffect } from 'react';
import {
  Barcode,
  Check,
  Copy,
  ExternalLink,
  MessageCircle,
  Phone,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import { ProjectInstallment, ProjectMilestone } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { generateBoletoCodes, POPULAR_BANKS } from '../../utils/boletoGenerator';

interface NotifyClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  installment?: ProjectInstallment | null;
  milestone?: ProjectMilestone | null;
}

type MessageTemplateType = 'due_soon' | 'due_today' | 'overdue' | 'receipt' | 'milestone_done' | 'boleto';

export const NotifyClientModal: React.FC<NotifyClientModalProps> = ({
  isOpen,
  onClose,
  installment,
  milestone,
}) => {
  const { architectProfile } = useFinance();
  const [templateType, setTemplateType] = useState<MessageTemplateType>('due_soon');
  const [customPhone, setCustomPhone] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Initialize or determine best initial template
  useEffect(() => {
    if (milestone) {
      setTemplateType('milestone_done');
      setCustomPhone(milestone.clientPhone || '');
    } else if (installment) {
      setCustomPhone(installment.clientPhone || '');
      const todayStr = new Date().toISOString().split('T')[0];
      if (installment.status === 'paid') {
        setTemplateType('receipt');
      } else if (installment.dueDate < todayStr) {
        setTemplateType('overdue');
      } else if (installment.dueDate === todayStr) {
        setTemplateType('due_today');
      } else {
        setTemplateType('due_soon');
      }
    }
  }, [installment, milestone, isOpen]);

  // Build dynamic message based on template type
  useEffect(() => {
    const architectName = architectProfile?.name || 'Laíne Paula';
    const pixKey = architectProfile?.pixKey || 'contato@lainepaula.arq.br';
    const pixType = architectProfile?.pixKeyType ? ` (${architectProfile.pixKeyType.toUpperCase()})` : '';

    if (milestone) {
      const clientName = milestone.clientName || 'Cliente';
      const projectTitle = milestone.projectTitle || 'Projeto';
      const stageName = milestone.title || 'Etapa do Projeto';

      setCustomMessage(
        `Olá ${clientName}! Tudo bem? Aqui é a arquiteta ${architectName} 📐✨\n\n` +
        `Passando para avisar que concluímos com sucesso a etapa: "${stageName}" do seu projeto "${projectTitle}".\n\n` +
        `Estou preparando o material para apresentação. Qualquer dúvida ou ajuste que queira conversar, estou à disposição!`
      );
      return;
    }

    if (installment) {
      const clientName = installment.clientName || 'Cliente';
      const projectTitle = installment.projectTitle || 'Projeto';
      const installmentInfo = `parcela ${installment.installmentNumber}/${installment.totalInstallments} (${installment.description})`;
      const formattedValue = formatCurrency(installment.amount);
      const formattedDueDate = formatDate(installment.dueDate);

      if (templateType === 'boleto') {
        const bank = POPULAR_BANKS[installment.boletoBank || '341'] || POPULAR_BANKS['341'];
        const codes = generateBoletoCodes(
          installment.boletoBank || '341',
          installment.amount,
          installment.dueDate,
          `${installment.installmentNumber}`
        );
        const linha = installment.boletoBarcode || codes.linhaDigitavel;

        setCustomMessage(
          `Olá, *${clientName}*! Tudo bem? Aqui é do escritório de arquitetura de *${architectName}* 📐✨\n\n` +
          `Segue o *Boleto Bancário* referente à *${installmentInfo}* do seu projeto *${projectTitle}*:\n\n` +
          `📄 *DADOS DO BOLETO:*\n` +
          `💰 *Valor:* ${formattedValue}\n` +
          `📅 *Vencimento:* ${formattedDueDate}\n` +
          `🏦 *Banco Emissor:* ${bank.fullName}\n\n` +
          `📋 *LINHA DIGITÁVEL (Copie e Cole no App do seu Banco):*\n` +
          `\`${linha}\`\n\n` +
          `⚡ *Ou pague via PIX:*\n` +
          `Chave PIX: ${pixKey}${pixType}\n` +
          `Favorecido: ${architectName}\n\n` +
          `Após efetuar o pagamento, basta nos enviar o comprovante por aqui. Muito obrigado!`
        );
      } else if (templateType === 'due_soon') {
        setCustomMessage(
          `Olá ${clientName}! Tudo bem? Aqui é a arquiteta ${architectName} 📐✨\n\n` +
          `Passando para lembrar que a ${installmentInfo} referente ao seu projeto "${projectTitle}" tem vencimento próximo no dia ${formattedDueDate}, no valor de ${formattedValue}.\n\n` +
          `💳 Dados para pagamento via PIX:\n` +
          `Chave PIX: ${pixKey}${pixType}\n` +
          `Favorecido: ${architectName}\n\n` +
          `Assim que realizar o pagamento, pode me enviar o comprovante por aqui. Muito obrigada!`
        );
      } else if (templateType === 'due_today') {
        setCustomMessage(
          `Olá ${clientName}! Tudo bem? Aqui é a arquiteta ${architectName} 📐✨\n\n` +
          `Lembrando que a ${installmentInfo} do projeto "${projectTitle}" vence hoje (${formattedDueDate}), no valor de ${formattedValue}.\n\n` +
          `💳 Chave PIX: ${pixKey}${pixType}\n` +
          `Favorecido: ${architectName}\n\n` +
          `Caso já tenha efetuado o pagamento, por favor desconsidere este lembrete e me envie o comprovante. Tenha um ótimo dia!`
        );
      } else if (templateType === 'overdue') {
        setCustomMessage(
          `Olá ${clientName}! Tudo bem? Aqui é a ${architectName} 📐\n\n` +
          `Consta em aberto em nosso sistema a ${installmentInfo} do projeto "${projectTitle}", vencida em ${formattedDueDate}, no valor de ${formattedValue}.\n\n` +
          `Poderia verificar, por gentileza? Caso precise de uma segunda via ou de novos dados de pagamento:\n` +
          `💳 Chave PIX: ${pixKey}${pixType}\n` +
          `Favorecido: ${architectName}\n\n` +
          `Se já foi pago, peço que me envie o comprovante para darmos baixa. Muito obrigada!`
        );
      } else if (templateType === 'receipt') {
        const paidDateFormatted = installment.paidDate ? formatDate(installment.paidDate) : 'recente';
        setCustomMessage(
          `Olá ${clientName}! Tudo bem? Aqui é a arquiteta ${architectName} 📐✨\n\n` +
          `Confirmamos o recebimento com sucesso da ${installmentInfo} do projeto "${projectTitle}" no valor de ${formattedValue} (${paidDateFormatted}).\n\n` +
          `Agradeço pela confiança e seguimos firmes com os próximos passos do projeto!`
        );
      }
    }
  }, [templateType, installment, milestone, architectProfile]);

  if (!isOpen) return null;

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(customMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendWhatsApp = () => {
    const cleanPhone = customPhone.replace(/\D/g, '');
    const phoneWithCountry = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const encodedText = encodeURIComponent(customMessage);
    const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${encodedText}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)] bg-[var(--bg-card-hover)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <MessageCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[var(--text-main)]">
                Avisar Cliente pelo WhatsApp
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                {installment
                  ? `${installment.clientName} • ${installment.projectTitle}`
                  : milestone
                  ? `${milestone.clientName} • ${milestone.projectTitle}`
                  : 'Lembrete profissional'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1.5 rounded-lg hover:bg-[var(--bg-card-secondary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Template Selection Pills */}
          {installment && (
            <div>
              <label className="block text-xs font-semibold text-amber-700 dark:text-[#d49454] uppercase tracking-wider mb-2">
                Tipo de Lembrete
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => setTemplateType('boleto')}
                  className={`px-2.5 py-2 rounded-xl text-xs font-bold text-center transition-all cursor-pointer border flex items-center justify-center gap-1 ${
                    templateType === 'boleto'
                      ? 'bg-[#c58a4b] text-white border-[#c58a4b] shadow'
                      : 'bg-[var(--bg-card-secondary)] text-amber-700 dark:text-amber-400 border-amber-500/30 hover:border-amber-500/60'
                  }`}
                >
                  <Barcode className="w-3.5 h-3.5" />
                  <span>Boleto</span>
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('due_soon')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all cursor-pointer border ${
                    templateType === 'due_soon'
                      ? 'bg-[#c58a4b]/20 text-[#c58a4b] border-[#c58a4b]'
                      : 'bg-[var(--bg-card-secondary)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[#a89c93]/40'
                  }`}
                >
                  📅 A Vencer
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('due_today')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all cursor-pointer border ${
                    templateType === 'due_today'
                      ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500'
                      : 'bg-[var(--bg-card-secondary)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[#a89c93]/40'
                  }`}
                >
                  ⏰ Hoje
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('overdue')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all cursor-pointer border ${
                    templateType === 'overdue'
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500'
                      : 'bg-[var(--bg-card-secondary)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[#a89c93]/40'
                  }`}
                >
                  ⚠️ Vencida
                </button>
                <button
                  type="button"
                  onClick={() => setTemplateType('receipt')}
                  className={`px-3 py-2 rounded-xl text-xs font-medium text-center transition-all cursor-pointer border ${
                    templateType === 'receipt'
                      ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500'
                      : 'bg-[var(--bg-card-secondary)] text-[var(--text-muted)] border-[var(--border-color)] hover:border-[#a89c93]/40'
                  }`}
                >
                  ✅ Recibo
                </button>
              </div>
            </div>
          )}

          {/* Client Phone Input */}
          <div>
            <label className="block text-xs font-medium text-[var(--text-muted)] mb-1.5">
              WhatsApp do Cliente (DDD + Número)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="(21) 99876-5432"
                value={customPhone}
                onChange={(e) => setCustomPhone(e.target.value)}
                className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[#c58a4b] transition-colors"
              />
            </div>
          </div>

          {/* Message Textarea */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-[var(--text-muted)]">
                Mensagem Personalizada
              </label>
              <span className="text-[11px] text-[var(--text-muted)]">
                Você pode editar antes de enviar
              </span>
            </div>
            <textarea
              rows={8}
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              className="w-full bg-[var(--bg-input)] border border-[var(--border-color)] rounded-xl p-3.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[#c58a4b] leading-relaxed resize-none font-sans"
            />
          </div>

          {/* PIX Reminder Highlight */}
          <div className="p-3 bg-[var(--bg-card-secondary)] rounded-xl border border-[var(--border-color)] flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[var(--text-muted)]">Chave PIX configurada:</span>
              <span className="font-bold text-[var(--text-main)]">{architectProfile?.pixKey || 'contato@lainepaula.arq.br'}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-[var(--border-color)] bg-[var(--bg-card-hover)]">
          <button
            type="button"
            onClick={handleCopyMessage}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card)] text-[var(--text-main)] rounded-xl text-xs font-semibold border border-[var(--border-color)] transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-500">Mensagem Copiada!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[var(--text-muted)]" />
                <span>Copiar Mensagem</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 sm:w-auto px-4 py-2.5 bg-[var(--bg-card-secondary)] hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)] rounded-xl text-xs font-semibold border border-[var(--border-color)] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="w-1/2 sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Abrir WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
