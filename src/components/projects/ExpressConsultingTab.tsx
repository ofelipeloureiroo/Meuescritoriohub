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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFinance } from '../../context/FinanceContext';

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
  ideas: string[];
  directionTags: string[];
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
  const [selectedReferences, setSelectedReferences] = useState<string[]>([]);

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

  // Update prompt whenever choices change
  useEffect(() => {
    const prompt = `Criar uma proposta de redesign para ${roomType}, preservando rigorosamente o enquadramento, a perspectiva e a arquitetura da imagem original.\nIntervenções desejadas: ${selectedChanges.join(', ') || 'Redesign amplo'}.\nAtmosfera desejada: ${selectedStyles.join(', ') || 'Sofisticado'}.\nAplicar apenas as mudanças descritas acima. Toda indicação de "Não mexer" deve ser respeitada e os demais elementos originais devem ser mantidos.`;
    setFinalPrompt(prompt);
  }, [roomType, selectedChanges, selectedStyles, checklist]);

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

  // Start generation in Step 5 -> Step 6 with STRICT prompt matching
  const handleGenerateProposal = () => {
    setStep(6);
    setIsGenerating(true);

    const matchedDesign = findBestRedesignImage(roomType, selectedStyles, selectedChanges, finalPrompt);
    setRedesignImage(matchedDesign);
    setVersionHistory([matchedDesign]);
    setCurrentVersionIndex(0);

    const generatedSummary = `A proposta segue uma direção de redesign para ${roomType}, com foco em transformar os elementos de acabamento, marcenaria e iluminação sem alterar a arquitetura e perspectiva do ambiente. O objetivo é criar uma atmosfera ${selectedStyles.join(', ').toLowerCase() || 'sofisticada'}.`;
    setSummaryText(generatedSummary);

    setTimeout(() => {
      setIsGenerating(false);
      showToastMsg(`Proposta visual para ${roomType} gerada com sucesso!`);
    }, 1800);
  };

  // REAL AI REDESIGN ADJUSTMENT: Modifies the proposal image according to prompt description!
  const handleRefineImage = (promptTweak: string) => {
    if (!promptTweak.trim()) return;
    setIsGenerating(true);

    setTimeout(() => {
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

      const nextVersionUrl = variations[matchedKey] || variations.default;
      setRedesignImage(nextVersionUrl);
      setVersionHistory((prev) => [...prev, nextVersionUrl]);
      setCurrentVersionIndex(versionHistory.length);
      setIsGenerating(false);
      setCustomAdjustmentPrompt('');
      showToastMsg(`Imagem ajustada por IA: "${promptTweak}"`);
    }, 1500);
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
      ideas,
      directionTags,
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

  // WhatsApp formatted share link with Office Name
  const getWhatsAppShareUrl = (consultation: ExpressConsultation) => {
    const text =
      `✨ *Proposta de Consultoria Expressa - ${consultation.officeName}*\n\n` +
      `Olá, ${consultation.clientName}! Preparamos uma proposta personalizada para a transformação do seu ambiente (*${consultation.roomType}*).\n\n` +
      `🎨 *Atmosfera:* ${consultation.desiredStyle.join(', ') || 'Sofisticado'}\n` +
      `📌 *Resumo:* ${consultation.summaryText}\n\n` +
      `Acesse a apresentação online para visualizar o Antes & Depois interativo:`;
    return `https://api.whatsapp.com/send?phone=${encodeURIComponent(
      consultation.clientPhone.replace(/\D/g, '')
    )}&text=${encodeURIComponent(text)}`;
  };

  // Print PDF helper
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="w-full min-h-screen bg-[#12100e] text-[#fcf8f5] p-4 sm:p-6 lg:p-8 space-y-6 font-sans">
      {/* Toast alert */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 bg-[#1c1815] border border-[#c58a4b] text-[#fcf8f5] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
          <Sparkles className="w-4 h-4 text-[#c58a4b] shrink-0" />
          <span className="text-xs font-semibold">{toast}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="flex items-center justify-between pb-4 border-b border-[#3d342f]/80 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#c58a4b]/15 text-[#c58a4b] border border-[#c58a4b]/30 flex items-center justify-center font-serif font-bold text-lg shadow-inner">
            {officeName.charAt(0) || 'E'}
          </div>
          <div>
            <h1 className="text-sm font-bold text-[#fcf8f5] tracking-tight">
              Consultoria Expressa {step > 0 && step < 7 && `— Passo ${step} de 6`}
            </h1>
            <p className="text-[11px] text-[#a89c93]">Redesign de ambientes do {officeName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {savedConsultations.length > 0 && (
            <button
              onClick={() => setShowHistoryModal(true)}
              className="px-3.5 py-1.5 bg-[#251e1a] hover:bg-[#2e2621] text-[#fcf8f5] text-xs font-bold rounded-xl border border-[#3d342f] transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-[#c58a4b]" />
              <span>Histórico ({savedConsultations.length})</span>
            </button>
          )}

          {step > 0 && (
            <button
              onClick={() => setStep(0)}
              className="px-3.5 py-1.5 border border-[#3d342f] bg-[#14110f] hover:bg-[#1c1815] text-[#a89c93] hover:text-[#fcf8f5] text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Início
            </button>
          )}

          {onExit && (
            <button
              onClick={onExit}
              className="px-3.5 py-1.5 border border-[#3d342f] bg-[#14110f] hover:bg-[#1c1815] text-[#a89c93] hover:text-[#fcf8f5] text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5 text-[#c58a4b]" />
              <span>Voltar ao Sistema</span>
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* STEP 0: LANDING & CTA */}
      {/* ========================================================================= */}
      {step === 0 && (
        <div className="relative rounded-3xl overflow-hidden border border-[#3d342f] shadow-2xl bg-[#1c1815]">
          <div
            className="absolute inset-0 opacity-25 bg-cover bg-center"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1600&auto=format&fit=crop')`,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#14110f]/95 via-[#1c1815]/90 to-transparent" />

          {/* Header Bar */}
          <div className="relative z-10 p-6 sm:p-8 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#c58a4b]/20 backdrop-blur-md border border-[#c58a4b]/40 text-[#c58a4b] flex items-center justify-center font-serif font-bold text-lg">
                {officeName.charAt(0)}
              </div>
              <span className="font-serif font-bold text-sm tracking-wider uppercase text-[#fcf8f5]">
                {officeName}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => setShowHistoryModal(true)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 backdrop-blur-md text-[#fcf8f5] border border-[#3d342f] text-xs font-semibold rounded-full transition-all flex items-center gap-2 cursor-pointer"
              >
                <History className="w-3.5 h-3.5 text-[#c58a4b]" />
                <span>HISTÓRICO</span>
              </button>

              {onExit && (
                <button
                  onClick={onExit}
                  className="px-4 py-2 bg-black/40 hover:bg-black/60 text-[#a89c93] hover:text-[#fcf8f5] border border-[#3d342f] text-xs font-semibold rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-[#c58a4b]" />
                  <span>VOLTAR AO SISTEMA</span>
                </button>
              )}
            </div>
          </div>

          {/* Hero Section */}
          <div className="relative z-10 p-6 sm:p-12 lg:p-16 max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#c58a4b]/15 border border-[#c58a4b]/30 text-[#c58a4b] text-[11px] font-bold tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              <span>CONSULTORIA EXPRESSA</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-serif font-bold leading-tight text-[#fcf8f5]">
              Uma nova possibilidade para o seu espaço.
            </h1>

            <p className="text-xs sm:text-sm text-[#a89c93] leading-relaxed font-sans">
              Transformação inteligente de ambientes preservando rigorosamente a arquitetura, enquadramento e perspectiva existentes. Gere propostas visuais refinadas com comparador interativo Antes & Depois.
            </p>

            <div className="pt-2">
              <button
                onClick={() => {
                  setOriginalImage('');
                  setRedesignImage('');
                  setStep(1);
                }}
                className="px-8 py-4 bg-[#c58a4b] hover:bg-[#d49454] text-[#12100e] font-bold text-xs rounded-full transition-all flex items-center gap-2.5 cursor-pointer shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>INICIAR CONSULTORIA</span>
                <ArrowRight className="w-4 h-4 text-[#12100e]" />
              </button>
            </div>
          </div>

          {/* Footer Info */}
          <div className="relative z-10 p-6 sm:p-8 border-t border-[#3d342f] flex flex-wrap items-center justify-between text-xs text-[#a89c93] gap-4">
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
        <div className="bg-[#1c1815] border border-[#3d342f] rounded-3xl p-6 sm:p-10 shadow-xl max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#c58a4b]">PASSO 1 DE 5</span>
            <h2 className="text-2xl font-serif font-bold text-[#fcf8f5]">Dados do Cliente & Foto do Ambiente</h2>
            <p className="text-xs text-[#a89c93]">Preencha os dados e envie a imagem do espaço que o cliente deseja transformar.</p>
          </div>

          <div className="space-y-6">
            {/* Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#a89c93] mb-1.5">Nome do Cliente</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#786d65] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="Ex: Maria Silva"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0e0c0b] border border-[#3d342f] rounded-xl text-xs font-medium text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#a89c93] mb-1.5">WhatsApp / Telefone</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#786d65] absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    placeholder="+55 (11) 99999-9999"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#0e0c0b] border border-[#3d342f] rounded-xl text-xs font-medium text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
                  />
                </div>
              </div>
            </div>

            {/* Room Type Selector Pills */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#a89c93]">Tipo de ambiente</label>
              <div className="flex flex-wrap gap-2">
                {ROOM_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleRoomTypeSelect(type)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      roomType === type
                        ? 'bg-[#c58a4b] text-[#12100e] font-bold shadow-md'
                        : 'bg-[#251e1a] hover:bg-[#2e2621] text-[#a89c93] border border-[#3d342f]'
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
                <label className="block text-xs font-bold text-[#fcf8f5]">Foto do Ambiente Atual (Obrigatório)</label>
                {originalImage && (
                  <span className="text-[11px] text-[#c58a4b] font-bold">✓ Imagem Selecionada</span>
                )}
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all space-y-3 ${
                  originalImage
                    ? 'border-[#c58a4b] bg-[#c58a4b]/5'
                    : 'border-[#3d342f] bg-[#0e0c0b] hover:bg-[#14110f]'
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
                      className="w-full h-52 object-cover rounded-xl shadow-md border border-[#3d342f]"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all rounded-xl flex items-center justify-center text-[#fcf8f5] text-xs font-bold gap-2">
                      <Camera className="w-5 h-5 text-[#c58a4b]" />
                      <span>Trocar foto do cliente</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-14 h-14 rounded-full bg-[#c58a4b]/15 text-[#c58a4b] border border-[#c58a4b]/30 flex items-center justify-center mx-auto">
                      <Camera className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#fcf8f5]">Envie a foto do ambiente do cliente</p>
                      <p className="text-xs text-[#a89c93] max-w-md mx-auto mt-1">
                        Clique aqui para selecionar do dispositivo, tirar uma foto com a câmera ou escolher uma referência.
                      </p>
                    </div>
                  </>
                )}
              </div>

              {/* Quick Preset Selector for Optional Demonstration */}
              <div className="pt-2">
                <span className="text-[11px] font-bold text-[#a89c93] block mb-2">
                  Ou escolha uma imagem de demonstração por tipo de ambiente:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.keys(SAMPLE_ROOM_PRESETS).slice(0, 8).map((key) => (
                    <button
                      key={key}
                      onClick={() => handleSelectPresetImage(key)}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 cursor-pointer transition-all ${
                        roomType === key && originalImage === SAMPLE_ROOM_PRESETS[key].before
                          ? 'border-[#c58a4b] bg-[#c58a4b]/15'
                          : 'border-[#3d342f] bg-[#0e0c0b] hover:bg-[#1c1815]'
                      }`}
                    >
                      <img
                        src={SAMPLE_ROOM_PRESETS[key].before}
                        alt={key}
                        className="w-8 h-8 rounded-lg object-cover"
                      />
                      <span className="text-xs font-semibold text-[#fcf8f5] truncate">{key}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Lead Temperature & Note */}
            <div className="p-4 bg-[#0e0c0b] border border-[#3d342f] rounded-2xl space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#a89c93]">
                  <span>TEMPERATURA:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setTemperature('cold')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        temperature === 'cold'
                          ? 'bg-blue-600 text-white'
                          : 'bg-[#251e1a] text-[#a89c93]'
                      }`}
                    >
                      ❄️ Frio
                    </button>
                    <button
                      onClick={() => setTemperature('neutral')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        temperature === 'neutral'
                          ? 'bg-[#c58a4b] text-[#12100e]'
                          : 'bg-[#251e1a] text-[#a89c93]'
                      }`}
                    >
                      🔘 Neutro
                    </button>
                    <button
                      onClick={() => setTemperature('hot')}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        temperature === 'hot'
                          ? 'bg-amber-600 text-white'
                          : 'bg-[#251e1a] text-[#a89c93]'
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
                  className="flex-1 px-3 py-1.5 bg-[#1c1815] border border-[#3d342f] rounded-xl text-xs text-[#fcf8f5] focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-[#3d342f] flex items-center justify-between">
            <button
              onClick={() => setStep(0)}
              className="px-5 py-2.5 border border-[#3d342f] bg-[#14110f] hover:bg-[#1c1815] text-[#a89c93] text-xs font-bold rounded-full transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={handleNextFromStep1}
              className="px-6 py-2.5 bg-[#c58a4b] hover:bg-[#d49454] text-[#12100e] text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-md"
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
        <div className="bg-[#1c1815] border border-[#3d342f] rounded-3xl p-6 sm:p-10 shadow-xl max-w-4xl mx-auto space-y-8">
          {/* Top thumbnail card */}
          <div className="p-4 bg-[#0e0c0b] rounded-2xl border border-[#3d342f] flex items-center gap-4">
            <img
              src={originalImage}
              alt="Ambiente em análise"
              className="w-16 h-16 rounded-xl object-cover shadow-sm border border-[#3d342f]"
            />
            <div>
              <span className="text-[10px] font-bold text-[#c58a4b] uppercase tracking-wider block">
                AMBIENTE EM ANÁLISE — {roomType.toUpperCase()}
              </span>
              <p className="text-xs font-medium text-[#a89c93]">
                Use esta imagem como referência durante a consultoria.
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Question 1 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[#fcf8f5]">O que mais incomoda hoje?</h3>
              <div className="flex flex-wrap gap-2">
                {ANNOYANCE_OPTIONS.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleArrayItem(selectedAnnoyances, setSelectedAnnoyances, item)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      selectedAnnoyances.includes(item)
                        ? 'bg-[#c58a4b] text-[#12100e] font-bold shadow-sm'
                        : 'bg-[#251e1a] hover:bg-[#2e2621] text-[#a89c93] border border-[#3d342f]'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 2 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[#fcf8f5]">O que você gostaria de mudar?</h3>
              <div className="flex flex-wrap gap-2">
                {DESIRED_CHANGE_OPTIONS.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleArrayItem(selectedChanges, setSelectedChanges, item)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      selectedChanges.includes(item)
                        ? 'bg-[#c58a4b] text-[#12100e] font-bold shadow-sm'
                        : 'bg-[#251e1a] hover:bg-[#2e2621] text-[#a89c93] border border-[#3d342f]'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* Question 3 */}
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-[#fcf8f5]">Como você gostaria que ficasse?</h3>
              <div className="flex flex-wrap gap-2">
                {DESIRED_STYLE_OPTIONS.map((item) => (
                  <button
                    key={item}
                    onClick={() => toggleArrayItem(selectedStyles, setSelectedStyles, item)}
                    className={`px-4 py-2 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      selectedStyles.includes(item)
                        ? 'bg-[#c58a4b] text-[#12100e] font-bold shadow-sm'
                        : 'bg-[#251e1a] hover:bg-[#2e2621] text-[#a89c93] border border-[#3d342f]'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-[#3d342f] flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-5 py-2.5 border border-[#3d342f] bg-[#14110f] hover:bg-[#1c1815] text-[#a89c93] text-xs font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 bg-[#c58a4b] hover:bg-[#d49454] text-[#12100e] text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>Próximo Passo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STEP 3: REFERÊNCIAS */}
      {/* ========================================================================= */}
      {step === 3 && (
        <div className="bg-[#1c1815] border border-[#3d342f] rounded-3xl p-6 sm:p-10 shadow-xl max-w-4xl mx-auto space-y-8">
          {/* Top thumbnail */}
          <div className="p-4 bg-[#0e0c0b] rounded-2xl border border-[#3d342f] flex items-center gap-4">
            <img
              src={originalImage}
              alt="Ambiente em análise"
              className="w-16 h-16 rounded-xl object-cover border border-[#3d342f]"
            />
            <div>
              <span className="text-[10px] font-bold text-[#c58a4b] uppercase tracking-wider block">
                AMBIENTE EM ANÁLISE — REFERÊNCIAS VISUAIS
              </span>
              <p className="text-xs font-medium text-[#a89c93]">
                Escolha de uma a três fotos reais. As referências inspiram o estilo, sem substituir a arquitetura do ambiente.
              </p>
            </div>
          </div>

          {/* References Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#fcf8f5]">Referências sugeridas para {roomType}</h3>
              <button
                onClick={() => showToastMsg('Modo de upload de referências ativado.')}
                className="px-3.5 py-1.5 bg-[#251e1a] hover:bg-[#2e2621] text-[#fcf8f5] text-xs font-bold rounded-xl border border-[#3d342f] flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#c58a4b]" />
                <span>Cadastrar referências</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                {
                  title: 'Estilo Sofisticado / Iluminação',
                  url: AI_REDESIGN_VARIATIONS[roomType]?.sofisticado || AI_REDESIGN_VARIATIONS.Escritório.sofisticado,
                },
                {
                  title: 'Textura Natural / Madeira',
                  url: AI_REDESIGN_VARIATIONS[roomType]?.madeira || AI_REDESIGN_VARIATIONS.Escritório.madeira,
                },
                {
                  title: 'Clean / Minimalista',
                  url: AI_REDESIGN_VARIATIONS[roomType]?.minimalista || AI_REDESIGN_VARIATIONS.Escritório.minimalista,
                },
              ].map((ref, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleArrayItem(selectedReferences, setSelectedReferences, ref.url)}
                  className={`relative rounded-2xl overflow-hidden border cursor-pointer transition-all group ${
                    selectedReferences.includes(ref.url)
                      ? 'border-[#c58a4b] ring-2 ring-[#c58a4b]'
                      : 'border-[#3d342f] hover:border-[#c58a4b]'
                  }`}
                >
                  <img src={ref.url} alt={ref.title} className="w-full h-44 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent p-3 flex flex-col justify-end">
                    <span className="text-xs font-bold text-white">{ref.title}</span>
                  </div>
                  {selectedReferences.includes(ref.url) && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#c58a4b] text-[#12100e] flex items-center justify-center font-bold">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-[#3d342f] flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 border border-[#3d342f] bg-[#14110f] hover:bg-[#1c1815] text-[#a89c93] text-xs font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              onClick={() => setStep(4)}
              className="px-6 py-2.5 bg-[#c58a4b] hover:bg-[#d49454] text-[#12100e] text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-md"
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
        <div className="bg-[#1c1815] border border-[#3d342f] rounded-3xl p-6 sm:p-10 shadow-xl max-w-5xl mx-auto space-y-8">
          {/* Top thumbnail */}
          <div className="p-4 bg-[#0e0c0b] rounded-2xl border border-[#3d342f] flex items-center gap-4">
            <img
              src={originalImage}
              alt="Ambiente em análise"
              className="w-16 h-16 rounded-xl object-cover border border-[#3d342f]"
            />
            <div>
              <span className="text-[10px] font-bold text-[#c58a4b] uppercase tracking-wider block">
                CHECKLIST DE MELHORIAS — ESPECIFICAÇÕES
              </span>
              <p className="text-xs font-medium text-[#a89c93]">
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
              <div key={block.category} className="p-4 bg-[#0e0c0b] rounded-2xl border border-[#3d342f] space-y-3 shadow-2xs">
                <h4 className="text-xs font-bold text-[#fcf8f5]">{block.category}</h4>
                <div className="flex flex-wrap gap-1.5">
                  {block.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setChecklist({ ...checklist, [block.category]: opt })}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                        checklist[block.category] === opt
                          ? 'bg-[#c58a4b] text-[#12100e] font-bold shadow-2xs'
                          : 'bg-[#1c1815] hover:bg-[#251e1a] text-[#a89c93]'
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
          <div className="pt-4 border-t border-[#3d342f] flex items-center justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-5 py-2.5 border border-[#3d342f] bg-[#14110f] hover:bg-[#1c1815] text-[#a89c93] text-xs font-bold rounded-full transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>

            <button
              onClick={() => setStep(5)}
              className="px-6 py-2.5 bg-[#c58a4b] hover:bg-[#d49454] text-[#12100e] text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-md"
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
        <div className="bg-[#1c1815] border border-[#3d342f] rounded-3xl p-6 sm:p-10 shadow-xl max-w-5xl mx-auto space-y-8">
          {/* Top thumbnail */}
          <div className="p-4 bg-[#0e0c0b] rounded-2xl border border-[#3d342f] flex items-center gap-4">
            <img
              src={originalImage}
              alt="Ambiente em análise"
              className="w-16 h-16 rounded-xl object-cover border border-[#3d342f]"
            />
            <div>
              <span className="text-[10px] font-bold text-[#c58a4b] uppercase tracking-wider block">
                CONFIRA ANTES DE GERAR COM IA
              </span>
              <p className="text-xs font-medium text-[#a89c93]">
                Revise os parâmetros e o prompt de inteligência artificial que gerará a proposta de redesign.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            {/* Left Image Preview */}
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#c58a4b] uppercase tracking-wider block">
                FOTO ORIGINAL DO AMBIENTE
              </span>
              <img
                src={originalImage}
                alt="Original"
                className="w-full h-80 object-cover rounded-2xl shadow-md border border-[#3d342f]"
              />
            </div>

            {/* Right Instructions Panel */}
            <div className="space-y-6">
              <div className="p-5 bg-[#0e0c0b] rounded-2xl border border-[#3d342f] space-y-3 shadow-2xs">
                <h4 className="text-xs font-bold text-[#fcf8f5] uppercase tracking-wider">
                  Resumo do Atendimento
                </h4>
                <div className="space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-[#c58a4b] uppercase tracking-wider block text-[10px]">
                      O QUE DESEJA MUDAR
                    </span>
                    <span className="font-semibold text-[#fcf8f5]">
                      {selectedChanges.join(', ') || 'Quase tudo.'}
                    </span>
                  </div>
                  <div>
                    <span className="font-bold text-[#c58a4b] uppercase tracking-wider block text-[10px]">
                      COMO O AMBIENTE DEVE FICAR
                    </span>
                    <span className="font-semibold text-[#fcf8f5]">
                      {selectedStyles.join(', ') || 'Sofisticado, Minimalista.'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Prompt Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#fcf8f5]">Prompt final da proposta IA</label>
                  <button
                    onClick={() => showToastMsg('Prompt sincronizado com as diretrizes do checklist!')}
                    className="text-[11px] font-bold text-[#c58a4b] hover:underline cursor-pointer"
                  >
                    Atualizar pelo checklist
                  </button>
                </div>
                <textarea
                  rows={6}
                  value={finalPrompt}
                  onChange={(e) => setFinalPrompt(e.target.value)}
                  className="w-full p-4 bg-[#0e0c0b] border border-[#3d342f] rounded-2xl text-xs leading-relaxed text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
                />
              </div>

              <button
                onClick={handleGenerateProposal}
                className="w-full py-4 bg-[#c58a4b] hover:bg-[#d49454] text-[#12100e] text-xs font-bold rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <Sparkles className="w-4 h-4 text-[#12100e]" />
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
        <div className="bg-[#1c1815] border border-[#3d342f] rounded-3xl p-6 sm:p-10 shadow-xl max-w-6xl mx-auto space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#3d342f]/80">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#c58a4b]">GERAÇÃO INTELIGENTE POR IA</span>
              <h2 className="text-2xl font-serif font-bold text-[#fcf8f5]">Converse com a imagem</h2>
              <p className="text-xs text-[#a89c93]">Compare o ambiente original com a nova proposta e refine por texto.</p>
            </div>

            {/* Toggle between Slider Drag and Side by Side */}
            <div className="flex items-center gap-1 p-1 bg-[#0e0c0b] rounded-xl border border-[#3d342f] self-start sm:self-center">
              <button
                onClick={() => setComparisonMode('slider')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  comparisonMode === 'slider'
                    ? 'bg-[#c58a4b] text-[#12100e] shadow-sm'
                    : 'text-[#a89c93] hover:text-[#fcf8f5]'
                }`}
              >
                <MoveHorizontal className="w-3.5 h-3.5" />
                <span>Arrastar Comparador</span>
              </button>
              <button
                onClick={() => setComparisonMode('side-by-side')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  comparisonMode === 'side-by-side'
                    ? 'bg-[#c58a4b] text-[#12100e] shadow-sm'
                    : 'text-[#a89c93] hover:text-[#fcf8f5]'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Lado a Lado</span>
              </button>
            </div>
          </div>

          {/* Loading Indicator */}
          {isGenerating ? (
            <div className="py-20 text-center space-y-4 bg-[#0e0c0b] rounded-3xl border border-[#3d342f] shadow-inner">
              <RefreshCw className="w-10 h-10 text-[#c58a4b] animate-spin mx-auto" />
              <div className="space-y-1">
                <h3 className="text-base font-bold text-[#fcf8f5]">A Inteligência Artificial está renderizando a proposta...</h3>
                <p className="text-xs text-[#a89c93] font-medium">
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
                    <span className="text-[11px] font-bold text-[#a89c93] uppercase tracking-wider block">
                      ANTES (ORIGINAL ENVIADO)
                    </span>
                    <img
                      src={originalImage}
                      alt="Antes"
                      className="w-full h-80 sm:h-96 object-cover rounded-2xl shadow-md border border-[#3d342f]"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-[#c58a4b] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#c58a4b]" />
                        PROPOSTA GERADA POR IA — VERSÃO {currentVersionIndex + 1}
                      </span>
                    </div>
                    <img
                      src={redesignImage}
                      alt="Depois"
                      className="w-full h-80 sm:h-96 object-cover rounded-2xl shadow-md border border-[#c58a4b]/40 ring-1 ring-[#c58a4b]/30"
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
                          ? 'border-[#c58a4b] bg-[#c58a4b] text-[#12100e] shadow-sm'
                          : 'border-[#3d342f] bg-[#0e0c0b] text-[#a89c93] hover:bg-[#1c1815]'
                      }`}
                    >
                      <img src={verUrl} alt={`Versão ${idx + 1}`} className="w-6 h-6 rounded-md object-cover" />
                      <span>Versão {idx + 1}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Refinement Controls Box */}
              <div className="p-5 bg-[#0e0c0b] rounded-2xl border border-[#3d342f] space-y-4 shadow-2xs">
                <span className="text-xs font-bold text-[#fcf8f5] block">
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
                      className="px-3.5 py-1.5 bg-[#1c1815] hover:bg-[#251e1a] text-[#fcf8f5] text-xs font-medium rounded-full border border-[#3d342f] hover:border-[#c58a4b] transition-all cursor-pointer"
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
                    className="flex-1 w-full px-4 py-2.5 bg-[#1c1815] border border-[#3d342f] rounded-xl text-xs font-medium text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleRefineImage(customAdjustmentPrompt)}
                      className="px-5 py-2.5 bg-[#c58a4b] hover:bg-[#d49454] text-[#12100e] text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-1.5"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>AJUSTAR IMAGEM</span>
                    </button>

                    <button
                      onClick={handleConfirmProposal}
                      className="px-5 py-2.5 border border-[#c58a4b] bg-[#c58a4b]/10 hover:bg-[#c58a4b]/20 text-[#c58a4b] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
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
        <div className="bg-[#1c1815] border border-[#3d342f] rounded-3xl p-6 sm:p-12 shadow-xl max-w-4xl mx-auto space-y-8 text-center">
          <div className="w-16 h-16 rounded-full bg-[#c58a4b]/20 text-[#c58a4b] border border-[#c58a4b]/40 flex items-center justify-center mx-auto shadow-inner">
            <Check className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h2 className="text-3xl font-serif font-bold text-[#fcf8f5]">Proposta Gerada com Sucesso!</h2>
            <p className="text-xs text-[#a89c93] max-w-xl mx-auto leading-relaxed">
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
              className="px-6 py-3 bg-[#c58a4b] hover:bg-[#d49454] text-[#12100e] text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-md"
            >
              <Download className="w-4 h-4" />
              <span>Gerar PDF</span>
            </button>

            <button
              onClick={() => {
                if (!activeConsultation) handleConfirmProposal();
                setShowPresentationModal(true);
              }}
              className="px-6 py-3 bg-[#251e1a] hover:bg-[#2e2621] text-[#fcf8f5] text-xs font-bold rounded-xl border border-[#3d342f] transition-all flex items-center gap-2 cursor-pointer"
            >
              <Eye className="w-4 h-4 text-[#c58a4b]" />
              <span>Ver apresentação</span>
            </button>

            {activeConsultation && (
              <a
                href={getWhatsAppShareUrl(activeConsultation)}
                target="_blank"
                rel="noreferrer"
                className="px-6 py-3 bg-[#25d366]/10 hover:bg-[#25d366]/20 text-[#25d366] border border-[#25d366]/30 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Enviar pelo WhatsApp</span>
              </a>
            )}

            <button
              onClick={() => {
                setOriginalImage('');
                setRedesignImage('');
                setStep(1);
              }}
              className="px-5 py-3 border border-[#3d342f] bg-[#14110f] hover:bg-[#1c1815] text-[#a89c93] hover:text-[#fcf8f5] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
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
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md overflow-y-auto p-4 sm:p-8 flex justify-center animate-in fade-in">
          <div className="bg-[#1c1815] text-[#fcf8f5] w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-[#3d342f] my-auto relative">
            {/* Close Modal Button */}
            <button
              onClick={() => setShowPresentationModal(false)}
              className="absolute top-6 right-6 z-20 w-10 h-10 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center cursor-pointer backdrop-blur-md border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* PRESENTATION HEADER */}
            <div className="bg-[#14110f] text-[#fcf8f5] p-8 sm:p-12 text-center space-y-4 relative border-b border-[#3d342f]">
              <div className="font-serif text-xl sm:text-2xl font-bold tracking-widest text-[#c58a4b]">
                {activeConsultation?.officeName || officeName}
              </div>
              <span className="text-[10px] font-bold tracking-widest uppercase text-[#a89c93] block">
                CONSULTORIA EXPRESSA DE ARQUITETURA
              </span>

              <h1 className="text-3xl sm:text-5xl font-serif font-normal max-w-2xl mx-auto leading-tight text-[#fcf8f5]">
                Uma nova possibilidade para o seu espaço.
              </h1>

              <div className="text-xs text-[#a89c93] font-medium">
                {activeConsultation?.clientName || clientName || 'Cliente'} • {activeConsultation?.roomType || roomType} | Consultor: {activeConsultation?.consultantName || consultantName}
              </div>
            </div>

            {/* PRESENTATION BODY */}
            <div className="p-6 sm:p-12 space-y-12">
              {/* SECTION: ANTES E DEPOIS INTERATIVO */}
              <div className="space-y-4">
                <span className="text-[10px] font-bold text-[#c58a4b] uppercase tracking-widest block text-center sm:text-left">
                  TRANSFORMAÇÃO VISUAL (ANTES & DEPOIS)
                </span>

                <BeforeAfterSlider
                  beforeImage={activeConsultation?.originalImage || originalImage}
                  afterImage={activeConsultation?.redesignImage || redesignImage}
                  title="ARRASTE PARA COMPARAR"
                  aspectRatioClass="h-[380px] sm:h-[500px]"
                />

                <p className="text-xs sm:text-sm text-[#a89c93] leading-relaxed max-w-3xl font-sans">
                  O ambiente ({activeConsultation?.roomType || roomType}) parte de uma base arquitetônica que é preservada integralmente, sem alterar enquadramento e perspectiva. A proposta da Inteligência Artificial renova materiais, marcenaria e iluminação para atingir a atmosfera desejada.
                </p>
              </div>

              {/* SECTION: O QUE VOCÊ GOSTARIA DE MELHORAR */}
              <div className="bg-[#0e0c0b] border border-[#3d342f] text-white p-8 rounded-2xl space-y-4">
                <span className="text-[10px] font-bold text-[#c58a4b] uppercase tracking-widest block">
                  O QUE VOCÊ GOSTARIA DE MELHORAR
                </span>
                <p className="text-xs text-[#a89c93]">Mudanças e sensações desejadas para o espaço.</p>

                <div className="flex flex-wrap gap-3 pt-2">
                  {(activeConsultation?.desiredChanges || selectedChanges).concat(activeConsultation?.desiredStyle || selectedStyles).map((tag, i) => (
                    <span
                      key={i}
                      className="px-5 py-2.5 rounded-xl border border-[#c58a4b]/30 bg-[#c58a4b]/10 text-xs font-semibold text-[#c58a4b] backdrop-blur-md"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* SECTION: IDEIAS PARA TRANSFORMAR SEU ESPAÇO */}
              <div className="space-y-6">
                <h2 className="text-2xl font-serif font-bold text-[#fcf8f5]">Ideias para transformar seu espaço</h2>

                <div className="space-y-3">
                  {(activeConsultation?.ideas || ideas).map((idea, idx) => (
                    <div
                      key={idx}
                      className="p-4 bg-[#0e0c0b] rounded-2xl border border-[#3d342f] flex items-center gap-4 shadow-2xs"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#1c1815] border border-[#3d342f] text-[#c58a4b] font-bold text-xs flex items-center justify-center shrink-0">
                        0{idx + 1}
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-[#fcf8f5] leading-snug">{idea}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION: DIREÇÃO SUGERIDA */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-[#c58a4b] uppercase tracking-widest block">
                  DIREÇÃO SUGERIDA
                </span>
                <div className="flex flex-wrap gap-2">
                  {(activeConsultation?.directionTags || directionTags).map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-[#0e0c0b] border border-[#3d342f] text-[#a89c93] text-xs font-semibold rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* SECTION: ESSA É APENAS UMA PRIMEIRA POSSIBILIDADE */}
              <div className="text-center p-8 bg-[#0e0c0b] rounded-3xl border border-[#3d342f] space-y-6 shadow-sm">
                <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#fcf8f5] max-w-xl mx-auto">
                  Essa é apenas uma primeira possibilidade.
                </h2>
                <p className="text-xs sm:text-sm text-[#a89c93] max-w-2xl mx-auto leading-relaxed">
                  Esta consultoria apresenta uma primeira direção para o seu ambiente — uma forma de explorar possibilidades, identificar caminhos e visualizar o potencial do espaço. Em um projeto completo com o {activeConsultation?.officeName || officeName}, essa visão evolui.
                </p>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <a
                    href={`https://api.whatsapp.com/send?phone=5511999999999&text=${encodeURIComponent(
                      `Olá! Gostaria de evoluir a minha Consultoria Expressa para um Projeto Completo com o ${activeConsultation?.officeName || officeName}.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-6 py-3 bg-[#c58a4b] hover:bg-[#d49454] text-[#12100e] text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-md"
                  >
                    <MessageCircle className="w-4 h-4 text-[#12100e]" />
                    <span>Falar com o {activeConsultation?.officeName || officeName}</span>
                  </a>

                  <button
                    onClick={handlePrintPDF}
                    className="px-6 py-3 border border-[#3d342f] bg-[#1c1815] hover:bg-[#251e1a] text-[#fcf8f5] text-xs font-bold rounded-full transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-[#a89c93]" />
                    <span>Baixar PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* HISTÓRICO MODAL */}
      {/* ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm p-4 sm:p-8 flex items-center justify-center animate-in fade-in">
          <div className="bg-[#1c1815] text-[#fcf8f5] w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-[#3d342f] max-h-[90vh] flex flex-col">
            <div className="p-6 bg-[#0e0c0b] border-b border-[#3d342f] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-[#c58a4b]" />
                <h2 className="text-base font-bold text-[#fcf8f5]">Histórico de Consultorias Expressas</h2>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1 text-[#a89c93] hover:text-[#fcf8f5] rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {savedConsultations.length === 0 ? (
                <div className="py-12 text-center text-xs text-[#a89c93]">
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
                    className="p-4 bg-[#0e0c0b] border border-[#3d342f] hover:border-[#c58a4b] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all shadow-2xs hover:shadow-md"
                  >
                    <div className="flex items-center gap-3.5">
                      <img
                        src={item.redesignImage}
                        alt={item.clientName}
                        className="w-14 h-14 rounded-xl object-cover border border-[#3d342f]"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-[#fcf8f5]">{item.clientName}</h4>
                          <span className="px-2 py-0.5 bg-[#1c1815] text-[#c58a4b] border border-[#c58a4b]/30 text-[10px] font-bold rounded-md uppercase">
                            {item.roomType}
                          </span>
                        </div>
                        <p className="text-xs text-[#a89c93]">
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
                        className="p-2 bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366]/20 rounded-xl text-xs font-bold transition-all"
                        title="Enviar no WhatsApp"
                      >
                        <MessageCircle className="w-4 h-4" />
                      </a>
                      <button
                        onClick={(e) => handleDeleteConsultation(item.id, e)}
                        className="p-2 bg-red-950/40 text-red-400 border border-red-800/40 hover:bg-red-900/60 rounded-xl transition-all cursor-pointer"
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
    </div>
  );
};
