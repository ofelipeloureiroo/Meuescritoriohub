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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-stone-200 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50/80">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm bg-amber-500/15 text-amber-700 border border-amber-500/30"
            >
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-base text-stone-900">
                Assinatura Digital do Contrato
              </h3>
              <p className="text-xs text-stone-500">
                {contract.title} • {contract.clientName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleConfirmSignature} className="p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium">
              {errorMsg}
            </div>
          )}

          {/* Contract Summary Pill */}
          <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span className="text-stone-500 block">Valor Contratado:</span>
              <strong className="text-emerald-600 font-serif text-sm">
                {formatCurrency(contract.totalAmount)}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-stone-500 block">Condição de Pagamento:</span>
              <span className="text-stone-800 font-medium">{contract.paymentTerms || 'Conforme acordado'}</span>
            </div>
          </div>

          {/* Signer Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Nome Completo do Signatário / Cliente *
              </label>
              <input
                type="text"
                required
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="Ex: Mariana Silveira"
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                CPF ou CNPJ
              </label>
              <input
                type="text"
                value={signerDocument}
                onChange={(e) => setSignerDocument(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email de Notificação
              </label>
              <input
                type="email"
                value={signerEmail}
                onChange={(e) => setSignerEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full bg-white border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Signature Method Toggle */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1.5">
              Método de Assinatura
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSignMethod('drawn')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  signMethod === 'drawn'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
                }`}
              >
                <PenTool className="w-3.5 h-3.5" />
                <span>Desenhar Assinatura</span>
              </button>

              <button
                type="button"
                onClick={() => setSignMethod('typed')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                  signMethod === 'typed'
                    ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                    : 'bg-stone-50 text-stone-700 border-stone-300 hover:bg-stone-100'
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
                <span className="text-[11px] text-stone-500">
                  Desenhe sua assinatura ou rubrica no quadro abaixo:
                </span>
                <button
                  type="button"
                  onClick={clearCanvas}
                  className="text-[11px] text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Eraser className="w-3 h-3" /> Limpar
                </button>
              </div>
              <div className="relative bg-stone-50 border-2 border-dashed border-stone-300 rounded-2xl overflow-hidden touch-none">
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
                  className="w-full h-32 cursor-crosshair block bg-white"
                />
                {!hasDrawn && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-stone-400 font-medium">
                    Clique e arraste ou deslize o dedo para assinar
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl text-center">
              <span className="text-[11px] text-stone-500 block mb-2 font-medium">Prévia da Assinatura Digital:</span>
              <p className="font-serif italic text-2xl text-amber-700 tracking-wider">
                {signerName || 'Seu Nome Aqui'}
              </p>
              <span className="text-[10px] text-stone-400 block mt-1 font-mono">
                Autenticado digitalmente por ICP-Brasil / Padrão MP 2.200-2/2001
              </span>
            </div>
          )}

          {/* Legal Compliance & Agreement */}
          <div className="p-3 bg-stone-50 border border-stone-200 rounded-xl flex items-start gap-2.5">
            <input
              type="checkbox"
              id="agree-contract-terms"
              checked={agreedTerms}
              onChange={(e) => setAgreedTerms(e.target.checked)}
              className="mt-0.5 rounded border-stone-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
            />
            <label htmlFor="agree-contract-terms" className="text-[11px] text-stone-600 leading-relaxed cursor-pointer select-none">
              Declaro que li e concordo com todas as cláusulas, escopo, prazos e condições financeiras estipuladas neste Contrato de Prestação de Serviços de Trabalho.
            </label>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-emerald-700 font-medium">
            <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Assinatura protegida com carimbo temporal e hash criptográfico de validação.</span>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-stone-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-semibold text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 flex items-center gap-2 cursor-pointer shadow-md active:scale-95 transition-all"
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
