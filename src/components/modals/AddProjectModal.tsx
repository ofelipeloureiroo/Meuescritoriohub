import React, { useState, useEffect } from 'react';
import {
  Camera,
  Check,
  FolderPlus,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import { ArchitectureProject } from '../../types';
import { NICHES } from '../../utils/theme';
import { compressImage } from '../../utils/imageCompressor';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialProject?: ArchitectureProject | null;
}

export const AddProjectModal: React.FC<AddProjectModalProps> = ({
  isOpen,
  onClose,
  initialProject,
}) => {
  const { addArchitectureProject, updateArchitectureProject, deleteArchitectureProject, clients, architectProfile } = useFinance();
  const currentNiche = NICHES[architectProfile.niche || 'arquitetura'] || NICHES.outro;
  const form = currentNiche.formConfig;
  const categoryOptions = currentNiche.categories.filter((c) => c.id !== 'all' && c.id !== 'antes_depois');
  const statusOptions = currentNiche.statusOptions;

  const [title, setTitle] = useState(initialProject?.title || '');
  const [clientName, setClientName] = useState(initialProject?.clientName || '');
  const [category, setCategory] = useState<ArchitectureProject['category']>(
    initialProject?.category || categoryOptions[0]?.id || 'residencial'
  );
  const [location, setLocation] = useState(initialProject?.location || 'Rio Bonito, RJ');
  const [state, setState] = useState(initialProject?.state || 'RJ');
  const [areaM2, setAreaM2] = useState<string>(
    initialProject?.areaM2 ? String(initialProject.areaM2) : ''
  );
  const [honorarios, setHonorarios] = useState<string>(
    initialProject?.honorarios ? String(initialProject.honorarios) : ''
  );
  const [status, setStatus] = useState<ArchitectureProject['status']>(
    initialProject?.status || statusOptions[0]?.value || 'estudo_preliminar'
  );
  const [coverImage, setCoverImage] = useState(
    initialProject?.coverImage || ''
  );
  const [galleryImages, setGalleryImages] = useState<string[]>(
    initialProject?.images && initialProject.images.length > 0
      ? initialProject.images
      : (initialProject?.coverImage ? [initialProject.coverImage] : [])
  );
  const [beforeImage, setBeforeImage] = useState(initialProject?.beforeImage || '');
  const [afterImage, setAfterImage] = useState(initialProject?.afterImage || '');
  const [description, setDescription] = useState(initialProject?.description || '');
  const [deliveryDate, setDeliveryDate] = useState(initialProject?.deliveryDate || '');
  const [newImageUrl, setNewImageUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(initialProject?.tags || form.defaultTags || []);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  // Sync state whenever modal opens or niche changes
  useEffect(() => {
    if (isOpen) {
      setTitle(initialProject?.title || '');
      setClientName(initialProject?.clientName || '');
      setCategory(initialProject?.category || categoryOptions[0]?.id || 'residencial');
      setLocation(initialProject?.location || 'Rio Bonito, RJ');
      setState(initialProject?.state || 'RJ');
      setAreaM2(initialProject?.areaM2 ? String(initialProject.areaM2) : '');
      setHonorarios(initialProject?.honorarios ? String(initialProject.honorarios) : '');
      setStatus(initialProject?.status || statusOptions[0]?.value || 'estudo_preliminar');
      
      const existingCover = initialProject?.coverImage || '';
      const existingImages = initialProject?.images && initialProject.images.length > 0
        ? initialProject.images
        : (existingCover ? [existingCover] : []);

      setCoverImage(existingCover);
      setGalleryImages(existingImages);
      setBeforeImage(initialProject?.beforeImage || '');
      setAfterImage(initialProject?.afterImage || '');
      setDescription(initialProject?.description || '');
      setDeliveryDate(initialProject?.deliveryDate || '');
      setTags(initialProject?.tags || form.defaultTags || []);
      setShowDeleteConfirm(false);
      setIsCompressing(false);
      setNewImageUrl('');
      setTagInput('');
    }
  }, [isOpen, initialProject, architectProfile.niche]);

  if (!isOpen) return null;

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: 'cover' | 'gallery' | 'before' | 'after'
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsCompressing(true);
    try {
      const fileList: File[] = Array.from(files);
      for (const file of fileList) {
        const compressedBase64 = await compressImage(file, 800, 800, 0.70);
        if (!compressedBase64) continue;

        if (target === 'cover') {
          setCoverImage(compressedBase64);
          setGalleryImages((prev) =>
            prev.includes(compressedBase64) ? prev : [compressedBase64, ...prev]
          );
        } else if (target === 'gallery') {
          setGalleryImages((prev) => [...prev, compressedBase64]);
          setCoverImage((prev) => {
            const isPreset = form.presetPhotos?.some((p) => p.url === prev);
            if (!prev || isPreset) {
              return compressedBase64;
            }
            return prev;
          });
        } else if (target === 'before') {
          setBeforeImage(compressedBase64);
        } else if (target === 'after') {
          setAfterImage(compressedBase64);
        }
      }
    } catch (err) {
      console.error('Error processing image upload:', err);
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    const url = newImageUrl.trim();
    setGalleryImages((prev) => [...prev, url]);
    setCoverImage((prev) => {
      const isPreset = form.presetPhotos?.some((p) => p.url === prev);
      if (!prev || isPreset) return url;
      return prev;
    });
    setNewImageUrl('');
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryImages((prev) => {
      const targetImg = prev[index];
      const next = prev.filter((_, i) => i !== index);
      if (coverImage === targetImg) {
        setCoverImage(next.length > 0 ? next[0] : '');
      }
      return next;
    });
  };

  const handleAddTag = () => {
    if (!tagInput.trim() || tags.includes(tagInput.trim())) return;
    setTags((prev) => [...prev, tagInput.trim()]);
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !clientName.trim()) return;

    const finalCover = coverImage || galleryImages[0] || form.presetPhotos[0]?.url || '';
    let finalGallery = [...galleryImages];
    if (finalCover && !finalGallery.includes(finalCover)) {
      finalGallery = [finalCover, ...finalGallery];
    }
    if (finalGallery.length === 0 && finalCover) {
      finalGallery = [finalCover];
    }

    const projectData = {
      title: title.trim(),
      clientName: clientName.trim(),
      category,
      location: (location || '').trim() || 'Rio Bonito, RJ',
      state: (state || '').toUpperCase(),
      areaM2: areaM2 ? parseFloat(areaM2) : 0,
      honorarios: honorarios ? parseFloat(honorarios) : 0,
      status,
      coverImage: finalCover,
      images: finalGallery,
      beforeImage: beforeImage ? beforeImage.trim() : '',
      afterImage: afterImage ? afterImage.trim() : '',
      description: description ? description.trim() : '',
      deliveryDate: deliveryDate || '',
      tags: tags.length > 0 ? tags : [],
    };

    if (initialProject) {
      updateArchitectureProject(initialProject.id, projectData);
    } else {
      addArchitectureProject(projectData);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl my-8 bg-[#1a1614] border border-[#3d342f] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#3d342f] bg-[#14110f]">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: 'rgba(var(--theme-accent-rgb), 0.2)',
                border: '1px solid rgba(var(--theme-accent-rgb), 0.4)',
                color: 'var(--theme-accent)',
              }}
            >
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#fcf8f5] font-serif">
                {initialProject ? form.modalTitleEdit : form.modalTitleNew}
              </h2>
              <p className="text-xs text-[#a89c93]">
                {form.modalSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#a89c93] hover:text-[#fcf8f5] hover:bg-[#28221e] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          {/* Main Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--theme-primary)' }}
              >
                {form.titleFieldLabel}
              </label>
              <input
                type="text"
                required
                placeholder={form.titlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#12100e] border border-[#3d342f] text-[#fcf8f5] text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--theme-primary)' }}
              >
                {form.clientFieldLabel}
              </label>
              <input
                type="text"
                required
                placeholder={form.clientPlaceholder}
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                list="client-suggestions"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#12100e] border border-[#3d342f] text-[#fcf8f5] text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
              <datalist id="client-suggestions">
                {clients.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--theme-primary)' }}
              >
                Categoria / Classificação
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ArchitectureProject['category'])}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#12100e] border border-[#3d342f] text-[#fcf8f5] text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--theme-primary)' }}
              >
                Status / Fase Atual
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ArchitectureProject['status'])}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#12100e] border border-[#3d342f] text-[#fcf8f5] text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--theme-primary)' }}
              >
                Cidade / Localização / Canal
              </label>
              <input
                type="text"
                placeholder={form.locationPlaceholder}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#12100e] border border-[#3d342f] text-[#fcf8f5] text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
            </div>

            {form.showMetricField ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--theme-primary)' }}
                  >
                    {form.metricFieldLabel}
                  </label>
                  <input
                    type="text"
                    placeholder={form.metricPlaceholder}
                    value={areaM2}
                    onChange={(e) => setAreaM2(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#12100e] border border-[#3d342f] text-[#fcf8f5] text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                    style={{ color: 'var(--theme-primary)' }}
                  >
                    {form.valueFieldLabel}
                  </label>
                  <input
                    type="number"
                    placeholder={form.valuePlaceholder}
                    value={honorarios}
                    onChange={(e) => setHonorarios(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#12100e] border border-[#3d342f] text-[#fcf8f5] text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--theme-primary)' }}
                >
                  {form.valueFieldLabel}
                </label>
                <input
                  type="number"
                  placeholder={form.valuePlaceholder}
                  value={honorarios}
                  onChange={(e) => setHonorarios(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#12100e] border border-[#3d342f] text-[#fcf8f5] text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
                />
              </div>
            )}
          </div>

          {/* Photos Showcase & Upload Section */}
          <div className="p-4 rounded-xl bg-[#14110f] border border-[#3d342f] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" style={{ color: 'var(--theme-accent)' }} />
                <h3 className="text-sm font-bold text-[#fcf8f5]">{form.photosSectionTitle}</h3>
              </div>
              <span className="text-xs text-[#a89c93]">{galleryImages.length} foto(s)</span>
            </div>

            {/* Quick Upload / File Drop */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-[#4a3e37] hover:border-[var(--theme-primary)] rounded-xl bg-[#1b1714]/60 cursor-pointer transition-colors text-center group">
                <Upload className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" style={{ color: 'var(--theme-primary)' }} />
                <span className="text-xs font-semibold text-[#fcf8f5]">Carregar Foto de Capa</span>
                <span className="text-[10px] text-[#a89c93]">Imagem principal do card</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'cover')}
                  className="hidden"
                />
              </label>

              <label className="flex flex-col items-center justify-center p-3.5 border-2 border-dashed border-[#4a3e37] hover:border-[var(--theme-primary)] rounded-xl bg-[#1b1714]/60 cursor-pointer transition-colors text-center group">
                <Upload className="w-5 h-5 mb-1 group-hover:scale-110 transition-transform" style={{ color: 'var(--theme-accent)' }} />
                <span className="text-xs font-semibold text-[#fcf8f5]">Carregar Galeria (Múltiplas)</span>
                <span className="text-[10px] text-[#a89c93]">Adicionar várias fotos</span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFileUpload(e, 'gallery')}
                  className="hidden"
                />
              </label>
            </div>

            <div className="flex flex-col justify-center gap-2 p-3 bg-[#1b1714]/60 border border-[#3d342f] rounded-xl">
              <span className="text-xs font-medium text-[#a89c93]">Ou adicionar link de foto (URL):</span>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://exemplo.com/foto.jpg"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#12100e] border border-[#3d342f] text-xs text-[#fcf8f5] focus:outline-none focus:border-[var(--theme-primary)]"
                />
                <button
                  type="button"
                  onClick={handleAddImageUrl}
                  className="px-3 py-1.5 rounded-lg font-semibold text-xs text-black transition-colors flex items-center gap-1 cursor-pointer hover:brightness-110"
                  style={{ backgroundColor: 'var(--theme-primary)' }}
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
            </div>

            {/* Presets Quick Picker */}
            {form.presetPhotos && form.presetPhotos.length > 0 && (
              <div>
                <span className="text-[11px] text-[#a89c93] block mb-1.5 font-medium">
                  {form.presetPhotosLabel}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {form.presetPhotos.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        if (!galleryImages.includes(preset.url)) {
                          setGalleryImages((prev) => [...prev, preset.url]);
                        }
                        if (!coverImage) setCoverImage(preset.url);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-[#28221e] hover:bg-[#3d342f] text-[11px] text-[#e8ded7] border border-[#4a3e37] transition-colors cursor-pointer"
                    >
                      + {preset.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Gallery Thumbnails Strip */}
            {galleryImages.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-[#2d2622]">
                <span className="text-xs font-semibold" style={{ color: 'var(--theme-accent)' }}>
                  Galeria Atual (Clique para definir a Capa):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {galleryImages.map((img, idx) => {
                    const isCover = coverImage === img;
                    return (
                      <div
                        key={idx}
                        className={`relative rounded-xl overflow-hidden border-2 aspect-video group cursor-pointer transition-all ${
                          isCover ? 'border-[var(--theme-primary)] ring-2 ring-[var(--theme-primary)]/30' : 'border-[#3d342f] opacity-80 hover:opacity-100'
                        }`}
                        onClick={() => setCoverImage(img)}
                      >
                        <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                        {isCover && (
                          <div
                            className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md font-bold text-[10px] text-black shadow"
                            style={{ backgroundColor: 'var(--theme-primary)' }}
                          >
                            Capa
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveGalleryImage(idx);
                          }}
                          className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/70 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Antes e Depois (Transformação) */}
          {form.showBeforeAfter !== false && (
            <div className="p-4 rounded-xl bg-[#14110f] border border-[#3d342f] space-y-3">
              <h3 className="text-sm font-bold text-[#fcf8f5] flex items-center gap-2">
                <span>{form.beforeAfterTitle}</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#a89c93] mb-1">{form.beforeLabel}</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="URL da foto"
                      value={beforeImage}
                      onChange={(e) => setBeforeImage(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#12100e] border border-[#3d342f] text-xs text-[#fcf8f5]"
                    />
                    <label className="px-2.5 py-1.5 rounded-lg bg-[#28221e] hover:bg-[#3d342f] text-xs text-[#fcf8f5] cursor-pointer flex items-center">
                      <Upload className="w-3.5 h-3.5 mr-1" /> Arquivo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'before')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {beforeImage && (
                    <div className="h-28 rounded-lg overflow-hidden border border-[#3d342f]">
                      <img src={beforeImage} alt="Antes" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs text-[#a89c93] mb-1">{form.afterLabel}</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      placeholder="URL da foto"
                      value={afterImage}
                      onChange={(e) => setAfterImage(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-[#12100e] border border-[#3d342f] text-xs text-[#fcf8f5]"
                    />
                    <label className="px-2.5 py-1.5 rounded-lg bg-[#28221e] hover:bg-[#3d342f] text-xs text-[#fcf8f5] cursor-pointer flex items-center">
                      <Upload className="w-3.5 h-3.5 mr-1" /> Arquivo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'after')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  {afterImage && (
                    <div className="h-28 rounded-lg overflow-hidden border border-[#3d342f]">
                      <img src={afterImage} alt="Depois" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Description & Tags */}
          <div className="space-y-4">
            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--theme-primary)' }}
              >
                {form.conceptFieldLabel}
              </label>
              <textarea
                rows={3}
                placeholder={form.conceptPlaceholder}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#12100e] border border-[#3d342f] text-[#fcf8f5] text-sm focus:outline-none focus:border-[var(--theme-primary)] transition-colors"
              />
            </div>

            <div>
              <label
                className="block text-xs font-semibold uppercase tracking-wider mb-1.5"
                style={{ color: 'var(--theme-primary)' }}
              >
                {form.tagsFieldLabel}
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder={form.tagsPlaceholder}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#12100e] border border-[#3d342f] text-[#fcf8f5] text-xs focus:outline-none focus:border-[var(--theme-primary)]"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-4 py-2 rounded-xl bg-[#28221e] hover:bg-[#3d342f] text-xs font-medium text-[#fcf8f5] border border-[#4a3e37] cursor-pointer"
                >
                  + Adicionar Tag
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#28221e] text-xs text-[#e8ded7] border border-[#3d342f]"
                  >
                    #{t}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(t)}
                      className="hover:text-rose-400 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="flex items-center justify-between gap-3 pt-4 border-t border-[#3d342f]">
            <div>
              {initialProject && (
                showDeleteConfirm ? (
                  <div className="flex items-center gap-2 bg-rose-950/70 border border-rose-800/80 px-3 py-1.5 rounded-xl">
                    <span className="text-xs text-rose-200 font-medium">Confirmar exclusão?</span>
                    <button
                      type="button"
                      onClick={() => {
                        deleteArchitectureProject(initialProject.id);
                        onClose();
                      }}
                      className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Sim, Excluir
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(false)}
                      className="px-2 py-1 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 border border-rose-900/50 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Excluir {form.itemLabel}</span>
                  </button>
                )
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl bg-[#28221e] hover:bg-[#342d28] text-xs font-semibold text-[#e8ded7] transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isCompressing}
                className="px-6 py-2.5 rounded-xl text-black font-bold text-xs shadow-lg transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  backgroundColor: 'var(--theme-primary)',
                }}
              >
                {isCompressing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Otimizando imagens...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    {initialProject ? 'Salvar Alterações' : form.submitButtonText}
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
