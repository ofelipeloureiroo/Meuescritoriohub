import React, { useRef, useState, useEffect } from 'react';
import {
  Check,
  CheckCircle2,
  Eraser,
  FileCheck,
  Lock,
  PenTool,
  ShieldCheck,
  Type,
  X,
} from 'lucide-react';
import { DigitalSignature, WorkContract } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface DigitalSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  contract: WorkContract;
  onSign: (signature: Omit<DigitalSignature, 'signedAt' | 'verificationCode'>) => void;
}

export const DigitalSignatureModal: React.FC<DigitalSignatureModalProps> = ({
  isOpen,
  onClose,
  contract,
  onSign,
}) => {
  const [signerName, setSignerName] = useState(contract.clientName || '');
  const [signerDocument, setSignerDocument] = useState(contract.clientDocument || '');
  const [signerEmail, setSignerEmail] = useState(contract.clientEmail || '');
  const [signerPhone, setSignerPhone] = useState(contract.clientPhone || '');
  const [signMethod, setSignMethod] = useState<'drawn' | 'typed'>('drawn');
  const [agreedTerms, setAgreedTerms] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Canvas drawing
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSignerName(contract.clientName || '');
      setSignerDocument(contract.clientDocument || '');
      setSignerEmail(contract.clientEmail || '');
      setSignerPhone(contract.clientPhone || '');
      setErrorMsg('');
      setHasDrawn(false);
      clearCanvas();
    }
  }, [isOpen, contract]);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#c58a4b';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsDrawing(true);
    setHasDrawn(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleConfirmSignature = (e: React.FormEvent) => {
    e.preventDefault();
    if (!signerName.trim()) {
      setErrorMsg('Por favor, informe o nome completo do signatário.');
      return;
    }

    if (!agreedTerms) {
      setErrorMsg('Você precisa concordar com os termos contratuais para assinar.');
      return;
    }

    let signatureDataUrl: string | undefined;
    if (signMethod === 'drawn' && canvasRef.current) {
      signatureDataUrl = canvasRef.current.toDataURL('image/png');
    }

    onSign({
      signerName: signerName.trim(),
      signerDocument: signerDocument.trim(),
      signerEmail: signerEmail.trim(),
      signerPhone: signerPhone.trim(),
      signatureType: signMethod,
      signatureDataUrl,
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#1a1614] border border-[#3d342f] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3d342f] bg-[#14110f]/80">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm"
              style={{
                backgroundColor: 'var(--theme-badge-bg)',
                color: 'var(--theme-badge-text)',
                border: '1px solid var(--theme-badge-border)',
              }}
            >
              <PenTool className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-[#fcf8f5]">
                Assinatura Digital do Contrato
              </h3>
              <p className="text-xs text-[#a89c93]">
                {contract.title} • {contract.clientName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#a89c93] hover:text-[#fcf8f5] p-1.5 rounded-lg hover:bg-[#241e1b] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirmSignature} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          {/* Contract Summary Pill */}
          <div className="p-3.5 bg-[#14110f] border border-[#2b2420] rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-[#a89c93] block">Valor Contratado:</span>
              <strong className="text-emerald-400 font-serif text-sm">
                {formatCurrency(contract.totalAmount)}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-[#a89c93] block">Condição de Pagamento:</span>
              <span className="text-[#fcf8f5] font-medium">{contract.paymentTerms}</span>
            </div>
          </div>

          {/* Signer Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-[#a89c93] mb-1">
                Nome Completo do Signatário / Cliente *
              </label>
              <input
                type="text"
                required
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Ex: Mariana Silveira"
                className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-sm text-[#fcf8f5] placeholder-[#6b5d54] focus:outline-none focus:border-[var(--theme-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#a89c93] mb-1">
                CPF ou CNPJ
              </label>
              <input
                type="text"
                value={signerDocument}
                onChange={(e) => setSignerDocument(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-sm text-[#fcf8f5] placeholder-[#6b5d54] focus:outline-none focus:border-[var(--theme-primary)]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#a89c93] mb-1">
                Email de Notificação
              </label>
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full bg-[#14110f] border border-[#3d342f] rounded-xl px-3 py-2 text-sm text-[#fcf8f5] placeholder-[#6b5d54] focus:outline-none focus:border-[var(--theme-primary)]"
              />
            </div>
          </div>

          {/* Signature Method Toggle */}
          <div>
            <label className="block text-xs font-medium text-[#a89c93] mb-1.5">
              Método de Assinatura
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSignMethod('drawn')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  signMethod === 'drawn'
                    ? 'bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border-[var(--theme-primary)] shadow-sm'
                    : 'bg-[#14110f] text-[#a89c93] border-[#3d342f] hover:text-[#fcf8f5]'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Desenhar Assinatura</span>
              </button>

              <button
                type="button"
                onClick={() => setSignMethod('typed')}
                className={`py-2 px-3 rounded-xl border text-xs font-medium flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  signMethod === 'typed'
                    ? 'bg-[var(--theme-badge-bg)] text-[var(--theme-badge-text)] border-[var(--theme-primary)] shadow-sm'
                    : 'bg-[#14110f] text-[#a89c93] border-[#3d342f] hover:text-[#fcf8f5]'
                }`}
              >
                <Type className="w-3.5 h-3.5" />
                <span>Assinatura Tipográfica</span>
              </button>
            </div>
          </div>

          {/* Canvas or Type Preview */}
          {signMethod === 'drawn' ? (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-[#a89c93]">
                  Desenhe sua assinatura ou rubrica no quadro abaixo:
                </span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                >
                  <Eraser className="w-3 h-3" /> Limpar
                </button>
              </div>
              <div className="relative bg-[#12100e] border border-[#3d342f] rounded-xl overflow-hidden touch-none">
                <canvas
                  ref={canvasRef}
                  width={440}
                  height={140}
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                  className="w-full h-32 cursor-crosshair block"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-[#6b5d54]">
                    Clique e arraste ou deslize o dedo para assinar
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-[#14110f] border border-[#3d342f] rounded-xl text-center">
              <span className="text-[11px] text-[#a89c93] block mb-2">Prévia da Assinatura Digital:</span>
              <p className="font-serif italic text-2xl text-[var(--theme-primary)] tracking-wider">
                {signerName || 'Seu Nome Aqui'}
              </p>
              <span className="text-[10px] text-[#6b5d54] block mt-1">
                Autenticado digitalmente por ICP-Brasil / Padrão MP 2.200-2/2001
              </span>
            </div>
          )}

          {/* Legal Compliance & Agreement */}
          <div className="p-3 bg-[#14110f]/70 border border-[#2b2420] rounded-xl flex items-start gap-2.5">
            <input
              type="checkbox"
              id="agree-contract-terms"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-0.5 rounded border-[#3d342f] text-[var(--theme-primary)] focus:ring-0 cursor-pointer"
            />
            <label htmlFor="agree-contract-terms" className="text-[11px] text-[#a89c93] leading-relaxed cursor-pointer select-none">
              Declaro que li e concordo com todas as cláusulas, escopo, prazos e condições financeiras estipuladas neste Contrato de Prestação de Serviços de Trabalho.
            </label>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-emerald-400/90">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Assinatura protegida com carimbo temporal e hash criptográfico de validação.</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3d342f]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-[#3d342f] text-sm text-[#a89c93] hover:text-[#fcf8f5] transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-sm font-bold text-[#12100e] flex items-center gap-2 cursor-pointer shadow-lg hover:brightness-110 active:scale-95 transition-all"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              <FileCheck className="w-4 h-4" />
              <span>Confirmar Assinatura do Contrato</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
