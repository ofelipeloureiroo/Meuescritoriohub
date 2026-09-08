import React, { useState } from 'react';
import {
  Calendar,
  Camera,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Edit,
  ExternalLink,
  Layers,
  MapPin,
  Maximize2,
  Plus,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  User,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ArchitectureProject } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { NICHES } from '../../utils/theme';
import { compressImage } from '../../utils/imageCompressor';

interface ProjectDetailModalProps {
  project: ArchitectureProject | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (project: ArchitectureProject) => void;
}

export const ProjectDetailModal: React.FC<ProjectDetailModalProps> = ({
  project,
  isOpen,
  onClose,
  onEdit,
}) => {
  const { addPhotoToProject, removePhotoFromProject, deleteArchitectureProject, architectProfile } = useFinance();
  const currentNiche = NICHES[architectProfile.niche || 'arquitetura'] || NICHES.outro;
  const form = currentNiche.formConfig;
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showBeforeAfter, setShowBeforeAfter] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  if (!isOpen || !project) return null;

  const photos = project.images && project.images.length > 0 ? project.images : [project.coverImage];

  const handleNextPhoto = () => {
    setActivePhotoIndex((prev) => (prev + 1) % photos.length);
  };

  const handlePrevPhoto = () => {
    setActivePhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
  };

  const handleUploadPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      try {
        const compressed = await compressImage(file as File, 800, 800, 0.70);
        if (compressed) {
          addPhotoToProject(project.id, compressed);
        }
      } catch (err) {
        console.error('Error compressing project photo:', err);
      }
    }
    setIsAddingPhoto(false);
  };

  const handleAddUrlPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    addPhotoToProject(project.id, newPhotoUrl.trim());
    setNewPhotoUrl('');
    setIsAddingPhoto(false);
  };

  const handleDeleteCurrentPhoto = () => {
    if (photos.length <= 1) {
      setPhotoError('O projeto precisa ter pelo menos uma foto.');
      setTimeout(() => setPhotoError(null), 3000);
      return;
    }
    removePhotoFromProject(project.id, activePhotoIndex);
    setActivePhotoIndex(0);
  };

  const handleConfirmDeleteProject = () => {
    deleteArchitectureProject(project.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  const getStatusBadge = (status: ArchitectureProject['status']) => {
    const option = currentNiche.statusOptions.find((o) => o.value === status);
    const label = option ? option.label : status;
    switch (status) {
      case 'estudo_preliminar':
        return { label, bg: 'bg-[#de9b9d]/20 text-[#e29a9b] border-[#de9b9d]/30' };
      case 'anteprojeto':
        return { label, bg: 'bg-[#c58a4b]/20 text-[#d49454] border-[#c58a4b]/30' };
      case 'executivo':
        return { label, bg: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
      case 'obra':
        return { label, bg: 'bg-[#d97706]/20 text-[#f59e0b] border-[#d97706]/30' };
      case 'entregue':
        return { label, bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
      default:
        return { label, bg: 'bg-zinc-800 text-zinc-300 border-zinc-700' };
    }
  };

  const statusBadge = getStatusBadge(project.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-5xl my-6 bg-[#1a1614] border border-[#3d342f] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Bar */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-[#3d342f] bg-[#14110f]">
          <div className="flex items-center gap-3">
            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge.bg}`}>
              {statusBadge.label}
            </span>
            <span className="text-xs text-[#a89c93] flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-[#d48b8e]" /> {project.location}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                onEdit(project);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#28221e] hover:bg-[#3d342f] text-xs font-semibold text-[#fcf8f5] flex items-center gap-1.5 border border-[#3d342f] transition-colors cursor-pointer"
            >
              <Edit className="w-3.5 h-3.5 text-[#c58a4b]" /> Editar
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-1.5 rounded-lg bg-[#28221e] hover:bg-rose-900/40 text-rose-400 hover:text-rose-300 border border-[#3d342f] transition-colors cursor-pointer"
              title="Excluir Projeto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#28221e] transition-colors ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Inline Photo Error Notification */}
        {photoError && (
          <div className="bg-rose-950/90 border-b border-rose-800 text-rose-200 px-4 py-2 text-xs flex items-center justify-between animate-fadeIn">
            <span>{photoError}</span>
            <button onClick={() => setPhotoError(null)} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Delete Confirmation Dialog Inside Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#1a1614] border border-rose-900/60 rounded-2xl p-6 shadow-2xl space-y-4">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-rose-950/70 border border-rose-900/60 flex items-center justify-center text-rose-400 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-serif text-[#fcf8f5]">Excluir {form.itemLabel}</h3>
                  <p className="text-xs text-[#a89c93]">Confirmação de segurança</p>
                </div>
              </div>

              <p className="text-xs text-[#d4c8c1] leading-relaxed">
                Tem certeza que deseja excluir o cadastro <strong className="text-[#fcf8f5]">"{project.title}"</strong>? Esta ação removerá todas as fotos e registros associados.
              </p>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#3d342f]">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded-xl bg-[#28221e] hover:bg-[#342d28] text-xs font-semibold text-[#e8ded7] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteProject}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/40 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Sim, Excluir</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Main Content */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* Main Visual Carousel / Gallery Display */}
          <div className="relative bg-[#0d0b0a] aspect-video sm:h-[420px] w-full flex items-center justify-center overflow-hidden">
            {showBeforeAfter && project.beforeImage && project.afterImage ? (
              /* Before / After Interactive Split */
              <div className="relative w-full h-full select-none overflow-hidden group">
                {/* After image (base) */}
                <img
                  src={project.afterImage}
                  alt="Depois"
                  className="w-full h-full object-contain pointer-events-none"
                />
                <span className="absolute bottom-3 right-4 px-2.5 py-1 rounded-md bg-emerald-950/80 text-emerald-300 text-xs font-bold border border-emerald-700/50">
                  DEPOIS
                </span>

                {/* Before image (clipped overlay) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${sliderPosition}%` }}
                >
                  <img
                    src={project.beforeImage}
                    alt="Antes"
                    className="w-full h-full object-contain pointer-events-none"
                    style={{ width: '100%', maxWidth: 'none' }}
                  />
                  <span className="absolute bottom-3 left-4 px-2.5 py-1 rounded-md bg-amber-950/80 text-amber-300 text-xs font-bold border border-amber-700/50">
                    ANTES
                  </span>
                </div>

                {/* Slider divider line */}
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize flex items-center justify-center"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="w-7 h-7 rounded-full bg-white text-black font-bold flex items-center justify-center text-[10px] shadow-md">
                    ⇄
                  </div>
                </div>

                {/* Range input for scrubbing */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(Number(e.target.value))}
                  className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full"
                />
              </div>
            ) : (
              /* Regular Photo Carousel */
              <div className="relative w-full h-full flex items-center justify-center">
                <img
                  src={photos[activePhotoIndex]}
                  alt={`${project.title} - Foto ${activePhotoIndex + 1}`}
                  className="w-full h-full object-contain cursor-zoom-in transition-transform duration-200"
                  onClick={() => setIsLightboxOpen(true)}
                />

                {/* Left/Right Navigation Arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={handlePrevPhoto}
                      className="absolute left-3 p-2 rounded-full bg-black/60 hover:bg-[#c58a4b] text-white hover:text-black transition-all shadow-lg backdrop-blur-sm"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleNextPhoto}
                      className="absolute right-3 p-2 rounded-full bg-black/60 hover:bg-[#c58a4b] text-white hover:text-black transition-all shadow-lg backdrop-blur-sm"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Lightbox / Zoom Fullscreen Button */}
                <button
                  onClick={() => setIsLightboxOpen(true)}
                  className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white text-xs flex items-center gap-1 backdrop-blur-sm transition-colors"
                >
                  <Maximize2 className="w-4 h-4" /> Expandir
                </button>

                {/* Photo Counter Badge */}
                <div className="absolute bottom-3 left-4 px-3 py-1 rounded-full bg-black/70 text-xs font-mono text-[#e8ded7] backdrop-blur-sm">
                  Foto {activePhotoIndex + 1} de {photos.length}
                </div>

                {/* Delete current photo */}
                {photos.length > 1 && (
                  <button
                    onClick={handleDeleteCurrentPhoto}
                    className="absolute bottom-3 right-4 px-2.5 py-1 rounded-lg bg-black/70 hover:bg-rose-700 text-rose-300 text-xs flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Excluir Foto
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Gallery Thumbnails & Quick Actions */}
          <div className="p-4 bg-[#14110f] border-b border-[#3d342f]">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#fcf8f5] uppercase tracking-wider">
                  Galeria de Fotos ({photos.length})
                </span>
                {project.beforeImage && project.afterImage && (
                  <button
                    onClick={() => setShowBeforeAfter(!showBeforeAfter)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      showBeforeAfter
                        ? 'bg-[#c58a4b] text-black font-bold'
                        : 'bg-[#28221e] text-[#d48b8e] hover:bg-[#342c27] border border-[#3d342f]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {showBeforeAfter ? 'Ver Galeria Padrão' : 'Comparar Antes x Depois'}
                  </button>
                )}
              </div>

              {/* Add Photo Button */}
              <button
                onClick={() => setIsAddingPhoto(!isAddingPhoto)}
                className="px-3 py-1.5 rounded-lg bg-[#c58a4b]/15 hover:bg-[#c58a4b]/25 text-[#d49454] text-xs font-bold flex items-center gap-1.5 border border-[#c58a4b]/30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Adicionar Fotos a este Projeto
              </button>
            </div>

            {/* Expandable Add Photo Panel */}
            {isAddingPhoto && (
              <div className="mb-4 p-3 bg-[#1e1916] rounded-xl border border-[#3d342f] space-y-3">
                <span className="text-xs font-bold text-[#fcf8f5] block">
                  📸 Adicionar Novas Fotos ao Projeto:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-center gap-2 p-2.5 rounded-lg bg-[#28221e] hover:bg-[#342c27] border border-[#4a3e37] cursor-pointer text-xs font-medium text-[#fcf8f5] transition-colors">
                    <Upload className="w-4 h-4 text-[#c58a4b]" />
                    Carregar do Celular / Computador
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleUploadPhoto}
                      className="hidden"
                    />
                  </label>

                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="Colar link da foto (URL)..."
                      value={newPhotoUrl}
                      onChange={(e) => setNewPhotoUrl(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#12100e] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[#c58a4b]"
                    />
                    <button
                      onClick={handleAddUrlPhoto}
                      className="px-3 py-1.5 rounded-lg bg-[#c58a4b] hover:bg-[#d49454] text-black font-semibold text-xs"
                    >
                      Inserir
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Thumbnail Strip */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-1 no-scrollbar">
              {photos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setShowBeforeAfter(false);
                    setActivePhotoIndex(idx);
                  }}
                  className={`relative flex-shrink-0 w-20 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                    !showBeforeAfter && activePhotoIndex === idx
                      ? 'border-[#c58a4b] ring-2 ring-[#c58a4b]/40 scale-105'
                      : 'border-[#3d342f] opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          {/* Project Details Section */}
          <div className="p-6 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-[#fcf8f5] font-serif tracking-tight mb-2">
                {project.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#a89c93]">
                <span className="flex items-center gap-1.5 text-[#fcf8f5] font-medium">
                  <User className="w-4 h-4 text-[#c58a4b]" /> {project.clientName}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-[#d48b8e]" /> {project.location}
                </span>
                {project.areaM2 && (
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />{' '}
                    {currentNiche.id === 'arquitetura' || currentNiche.id === 'engenharia' || currentNiche.id === 'imobiliario'
                      ? `${project.areaM2} m² de área`
                      : `${project.areaM2} (${form.metricFieldLabel || 'unidades'})`}
                  </span>
                )}
                {project.honorarios && (
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <DollarSign className="w-4 h-4 text-emerald-400" />{' '}
                    {form.valueFieldLabel.replace(' (R$)', '')}: {formatCurrency(project.honorarios)}
                  </span>
                )}
                {project.deliveryDate && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-[#a89c93]" /> Entrega: {project.deliveryDate}
                  </span>
                )}
              </div>
            </div>

            {/* Description / Architectural Narrative */}
            {project.description && (
              <div className="p-4 rounded-xl bg-[#14110f] border border-[#3d342f]">
                <h4
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  {form.conceptFieldLabel}
                </h4>
                <p className="text-sm text-[#e8ded7] leading-relaxed whitespace-pre-line font-sans">
                  {project.description}
                </p>
              </div>
            )}

            {/* Tags & Materials */}
            {project.tags && project.tags.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-[#a89c93] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5" style={{ color: 'var(--theme-accent)' }} /> {form.tagsFieldLabel}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg bg-[#28221e] text-xs font-medium text-[#e8ded7] border border-[#3d342f]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox / Zoom Modal */}
      {isLightboxOpen && (
        <div className="fixed inset-0 z-60 bg-black/95 flex flex-col items-center justify-center p-4">
          <button
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={photos[activePhotoIndex]}
            alt=""
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
          <div className="flex items-center gap-4 mt-4 text-white text-xs font-mono">
            <button
              onClick={handlePrevPhoto}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
            >
              ← Anterior
            </button>
            <span>
              {activePhotoIndex + 1} / {photos.length}
            </span>
            <button
              onClick={handleNextPhoto}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20"
            >
              Próxima →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
