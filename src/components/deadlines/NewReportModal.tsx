import React, { useState } from 'react';
import { Camera, FileText, Send, X } from 'lucide-react';
import { ArchitectureProject, ConstructionReport } from '../../types';
import { useFinance } from '../../context/FinanceContext';
import { compressImage } from '../../utils/imageCompressor';

interface NewReportModalProps {
  project: ArchitectureProject | null;
  isOpen: boolean;
  onClose: () => void;
}

export const NewReportModal: React.FC<NewReportModalProps> = ({ project, isOpen, onClose }) => {
  const { addConstructionReport } = useFinance();
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);

  if (!isOpen || !project) return null;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (const file of Array.from(files)) {
      try {
        const compressed = await compressImage(file as File, 800, 800, 0.70);
        if (compressed) {
          setImages((prev) => [...prev, compressed]);
        }
      } catch (err) {
        console.error('Error compressing report image:', err);
      }
    }
  };

  const handleSave = () => {
    if (!text.trim() && images.length === 0) return;
    
    addConstructionReport(project.id, {
      date: new Date().toISOString().split('T')[0],
      text,
      images,
    });
    
    // Also generate a WhatsApp message to send the report
    const msg = `Olá ${project.clientName},\n\nAcabei de adicionar um novo relatório de obra no sistema para o projeto *${project.title}*:\n\n${text}\n\nAbraços!`;
    const whatsappUrl = `https://wa.me/55${(project.clientPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
    
    setText('');
    setImages([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#1a1614] rounded-3xl border border-[#3d342f] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-[#3d342f] flex items-center justify-between bg-[#14110f]">
          <div>
            <h2 className="text-xl font-bold text-[#fcf8f5] font-serif">Novo Relatório de Obra</h2>
            <p className="text-xs text-[#a89c93]">Projeto: {project.title}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[#241e1b] text-[#a89c93] hover:text-[#fcf8f5] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#fcf8f5]">Relatório / Observações</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Descreva o que foi feito na obra hoje..."
              rows={4}
              className="w-full bg-[#1c1815] border border-[#3d342f] rounded-xl p-3 text-sm text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-[#fcf8f5]">Fotos da Obra</label>
            <div className="grid grid-cols-3 gap-3">
              {images.map((img, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-[#3d342f] group">
                  <img src={img} alt="Obra" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <label className="aspect-square rounded-xl border border-dashed border-[#3d342f] hover:border-[#c58a4b] hover:bg-[#c58a4b]/10 flex flex-col items-center justify-center text-[#a89c93] hover:text-[#d49454] cursor-pointer transition-colors">
                <Camera className="w-6 h-6 mb-1" />
                <span className="text-xs">Adicionar Foto</span>
                <input type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />
              </label>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-[#3d342f] bg-[#14110f] flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-sm text-[#a89c93] hover:text-[#fcf8f5] transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!text.trim() && images.length === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#c58a4b] hover:bg-[#d49454] text-black font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" /> Enviar p/ Cliente
          </button>
        </div>
      </div>
    </div>
  );
};
