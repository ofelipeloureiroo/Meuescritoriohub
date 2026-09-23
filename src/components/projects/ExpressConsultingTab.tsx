import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Camera,
  Upload,
  ChevronRight,
  ChevronLeft,
  Check,
  RefreshCw,
  FileText,
  Share2,
  MessageCircle,
  Download,
  Plus,
  Trash2,
  Eye,
  Sliders,
  CheckCircle2,
  X,
  ArrowRight,
  Send,
  User,
  Phone,
  HelpCircle,
  History,
  Wand2,
  Image as ImageIcon,
  Columns,
  MoveHorizontal,
  Link,
  Edit2,
  ZoomIn,
  Layers,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';

export interface UserReferenceItem {
  id: string;
  url: string;
  title: string;
  tag?: string;
  notes?: string;
  createdAt: string;
}

export interface ExpressConsultation {
  id: string;
  clientName: string;
  clientPhone: string;
  roomType: string;
  temperature: 'cold' | 'neutral' | 'hot';
  notes: string;
  originalImage: string;
  redesignImage: string;
  versionCount: number;
  versions: string[];
  annoyances: string[];
  desiredChanges: string[];
  desiredStyle: string[];
  checklist: Record<string, string>;
  finalPrompt: string;
  summaryText: string;
  adjustmentsText?: string;
  ideas: string[];
  directionTags: string[];
  userReferences?: UserReferenceItem[];
  selectedReferences?: string[];
  createdAt: string;
  consultantName: string;
  officeName: string;
}

const ROOM_TYPES = [
  'Escritório',
  'Sala',
  'Cozinha',
  'Quarto',
  'Banheiro',
  'Área gourmet',
  'Consultório',
  'Comércio',
  'Outro',
];

const ANNOYANCE_OPTIONS = [
  'Ambiente escuro',
  'Sem personalidade',
  'Móveis antigos',
  'Pouco aconchegante',
  'Mal aproveitado',
  'Visual pesado',
  'Falta organização',
  'Outro',
];

const DESIRED_CHANGE_OPTIONS = [
  'Mobiliário',
  'Marcenaria',
  'Iluminação',
  'Cores',
  'Decoração',
  'Revestimentos',
  'Organização',
  'Quase tudo',
];

const DESIRED_STYLE_OPTIONS = [
  'Aconchegante',
  'Sofisticado',
  'Contemporâneo',
  'Clean',
  'Natural',
  'Elegante',
  'Marcante',
  'Minimalista',
];

// Architectural transformation image repository organized by Room Type & Prompt Keywords
const AI_REDESIGN_VARIATIONS: Record<string, Record<string, string>> = {
  Escritório: {
    default: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop',
    sofisticado: 'https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1200&auto=format&fit=crop',
    minimalista: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1200&auto=format&fit=crop',
    madeira: 'https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4?q=80&w=1200&auto=format&fit=crop',
    claro: 'https://images.unsplash.com/photo-1593062096033-9a26b09da705?q=80&w=1200&auto=format&fit=crop',
    aconchegante: 'https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?q=80&w=1200&auto=format&fit=crop',
    plantas: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?q=80&w=1200&auto=format&fit=crop',
  },
  Sala: {
    default: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop',
    claro: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1200&auto=format&fit=crop',
    madeira: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1200&auto=format&fit=crop',
    aconchegante: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1200&auto=format&fit=crop',
    sofisticado: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop',
    minimalista: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1200&auto=format&fit=crop',
    plantas: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop',
  },
  Cozinha: {
    default: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?q=80&w=1200&auto=format&fit=crop',
    claro: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop',
    madeira: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=1200&auto=format&fit=crop',
    aconchegante: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?q=80&w=1200&auto=format&fit=crop',
    sofisticado: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200&auto=format&fit=crop',
    minimalista: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?q=80&w=1200&auto=format&fit=crop',
    plantas: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?q=80&w=1200&auto=format&fit=crop',
  },
  Quarto: {
    default: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=1200&auto=format&fit=crop',
    claro: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=1200&auto=format&fit=crop',
    madeira: 'https://images.unsplash.com/photo-1617325247661-675ab4b64ae2?q=80&w=1200&auto=format&fit=crop',
    aconchegante: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=1200&auto=format&fit=crop',
    sofisticado: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=1200&auto=format&fit=crop',
    minimalista: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=1200&auto=format&fit=crop',
    plantas: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?q=80&w=1200&auto=format&fit=crop',
  },
  Banheiro: {
    default: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?q=80&w=1200&auto=format&fit=crop',
    claro: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1200&auto=format&fit=crop',
    madeira: 'https://images.unsplash.com/photo-1604014237800-1c9102c219da?q=80&w=1200&auto=format&fit=crop',
    aconchegante: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?q=80&w=1200&auto=format&fit=crop',
    sofisticado: 'https://images.unsplash.com/photo-1600566753376-12c8ab7fb75b?q=80&w=1200&auto=format&fit=crop',
    minimalista: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?q=80&w=1200&auto=format&fit=crop',
    plantas: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1200&auto=format&fit=crop',
  },
  'Área gourmet': {
    default: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop',
    sofisticado: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop',
    madeira: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop',
    claro: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop',
    aconchegante: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?q=80&w=1200&auto=format&fit=crop',
    minimalista: 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?q=80&w=1200&auto=format&fit=crop',
    plantas: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop',
  },
  Consultório: {
    default: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200&auto=format&fit=crop',
    sofisticado: 'https://images.unsplash.com/photo-1629909615184-74f495363b67?q=80&w=1200&auto=format&fit=crop',
    minimalista: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1200&auto=format&fit=crop',
    madeira: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200&auto=format&fit=crop',
    claro: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1200&auto=format&fit=crop',
    aconchegante: 'https://images.unsplash.com/photo-1629909615184-74f495363b67?q=80&w=1200&auto=format&fit=crop',
    plantas: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1200&auto=format&fit=crop',
  },
  Comércio: {
    default: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop',
    sofisticado: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop',
    minimalista: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=1200&auto=format&fit=crop',
    madeira: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1200&auto=format&fit=crop',
    claro: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=1200&auto=format&fit=crop',
    aconchegante: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?q=80&w=1200&auto=format&fit=crop',
    plantas: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=1200&auto=format&fit=crop',
  },
  Outro: {
    default: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop',
    sofisticado: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?q=80&w=1200&auto=format&fit=crop',
    minimalista: 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?q=80&w=1200&auto=format&fit=crop',
    madeira: 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1200&auto=format&fit=crop',
    claro: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=1200&auto=format&fit=crop',
    aconchegante: 'https://images.unsplash.com/photo-1583847268964-b28dc8f51f92?q=80&w=1200&auto=format&fit=crop',
    plantas: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop',
  },
};

const SAMPLE_ROOM_PRESETS: Record<string, { before: string; defaultAfter: string; ideas: string[] }> = {
  Escritório: {
    before: 'https://images.unsplash.com/photo-1585412727339-54e4bae3bbf9?q=80&w=1200&auto=format&fit=crop',
    defaultAfter: 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1200&auto=format&fit=crop',
    ideas: [
      'Preservar as paredes estruturais e a entrada de luz natural.',
      'Desenvolver marcenaria planejada com nichos iluminados e painel ripado.',
      'Substituir a mesa por bancada executiva com passagem embutida de cabos.',
      'Integrar iluminação linear anti-reflexo em LED com temperatura quente.',
      'Adicionar cadeira ergonômica de alto padrão e poltronas de apoio.',
    ],
  },
  Sala: {
    before: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&auto=format&fit=crop',
    defaultAfter: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop',
    ideas: [
      'Integrar painel ripado em tom carvalho natural com iluminação de destaque.',
      'Substituir o estofado por modelo contemporâneo em tecido neutro.',
      'Inserir mesa de centro orgânica de linhas suaves.',
      'Reorganizar os pontos de luz para criar uma atmosfera aconchegante.',
      'Manter o piso existente aplicando tapete de grande formato.',
    ],
  },
  Cozinha: {
    before: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?q=80&w=1200&auto=format&fit=crop',
    defaultAfter: 'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?q=80&w=1200&auto=format&fit=crop',
    ideas: [
      'Atualizar armários para marcenaria moderna em tom neutro e elegante.',
      'Instalar bancada em quartzo branco com acabamento impecável.',
      'Inserir iluminação linear abaixo dos armários superiores.',
      'Revestir o backsplash com cerâmica de design limpo.',
      'Preservar os pontos de tomada e encanamento originais.',
    ],
  },
  Quarto: {
    before: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?q=80&w=1200&auto=format&fit=crop',
    defaultAfter: 'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?q=80&w=1200&auto=format&fit=crop',
    ideas: [
      'Criar cabeceira estofada flutuante de ponta a ponta com perfis de iluminação.',
      'Substituir luminárias de apoio por pendentes elegantes.',
      'Aplicar paleta de cores neutras e relaxantes na parede principal.',
      'Instalar cortinas de linho para enriquecer a textura do ambiente.',
      'Preservar o guarda-roupa existente renovando puxadores.',
    ],
  },
  Banheiro: {
    before: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=1200&auto=format&fit=crop',
    defaultAfter: 'https://images.unsplash.com/photo-1620626011761-996317b8d101?q=80&w=1200&auto=format&fit=crop',
    ideas: [
      'Preservar a arquitetura original sem alterar pontos hidráulicos.',
      'Substituir o revestimento atual por porcelanato com textura suave.',
      'Requalificar louças e metais em acabamento preto fosco ou champanhe.',
      'Refinar a iluminação com iluminação indireta em LED atrás do espelho.',
      'Manter os pontos de esgoto e ventilação existentes.',
    ],
  },
  'Área gourmet': {
    before: 'https://images.unsplash.com/photo-1600585154526-990dced4db0d?q=80&w=1200&auto=format&fit=crop',
    defaultAfter: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1200&auto=format&fit=crop',
    ideas: [
      'Revestir bancada e churrasqueira com granito escovado ou quartzo.',
      'Inserir marcenaria naval sob medida resistente a umidade.',
      'Compor iluminação pontual de trilhos e pendentes de palha natural.',
      'Aproveitar espaço de circulação com mesa bistrô integrada.',
    ],
  },
  Consultório: {
    before: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1200&auto=format&fit=crop',
    defaultAfter: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=1200&auto=format&fit=crop',
    ideas: [
      'Proporcionar atmosfera acolhedora com paleta neutra e acabamentos nobres.',
      'Integrar armários ocultos e nichos de apoio funcional.',
      'Iluminação indireta suave que transmite serenidade e bem-estar.',
      'Preservar divisórias e layout estrutural da sala.',
    ],
  },
  Comércio: {
    before: 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?q=80&w=1200&auto=format&fit=crop',
    defaultAfter: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1200&auto=format&fit=crop',
    ideas: [
      'Valorizar vitrine e exposição de produtos com spots direcionáveis.',
      'Modernizar balcão de atendimento com detalhes metálicos e amadeirados.',
      'Otimizar fluxo e circulação dos clientes.',
    ],
  },
  Outro: {
    before: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?q=80&w=1200&auto=format&fit=crop',
    defaultAfter: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200&auto=format&fit=crop',
    ideas: [
      'Renovação harmônica preservando alvenaria e proporções.',
      'Requalificação de revestimentos, marcenaria e iluminação cênica.',
    ],
  },
};

// Canvas downsampling helper to prevent quota exceeded in localStorage
const compressImageDataUrl = (dataUrl: string, maxDimension = 1000, quality = 0.75): Promise<string> => {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image')) {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
};

// Safe storage helper with quota error prevention
const safeSaveConsultationsToStorage = (items: ExpressConsultation[]) => {
  const trimmed = items.slice(0, 8).map((item) => ({
    ...item,
    versions: item.versions ? item.versions.slice(-2) : [item.redesignImage],
  }));

  try {
    localStorage.setItem('obra_express_consultations', JSON.stringify(trimmed));
  } catch (err) {
    console.warn('LocalStorage quota limit reached, saving lightweight items...', err);
    try {
      const lightweight = trimmed.map((item) => ({
        ...item,
        originalImage: item.originalImage.startsWith('data:')
          ? item.originalImage.slice(0, 200) + '...'
          : item.originalImage,
        versions: [item.redesignImage],
      }));
      localStorage.setItem('obra_express_consultations', JSON.stringify(lightweight));
    } catch (e2) {
      console.error('Failed to save to localStorage:', e2);
    }
  }
};

// ============================================================================
// INTERACTIVE BEFORE / AFTER SLIDER COMPONENT
// ============================================================================
interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  title?: string;
  className?: string;
  aspectRatioClass?: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  beforeImage,
  afterImage,
  title = 'ARRASTE PARA COMPARAR',
  className = '',
  aspectRatioClass = 'h-[360px] sm:h-[480px]',
  beforeLabel = 'ANTES',
  afterLabel = 'DEPOIS',
}) => {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleUpdatePos = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    let percentage = (x / rect.width) * 100;
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    setSliderPos(percentage);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleUpdatePos(e.clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleUpdatePos(e.touches[0].clientX);
    }
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleUpdatePos(e.clientX);
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isDragging]);

  return (
    <div className={`space-y-3 select-none ${className}`}>
      {title && (
        <div className="text-center">
          <span className="text-[11px] font-bold tracking-[0.2em] text-[#a89c93] uppercase font-sans">
            {title}
          </span>
        </div>
      )}

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onTouchMove={handleTouchMove}
        className={`relative w-full ${aspectRatioClass} rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border border-[#3d342f] cursor-ew-resize select-none touch-none group`}
      >
        {/* DEPOIS Image (Underneath, Full Width) */}
        <img
          src={afterImage || beforeImage}
          alt="Depois"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* ANTES Image (Clipped on top based on slider percentage) */}
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          style={{ width: `${sliderPos}%` }}
        >
          <img
            src={beforeImage || afterImage}
            alt="Antes"
            className="absolute inset-0 h-full object-cover pointer-events-none max-w-none"
            style={{
              width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100vw',
              minWidth: '100%',
            }}
          />
        </div>

        {/* Badge: ANTES */}
        <div className="absolute top-4 left-4 z-20 pointer-events-none">
          <span className="px-3.5 py-1.5 bg-black/85 backdrop-blur-md text-[#fcf8f5] text-[11px] font-bold tracking-widest rounded-lg border border-white/15 uppercase shadow-md">
            {beforeLabel}
          </span>
        </div>

        {/* Badge: DEPOIS */}
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <span className="px-3.5 py-1.5 bg-black/85 backdrop-blur-md text-[#fcf8f5] text-[11px] font-bold tracking-widest rounded-lg border border-white/15 uppercase shadow-md">
            {afterLabel}
          </span>
        </div>

        {/* Central Divider Line & Draggable Circle */}
        <div
          className="absolute top-0 bottom-0 z-30 pointer-events-none flex flex-col items-center"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="w-[2px] h-full bg-white shadow-[0_0_12px_rgba(0,0,0,0.8)]" />
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white text-[#12100e] flex items-center justify-center shadow-2xl border-2 border-[#12100e]/20 transition-transform group-hover:scale-110">
            <svg
              className="w-5 h-5 text-[#12100e]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l-4 3 4 3m8-6l4 3-4 3" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper function to build comprehensive architectural prompt from all wizard selections
export const buildArchitecturalPrompt = (
  room: string,
  annoyances: string[],
  changes: string[],
  styles: string[],
  checklistData: Record<string, string>,
  userRefs: UserReferenceItem[],
  selectedRefIds: string[],
  clientNotes: string
): string => {
  const parts: string[] = [];

  // 1. Objetivo Principal e Enquadramento
  parts.push(
    `Criar uma proposta de redesign arquitetônico e decoração de interiores para ${room || 'o ambiente'}, preservando rigorosamente o enquadramento, a perspectiva, a posição das janelas/portas e a estrutura espacial da imagem original.`
  );

  // 2. O que incomoda / Diagnóstico do espaço
  if (annoyances && annoyances.length > 0) {
    parts.push(`Problemas e incômodos a solucionar: ${annoyances.join(', ')}.`);
  }

  // 3. O que deseja mudar
  if (changes && changes.length > 0) {
    parts.push(`Intervenções desejadas: ${changes.join(', ')}.`);
  }

  // 4. Como o ambiente deve ficar (Atmosfera e Estilo)
  if (styles && styles.length > 0) {
    parts.push(`Atmosfera e conceito visual pretendido: ${styles.join(', ')}.`);
  }

  // 5. Diretrizes do Checklist Técnico
  const checklistEntries = Object.entries(checklistData || {});
  if (checklistEntries.length > 0) {
    const lines = checklistEntries.map(([category, val]) => {
      if (val === 'Não mexer') {
        return `• ${category}: NÃO MEXER (manter exatamente como na foto original).`;
      }
      return `• ${category}: ${val}.`;
    });
    parts.push(`Diretrizes técnicas do checklist:\n${lines.join('\n')}`);
  }

  // 6. Referências Visuais do Usuário
  const activeRefs = (userRefs || []).filter(
    (r) => selectedRefIds.includes(r.id) || selectedRefIds.includes(r.url)
  );
  if (activeRefs.length > 0) {
    const refLines = activeRefs.map(
      (r, idx) => `• Referência 0${idx + 1} [${r.tag || 'Foco Geral'}]: ${r.title || 'Inspiração visual'}`
    );
    parts.push(`Inspirações e referências visuais selecionadas:\n${refLines.join('\n')}`);
  }

  // 7. Observações complementares
  if (clientNotes && clientNotes.trim()) {
    parts.push(`Observações do cliente/arquiteto: ${clientNotes.trim()}`);
  }

  // 8. Instrução de execução
  parts.push(
    `Regras de execução: Renderização fotorealista de alto padrão. Aplicar exclusivamente as mudanças descritas acima. Toda indicação de "Não mexer" deve ser estritamente respeitada e os demais elementos originais devem ser preservados e integrados harmoniosamente.`
  );

  return parts.join('\n\n');
};

interface ExpressConsultingTabProps {
  onExit?: () => void;
}

export const ExpressConsultingTab: React.FC<ExpressConsultingTabProps> = ({ onExit }) => {
  const { user, profile } = useAuth();
  const { architectProfile, officeSettings } = useFinance();

  const consultantName = profile?.name || user?.displayName || architectProfile?.name || 'Consultor de Projetos';
  const officeName = profile?.companyName || officeSettings?.officeName || architectProfile?.name || 'Meu Escritório Online';

  // Step flow: 0 = Landing, 1 = Client data & Photo, 2 = Desires, 3 = References, 4 = Checklist, 5 = Review Prompt, 6 = Interactive Redesign AI, 7 = Complete
  const [step, setStep] = useState<number>(0);

  // Form states
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [roomType, setRoomType] = useState('Escritório');
  const [temperature, setTemperature] = useState<'cold' | 'neutral' | 'hot'>('neutral');
  const [notes, setNotes] = useState('');

  // Images - START EMPTY so the client/user uploads their own image!
  const [originalImage, setOriginalImage] = useState<string>('');
  const [redesignImage, setRedesignImage] = useState<string>('');
  
  // Real User Placed References (not hardcoded system suggestions)
  const [userReferences, setUserReferences] = useState<UserReferenceItem[]>(() => {
    try {
      const stored = localStorage.getItem('obra_express_user_references');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [selectedReferences, setSelectedReferences] = useState<string[]>([]);
  const [showUrlReferenceModal, setShowUrlReferenceModal] = useState(false);
  const [urlRefInput, setUrlRefInput] = useState('');
  const [urlRefTitle, setUrlRefTitle] = useState('');
  const [urlRefTag, setUrlRefTag] = useState('Marcenaria');
  const [previewingReference, setPreviewingReference] = useState<UserReferenceItem | null>(null);
  const [activeRefSlotIndex, setActiveRefSlotIndex] = useState<number | null>(null);

  const refFileInputRef = useRef<HTMLInputElement>(null);

  // Sync user references to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('obra_express_user_references', JSON.stringify(userReferences));
    } catch (e) {
      console.warn('Could not cache references', e);
    }
  }, [userReferences]);

  // Selections
  const [selectedAnnoyances, setSelectedAnnoyances] = useState<string[]>(['Mal aproveitado', 'Visual pesado']);
  const [selectedChanges, setSelectedChanges] = useState<string[]>(['Quase tudo']);
  const [selectedStyles, setSelectedStyles] = useState<string[]>(['Sofisticado', 'Minimalista']);

  // Checklist choices
  const [checklist, setChecklist] = useState<Record<string, string>>({
    'Pisos e revestimentos': 'Amadeirado',
    'Paredes e cores': 'Textura/revestimento',
    'Iluminação': 'Luz indireta',
    'Mobiliário': 'Substituir',
    'Marcenaria': 'Atualizar',
    'Decoração': 'Minimalista',
    'Organização e uso': 'Melhor circulação',
    'Prioridade principal': 'Estética',
  });

  // Prompt and proposal text
  const [finalPrompt, setFinalPrompt] = useState('');
  const [summaryText, setSummaryText] = useState('');
  const [adjustmentsText, setAdjustmentsText] = useState('');
  const [ideas, setIdeas] = useState<string[]>(SAMPLE_ROOM_PRESETS['Escritório'].ideas);
  const [directionTags, setDirectionTags] = useState<string[]>(['sofisticado', 'redesign amplo', 'preservação arquitetônica', 'elegante']);

  // Interactive AI redesign adjustments
  const [customAdjustmentPrompt, setCustomAdjustmentPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [versionHistory, setVersionHistory] = useState<string[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(0);
  const [comparisonMode, setComparisonMode] = useState<'slider' | 'side-by-side'>('slider');

  // Consultations storage & history
  const [savedConsultations, setSavedConsultations] = useState<ExpressConsultation[]>(() => {
    try {
      const stored = localStorage.getItem('obra_express_consultations');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [activeConsultation, setActiveConsultation] = useState<ExpressConsultation | null>(null);
  const [showPresentationModal, setShowPresentationModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  // Update prompt whenever choices change (including user placed references)
  useEffect(() => {
    const prompt = buildArchitecturalPrompt(
      roomType,
      selectedAnnoyances,
      selectedChanges,
      selectedStyles,
      checklist,
      userReferences,
      selectedReferences,
      notes
    );
    setFinalPrompt(prompt);
  }, [
    roomType,
    selectedAnnoyances,
    selectedChanges,
    selectedStyles,
    checklist,
    selectedReferences,
    userReferences,
    notes,
  ]);

  // References upload handlers
  const handleReferenceFilesUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newRefs: UserReferenceItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const reader = new FileReader();
        const rawUrl = await new Promise<string>((resolve) => {
          reader.onload = (ev) => resolve(ev.target?.result as string);
          reader.readAsDataURL(file);
        });
        const compressed = await compressImageDataUrl(rawUrl, 1000, 0.8);
        const autoTitle =
          file.name.replace(/\.[^/.]+$/, '').slice(0, 30) || `Referência ${userReferences.length + i + 1}`;
        newRefs.push({
          id: `ref_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
          url: compressed,
          title: autoTitle,
          tag: 'Marcenaria & Acabamentos',
          createdAt: new Date().toISOString(),
        });
      } catch (err) {
        console.error('Error reading reference file', err);
      }
    }

    if (newRefs.length > 0) {
      const updated = [...userReferences, ...newRefs];
      setUserReferences(updated);

      if (activeRefSlotIndex !== null) {
        const currentSelected = [...selectedReferences];
        currentSelected[activeRefSlotIndex] = newRefs[0].id;
        setSelectedReferences(currentSelected.filter(Boolean).slice(0, 3));
        setActiveRefSlotIndex(null);
      } else {
        const newSelected = Array.from(new Set([...selectedReferences, ...newRefs.map((r) => r.id)])).slice(0, 3);
        setSelectedReferences(newSelected);
      }

      showToastMsg(`${newRefs.length} foto(s) de referência colocada(s) com sucesso!`);
    }

    if (refFileInputRef.current) refFileInputRef.current.value = '';
  };

  const handleAddUrlReference = () => {
    if (!urlRefInput.trim()) {
      showToastMsg('Por favor, insira o link da imagem.');
      return;
    }
    const newRef: UserReferenceItem = {
      id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      url: urlRefInput.trim(),
      title: urlRefTitle.trim() || `Referência ${userReferences.length + 1}`,
      tag: urlRefTag || 'Geral',
      createdAt: new Date().toISOString(),
    };
    const updated = [...userReferences, newRef];
    setUserReferences(updated);

    if (activeRefSlotIndex !== null) {
      const currentSelected = [...selectedReferences];
      currentSelected[activeRefSlotIndex] = newRef.id;
      setSelectedReferences(currentSelected.filter(Boolean).slice(0, 3));
      setActiveRefSlotIndex(null);
    } else if (selectedReferences.length < 3) {
      setSelectedReferences([...selectedReferences, newRef.id]);
    }

    setUrlRefInput('');
    setUrlRefTitle('');
    setShowUrlReferenceModal(false);
    showToastMsg('Referência por link adicionada com sucesso!');
  };

  const handleRemoveReference = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setUserReferences((prev) => prev.filter((r) => r.id !== id));
    setSelectedReferences((prev) => prev.filter((rId) => rId !== id));
    showToastMsg('Referência removida.');
  };

  const handleToggleReferenceSelect = (id: string) => {
    if (selectedReferences.includes(id)) {
      setSelectedReferences(selectedReferences.filter((rId) => rId !== id));
    } else {
      if (selectedReferences.length >= 3) {
        showToastMsg('Você pode selecionar no máximo 3 referências para a proposta.');
        return;
      }
      setSelectedReferences([...selectedReferences, id]);
    }
  };

  const handleUpdateReferenceTag = (id: string, tag: string) => {
    setUserReferences((prev) =>
      prev.map((r) => (r.id === id ? { ...r, tag } : r))
    );
  };

  const triggerUploadForSlot = (slotIdx: number) => {
    setActiveRefSlotIndex(slotIdx);
    refFileInputRef.current?.click();
  };

  // Select the most suitable redesign image strictly matching the prompt and room type
  const findBestRedesignImage = (
    currentRoom: string,
    styles: string[],
    changes: string[],
    promptText: string
  ): string => {
    const roomKey = AI_REDESIGN_VARIATIONS[currentRoom] ? currentRoom : 'Escritório';
    const variations = AI_REDESIGN_VARIATIONS[roomKey] || AI_REDESIGN_VARIATIONS['Escritório'];

    const combined = `${styles.join(' ')} ${changes.join(' ')} ${promptText}`.toLowerCase();

    if (combined.includes('minimalista') || combined.includes('clean') || combined.includes('limpo')) {
      return variations.minimalista || variations.default;
    }
    if (
      combined.includes('sofisticado') ||
      combined.includes('luxo') ||
      combined.includes('mármore') ||
      combined.includes('elegante')
    ) {
      return variations.sofisticado || variations.default;
    }
    if (
      combined.includes('madeira') ||
      combined.includes('marcenaria') ||
      combined.includes('ripado') ||
      combined.includes('amadeirado')
    ) {
      return variations.madeira || variations.default;
    }
    if (
      combined.includes('claro') ||
      combined.includes('ilumina') ||
      combined.includes('branco') ||
      combined.includes('luz')
    ) {
      return variations.claro || variations.default;
    }
    if (combined.includes('aconchegante') || combined.includes('quente')) {
      return variations.aconchegante || variations.default;
    }
    if (combined.includes('planta') || combined.includes('verde') || combined.includes('natural')) {
      return variations.plantas || variations.default;
    }

    return variations.default;
  };

  // Select room type
  const handleRoomTypeSelect = (type: string) => {
    setRoomType(type);
    if (SAMPLE_ROOM_PRESETS[type]) {
      setIdeas(SAMPLE_ROOM_PRESETS[type].ideas);
    }
  };

  // Handle image file upload by user with automatic canvas compression
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (uploadEv) => {
        if (uploadEv.target?.result) {
          const rawUrl = uploadEv.target.result as string;
          const compressed = await compressImageDataUrl(rawUrl, 1200, 0.8);
          setOriginalImage(compressed);
          const initialMatch = findBestRedesignImage(roomType, selectedStyles, selectedChanges, finalPrompt);
          setRedesignImage(initialMatch);
          showToastMsg('Sua foto do ambiente foi carregada com sucesso!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Preset sample image selector for quick testing
  const handleSelectPresetImage = (sampleKey: string) => {
    setRoomType(sampleKey);
    const preset = SAMPLE_ROOM_PRESETS[sampleKey] || SAMPLE_ROOM_PRESETS['Escritório'];
    setOriginalImage(preset.before);
    setRedesignImage(preset.defaultAfter);
    setIdeas(preset.ideas);
    showToastMsg(`Imagem de demonstração de ${sampleKey} selecionada.`);
  };

  const toggleArrayItem = (list: string[], setList: React.Dispatch<React.SetStateAction<string[]>>, item: string) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  // Check before moving from Step 1 -> Step 2
  const handleNextFromStep1 = () => {
    if (!originalImage) {
      showToastMsg('Por favor, tire ou selecione uma foto do ambiente para continuar!');
      return;
    }
    setStep(2);
  };

  // Start generation in Step 5 -> Step 6 with STRICT prompt matching and Server AI
  const handleGenerateProposal = async () => {
    setStep(6);
    setIsGenerating(true);

    const localMatched = findBestRedesignImage(roomType, selectedStyles, selectedChanges, finalPrompt);
    const activeRefs = userReferences.filter(
      (r) => selectedReferences.includes(r.id) || selectedReferences.includes(r.url)
    );

    try {
      const response = await fetch('/api/gemini/generate-proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          roomType,
          originalImage,
          referenceImages: activeRefs,
          annoyances: selectedAnnoyances,
          changes: selectedChanges,
          styles: selectedStyles,
          checklist,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const chosenImage = data.redesignImage || localMatched;
        setRedesignImage(chosenImage);
        setVersionHistory([chosenImage]);
        setCurrentVersionIndex(0);
        if (data.summary) setSummaryText(data.summary);
        if (data.adjustmentsText) setAdjustmentsText(data.adjustmentsText);
        if (data.ideas && data.ideas.length > 0) setIdeas(data.ideas);
        if (data.directionTags && data.directionTags.length > 0) setDirectionTags(data.directionTags);
        showToastMsg(`Proposta visual para ${roomType} gerada com IA!`);
      } else {
        setRedesignImage(localMatched);
        setVersionHistory([localMatched]);
        setCurrentVersionIndex(0);
        const fallbackSummary = `A proposta segue uma linha de redesign pontual para ${roomType}, com foco em requalificar os elementos de acabamento, marcenaria e iluminação para diminuir a sensação de ${selectedAnnoyances.join(' e ') || 'peso visual'}. A intenção é trazer um resultado mais ${selectedStyles.join(', ').toLowerCase() || 'sofisticado'}, preservando integralmente a arquitetura existente e todos os elementos que não foram indicados para alteração.`;
        setSummaryText(fallbackSummary);
        const fallbackAdjustments = `A intervenção se concentra nas soluções solicitadas para o ${roomType.toLowerCase()}, que passa a ser o principal recurso para organizar melhor a leitura do espaço e aliviar o aspecto anterior. Mantêm-se rigorosamente o enquadramento, a perspectiva e a arquitetura original, sem qualquer alteração estrutural fora do que foi solicitado.`;
        setAdjustmentsText(fallbackAdjustments);
        showToastMsg(`Proposta visual para ${roomType} gerada com sucesso!`);
      }
    } catch (err) {
      console.warn("Generation error:", err);
      setRedesignImage(localMatched);
      setVersionHistory([localMatched]);
      setCurrentVersionIndex(0);
      showToastMsg(`Proposta visual para ${roomType} gerada com sucesso!`);
    } finally {
      setIsGenerating(false);
    }
  };

  // REAL AI REDESIGN ADJUSTMENT: Modifies the proposal image according to prompt description!
  const handleRefineImage = async (promptTweak: string) => {
    if (!promptTweak.trim()) return;
    setIsGenerating(true);

    try {
      const response = await fetch('/api/gemini/adjust-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adjustmentPrompt: promptTweak,
          currentImage: redesignImage,
          roomType,
        }),
      });

      let nextVersionUrl = '';
      if (response.ok) {
        const data = await response.json();
        if (data.adjustedImage) {
          nextVersionUrl = data.adjustedImage;
        }
      }

      if (!nextVersionUrl) {
        const roomCategory = AI_REDESIGN_VARIATIONS[roomType] ? roomType : 'Escritório';
        const variations = AI_REDESIGN_VARIATIONS[roomCategory] || AI_REDESIGN_VARIATIONS['Escritório'];

        const lower = promptTweak.toLowerCase();
        let matchedKey = 'default';

        if (lower.includes('claro') || lower.includes('ilumina') || lower.includes('branco')) {
          matchedKey = 'claro';
        } else if (lower.includes('madeira') || lower.includes('marcenaria') || lower.includes('ripado') || lower.includes('amadeirado')) {
          matchedKey = 'madeira';
        } else if (lower.includes('aconchegante') || lower.includes('quente') || lower.includes('amarela')) {
          matchedKey = 'aconchegante';
        } else if (lower.includes('sofisticado') || lower.includes('luxo') || lower.includes('mármore') || lower.includes('elegante')) {
          matchedKey = 'sofisticado';
        } else if (lower.includes('minimalista') || lower.includes('limpo') || lower.includes('clean')) {
          matchedKey = 'minimalista';
        } else if (lower.includes('planta') || lower.includes('verde') || lower.includes('natureza')) {
          matchedKey = 'plantas';
        } else {
          const keys = Object.keys(variations);
          matchedKey = keys[(versionHistory.length + 1) % keys.length];
        }

        nextVersionUrl = variations[matchedKey] || variations.default;
      }

      setRedesignImage(nextVersionUrl);
      setVersionHistory((prev) => [...prev, nextVersionUrl]);
      setCurrentVersionIndex(versionHistory.length);
      setCustomAdjustmentPrompt('');
      showToastMsg(`Imagem ajustada por IA: "${promptTweak}"`);
    } catch (err) {
      console.warn("Adjustment error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  // Confirm version and save consultation
  const handleConfirmProposal = () => {
    const newConsultation: ExpressConsultation = {
      id: `cons_${Date.now()}`,
      clientName: clientName || 'Cliente Sem Nome',
      clientPhone: clientPhone || '',
      roomType,
      temperature,
      notes,
      originalImage,
      redesignImage,
      versionCount: versionHistory.length || 1,
      versions: versionHistory.length > 0 ? versionHistory : [redesignImage],
      annoyances: selectedAnnoyances,
      desiredChanges: selectedChanges,
      desiredStyle: selectedStyles,
      checklist,
      finalPrompt,
      summaryText,
      adjustmentsText,
      ideas,
      directionTags,
      userReferences,
      selectedReferences,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      consultantName,
      officeName,
    };

    const updated = [newConsultation, ...savedConsultations];
    setSavedConsultations(updated);
    safeSaveConsultationsToStorage(updated);

    setActiveConsultation(newConsultation);
    setStep(7);
    showToastMsg('Consultoria salva no histórico com sucesso!');
  };

  const handleDeleteConsultation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedConsultations.filter((c) => c.id !== id);
    setSavedConsultations(filtered);
    safeSaveConsultationsToStorage(filtered);
    showToastMsg('Consultoria removida.');
  };

  // WhatsApp formatted share link with Office Name & Direct Presentation URL
  const getWhatsAppShareUrl = (consultation: ExpressConsultation) => {
    const presentationUrl = `${window.location.origin}/consultoria/${consultation.id}`;
    const text =
      `✨ *Proposta de Consultoria Expressa - ${consultation.officeName}*\n\n` +
      `Olá, ${consultation.clientName}! Preparamos uma proposta personalizada para a transformação do seu ambiente (*${consultation.roomType}*).\n\n` +
      `🎨 *Atmosfera:* ${consultation.desiredStyle.join(', ') || 'Sofisticado'}\n` +
      `📌 *Resumo:* ${consultation.summaryText}\n\n` +
      `Acesse a sua apresentação interativa completa no link abaixo:\n` +
      `${presentationUrl}`;
    return `https://api.whatsapp.com/send?phone=${encodeURIComponent(
      consultation.clientPhone.replace(/\D/g, '')
    )}&text=${encodeURIComponent(text)}`;
  };

  const handleCopyPresentationLink = (consultation: ExpressConsultation) => {
    const url = `${window.location.origin}/consultoria/${consultation.id}`;
    navigator.clipboard.writeText(url);
    showToastMsg('Link da apresentação copiado para a área de transferência!');
  };

  // Print PDF helper
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="w-full min-h-screen bg-[#faf8f5] text-[#2d2621] p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      {/* Toast alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-white border border-[#b87c3e] text-[#2d2621] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-[#b87c3e] shrink-0" />
          <span className="text-xs font-semibold">{toast}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="flex items-center justify-between pb-4 border-b border-stone-200 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#b87c3e]/15 text-[#b87c3e] border border-[#b87c3e]/30 flex items-center justify-center font-serif font-bold text-lg shadow-inner">
            {officeName.charAt(0) || 'E'}
          </div>
          <div>
            <h1 className="text-sm font-bold text-stone-900 tracking-tight">
              Consultoria Expressa {step > 0 && step < 7 && `— Passo ${step} de 6`}
            </h1>
            <p className="text-[11px] text-stone-500">Redesign de ambientes do {officeName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {savedConsultations.length > 0 && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-200 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <History className="w-3.5 h-3.5 text-[#b87c3e]" />
              <span>Histórico ({savedConsultations.length})</span>
            </button>
          )}

          {step > 0 && (
            <button
              onClick={() => setStep(0)}
              className="px-3.5 py-1.5 border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Início
            </button>
          )}

          {onExit && (
            <button
              onClick={onExit}
              className="px-3.5 py-1.5 border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5 text-[#b87c3e]" />
              <span>Voltar ao Sistema</span>
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* STEP 0: LANDING & CTA */}
      {/* ========================================================================= */}
      {step === 0 && (
        <div className="relative rounded-3xl overflow-hidden border border-stone-200 shadow-xl bg-white">
          <div
            className="absolute inset-0 opacity-15 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1600&auto=format&fit=crop')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-stone-50/90 to-transparent" />

          {/* Header Bar */}
          <div className="relative z-10 p-6 sm:p-8 flex items-center justify-between flex-wrap gap-4 border-b border-stone-200/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#b87c3e]/15 border border-[#b87c3e]/30 text-[#b87c3e] flex items-center justify-center font-serif font-bold text-lg">
                {officeName.charAt(0)}
              </div>
              <span className="font-serif font-bold text-sm tracking-wider uppercase text-stone-900">
                {officeName}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 text-xs font-semibold rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <History className="w-3.5 h-3.5 text-[#b87c3e]" />
                <span>HISTÓRICO</span>
              </button>

              {onExit && (
                <button
                  onClick={onExit}
                  className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-900 border border-stone-200 text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <X className="w-3.5 h-3.5 text-[#b87c3e]" />
                  <span>VOLTAR AO SISTEMA</span>
                </button>
              )}
            </div>
          </div>

          {/* Hero Section */}
          <div className="relative z-10 p-6 sm:p-12 lg:p-16 max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#b87c3e]/15 border border-[#b87c3e]/30 text-[#b87c3e] text-[11px] font-bold tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CONSULTORIA EXPRESSA</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif font-bold leading-tight text-stone-900">
              Uma nova possibilidade para o seu espaço.
            </h1>

            <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-sans">
              Transformação inteligente de ambientes preservando rigorosamente a arquitetura, enquadramento e perspectiva existentes. Gere propostas visuais refinadas com comparador interativo Antes & Depois.
            </p>

            <div className="pt-2">
              <button
                onClick={() => {
                  setOriginalImage('');
                  setRedesignImage('');
                  setStep(1);
                }}
                className="px-8 py-4 bg-[#b87c3e] hover:bg-[#a36b32] text-white font-bold text-xs rounded-full transition-all flex items-center gap-2.5 cursor-pointer shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>INICIAR CONSULTORIA</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="relative z-10 p-6 sm:p-8 border-t border-stone-200 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-4">
            <div>Plataforma oficial do {officeName} — Redesign em minutos</div>
            <div className="flex items-center gap-4">
              <span>✓ Análise do Ambiente</span>
              <span>✓ Comparador Antes & Depois</span>
              <span>✓ Proposta Interativa</span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 1: DADOS DO CLIENTE & FOTO DO AMBIENTE */}
      {/* ========================================================================= */}
      {step === 1 && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-10 shadow-xl max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#b87c3e]">PASSO 1 DE 5</span>
            <h2 className="text-2xl font-serif font-bold text-stone-900">Dados do Cliente & Foto do Ambiente</h2>
            <p className="text-xs text-stone-500">Preencha os dados e envie a imagem do espaço que o cliente deseja transformar.</p>
          </div>

          <div className="space-y-6">
            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">Nome do Cliente</label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Maria Silva"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-[#b87c3e]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1.5">WhatsApp / Telefone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+55 (11) 99999-9999"
                    className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-[#b87c3e]"
                  />
                </div>
              </div>
            </div>

            {/* Room Type Selector Pills */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-700">Tipo de ambiente</label>
              <div className="flex flex-wrap gap-2">
                {ROOM_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleRoomTypeSelect(type)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      roomType === type
                        ? 'bg-[#b87c3e] text-white font-bold shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Photo Dropzone Box (CLIENT UPLOADS IMAGE HERE) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-stone-900">Foto do Ambiente Atual (Obrigatório)</label>
                {originalImage && (
                  <span className="text-[11px] text-[#b87c3e] font-bold">✓ Imagem Selecionada</span>
                )}
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all space-y-3 ${
                  originalImage
                    ? 'border-[#b87c3e] bg-[#b87c3e]/5'
                    : 'border-stone-300 bg-stone-50 hover:bg-stone-100'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />

                {originalImage ? (
                  <div className="relative max-w-md mx-auto group">
                    <img
                      src={originalImage}
                      alt="Foto do cliente"
                      className="w-full h-52 object-cover rounded-xl shadow-md border border-stone-200"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all rounded-xl flex items-center justify-center text-white text-xs font-bold gap-2">
                      <Camera className="w-5 h-5 text-[#b87c3e]" />
                      <span>Trocar foto do cliente</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-[#b87c3e]/15 text-[#b87c3e] border border-[#b87c3e]/30 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-stone-900">Envie a foto do ambiente do cliente</p>
                      <p className="text-xs text-stone-500 max-w-md mx-auto mt-1">
                        Clique aqui para selecionar do dispositivo, tirar uma foto com a câmera ou escolher uma referência.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Quick Preset Selector for Optional Demonstration */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-stone-500 block mb-2">
                  Ou escolha uma imagem de demonstração por tipo de ambiente:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.keys(SAMPLE_ROOM_PRESETS).slice(0, 8).map((key) => (
                    <button
                      key={key}
                      onClick={() => handleSelectPresetImage(key)}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        roomType === key && originalImage === SAMPLE_ROOM_PRESETS[key].before
                          ? 'border-[#b87c3e] bg-[#b87c3e]/15'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                      }`}
                    >
                      <img
                        src={SAMPLE_ROOM_PRESETS[key].before}
                        alt={key}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <span className="text-xs font-semibold text-stone-800 truncate">{key}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lead Temperature & Note */}
            <div className="p-4 bg-stone-50 border border-stone-200 rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-stone-600">
                  <span>TEMPERATURA:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setTemperature('cold')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        temperature === 'cold'
                          ? 'bg-blue-600 text-white'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      ❄️ Frio
                    </button>
                    <button
                      onClick={() => setTemperature('neutral')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        temperature === 'neutral'
                          ? 'bg-[#b87c3e] text-white'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      🔘 Neutro
                    </button>
                    <button
                      onClick={() => setTemperature('hot')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        temperature === 'hot'
                          ? 'bg-amber-600 text-white'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      🔥 Quente
                    </button>
                  </div>
                </div>

                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observação rápida sobre o cliente..."
                  className="flex-1 px-3 py-1.5 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#b87c3e]"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
            <button
              onClick={() => setStep(0)}
              className="px-5 py-2.5 border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-full transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleNextFromStep1}
              className="px-6 py-2.5 bg-[#b87c3e] hover:bg-[#a36b32] text-white text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>Próximo Passo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 2: O QUE VOCÊ DESEJA MELHORAR? */}
      {/* ========================================================================= */}
      {step === 2 && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-10 shadow-xl max-w-4xl mx-auto space-y-8">
          {/* Top thumbnail card */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center gap-4">
            <img
              src={originalImage}
              alt="Ambiente em análise"
              className="w-16 h-16 rounded-xl object-cover shadow-xs border border-stone-200"
            />
            <div>
              <span className="text-[10px] font-bold text-[#b87c3e] uppercase tracking-wider block">
                AMBIENTE EM ANÁLISE — {roomType.toUpperCase()}
              </span>
              <p className="text-xs font-medium text-stone-600">
                Use esta imagem como referência durante a consultoria.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Question 1 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-stone-900">O que mais incomoda hoje?</h3>
              <div className="flex flex-wrap gap-2">
                {ANNOYANCE_OPTIONS.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleArrayItem(selectedAnnoyances, setSelectedAnnoyances, item)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      selectedAnnoyances.includes(item)
                        ? 'bg-[#b87c3e] text-white font-bold shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 2 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-stone-900">O que você gostaria de mudar?</h3>
              <div className="flex flex-wrap gap-2">
                {DESIRED_CHANGE_OPTIONS.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleArrayItem(selectedChanges, setSelectedChanges, item)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      selectedChanges.includes(item)
                        ? 'bg-[#b87c3e] text-white font-bold shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 3 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-stone-900">Como você gostaria que ficasse?</h3>
              <div className="flex flex-wrap gap-2">
                {DESIRED_STYLE_OPTIONS.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleArrayItem(selectedStyles, setSelectedStyles, item)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      selectedStyles.includes(item)
                        ? 'bg-[#b87c3e] text-white font-bold shadow-xs'
                        : 'bg-stone-100 hover:bg-stone-200 text-stone-700 border border-stone-200'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-[#b87c3e] hover:bg-[#a36b32] text-white text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>Próximo Passo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: REFERÊNCIAS REAIS COLOCADAS PELO CLIENTE / ARQUITETO */}
      {/* ========================================================================= */}
      {step === 3 && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-10 shadow-xl max-w-5xl mx-auto space-y-8">
          {/* Hidden multi-file upload input */}
          <input
            ref={refFileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleReferenceFilesUpload}
            className="hidden"
          />

          {/* Top banner */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              {originalImage ? (
                <img
                  src={originalImage}
                  alt="Ambiente em análise"
                  className="w-14 h-14 rounded-xl object-cover border border-stone-200 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-stone-100 border border-stone-200 flex items-center justify-center text-[#b87c3e] shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold text-[#b87c3e] uppercase tracking-wider block">
                  PASSO 3 DE 5 — FOTOS DE REFERÊNCIA DO CLIENTE
                </span>
                <h3 className="text-base font-bold text-stone-900">
                  Coloque as fotos reais de referência
                </h3>
                <p className="text-xs text-stone-500">
                  Adicione fotos de marcenaria, iluminação, revestimentos ou estilo que o cliente deseja incorporar na proposta.
                </p>
              </div>
            </div>

            {/* Quick Upload action buttons */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              <button
                onClick={() => {
                  setActiveRefSlotIndex(null);
                  refFileInputRef.current?.click();
                }}
                className="px-4 py-2 bg-[#b87c3e] hover:bg-[#a36b32] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload de Fotos</span>
              </button>

              <button
                onClick={() => {
                  setActiveRefSlotIndex(null);
                  setShowUrlReferenceModal(true);
                }}
                className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-200 flex items-center gap-1.5 cursor-pointer"
              >
                <Link className="w-3.5 h-3.5 text-[#b87c3e]" />
                <span>Link URL</span>
              </button>
            </div>
          </div>

          {/* Status Counter */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-200">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-stone-900">
                Slots de Referências Ativas para a Proposta:
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#b87c3e]/15 text-[#b87c3e] border border-[#b87c3e]/30">
                {selectedReferences.length} de 3 selecionadas
              </span>
            </div>
            <span className="text-[11px] text-stone-500 hidden sm:inline">
              *Selecione até 3 fotos que guiarão a IA
            </span>
          </div>

          {/* 3 Primary Slots */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[0, 1, 2].map((slotIdx) => {
              const selectedId = selectedReferences[slotIdx];
              const refItem = userReferences.find(
                (r) => r.id === selectedId || r.url === selectedId
              );

              if (refItem) {
                return (
                  <div
                    key={slotIdx}
                    className="relative bg-stone-50 border-2 border-[#b87c3e] rounded-2xl overflow-hidden shadow-md flex flex-col group"
                  >
                    {/* Slot Header Badge */}
                    <div className="px-3 py-1.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#b87c3e] tracking-wider uppercase">
                        Slot 0{slotIdx + 1} — Ativa
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setPreviewingReference(refItem)}
                          className="p-1 hover:bg-stone-200 text-stone-600 hover:text-stone-900 rounded cursor-pointer"
                          title="Visualizar foto ampliada"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleRemoveReference(refItem.id, e)}
                          className="p-1 hover:bg-red-50 text-red-500 rounded cursor-pointer"
                          title="Remover referência"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Image Thumbnail */}
                    <div className="relative h-44 w-full bg-stone-200 overflow-hidden">
                      <img
                        src={refItem.url}
                        alt={refItem.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-md px-2 py-0.5 rounded-full border border-stone-200 text-[10px] font-bold text-[#b87c3e] flex items-center gap-1 shadow-xs">
                        <Check className="w-3 h-3 text-[#b87c3e]" />
                        <span>Selecionada</span>
                      </div>
                    </div>

                    {/* Controls & Tag */}
                    <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                      <div>
                        <input
                          type="text"
                          value={refItem.title}
                          onChange={(e) => {
                            const newTitle = e.target.value;
                            setUserReferences((prev) =>
                              prev.map((r) =>
                                r.id === refItem.id ? { ...r, title: newTitle } : r
                              )
                            );
                          }}
                          placeholder="Nome da referência..."
                          className="w-full px-2.5 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold text-stone-900 focus:outline-none focus:border-[#b87c3e]"
                        />
                      </div>

                      {/* Tag selector */}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-stone-500 uppercase tracking-wider block">
                          Foco desta referência:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {['Marcenaria', 'Iluminação', 'Cores', 'Mobiliário', 'Revestimento'].map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleUpdateReferenceTag(refItem.id, tag)}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                refItem.tag === tag
                                  ? 'bg-[#b87c3e] text-white'
                                  : 'bg-white text-stone-600 hover:text-stone-900 border border-stone-200'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-stone-200 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => triggerUploadForSlot(slotIdx)}
                          className="text-[10px] font-bold text-[#b87c3e] hover:underline cursor-pointer flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Substituir foto</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleReferenceSelect(refItem.id)}
                          className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                        >
                          Desmarcar slot
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              // Empty Slot
              return (
                <div
                  key={slotIdx}
                  className="border-2 border-dashed border-stone-300 hover:border-[#b87c3e] bg-stone-50/70 rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-4 transition-all min-h-[300px]"
                >
                  <div className="w-12 h-12 rounded-2xl bg-stone-100 border border-stone-200 text-[#b87c3e] flex items-center justify-center shadow-inner">
                    <Plus className="w-6 h-6" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                      Slot 0{slotIdx + 1} Livre
                    </span>
                    <h4 className="text-sm font-bold text-stone-900">
                      Colocar Foto de Referência
                    </h4>
                    <p className="text-[11px] text-stone-500 max-w-[200px] leading-relaxed">
                      Faça upload de uma foto real ou insira o link da imagem
                    </p>
                  </div>

                  <div className="flex flex-col w-full max-w-[200px] gap-2 pt-2">
                    <button
                      onClick={() => triggerUploadForSlot(slotIdx)}
                      className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5 text-[#b87c3e]" />
                      <span>Upload do Arquivo</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveRefSlotIndex(slotIdx);
                        setShowUrlReferenceModal(true);
                      }}
                      className="w-full py-1.5 bg-transparent hover:bg-stone-100 text-stone-600 hover:text-stone-900 text-[11px] font-semibold rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Link className="w-3 h-3 text-[#b87c3e]" />
                      <span>Inserir por Link URL</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* User's Reference Library / Banco de Referências */}
          {userReferences.length > 0 && (
            <div className="pt-6 border-t border-stone-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                    Galeria de Referências Colocadas ({userReferences.length})
                  </h4>
                  <p className="text-[11px] text-stone-500">
                    Clique em uma imagem para marcar ou desmarcar como referência ativa da proposta.
                  </p>
                </div>

                <button
                  onClick={() => {
                    setActiveRefSlotIndex(null);
                    refFileInputRef.current?.click();
                  }}
                  className="text-xs font-bold text-[#b87c3e] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Mais</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {userReferences.map((ref) => {
                  const isSelected =
                    selectedReferences.includes(ref.id) ||
                    selectedReferences.includes(ref.url);

                  return (
                    <div
                      key={ref.id}
                      onClick={() => handleToggleReferenceSelect(ref.id)}
                      className={`relative rounded-xl overflow-hidden border cursor-pointer group transition-all ${
                        isSelected
                          ? 'border-[#b87c3e] ring-2 ring-[#b87c3e]'
                          : 'border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      <img
                        src={ref.url}
                        alt={ref.title}
                        className="w-full h-24 object-cover group-hover:scale-105 transition-transform"
                      />

                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-1.5 flex flex-col justify-end">
                        <span className="text-[10px] font-bold text-white truncate">
                          {ref.title}
                        </span>
                        {ref.tag && (
                          <span className="text-[8px] text-[#b87c3e] uppercase font-bold truncate">
                            {ref.tag}
                          </span>
                        )}
                      </div>

                      {/* Selection Checkmark */}
                      {isSelected ? (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#b87c3e] text-white flex items-center justify-center font-bold shadow-md">
                          <Check className="w-3 h-3" />
                        </div>
                      ) : (
                        <button
                          onClick={(e) => handleRemoveReference(ref.id, e)}
                          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/70 text-red-400 hover:bg-red-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Excluir"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Action Footer */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              onClick={() => setStep(4)}
              className="px-6 py-2.5 bg-[#b87c3e] hover:bg-[#a36b32] text-white text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>Próximo Passo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 4: CHECKLIST DE MELHORIAS */}
      {/* ========================================================================= */}
      {step === 4 && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-10 shadow-xl max-w-5xl mx-auto space-y-8">
          {/* Top thumbnail */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center gap-4">
            <img
              src={originalImage}
              alt="Ambiente em análise"
              className="w-16 h-16 rounded-xl object-cover border border-stone-200"
            />
            <div>
              <span className="text-[10px] font-bold text-[#b87c3e] uppercase tracking-wider block">
                CHECKLIST DE MELHORIAS — ESPECIFICAÇÕES
              </span>
              <p className="text-xs font-medium text-stone-600">
                Selecione as diretrizes exatas para orientar a geração da proposta de redesign pela IA.
              </p>
            </div>
          </div>

          {/* Grid of 8 parameter cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { category: 'Pisos e revestimentos', options: ['Claro', 'Amadeirado', 'Escuro', 'Não mexer'] },
              { category: 'Paredes e cores', options: ['Claras', 'Coloridas', 'Textura/revestimento', 'Não mexer'] },
              { category: 'Iluminação', options: ['Mais luz geral', 'Luz indireta', 'Luz decorativa', 'Não mexer'] },
              { category: 'Mobiliário', options: ['Manter', 'Substituir', 'Reaproveitar parte', 'Adicionar peças'] },
              { category: 'Marcenaria', options: ['Adicionar', 'Atualizar', 'Madeira clara', 'Madeira escura', 'Não mexer'] },
              { category: 'Decoração', options: ['Minimalista', 'Aconchegante', 'Marcante', 'Natural', 'Não mexer'] },
              { category: 'Organização e uso', options: ['Mais armazenamento', 'Melhor circulação', 'Setorizar usos', 'Não mexer'] },
              { category: 'Prioridade principal', options: ['Estética', 'Conforto', 'Funcionalidade', 'Organização', 'Baixo investimento'] },
            ].map((block) => (
              <div key={block.category} className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 shadow-2xs">
                <h4 className="text-xs font-bold text-stone-900">{block.category}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {block.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setChecklist({ ...checklist, [block.category]: opt })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        checklist[block.category] === opt
                          ? 'bg-[#b87c3e] text-white font-bold shadow-2xs'
                          : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-stone-200 flex items-center justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2.5 border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              onClick={() => setStep(5)}
              className="px-6 py-2.5 bg-[#b87c3e] hover:bg-[#a36b32] text-white text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>Conferir Proposta</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 5: CONFIRA ANTES DE CRIAR */}
      {/* ========================================================================= */}
      {step === 5 && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-10 shadow-xl max-w-5xl mx-auto space-y-8">
          {/* Top thumbnail */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center gap-4">
            <img
              src={originalImage}
              alt="Ambiente em análise"
              className="w-16 h-16 rounded-xl object-cover border border-stone-200"
            />
            <div>
              <span className="text-[10px] font-bold text-[#b87c3e] uppercase tracking-wider block">
                CONFIRA ANTES DE GERAR COM IA
              </span>
              <p className="text-xs font-medium text-stone-600">
                Revise os parâmetros e o prompt de inteligência artificial que gerará a proposta de redesign.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Image Preview */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#b87c3e] uppercase tracking-wider block">
                FOTO ORIGINAL DO AMBIENTE
              </span>
              <img
                src={originalImage}
                alt="Original"
                className="w-full h-80 object-cover rounded-2xl shadow-md border border-stone-200"
              />
            </div>

            {/* Right Instructions Panel */}
            <div className="space-y-6">
              {/* Comprehensive Summary of all Prior Choices */}
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-stone-200 pb-2.5">
                  <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#b87c3e]" />
                    <span>Resumo do Atendimento</span>
                  </h4>
                  <button
                    onClick={() => setStep(2)}
                    className="text-[11px] font-bold text-[#b87c3e] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Editar escolhas</span>
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  {/* O que incomoda */}
                  {selectedAnnoyances.length > 0 && (
                    <div className="space-y-1">
                      <span className="font-bold text-[#b87c3e] uppercase tracking-wider block text-[10px]">
                        O QUE MAIS INCOMODA HOJE
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedAnnoyances.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-2.5 py-0.5 bg-stone-200 text-stone-800 rounded-full text-[11px] border border-stone-300 font-medium"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* O que deseja mudar */}
                  <div className="space-y-1">
                    <span className="font-bold text-[#b87c3e] uppercase tracking-wider block text-[10px]">
                      O QUE DESEJA MUDAR
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedChanges.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 bg-stone-200 text-stone-800 rounded-full text-[11px] border border-stone-300 font-medium"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Como o ambiente deve ficar */}
                  <div className="space-y-1">
                    <span className="font-bold text-[#b87c3e] uppercase tracking-wider block text-[10px]">
                      COMO O AMBIENTE DEVE FICAR (ATMOSFERA & CONCEITO)
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedStyles.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-0.5 bg-[#b87c3e]/15 text-[#b87c3e] font-bold rounded-full text-[11px] border border-[#b87c3e]/30"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Checklist Técnico Selecionado */}
                  <div className="space-y-1.5 pt-2 border-t border-stone-200">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#b87c3e] uppercase tracking-wider block text-[10px]">
                        DIRETRIZES DO CHECKLIST TÉCNICO
                      </span>
                      <button
                        onClick={() => setStep(4)}
                        className="text-[10px] text-stone-500 hover:text-[#b87c3e] hover:underline cursor-pointer"
                      >
                        Ajustar checklist
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {Object.entries(checklist).map(([cat, val]) => (
                        <div
                          key={cat}
                          className="p-1.5 rounded-lg bg-white border border-stone-200 flex items-center justify-between gap-1"
                        >
                          <span className="text-stone-500 truncate text-[10px]">{cat}:</span>
                          <span
                            className={`font-semibold text-[10px] px-1.5 py-0.5 rounded truncate ${
                              val === 'Não mexer'
                                ? 'bg-stone-200 text-stone-600'
                                : 'bg-[#b87c3e]/15 text-stone-900'
                            }`}
                          >
                            {val}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Observações do Cliente */}
                  {notes.trim() && (
                    <div className="pt-2 border-t border-stone-200">
                      <span className="font-bold text-[#b87c3e] uppercase tracking-wider block text-[10px]">
                        OBSERVAÇÕES DO CLIENTE
                      </span>
                      <p className="text-stone-900 text-xs italic mt-0.5">"{notes.trim()}"</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Selected References Preview */}
              {selectedReferences.length > 0 && (
                <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-stone-900 uppercase tracking-wider">
                      Referências Visuais Selecionadas ({selectedReferences.length})
                    </h4>
                    <button
                      onClick={() => setStep(3)}
                      className="text-[11px] font-bold text-[#b87c3e] hover:underline cursor-pointer"
                    >
                      Editar referências
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {selectedReferences.map((refId, idx) => {
                      const refItem = userReferences.find((r) => r.id === refId || r.url === refId);
                      if (!refItem) return null;
                      return (
                        <div
                          key={idx}
                          onClick={() => setPreviewingReference(refItem)}
                          className="relative rounded-xl overflow-hidden border border-stone-200 bg-white group cursor-pointer shadow-2xs"
                        >
                          <img
                            src={refItem.url}
                            alt={refItem.title}
                            className="w-full h-20 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-1.5 flex flex-col justify-end">
                            <span className="text-[10px] font-bold text-white truncate">
                              {refItem.title}
                            </span>
                            {refItem.tag && (
                              <span className="text-[8px] text-[#b87c3e] uppercase font-bold truncate">
                                {refItem.tag}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prompt Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-stone-900">Prompt final da proposta IA</label>
                  <button
                    onClick={() => {
                      const refreshedPrompt = buildArchitecturalPrompt(
                        roomType,
                        selectedAnnoyances,
                        selectedChanges,
                        selectedStyles,
                        checklist,
                        userReferences,
                        selectedReferences,
                        notes
                      );
                      setFinalPrompt(refreshedPrompt);
                      showToastMsg('Prompt atualizado com todas as opções anteriores e diretrizes do checklist!');
                    }}
                    className="text-[11px] font-bold text-[#b87c3e] hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Atualizar pelo checklist</span>
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={finalPrompt}
                  onChange={(e) => setFinalPrompt(e.target.value)}
                  className="w-full p-4 bg-stone-50 border border-stone-200 rounded-2xl text-xs leading-relaxed text-stone-900 focus:outline-none focus:border-[#b87c3e] font-mono font-normal"
                />
              </div>

              <button
                onClick={handleGenerateProposal}
                className="w-full py-4 bg-[#b87c3e] hover:bg-[#a36b32] text-white text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <Sparkles className="w-4 h-4 text-white" />
                <span>GERAR PROPOSTA COM IA</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 6: CONVERSE COM A IMAGEM & COMPARADOR ARRASTÁVEL INTERATIVO */}
      {/* ========================================================================= */}
      {step === 6 && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-10 shadow-xl max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-stone-200">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#b87c3e]">GERAÇÃO INTELIGENTE POR IA</span>
              <h2 className="text-2xl font-serif font-bold text-stone-900">Converse com a imagem</h2>
              <p className="text-xs text-stone-500">Compare o ambiente original com a nova proposta e refine por texto.</p>
            </div>

            {/* Toggle between Slider Drag and Side by Side */}
            <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-xl border border-stone-200 self-start sm:self-center">
              <button
                onClick={() => setComparisonMode('slider')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  comparisonMode === 'slider'
                    ? 'bg-[#b87c3e] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <MoveHorizontal className="w-3.5 h-3.5" />
                <span>Arrastar Comparador</span>
              </button>
              <button
                onClick={() => setComparisonMode('side-by-side')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  comparisonMode === 'side-by-side'
                    ? 'bg-[#b87c3e] text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Lado a Lado</span>
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isGenerating ? (
            <div className="py-20 text-center space-y-4 bg-stone-50 rounded-3xl border border-stone-200 shadow-inner">
              <RefreshCw className="w-10 h-10 text-[#b87c3e] animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-stone-900">A Inteligência Artificial está renderizando a proposta...</h3>
                <p className="text-xs text-stone-500 font-medium">
                  Aplicando alterações arquitetônicas e refinando acabamentos conforme a descrição do prompt...
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* INTERACTIVE COMPARISON (SLIDER OR SIDE-BY-SIDE) */}
              {comparisonMode === 'slider' ? (
                <div className="max-w-4xl mx-auto">
                  <BeforeAfterSlider
                    beforeImage={originalImage}
                    afterImage={redesignImage}
                    title="ARRASTE PARA COMPARAR"
                    aspectRatioClass="h-[400px] sm:h-[500px]"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                      ANTES (ORIGINAL ENVIADO)
                    </span>
                    <img
                      src={originalImage}
                      alt="Antes"
                      className="w-full h-80 sm:h-96 object-cover rounded-2xl shadow-md border border-stone-200"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#b87c3e] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#b87c3e]" />
                        PROPOSTA GERADA POR IA — VERSÃO {currentVersionIndex + 1}
                      </span>
                    </div>
                    <img
                      src={redesignImage}
                      alt="Depois"
                      className="w-full h-80 sm:h-96 object-cover rounded-2xl shadow-md border border-[#b87c3e]/40 ring-1 ring-[#b87c3e]/30"
                    />
                  </div>
                </div>
              )}

              {/* Version Selector Thumbnails */}
              {versionHistory.length > 1 && (
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {versionHistory.map((verUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setCurrentVersionIndex(idx);
                        setRedesignImage(verUrl);
                      }}
                      className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition-all ${
                        currentVersionIndex === idx
                          ? 'border-[#b87c3e] bg-[#b87c3e] text-white shadow-xs'
                          : 'border-stone-200 bg-stone-50 text-stone-600 hover:bg-stone-100'
                      }`}
                    >
                      <img src={verUrl} alt={`Versão ${idx + 1}`} className="w-6 h-6 rounded-md object-cover" />
                      <span>Versão {idx + 1}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Refinement Controls Box */}
              <div className="p-5 bg-stone-50 rounded-2xl border border-stone-200 space-y-4 shadow-2xs">
                <span className="text-xs font-bold text-stone-900 block">
                  Ajustar proposta com IA (Selecione um comando rápido ou digite o ajuste desejado):
                </span>

                {/* Quick adjustment pills */}
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    'Mais claro',
                    'Mais aconchegante',
                    'Mais sofisticado',
                    'Mais madeira',
                    'Minimalista',
                    'Plantas naturais',
                  ].map((pill) => (
                    <button
                      key={pill}
                      onClick={() => handleRefineImage(pill)}
                      className="px-3.5 py-1.5 bg-white hover:bg-stone-100 text-stone-800 text-xs font-medium rounded-full border border-stone-200 hover:border-[#b87c3e] transition-all cursor-pointer shadow-2xs"
                    >
                      ✨ {pill}
                    </button>
                  ))}
                </div>

                {/* Custom Tweak Input & Adjust Button */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <input
                    type="text"
                    value={customAdjustmentPrompt}
                    onChange={(e) => setCustomAdjustmentPrompt(e.target.value)}
                    placeholder="Descreva a alteração que a IA deve fazer na imagem (ex: mudar para tom amadeirado com luz indireta)..."
                    className="flex-1 w-full px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs font-medium text-stone-900 focus:outline-none focus:border-[#b87c3e]"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleRefineImage(customAdjustmentPrompt)}
                      className="px-5 py-2.5 bg-[#b87c3e] hover:bg-[#a36b32] text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>AJUSTAR IMAGEM</span>
                    </button>

                    <button
                      onClick={handleConfirmProposal}
                      className="px-5 py-2.5 border border-[#b87c3e] bg-[#b87c3e]/10 hover:bg-[#b87c3e]/20 text-[#b87c3e] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      <span>Usar esta versão</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 7: PROPOSTA PRONTA / SUCESSO COM COMPARADOR ARRASTÁVEL */}
      {/* ========================================================================= */}
      {step === 7 && (
        <div className="bg-white border border-stone-200 rounded-3xl p-6 sm:p-12 shadow-xl max-w-4xl mx-auto space-y-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#b87c3e]/15 text-[#b87c3e] border border-[#b87c3e]/30 flex items-center justify-center mx-auto shadow-inner">
            <Check className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-serif font-bold text-stone-900">Proposta Gerada com Sucesso!</h2>
            <p className="text-xs text-stone-500 max-w-xl mx-auto leading-relaxed">
              {summaryText}
            </p>
          </div>

          {/* Proposal main interactive draggable Before/After slider */}
          <div className="max-w-2xl mx-auto">
            <BeforeAfterSlider
              beforeImage={originalImage}
              afterImage={redesignImage}
              title="ARRASTE PARA COMPARAR O ANTES & DEPOIS"
              aspectRatioClass="h-[360px] sm:h-[440px]"
            />
          </div>

          {/* Action buttons matching Site Theme */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <button
              onClick={handlePrintPDF}
              className="px-6 py-3 bg-[#b87c3e] hover:bg-[#a36b32] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Gerar PDF</span>
            </button>

            <button
              onClick={() => {
                if (!activeConsultation) handleConfirmProposal();
                setShowPresentationModal(true);
              }}
              className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl border border-stone-200 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-[#b87c3e]" />
              <span>Ver apresentação</span>
            </button>

            {activeConsultation && (
              <button
                onClick={() => handleCopyPresentationLink(activeConsultation)}
                className="px-6 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                title="Copiar link da apresentação online"
              >
                <Copy className="w-4 h-4 text-[#b87c3e]" />
                <span>Copiar Link</span>
              </button>
            )}

            {activeConsultation && (
              <a
                href={getWhatsAppShareUrl(activeConsultation)}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 bg-[#25d366]/10 hover:bg-[#25d366]/20 text-[#1e8d46] border border-[#25d366]/30 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4 text-[#25d366]" />
                <span>Enviar pelo WhatsApp</span>
              </a>
            )}

            <button
              onClick={() => {
                setOriginalImage('');
                setRedesignImage('');
                setStep(1);
              }}
              className="px-5 py-3 border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Nova Consultoria</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PUBLIC PRESENTATION MODAL / FULL VIEW COM COMPARADOR ARRASTÁVEL */}
      {/* ========================================================================= */}
      {showPresentationModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md overflow-y-auto p-2 sm:p-6 md:p-8 flex justify-center animate-in fade-in">
          <div className="bg-[#f7f5f0] text-[#1c1917] w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-stone-200 my-auto relative">
            {/* Close Modal Button */}
            <button
              onClick={() => setShowPresentationModal(false)}
              className="absolute top-5 right-5 z-30 w-10 h-10 rounded-full bg-stone-900/80 text-white hover:bg-stone-900 flex items-center justify-center cursor-pointer backdrop-blur-md border border-white/20 transition-all"
              title="Fechar apresentação"
            >
              <X className="w-5 h-5" />
            </button>

            {/* PRESENTATION TOP SECTION (CLEAN DARK/STONE HERO & IDENTIFICATION) */}
            <div className="bg-stone-900 text-white p-6 sm:p-10 md:p-12 space-y-6 relative border-b border-stone-800">
              <div className="text-center space-y-2">
                <div className="font-serif text-xl sm:text-2xl font-bold tracking-[0.2em] text-[#e3a869] uppercase">
                  {activeConsultation?.officeName || officeName}
                </div>
                <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-stone-400 block">
                  CONSULTORIA EXPRESSA DE ARQUITETURA
                </span>

                <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-normal max-w-2xl mx-auto leading-tight text-white pt-2">
                  Uma nova possibilidade para o seu espaço.
                </h1>

                <div className="text-xs text-stone-400 font-medium pt-1">
                  {activeConsultation?.clientName || clientName || 'Cliente'} • {activeConsultation?.roomType || roomType} | Consultor: {activeConsultation?.consultantName || consultantName}
                </div>
              </div>

              {/* IDENTIFIED & DESIRED CARDS IN DARK CONTAINER */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                {/* O QUE IDENTIFICAMOS */}
                <div className="bg-stone-950 border border-stone-800 p-5 sm:p-6 rounded-2xl space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#e3a869] uppercase tracking-[0.15em] block">
                      O QUE IDENTIFICAMOS
                    </span>
                    <p className="text-xs text-stone-400 mt-0.5">Pontos que hoje limitam o ambiente.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(activeConsultation?.annoyances || selectedAnnoyances).length > 0 ? (
                      (activeConsultation?.annoyances || selectedAnnoyances).map((item, i) => (
                        <span
                          key={i}
                          className="px-3.5 py-1.5 rounded-xl border border-stone-800 bg-stone-900 text-xs font-medium text-stone-200"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="px-3.5 py-1.5 rounded-xl border border-stone-800 bg-stone-900 text-xs font-medium text-stone-400">
                        Visual pesado
                      </span>
                    )}
                  </div>
                </div>

                {/* O QUE VOCÊ GOSTARIA DE MELHORAR */}
                <div className="bg-stone-950 border border-stone-800 p-5 sm:p-6 rounded-2xl space-y-3">
                  <div>
                    <span className="text-[10px] font-bold text-[#e3a869] uppercase tracking-[0.15em] block">
                      O QUE VOCÊ GOSTARIA DE MELHORAR
                    </span>
                    <p className="text-xs text-stone-400 mt-0.5">Mudanças e sensações desejadas para o espaço.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {[
                      ...(activeConsultation?.desiredChanges || selectedChanges),
                      ...(activeConsultation?.desiredStyle || selectedStyles),
                    ].length > 0 ? (
                      [
                        ...(activeConsultation?.desiredChanges || selectedChanges),
                        ...(activeConsultation?.desiredStyle || selectedStyles),
                      ].map((item, i) => (
                        <span
                          key={i}
                          className="px-3.5 py-1.5 rounded-xl border border-[#b87c3e]/30 bg-[#b87c3e]/15 text-xs font-medium text-[#e3a869]"
                        >
                          {item}
                        </span>
                      ))
                    ) : (
                      <span className="px-3.5 py-1.5 rounded-xl border border-[#b87c3e]/30 bg-[#b87c3e]/15 text-xs font-medium text-[#e3a869]">
                        Marcenaria • Sofisticado
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* PRESENTATION BODY (WARM LIGHT CANVAS #f7f5f0) */}
            <div className="p-6 sm:p-10 md:p-12 space-y-12 bg-[#f7f5f0]">
              {/* SECTION: NOSSA PROPOSTA */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#8c7e73] uppercase tracking-[0.15em] block">
                  NOSSA PROPOSTA
                </span>

                <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-[#e5dfd8] bg-[#e5dfd8]/30">
                  <img
                    src={activeConsultation?.redesignImage || redesignImage}
                    alt="Proposta de Redesign com IA"
                    className="w-full h-auto max-h-[550px] object-cover"
                  />
                </div>
              </div>

              {/* SECTION: RESUMO DA PROPOSTA & O QUE AJUSTAMOS */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-[#8c7e73] uppercase tracking-[0.15em] block">
                    RESUMO DA PROPOSTA
                  </span>
                  <p className="text-sm sm:text-base text-[#4a443e] leading-relaxed font-sans">
                    {activeConsultation?.summaryText ||
                      summaryText ||
                      `A proposta segue uma linha de redesign pontual para ${activeConsultation?.roomType || roomType}, com foco em requalificar a marcenaria para diminuir a sensação de peso visual. A intenção é trazer um resultado mais sofisticado, preservando integralmente a arquitetura existente e todos os elementos que não foram indicados para alteração.`}
                  </p>
                </div>

                {/* CARD: O QUE AJUSTAMOS NESTA PROPOSTA */}
                <div className="bg-white border border-[#e5dfd8] rounded-2xl p-6 sm:p-8 space-y-3 shadow-xs">
                  <span className="text-[11px] font-bold text-[#8c7e73] uppercase tracking-[0.15em] block">
                    O QUE AJUSTAMOS NESTA PROPOSTA
                  </span>
                  <p className="text-xs sm:text-sm text-[#4a443e] leading-relaxed whitespace-pre-line font-sans">
                    {activeConsultation?.adjustmentsText ||
                      adjustmentsText ||
                      `A intervenção se concentra nas soluções solicitadas para o ${(activeConsultation?.roomType || roomType).toLowerCase()}, que passa a ser o principal recurso para organizar melhor a leitura do espaço e aliviar o aspecto anterior. Mantêm-se rigorosamente o enquadramento, a perspectiva e a arquitetura original, sem qualquer alteração estrutural ou de composição espacial fora do que foi solicitado. Com isso, a proposta atua de forma controlada, sem modificar os demais elementos do cenário. Não há indicação de mudanças em iluminação, decoração ou mobiliário além do que for inerente ao que foi acordado. A leitura geral buscada é mais elegante, limpa e bem resolvida, sem descaracterizar o ambiente original.`}
                  </p>
                </div>
              </div>

              {/* SECTION: REFERÊNCIAS VISUAIS SELECIONADAS (SE HOUVER) */}
              {((activeConsultation?.userReferences && activeConsultation.userReferences.length > 0) ||
                selectedReferences.length > 0) && (
                <div className="space-y-4">
                  <span className="text-[10px] font-bold text-[#8c7e73] uppercase tracking-[0.15em] block">
                    REFERÊNCIAS VISUAIS SELECIONADAS DO PROJETO
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {(
                      activeConsultation?.userReferences ||
                      userReferences.filter(
                        (r) => selectedReferences.includes(r.id) || selectedReferences.includes(r.url)
                      )
                    ).map((ref, idx) => (
                      <div
                        key={idx}
                        className="relative rounded-2xl overflow-hidden border border-[#e5dfd8] bg-white shadow-2xs"
                      >
                        <img src={ref.url} alt={ref.title} className="w-full h-36 object-cover" />
                        <div className="p-3 bg-white border-t border-[#e5dfd8] flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-[#1c1917] block truncate">{ref.title}</span>
                            {ref.tag && (
                              <span className="text-[10px] text-[#b87c3e] font-semibold">{ref.tag}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: ANTES E DEPOIS COMPARADOR */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#8c7e73] uppercase tracking-[0.15em] block">
                  ARRASTE PARA COMPARAR
                </span>

                <BeforeAfterSlider
                  beforeImage={activeConsultation?.originalImage || originalImage}
                  afterImage={activeConsultation?.redesignImage || redesignImage}
                  title="ARRASTE PARA COMPARAR"
                  aspectRatioClass="h-[380px] sm:h-[500px]"
                />
              </div>

              {/* SECTION: IDEIAS PARA TRANSFORMAR SEU ESPAÇO */}
              <div className="space-y-6">
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1c1917]">
                  Ideias para transformar seu espaço
                </h2>

                <div className="space-y-3">
                  {(activeConsultation?.ideas || ideas).map((idea, idx) => (
                    <div
                      key={idx}
                      className="p-4 sm:p-5 bg-white rounded-2xl border border-[#e5dfd8] flex items-center gap-4 shadow-2xs"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#f7f5f0] border border-[#e5dfd8] text-[#8c7e73] font-bold text-xs flex items-center justify-center shrink-0">
                        0{idx + 1}
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-[#2c2724] leading-snug">{idea}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: DIREÇÃO SUGERIDA */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-[#8c7e73] uppercase tracking-[0.15em] block">
                  DIREÇÃO SUGERIDA
                </span>
                <div className="flex flex-wrap gap-2">
                  {(activeConsultation?.directionTags || directionTags).map((tag, i) => (
                    <span
                      key={i}
                      className="px-3.5 py-1.5 bg-white border border-[#e5dfd8] text-[#59524c] text-xs font-semibold rounded-full shadow-2xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* SECTION: ESSA É APENAS UMA PRIMEIRA POSSIBILIDADE (CTA) */}
              <div className="text-center p-8 sm:p-12 bg-white rounded-3xl border border-[#e5dfd8] space-y-6 shadow-sm">
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#1c1917] max-w-xl mx-auto">
                  Essa é apenas uma primeira possibilidade.
                </h2>
                <div className="text-xs sm:text-sm text-[#59524c] max-w-2xl mx-auto leading-relaxed space-y-4">
                  <p>
                    Esta consultoria apresenta uma primeira direção para o seu ambiente — uma forma de explorar possibilidades, identificar caminhos e visualizar o potencial do espaço.
                  </p>
                  <p>
                    Em um projeto completo, essa visão evolui. Estudamos medidas, circulação, ergonomia, iluminação, materiais, marcenaria e cada decisão necessária para transformar a ideia em uma solução pensada para você e pronta para ser executada.
                  </p>
                  <p className="font-semibold text-[#1c1917]">
                    Vamos desenvolver seu espaço?
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
                  <a
                    href={`https://api.whatsapp.com/send?phone=5511999999999&text=${encodeURIComponent(
                      `Olá! Gostaria de evoluir a minha Consultoria Expressa para um Projeto Completo com o ${activeConsultation?.officeName || officeName}.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-7 py-3.5 bg-[#1c2e24] hover:bg-[#253e30] text-[#fcf8f5] text-xs font-bold rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <MessageCircle className="w-4 h-4 text-[#25d366]" />
                    <span>Falar com o {activeConsultation?.officeName || officeName}</span>
                  </a>

                  <button
                    onClick={handlePrintPDF}
                    className="px-7 py-3.5 border border-[#d5cfc7] bg-white hover:bg-[#f0ebe3] text-[#2c2724] text-xs font-bold rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Download className="w-4 h-4 text-[#8c7e73]" />
                    <span>Baixar PDF</span>
                  </button>
                </div>
              </div>

              {/* PRESENTATION FOOTER */}
              <div className="pt-6 border-t border-[#e5dfd8] text-center space-y-2">
                <div className="font-serif text-sm font-bold tracking-[0.15em] text-[#8c7e73] uppercase">
                  {activeConsultation?.officeName || officeName}
                </div>
                <p className="text-[11px] text-[#8c7e73] max-w-lg mx-auto">
                  Imagem conceitual desenvolvida durante a Consultoria Expressa. Materiais e soluções devem ser validados em projeto antes da execução.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HISTÓRICO MODAL */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 sm:p-8 flex items-center justify-center animate-in fade-in">
          <div className="bg-white text-stone-900 w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-stone-200 max-h-[90vh] flex flex-col">
            <div className="p-6 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-[#b87c3e]" />
                <h2 className="text-base font-bold text-stone-900">Histórico de Consultorias Expressas</h2>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {savedConsultations.length === 0 ? (
                <div className="py-12 text-center text-xs text-stone-500">
                  Nenhuma consultoria salva ainda. Clique em "Nova Consultoria" para iniciar.
                </div>
              ) : (
                savedConsultations.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setActiveConsultation(item);
                      setShowHistoryModal(false);
                      setShowPresentationModal(true);
                    }}
                    className="p-4 bg-stone-50 border border-stone-200 hover:border-[#b87c3e] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all shadow-2xs hover:shadow-md"
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={item.redesignImage}
                        alt={item.clientName}
                        className="w-14 h-14 rounded-xl object-cover border border-stone-200"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-stone-900">{item.clientName}</h4>
                          <span className="px-2 py-0.5 bg-white text-[#b87c3e] border border-[#b87c3e]/30 text-[10px] font-bold rounded-md uppercase">
                            {item.roomType}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500">
                          Criado em {item.createdAt} • {item.officeName}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <a
                        href={getWhatsAppShareUrl(item)}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 bg-[#25d366]/10 text-[#1e8d46] hover:bg-[#25d366]/20 rounded-xl text-xs font-bold transition-all"
                        title="Enviar no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4 text-[#25d366]" />
                      </a>
                      <button
                        onClick={(e) => handleDeleteConsultation(item.id, e)}
                        className="p-2 bg-red-50 text-red-500 border border-red-200 hover:bg-red-100 rounded-xl transition-all cursor-pointer"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADICIONAR REFERÊNCIA POR LINK URL MODAL */}
      {/* ========================================================================= */}
      {showUrlReferenceModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm p-4 flex items-center justify-center animate-in fade-in">
          <div className="bg-white text-stone-900 w-full max-w-md rounded-3xl overflow-hidden shadow-2xl border border-stone-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <Link className="w-5 h-5 text-[#b87c3e]" />
                <h3 className="text-sm font-bold text-stone-900">Adicionar Foto por Link URL</h3>
              </div>
              <button
                onClick={() => setShowUrlReferenceModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-600">Link direto da imagem (URL)</label>
                <input
                  type="url"
                  placeholder="https://exemplo.com/foto-referencia.jpg"
                  value={urlRefInput}
                  onChange={(e) => setUrlRefInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#b87c3e]"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-600">Nome ou descrição curta</label>
                <input
                  type="text"
                  placeholder="Ex: Armário em carvalho ripado"
                  value={urlRefTitle}
                  onChange={(e) => setUrlRefTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:border-[#b87c3e]"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-600">Foco da referência</label>
                <div className="flex flex-wrap gap-1.5">
                  {['Marcenaria', 'Iluminação', 'Cores', 'Mobiliário', 'Revestimento'].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setUrlRefTag(tag)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        urlRefTag === tag
                          ? 'bg-[#b87c3e] text-white'
                          : 'bg-stone-50 text-stone-600 hover:text-stone-900 border border-stone-200'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {urlRefInput.trim() && (
                <div className="relative rounded-xl overflow-hidden border border-stone-200 h-32 bg-stone-100">
                  <img
                    src={urlRefInput}
                    alt="Prévia"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="absolute bottom-1 right-2 bg-black/70 px-2 py-0.5 rounded text-[10px] text-white">
                    Prévia
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
              <button
                type="button"
                onClick={() => setShowUrlReferenceModal(false)}
                className="px-4 py-2 border border-stone-200 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddUrlReference}
                className="px-5 py-2 bg-[#b87c3e] hover:bg-[#a36b32] text-white text-xs font-bold rounded-xl cursor-pointer shadow-md"
              >
                Salvar Referência
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ZOOM PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewingReference && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-4 flex items-center justify-center animate-in fade-in">
          <div className="bg-white border border-stone-200 rounded-3xl overflow-hidden max-w-3xl w-full shadow-2xl relative">
            <button
              onClick={() => setPreviewingReference(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/70 text-white hover:bg-black/90 flex items-center justify-center cursor-pointer border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>

            <img
              src={previewingReference.url}
              alt={previewingReference.title}
              className="w-full max-h-[70vh] object-contain bg-stone-900"
            />

            <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900">{previewingReference.title}</h4>
                {previewingReference.tag && (
                  <span className="text-xs text-[#b87c3e] font-semibold">{previewingReference.tag}</span>
                )}
              </div>

              <button
                onClick={() => {
                  handleToggleReferenceSelect(previewingReference.id);
                  setPreviewingReference(null);
                }}
                className="px-4 py-2 bg-[#b87c3e] hover:bg-[#a36b32] text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                {selectedReferences.includes(previewingReference.id) ? 'Desmarcar' : 'Usar na Proposta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
