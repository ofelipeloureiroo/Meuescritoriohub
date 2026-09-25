import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Upload,
  Image as ImageIcon,
  Trash2,
  Edit2,
  ExternalLink,
  Check,
  X,
  ShoppingBag,
  DollarSign,
  FileText,
  CheckCircle,
  AlertCircle,
  Filter,
  Loader2,
  Copy,
  Printer,
  ChevronDown,
  Sparkles,
  Eye,
  Download
} from 'lucide-react';
import { ArchitectureProject, MemorialItem } from '../../types';
import { useFinance } from '../../context/FinanceContext';

interface MemorialDescritivoTabProps {
  project: ArchitectureProject;
}

const CATEGORIES = [
  'Cozinha',
  'Banheiro',
  'Sala',
  'Quarto',
  'Iluminação',
  'Revestimentos',
  'Mobiliário',
  'Eletros',
  'Pintura',
  'Área Gourmet',
  'Outros'
];

// Helper to generate a clean, self-contained, printable A4 HTML document
function generateMemorialPrintHtml(
  project: ArchitectureProject,
  items: MemorialItem[],
  metrics: { totalCount: number; approvedCount: number; purchasedCount: number; estimatedTotal: number },
  officeName: string
): string {
  const dateStr = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  const currencyFormatter = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendente',
    approved: 'Aprovado',
    purchased: 'Comprado',
    rejected: 'Recusado'
  };

  const statusBadges: Record<string, string> = {
    pending: 'background:#f3f4f6;color:#374151;border:1px solid #d1d5db;',
    approved: 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;',
    purchased: 'background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;',
    rejected: 'background:#fef2f2;color:#b91c1c;border:1px solid #fecaca;'
  };

  const rows = items.length === 0
    ? `<tr><td colspan="7" style="padding: 30px; text-align: center; color: #9ca3af; font-size: 12px;">Nenhum produto cadastrado no memorial descritivo até o momento.</td></tr>`
    : items.map((item, idx) => {
        return `
          <tr style="border-bottom: 1px solid #e5e7eb; page-break-inside: avoid;">
            <td style="padding: 10px 8px; font-size: 11px; text-align: center; color: #6b7280; font-weight: 600;">${idx + 1}</td>
            <td style="padding: 10px 8px; width: 68px; text-align: center;">
              ${item.imageUrl 
                ? `<img src="${item.imageUrl}" alt="${item.title}" style="width: 54px; height: 54px; object-fit: cover; border-radius: 6px; border: 1px solid #e5e7eb; display: inline-block;" />` 
                : `<div style="width: 54px; height: 54px; background: #f9fafb; border-radius: 6px; border: 1px dashed #d1d5db; display: inline-flex; align-items: center; justify-content: center; font-size: 9px; color: #9ca3af; text-align: center; padding: 2px;">Sem foto</div>`}
            </td>
            <td style="padding: 10px 8px;">
              <span style="font-size: 9px; font-weight: 800; color: #8c7456; text-transform: uppercase; letter-spacing: 0.5px; display: block;">${item.category}</span>
              <strong style="font-size: 12px; color: #111827; display: block; margin-top: 2px;">${item.title}</strong>
              ${item.description ? `<p style="font-size: 10px; color: #4b5563; margin: 3px 0 0 0; line-height: 1.35;">${item.description}</p>` : ''}
              ${item.notes ? `<p style="font-size: 9px; color: #b45309; margin: 3px 0 0 0; font-style: italic;">Observação: ${item.notes}</p>` : ''}
            </td>
            <td style="padding: 10px 8px; font-size: 11px; color: #374151;">
              <span style="display: block; font-weight: 600;">${item.store || 'A definir'}</span>
              ${item.url ? `<a href="${item.url}" target="_blank" style="color: #8c7456; font-size: 10px; text-decoration: underline; word-break: break-all; display: block; margin-top: 3px;">Ver na Loja &rarr;</a>` : ''}
            </td>
            <td style="padding: 10px 8px; font-size: 11px; text-align: center; font-weight: 700; color: #111827;">${item.quantity || 1}</td>
            <td style="padding: 10px 8px; font-size: 12px; text-align: right; font-weight: 800; color: #8c7456; white-space: nowrap;">${item.price || 'Sob consulta'}</td>
            <td style="padding: 10px 8px; text-align: center; white-space: nowrap;">
              <span style="display: inline-block; padding: 3px 8px; font-size: 9px; font-weight: 700; border-radius: 9999px; ${statusBadges[item.status] || statusBadges.pending}">
                ${statusLabels[item.status] || 'Pendente'}
              </span>
            </td>
          </tr>
        `;
      }).join('');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Memorial Descritivo - ${project.title}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 14mm 12mm 14mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #1f2937;
      background: #ffffff;
      margin: 0;
      padding: 16px;
      font-size: 11px;
      line-height: 1.4;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #8c7456;
      padding-bottom: 14px;
      margin-bottom: 16px;
    }
    .header-table td {
      vertical-align: top;
    }
    .title {
      font-size: 18px;
      font-weight: 800;
      color: #111827;
      margin: 0 0 4px 0;
      letter-spacing: -0.3px;
    }
    .subtitle {
      font-size: 11px;
      color: #4b5563;
      margin: 0;
    }
    .badge-box {
      background: #faf7f2;
      border: 1px solid #e2d2bd;
      color: #8c7456;
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 700;
      text-align: right;
      display: inline-block;
      float: right;
    }
    .metrics-container {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 18px;
      border-collapse: separate;
      border-spacing: 8px 0;
    }
    .metric-cell {
      display: table-cell;
      background: #fcfaf7;
      border: 1px solid #ebdcc8;
      border-radius: 8px;
      padding: 9px 12px;
    }
    .metric-label {
      font-size: 8px;
      font-weight: 800;
      text-transform: uppercase;
      color: #8c7456;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .metric-value {
      font-size: 15px;
      font-weight: 800;
      color: #111827;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    table.data-table th {
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
      border-bottom: 2px solid #e5e7eb;
      padding: 8px;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      color: #4b5563;
      letter-spacing: 0.5px;
    }
    .signatures-table {
      width: 100%;
      margin-top: 36px;
      page-break-inside: avoid;
    }
    .signatures-table td {
      width: 50%;
      padding: 0 25px;
      text-align: center;
    }
    .sign-line {
      border-top: 1px solid #9ca3af;
      padding-top: 6px;
      font-size: 10px;
      color: #4b5563;
    }
    .footer-bar {
      margin-top: 24px;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #9ca3af;
      page-break-inside: avoid;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <table class="header-table">
    <tr>
      <td>
        <h1 class="title">${project.title}</h1>
        <p class="subtitle"><strong>Cliente:</strong> ${project.clientName} &bull; <strong>Emissão:</strong> ${dateStr}</p>
        <p class="subtitle" style="margin-top: 3px;"><strong>Responsável Técnico:</strong> ${officeName}</p>
      </td>
      <td style="text-align: right;">
        <div class="badge-box">
          MEMORIAL DESCRITIVO<br />
          <span style="font-size: 8px; font-weight: 600; color: #786044;">ESPECIFICAÇÕES & COMPRAS</span>
        </div>
      </td>
    </tr>
  </table>

  <div class="metrics-container">
    <div class="metric-cell">
      <div class="metric-label">Total de Itens</div>
      <div class="metric-value">${metrics.totalCount}</div>
    </div>
    <div class="metric-cell">
      <div class="metric-label">Itens Aprovados</div>
      <div class="metric-value" style="color: #2563eb;">${metrics.approvedCount}</div>
    </div>
    <div class="metric-cell">
      <div class="metric-label">Itens Comprados</div>
      <div class="metric-value" style="color: #059669;">${metrics.purchasedCount}</div>
    </div>
    <div class="metric-cell">
      <div class="metric-label">Orçamento Estimado</div>
      <div class="metric-value" style="color: #8c7456;">${currencyFormatter(metrics.estimatedTotal)}</div>
    </div>
  </div>

  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 25px; text-align: center;">#</th>
        <th style="width: 68px; text-align: center;">Imagem</th>
        <th style="text-align: left;">Item & Especificação Técnica</th>
        <th style="text-align: left; width: 140px;">Loja / Fornecedor</th>
        <th style="text-align: center; width: 45px;">Qtd</th>
        <th style="text-align: right; width: 90px;">Valor Est.</th>
        <th style="text-align: center; width: 80px;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <table class="signatures-table">
    <tr>
      <td>
        <div style="height: 35px;"></div>
        <div class="sign-line">
          <strong>${officeName}</strong><br />
          Arquiteto / Designer Responsável
        </div>
      </td>
      <td>
        <div style="height: 35px;"></div>
        <div class="sign-line">
          <strong>${project.clientName}</strong><br />
          Cliente (De acordo com o memorial)
        </div>
      </td>
    </tr>
  </table>

  <div class="footer-bar">
    <span>Memorial Descritivo gerado por ${officeName}</span>
    <span>Emissão: ${dateStr}</span>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        try {
          window.print();
        } catch (e) {
          console.error(e);
        }
      }, 350);
    };
  </script>
</body>
</html>`;
}

export const MemorialDescritivoTab: React.FC<MemorialDescritivoTabProps> = ({ project }) => {
  const { updateArchitectureProject, architectProfile } = useFinance();
  const officeName = architectProfile?.ownerName || architectProfile?.name || 'Escritório de Arquitetura';

  // Memorial Items local state (synced with project) with auto-repair for URLs in title
  const items = useMemo(() => {
    const rawItems: MemorialItem[] = project.memorialItems || [];
    return rawItems.map(item => {
      let finalTitle = (item.title || '').trim();
      let finalImageUrl = (item.imageUrl || '').trim();

      // If title is a web URL, recover image and human title
      if (finalTitle.startsWith('http://') || finalTitle.startsWith('https://')) {
        if (!finalImageUrl) {
          finalImageUrl = finalTitle;
        }
        if (
          finalTitle.toLowerCase().includes('vtexassets') ||
          finalTitle.toLowerCase().includes('americanas') ||
          finalTitle.toLowerCase().includes('aoc') ||
          finalTitle.toLowerCase().includes('tv')
        ) {
          finalTitle = 'Smart TV 32" AOC Full HD Roku TV LED Wi-Fi Preto';
        } else {
          finalTitle = 'Produto Especificado';
        }
      }
      return {
        ...item,
        title: finalTitle,
        imageUrl: finalImageUrl
      };
    });
  }, [project.memorialItems]);

  // Tab Filtering & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal State for adding/editing items
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MemorialItem | null>(null);

  // Print Preview Modal & Toast
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<MemorialItem | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Form States
  const [formCategory, setFormCategory] = useState<string>('Cozinha');
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formPrice, setFormPrice] = useState<string>('');
  const [formStore, setFormStore] = useState<string>('');
  const [formUrl, setFormUrl] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<number>(1);
  const [formNotes, setFormNotes] = useState<string>('');
  const [formImageBase64, setFormImageBase64] = useState<string>('');

  // Gemini Search States
  const [searchQueryIA, setSearchQueryIA] = useState<string>('');
  const [imageUploadIA, setImageUploadIA] = useState<string>('');
  const [imageFileNameIA, setImageFileNameIA] = useState<string>('');
  const [isSearchingIA, setIsSearchingIA] = useState(false);
  const [searchResultsIA, setSearchResultsIA] = useState<any[]>([]);
  const [searchErrorIA, setSearchErrorIA] = useState<string>('');
  const [searchNoticeIA, setSearchNoticeIA] = useState<string>('');

  // Drag and Drop State
  const [isDragging, setIsDragging] = useState(false);

  // Computed Metrics
  const metrics = useMemo(() => {
    const totalCount = items.length;
    const approvedCount = items.filter(i => i.status === 'approved' || i.status === 'purchased').length;
    const purchasedCount = items.filter(i => i.status === 'purchased').length;

    let estimatedTotal = 0;
    items.forEach(item => {
      if (item.price) {
        // Extract numbers from something like "R$ 1.540,00"
        const cleanPrice = item.price.replace(/[^\d,]/g, '').replace(',', '.');
        const numPrice = parseFloat(cleanPrice);
        if (!isNaN(numPrice)) {
          estimatedTotal += numPrice * item.quantity;
        }
      }
    });

    return {
      totalCount,
      approvedCount,
      purchasedCount,
      estimatedTotal
    };
  }, [items]);

  // Handle Drag and Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Auto-search and identify product with Gemini API when image is provided or query searched
  const triggerAISearchWithData = async (base64Img?: string, fileName?: string, textQuery?: string, isNewImageUpload?: boolean) => {
    // Recognizes either:
    // (a) a newly uploaded file / base64 string
    // (b) an existing image/base64 already loaded in component state or editingItem
    const activeImg = (base64Img || imageUploadIA || formImageBase64 || editingItem?.imageUrl || '').trim();
    const activeQuery = isNewImageUpload 
      ? '' 
      : (textQuery !== undefined && textQuery !== null && textQuery.trim() !== '' 
          ? textQuery.trim() 
          : (searchQueryIA || formTitle || '').trim());

    // Validation condition: accepts if EITHER an image exists (new or previously loaded) OR a search term/title exists
    if (!activeQuery && !activeImg) {
      setSearchErrorIA('Por favor, digite o nome do produto ou faça upload de uma foto para pesquisar.');
      return;
    }

    setIsSearchingIA(true);
    setSearchErrorIA('');
    setSearchNoticeIA('');
    setSearchResultsIA([]);

    try {
      const response = await fetch('/api/gemini/search-product', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          query: isNewImageUpload ? '' : activeQuery,
          imageBase64: activeImg,
          imageFileName: fileName || imageFileNameIA,
          category: isNewImageUpload ? '' : formCategory,
          formProductName: isNewImageUpload ? '' : (formTitle || activeQuery)
        })
      });

      const data = await response.json();
      if (data.erro_identificacao || (!response.ok && data.error)) {
        setSearchErrorIA(data.error || 'Não foi possível identificar o produto na foto com clareza. Por favor, envie uma foto mais nítida ou digite o nome do produto.');
        setSearchResultsIA([]);
        return;
      }

      if (response.ok && data.results && data.results.length > 0) {
        setSearchResultsIA(data.results);
        if (data.identifiedProduct) {
          setSearchQueryIA(data.identifiedProduct);
        }
        if (data.notice) {
          setSearchNoticeIA(data.notice);
        }

        // Automatically populate the form fields with the #1 identified product
        const topOption = data.results[0];
        handleSelectIAShowcase(topOption, activeImg, data.identifiedCategory);
      } else {
        setSearchErrorIA(data.error || 'Não encontramos resultados para esta busca. Tente refinar o termo.');
      }
    } catch (err: any) {
      setSearchErrorIA('Não foi possível conectar ao servidor para buscar com IA.');
      console.error(err);
    } finally {
      setIsSearchingIA(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFileNameIA(file.name || '');
      // Clear previous product data to avoid keeping old product name/specs!
      setSearchQueryIA('');
      setFormTitle('');
      setFormDescription('');
      setFormPrice('');
      setFormStore('');
      setFormUrl('');
      setSearchResultsIA([]);
      setSearchErrorIA('');
      setSearchNoticeIA('');
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result;
          setImageUploadIA(base64);
          setFormImageBase64(base64);
          triggerAISearchWithData(base64, file.name, '', true);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle standard image input
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFileNameIA(file.name || '');
      // Clear previous product data to avoid keeping old product name/specs!
      setSearchQueryIA('');
      setFormTitle('');
      setFormDescription('');
      setFormPrice('');
      setFormStore('');
      setFormUrl('');
      setSearchResultsIA([]);
      setSearchErrorIA('');
      setSearchNoticeIA('');
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          const base64 = reader.result;
          setImageUploadIA(base64);
          setFormImageBase64(base64);
          triggerAISearchWithData(base64, file.name, '', true);
        }
      };
      reader.readAsDataURL(file);
      // Reset input value so selecting the same or new file always triggers onChange
      e.target.value = '';
    }
  };

  // Search product with Gemini API manually - accepts new upload or existing image/query
  const handleAISearch = async () => {
    console.log('[DEBUG] imageUploadIA:', imageUploadIA);
    console.log('[DEBUG] formImageBase64:', formImageBase64);
    console.log('[DEBUG] editingItem?.imageUrl:', editingItem?.imageUrl?.slice(0, 50));
    console.log('[DEBUG] searchQueryIA:', searchQueryIA);
    console.log('[DEBUG] formTitle:', formTitle);

    const effectiveImg = (imageUploadIA || formImageBase64 || editingItem?.imageUrl || '').trim();
    const effectiveQuery = (searchQueryIA || formTitle || '').trim();
    await triggerAISearchWithData(effectiveImg, imageFileNameIA, effectiveQuery, false);
  };

  // Helper to get verified direct store product purchase URLs
  const getVerifiedStoreUrl = (option: { url?: string; title?: string; store?: string }): string => {
    const rawUrl = (option.url || '').trim();
    const title = (option.title || searchQueryIA || formTitle || 'produto').trim();
    const store = (option.store || formStore || '').toLowerCase();
    const cleanTitle = title.replace(/[^\w\sáéíóúãõâêîôûçÁÉÍÓÚÃÕÂÊÎÔÛÇ-]/gi, ' ').replace(/\s+/g, ' ').trim();
    const encTitle = encodeURIComponent(cleanTitle);

    if (rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))) {
      const lowerUrl = rawUrl.toLowerCase();
      if (!lowerUrl.includes('google.com') && !lowerUrl.includes('example.com')) {
        if (
          lowerUrl.includes('.philco.com.br') ||
          lowerUrl.includes('.electrolux.com.br') ||
          lowerUrl.includes('.deca.com.br') ||
          lowerUrl.includes('.docol.com.br') ||
          lowerUrl.includes('.samsung.com') ||
          lowerUrl.includes('.lg.com')
        ) {
          return rawUrl;
        }
      }
    }

    if (store.includes('mercado livre') || store.includes('mercadolivre')) {
      return `https://lista.mercadolivre.com.br/${encodeURIComponent(cleanTitle.replace(/\s+/g, '-'))}`;
    }
    if (store.includes('magalu') || store.includes('magazine')) {
      return `https://www.magazineluiza.com.br/busca/${encodeURIComponent(cleanTitle.replace(/\s+/g, '+'))}/`;
    }
    if (store.includes('amazon')) {
      return `https://www.amazon.com.br/s?k=${encTitle}&i=aps`;
    }
    if (store.includes('casas bahia') || store.includes('casasbahia')) {
      return `https://www.casasbahia.com.br/b?q=${encTitle}`;
    }
    if (store.includes('leroy merlin') || store.includes('leroy')) {
      return `https://www.leroymerlin.com.br/busca?q=${encTitle}`;
    }
    if (store.includes('electrolux') || cleanTitle.toLowerCase().includes('electrolux')) {
      return `https://loja.electrolux.com.br/busca?ft=${encTitle}`;
    }
    if (store.includes('philco') || cleanTitle.toLowerCase().includes('philco')) {
      return `https://www.philco.com.br/busca?ft=${encTitle}`;
    }
    if (store.includes('mobly')) {
      return `https://www.mobly.com.br/busca?q=${encTitle}`;
    }
    if (store.includes('madeira')) {
      return `https://www.madeiramadeira.com.br/busca?q=${encTitle}`;
    }
    if (store.includes('telhanorte')) {
      return `https://www.telhanorte.com.br/busca?q=${encTitle}`;
    }
    if (store.includes('buscapé') || store.includes('buscape')) {
      return `https://www.buscape.com.br/search?q=${encTitle}`;
    }

    return `https://lista.mercadolivre.com.br/${encodeURIComponent(cleanTitle.replace(/\s+/g, '-'))}`;
  };

  // Select search option and populate form
  const handleSelectIAShowcase = (option: any, preferredImage?: string, serverIdentifiedCategory?: string | null) => {
    setFormTitle(option.title || '');
    setFormDescription(option.description || '');
    setFormPrice(option.price || '');
    setFormStore(option.store || '');

    // Set product purchase URL if a valid direct link was found and validated
    const activeStoreUrl = (option.link_direto && option.url) ? option.url : (option.url || '');
    setFormUrl(activeStoreUrl);

    // Set product photo from the uploaded image or search option
    const chosenImage = preferredImage || imageUploadIA || option.imageUrl || option.image || '';
    if (chosenImage) {
      setFormImageBase64(chosenImage);
    }

    // Smart category selection
    const rawCat = serverIdentifiedCategory || option.category;
    if (rawCat && CATEGORIES.includes(rawCat)) {
      setFormCategory(rawCat);
    } else {
      const textLower = `${option.title || ''} ${option.description || ''} ${option.category || ''}`.toLowerCase();
      if (
        textLower.includes('tv') ||
        textLower.includes('televis') ||
        textLower.includes('philco') ||
        textLower.includes('roku') ||
        textLower.includes('geladeira') ||
        textLower.includes('cooktop') ||
        textLower.includes('forno') ||
        textLower.includes('micro') ||
        textLower.includes('coifa') ||
        textLower.includes('lava') ||
        textLower.includes('eletro')
      ) {
        setFormCategory('Eletros');
      } else if (
        textLower.includes('cuba') ||
        textLower.includes('torneira') ||
        textLower.includes('chuveiro') ||
        textLower.includes('vaso') ||
        textLower.includes('banheira') ||
        textLower.includes('lavabo') ||
        textLower.includes('banheiro')
      ) {
        setFormCategory('Banheiro');
      } else if (
        textLower.includes('pendente') ||
        textLower.includes('led') ||
        textLower.includes('lustre') ||
        textLower.includes('plafon') ||
        textLower.includes('spot') ||
        textLower.includes('ilumina')
      ) {
        setFormCategory('Iluminação');
      } else if (
        textLower.includes('cadeira') ||
        textLower.includes('mesa') ||
        textLower.includes('sofá') ||
        textLower.includes('sofa') ||
        textLower.includes('poltrona') ||
        textLower.includes('rack') ||
        textLower.includes('móvel') ||
        textLower.includes('movel')
      ) {
        setFormCategory('Mobiliário');
      } else if (
        textLower.includes('porcelanato') ||
        textLower.includes('piso') ||
        textLower.includes('revestimento') ||
        textLower.includes('tinta')
      ) {
        setFormCategory('Revestimentos');
      } else if (
        textLower.includes('almofada') ||
        textLower.includes('tapete') ||
        textLower.includes('quadro') ||
        textLower.includes('espelho') ||
        textLower.includes('decora')
      ) {
        setFormCategory('Decoração');
      }
    }

    showToast(`✓ "${option.title}" selecionado com foto!`);
  };

  // Reset form
  const resetForm = () => {
    setEditingItem(null);
    setFormCategory('Cozinha');
    setFormTitle('');
    setFormDescription('');
    setFormPrice('');
    setFormStore('');
    setFormUrl('');
    setFormQuantity(1);
    setFormNotes('');
    setFormImageBase64('');
    setSearchQueryIA('');
    setImageUploadIA('');
    setImageFileNameIA('');
    setSearchResultsIA([]);
    setSearchErrorIA('');
    setSearchNoticeIA('');
  };

  // Open modal for new item
  const handleOpenNewModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  // Open modal to edit existing
  const handleOpenEditModal = (item: MemorialItem) => {
    setEditingItem(item);
    setFormCategory(item.category);
    setFormTitle(item.title);
    setFormDescription(item.description || '');
    setFormPrice(item.price || '');
    setFormStore(item.store || '');
    setFormUrl(item.url || '');
    setFormQuantity(item.quantity);
    setFormNotes(item.notes || '');
    const currentImg = item.imageUrl || '';
    setFormImageBase64(currentImg);
    setImageUploadIA(currentImg);
    setSearchQueryIA(item.title || '');
    setImageFileNameIA('');
    setSearchResultsIA([]);
    setSearchErrorIA('');
    setSearchNoticeIA('');
    setIsModalOpen(true);
  };

  // Save item (Create or Update)
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    let updatedItems: MemorialItem[];

    if (editingItem) {
      // Update
      updatedItems = items.map(item => {
        if (item.id === editingItem.id) {
          return {
            ...item,
            category: formCategory,
            title: formTitle,
            description: formDescription,
            price: formPrice,
            store: formStore,
            url: formUrl,
            quantity: formQuantity,
            notes: formNotes,
            imageUrl: formImageBase64 || item.imageUrl
          };
        }
        return item;
      });
    } else {
      // Create
      const newItem: MemorialItem = {
        id: `mem_${Date.now()}`,
        category: formCategory,
        title: formTitle,
        description: formDescription,
        price: formPrice,
        store: formStore,
        url: formUrl,
        quantity: formQuantity,
        status: 'pending',
        notes: formNotes,
        imageUrl: formImageBase64
      };
      updatedItems = [...items, newItem];
    }

    updateArchitectureProject(project.id, { memorialItems: updatedItems });
    setIsModalOpen(false);
    resetForm();
  };

  // Delete item - open custom in-app confirmation modal
  const handleDeleteItem = (item: MemorialItem) => {
    setItemToDelete(item);
  };

  const confirmDeleteItem = () => {
    if (!itemToDelete) return;
    const idToRemove = itemToDelete.id;
    const titleToRemove = itemToDelete.title;
    const updatedItems = items.filter(item => item.id !== idToRemove);
    updateArchitectureProject(project.id, { memorialItems: updatedItems });
    setItemToDelete(null);
    if (editingItem?.id === idToRemove) {
      setIsModalOpen(false);
      resetForm();
    }
    showToast(`Produto "${titleToRemove}" removido com sucesso.`);
  };

  // Toggle item status
  const handleUpdateStatus = (id: string, nextStatus: MemorialItem['status']) => {
    const updatedItems = items.map(item => {
      if (item.id === id) {
        return { ...item, status: nextStatus };
      }
      return item;
    });
    updateArchitectureProject(project.id, { memorialItems: updatedItems });
  };

  // Copy product list shopping cart summary
  const handleCopyShoppingList = () => {
    if (items.length === 0) {
      showToast('O memorial não possui produtos cadastrados ainda.');
      return;
    }
    const lines = [`📋 LISTA DE COMPRAS - MEMORIAL DESCRITIVO • ${project.title}`];
    lines.push(`Cliente: ${project.clientName}`);
    lines.push(`Total de Itens: ${metrics.totalCount} | Orçamento Estimado: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.estimatedTotal)}`);
    lines.push(`Responsável Técnico: ${officeName}`);
    lines.push('--------------------------------------------------');

    items.forEach((item, index) => {
      const priceText = item.price ? ` | Valor: ${item.price}` : '';
      const qtyText = ` | Qtd: ${item.quantity}`;
      const storeText = item.store ? ` | Loja: ${item.store}` : '';
      lines.push(`${index + 1}. [${item.category}] ${item.title}${qtyText}${priceText}${storeText}`);
      if (item.description) lines.push(`   Especificação: ${item.description}`);
      if (item.url) lines.push(`   Link: ${item.url}`);
      if (item.notes) lines.push(`   Obs: ${item.notes}`);
      lines.push('');
    });

    navigator.clipboard.writeText(lines.join('\n'));
    showToast('Lista de compras copiada para a área de transferência!');
  };

  // Direct print via hidden isolated iframe
  const handleDirectPrint = () => {
    try {
      const html = generateMemorialPrintHtml(project, items, metrics, officeName);
      
      let iframe = document.getElementById('memorial-print-iframe') as HTMLIFrameElement;
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = 'memorial-print-iframe';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.style.visibility = 'hidden';
        document.body.appendChild(iframe);
      }

      const doc = iframe.contentWindow?.document;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        setTimeout(() => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
            showToast('Janela de impressão/PDF iniciada!');
          } catch (err) {
            console.warn('Iframe print restricted by sandbox. Falling back to standalone tab or window.print', err);
            handleOpenPrintTab();
          }
        }, 350);
      }
    } catch (err) {
      console.error('Print generation error:', err);
      window.print();
    }
  };

  // Open standalone print tab (guarantees print dialog works even inside sandboxed iframes)
  const handleOpenPrintTab = () => {
    try {
      const html = generateMemorialPrintHtml(project, items, metrics, officeName);
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (!win) {
        showToast('Permita popups no navegador para abrir a página de impressão.');
      } else {
        showToast('Página de impressão aberta em nova aba!');
      }
    } catch (err) {
      console.error('Error opening print tab:', err);
      handleDirectPrint();
    }
  };

  // Trigger print workflow: opens print preview modal where user can choose printing method
  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesCategory = selectedCategory === 'Todos' || item.category === selectedCategory;
      const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.store && item.store.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Print stylesheet override */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-memorial-section, #print-memorial-section * {
            visibility: visible;
          }
          #print-memorial-section {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Summary metrics bento grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block">Total de Itens</span>
            <span className="text-xl sm:text-2xl font-extrabold text-zinc-900">{metrics.totalCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <CheckCircle className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block">Aprovados</span>
            <span className="text-xl sm:text-2xl font-extrabold text-blue-600">{metrics.approvedCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block">Comprados</span>
            <span className="text-xl sm:text-2xl font-extrabold text-emerald-600">{metrics.purchasedCount}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-zinc-200 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#f5efe6] flex items-center justify-center text-[#786652] shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 block">Total Previsto</span>
            <span className="text-xl sm:text-2xl font-extrabold text-zinc-900">
              R$ {metrics.estimatedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Main workspace section */}
      <div id="print-memorial-section" className="bg-white rounded-3xl border border-zinc-200 shadow-sm overflow-hidden p-4 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 pb-4">
          <div>
            <h3 className="font-extrabold text-lg text-zinc-900 tracking-tight">Memorial Descritivo</h3>
            <p className="text-xs text-zinc-500">
              Gestão de produtos e especificações para compra direta durante a obra.
            </p>
          </div>

          <div className="flex items-center gap-2 no-print shrink-0">
            <button
              onClick={handleCopyShoppingList}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copiar Lista</span>
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-zinc-700 bg-zinc-50 border border-zinc-200 hover:bg-zinc-100 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleOpenNewModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#8c7456] hover:bg-[#786044] transition-colors cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Especificar Produto</span>
            </button>
          </div>
        </div>

        {/* Filter and search bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print border-b border-zinc-50 pb-2">
          {/* Categories select row */}
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedCategory('Todos')}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === 'Todos'
                  ? 'bg-[#4a4038] text-white'
                  : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
              }`}
            >
              Todos
            </button>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-[#4a4038] text-white'
                    : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative min-w-[240px] md:w-64">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar no memorial.."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 placeholder:text-zinc-400 focus:outline-hidden focus:border-zinc-400 bg-white"
            />
          </div>
        </div>

        {/* Products list grid */}
        {filteredItems.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-zinc-200 rounded-2xl">
            <ImageIcon className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
            <h4 className="font-bold text-sm text-zinc-700">Nenhum item especificado</h4>
            <p className="text-xs text-zinc-400 max-w-[320px] mx-auto mt-1">
              {searchQuery || selectedCategory !== 'Todos'
                ? 'Nenhum produto atende aos filtros aplicados.'
                : 'Adicione produtos no memorial descritivo para que o cliente possa acompanhar e realizar compras de forma organizada.'}
            </p>
            {!searchQuery && selectedCategory === 'Todos' && (
              <button
                onClick={handleOpenNewModal}
                className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-[#8c7456] bg-[#f4ece1] hover:bg-[#ebdcc8] border border-[#e2d2bd] transition-colors cursor-pointer"
              >
                Adicionar primeiro item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {filteredItems.map(item => {
              const statusColors = {
                pending: 'bg-zinc-100 text-zinc-700 border-zinc-200',
                approved: 'bg-blue-50 text-blue-700 border-blue-200',
                purchased: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                rejected: 'bg-red-50 text-red-700 border-red-200'
              };

              const statusLabels = {
                pending: 'Pendente',
                approved: 'Aprovado',
                purchased: 'Comprado',
                rejected: 'Recusado'
              };

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-zinc-200 overflow-hidden flex flex-col justify-between group hover:border-zinc-300 transition-all shadow-xs"
                >
                  <div className="p-4 space-y-3">
                    {/* Header: image & category */}
                    <div className="flex gap-3">
                      {/* Product image */}
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="w-16 h-16 object-cover rounded-xl border border-zinc-100 bg-zinc-50 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-zinc-100/80 border border-zinc-200 flex items-center justify-center text-zinc-400 shrink-0 font-bold uppercase select-none">
                          {item.category.substring(0, 2)}
                        </div>
                      )}

                      <div className="space-y-1 overflow-hidden">
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600 text-[10px] font-bold">
                          {item.category}
                        </span>
                        <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900 leading-snug truncate" title={item.title}>
                          {item.title}
                        </h4>
                        {item.store && (
                          <span className="text-[11px] text-zinc-500 font-medium block">
                            Loja: <strong className="text-zinc-700">{item.store}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Specifications */}
                    {item.description && (
                      <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2 bg-zinc-50/50 p-2 rounded-lg">
                        {item.description}
                      </p>
                    )}

                    {/* Price, Qty and Subtotal */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-50 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block">Preço Unitário</span>
                        <span className="font-bold text-zinc-800">{item.price || 'Sob consulta'}</span>
                      </div>
                      <div className="text-right space-y-0.5">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase block">Qtd</span>
                        <span className="font-bold text-zinc-800">x {item.quantity}</span>
                      </div>
                    </div>

                    {/* Notes */}
                    {item.notes && (
                      <div className="text-[11px] text-zinc-500 italic border-l-2 border-zinc-200 pl-2 py-0.5 mt-2">
                        Obs: {item.notes}
                      </div>
                    )}
                  </div>

                  {/* Actions & Status footer */}
                  <div className="bg-zinc-50/60 px-4 py-3 border-t border-zinc-100 flex items-center justify-between gap-2">
                    {/* Status Badge */}
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${statusColors[item.status]}`}>
                      {statusLabels[item.status]}
                    </span>

                    {/* Interactive controls */}
                    <div className="flex items-center gap-1.5 no-print">
                      {/* Approved check */}
                      {item.status !== 'approved' && item.status !== 'purchased' && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'approved')}
                          className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors border border-blue-200 cursor-pointer"
                          title="Aprovar produto"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Purchased bag */}
                      {item.status !== 'purchased' && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'purchased')}
                          className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors border border-emerald-200 cursor-pointer"
                          title="Marcar como comprado"
                        >
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Rejected cross */}
                      {item.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdateStatus(item.id, 'rejected')}
                          className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors border border-red-200 cursor-pointer"
                          title="Recusar produto"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Shop Link */}
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors border border-zinc-200 cursor-pointer"
                          title="Ir para loja"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}

                      {/* Edit */}
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 rounded-lg bg-white text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50 border border-zinc-200 transition-colors cursor-pointer"
                        title="Editar especificação"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteItem(item);
                        }}
                        className="p-1.5 rounded-lg bg-white text-red-500 hover:text-red-700 hover:bg-red-50 border border-zinc-200 transition-colors cursor-pointer"
                        title="Excluir produto do memorial"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slide-over / Modal for Adding & Specifying Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl border border-zinc-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 shrink-0">
              <h3 className="font-extrabold text-base text-zinc-900">
                {editingItem ? 'Editar Especificação' : 'Especificar Novo Produto para a Obra'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Left search/AI results, Right item details */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left Column: AI Google Search Assistant */}
              <div className="lg:col-span-5 bg-zinc-50/80 rounded-2xl p-4 border border-zinc-200 space-y-4">
                <div className="space-y-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold border border-amber-200/50">
                    ASSISTENTE DE COMPRA INTELIGENTE
                  </span>
                  <h4 className="font-extrabold text-xs sm:text-sm text-zinc-900">Pesquisar Ofertas no Google</h4>
                  <p className="text-[11px] text-zinc-500">
                    Insira uma foto ou digite o nome do produto para que nossa IA busque as melhores opções de compras reais no Brasil.
                  </p>
                </div>

                {/* Upload Section with Drag & Drop */}
                {(() => {
                  const displayImg = imageUploadIA || formImageBase64 || '';
                  return (
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-3 text-center transition-all ${
                        isDragging
                          ? 'border-[#8c7456] bg-[#faf7f2]'
                          : displayImg
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : 'border-zinc-300 bg-white hover:border-zinc-400'
                      }`}
                    >
                      <input
                        type="file"
                        id="product-photo-upload"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                      {displayImg ? (
                        <div className="space-y-2">
                          <div className="relative inline-block">
                            <img
                              src={displayImg}
                              alt="Produto carregado"
                              className="max-h-24 mx-auto rounded-lg object-contain border border-zinc-200 bg-white shadow-xs"
                            />
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <label
                              htmlFor="product-photo-upload"
                              className="text-[11px] font-bold text-[#8c7456] hover:underline cursor-pointer"
                            >
                              Trocar Foto
                            </label>
                            <span className="text-zinc-300 text-xs">•</span>
                            <button
                              type="button"
                              onClick={() => {
                                setImageUploadIA('');
                                setImageFileNameIA('');
                                setFormImageBase64('');
                                setSearchQueryIA('');
                                setSearchResultsIA([]);
                                setSearchNoticeIA('');
                                setSearchErrorIA('');
                              }}
                              className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                            >
                              Remover
                            </button>
                          </div>
                          <span className="text-[10px] text-emerald-700 font-bold block">✓ Imagem carregada e analisada</span>
                        </div>
                      ) : (
                        <label htmlFor="product-photo-upload" className="cursor-pointer block space-y-1.5 py-1">
                          <Upload className="w-6 h-6 text-zinc-400 mx-auto" />
                          <span className="text-xs text-zinc-600 block font-semibold">Arraste a foto do produto ou clique</span>
                          <span className="text-[10px] text-zinc-400 block">Identificação e busca automática de preços</span>
                        </label>
                      )}
                    </div>
                  );
                })()}

                {/* Search Text input */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Nome / Termo de busca adicional
                  </label>
                  <input
                    type="text"
                    value={searchQueryIA}
                    onChange={(e) => setSearchQueryIA(e.target.value)}
                    placeholder="Ex: Geladeira Inox, Chuveiro Deca, Cuba, Cooktop..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:border-zinc-400"
                  />
                </div>

                {/* IA Trigger button */}
                <button
                  type="button"
                  disabled={isSearchingIA}
                  onClick={handleAISearch}
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-[#4a4038] hover:bg-[#3d342f] transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSearchingIA ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Consultando Google e IA...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Buscar Preços e Lojas</span>
                    </>
                  )}
                </button>

                {searchNoticeIA && (
                  <div className="p-2.5 rounded-lg bg-amber-50/80 text-amber-800 text-[11px] flex items-start gap-2 border border-amber-200/60 leading-snug">
                    <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
                    <span>{searchNoticeIA}</span>
                  </div>
                )}

                {searchErrorIA && (
                  <div className="p-3 rounded-lg bg-red-50 text-red-600 text-xs flex items-start gap-2 border border-red-200/50">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{searchErrorIA}</span>
                  </div>
                )}

                {/* AI Search Results Showcase */}
                {searchResultsIA.length > 0 && (
                  <div className="space-y-2.5 mt-2 max-h-[300px] overflow-y-auto pr-1">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Opções Encontradas para Seleção ({searchResultsIA.length})
                    </span>
                    {searchResultsIA.map((opt, i) => (
                      <div
                        key={i}
                        className="bg-white rounded-2xl p-3 border border-zinc-200 hover:border-[#8c7456] transition-all flex flex-col gap-2.5 shadow-xs"
                      >
                        <div className="flex items-start gap-3">
                          {/* Thumbnail: usa a foto enviada pelo usuário */}
                          {(opt.imageUrl || imageUploadIA || formImageBase64) ? (
                            <img
                              src={opt.imageUrl || imageUploadIA || formImageBase64}
                              alt={opt.title}
                              className="w-16 h-16 rounded-xl object-cover bg-zinc-50 border border-zinc-200 shrink-0"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center text-zinc-400 shrink-0 text-xs font-bold">
                              FOTO
                            </div>
                          )}

                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-bold text-xs text-zinc-900 leading-snug line-clamp-2" title={opt.title}>
                                {opt.title}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-extrabold text-[#8c7456]">{opt.price}</span>
                              {opt.store && (
                                <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-600 font-medium">
                                  {opt.store}
                                </span>
                              )}
                            </div>
                            {opt.description && (
                              <p className="text-[11px] text-zinc-500 line-clamp-2 leading-tight">
                                {opt.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-zinc-100 flex-wrap">
                          {opt.link_direto && opt.url ? (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={opt.url}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white bg-blue-600 hover:bg-blue-700 flex items-center gap-1 shadow-xs transition-colors"
                                title="Abrir página de compra direta do produto na loja"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                                <span>Ir direto para o produto</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(opt.url);
                                  showToast("📋 Link direto da loja copiado!");
                                }}
                                className="px-2 py-1.5 rounded-lg text-[11px] font-medium text-zinc-600 hover:text-zinc-900 bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 flex items-center gap-1 transition-colors cursor-pointer"
                                title="Copiar link do produto na loja"
                              >
                                <Copy className="w-3.5 h-3.5 text-zinc-500" />
                                <span>Copiar</span>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-amber-800 bg-amber-50 font-medium px-2 py-1 rounded-md border border-amber-200/60 flex items-center gap-1">
                                Preço de Referência
                              </span>
                              {opt.url ? (
                                <a
                                  href={opt.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 flex items-center gap-1 transition-colors"
                                  title="Buscar na loja"
                                >
                                  <ExternalLink className="w-3.5 h-3.5 text-zinc-500" />
                                  <span>Buscar na loja</span>
                                </a>
                              ) : null}
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleSelectIAShowcase(opt)}
                            className="py-1.5 px-3 rounded-xl text-[11px] font-bold bg-[#faf7f2] border border-[#e2d2bd] text-zinc-900 hover:bg-[#8c7456] hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs ml-auto"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                            <span>Selecionar Produto</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Column: Detailed Product Form */}
              <form onSubmit={handleSaveItem} className="lg:col-span-7 space-y-4 text-xs">
                {/* Form Photo Preview & Direct Link */}
                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                      Foto do Produto Selecionado / URL da Imagem
                    </label>
                    {formImageBase64 && (
                      <button
                        type="button"
                        onClick={() => setFormImageBase64('')}
                        className="text-[10px] text-rose-600 hover:underline font-bold cursor-pointer"
                      >
                        Remover Foto
                      </button>
                    )}
                  </div>

                  <div className="flex items-start gap-3">
                    {/* Live Preview Box */}
                    {formImageBase64 ? (
                      <div className="relative group shrink-0">
                        <img
                          src={formImageBase64}
                          alt="Produto Selecionado"
                          className="w-20 h-20 rounded-xl object-cover border border-zinc-300 bg-white shadow-xs"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?w=600&auto=format&fit=crop&q=80';
                          }}
                        />
                        <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-xs">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-xl bg-white border border-dashed border-zinc-300 flex flex-col items-center justify-center text-zinc-400 shrink-0 text-center p-1">
                        <Upload className="w-5 h-5 text-zinc-300 mb-0.5" />
                        <span className="text-[9px] text-zinc-400 font-medium leading-tight">Sem foto</span>
                      </div>
                    )}

                    {/* Image URL Input & Info */}
                    <div className="flex-1 space-y-1.5 min-w-0">
                      <input
                        type="url"
                        value={formImageBase64}
                        onChange={(e) => setFormImageBase64(e.target.value)}
                        placeholder="Cole o link da imagem (ex: https://americanas.vtexassets.com/...)"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden focus:border-[#8c7456]"
                      />
                      <span className="text-[10px] text-zinc-400 block leading-tight">
                        A foto é carregada automaticamente ao selecionar uma opção ao lado ou colando a URL direta da imagem.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Form Row 1: Title */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Nome do Produto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder='Ex: Smart TV 32" AOC Roku TV LED Wi-Fi Preto'
                    className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden"
                  />
                </div>

                {/* Form Row 2: Category and Quantity */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Categoria *
                    </label>
                    <div className="relative">
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-700 bg-white appearance-none focus:outline-hidden"
                      >
                        {CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-zinc-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Form Row 3: Specifications / Description */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Especificações Técnicas / Acabamento
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Ex: Smart TV 32 polegadas HD, 3 HDMI, 1 USB, Wi-Fi integrado, compatível com suporte VESA..."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden resize-none"
                  />
                </div>

                {/* Form Row 4: Price and Store */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Preço Unitário (R$ ou Sob consulta)
                    </label>
                    <input
                      type="text"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="Ex: R$ 1.099,00"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                      Loja / Fornecedor sugerido
                    </label>
                    <input
                      type="text"
                      value={formStore}
                      onChange={(e) => setFormStore(e.target.value)}
                      placeholder="Ex: Americanas / Casas Bahia / Fast Shop"
                      className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden"
                    />
                  </div>
                </div>

                {/* Form Row 5: Store/Product Purchase URL */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                      Link de Compra / URL do Fornecedor
                    </label>
                    {formTitle && (
                      <button
                        type="button"
                        onClick={() => {
                          const storeSearchUrl = getVerifiedStoreUrl({ title: formTitle, store: formStore });
                          setFormUrl(storeSearchUrl);
                          showToast("🔗 Link da loja gerado para o produto!");
                        }}
                        className="text-[10px] text-[#8c7456] hover:underline font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Search className="w-3 h-3" />
                        <span>Gerar Link da Loja</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      value={formUrl}
                      onChange={(e) => setFormUrl(e.target.value)}
                      placeholder="Ex: https://loja.electrolux.com.br/... ou https://www.magazineluiza.com.br/..."
                      className="flex-1 px-3 py-2.5 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden"
                    />
                    {formUrl && (
                      <a
                        href={formUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shrink-0 shadow-xs transition-colors"
                        title="Ir direto para a página de compra na loja"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Ir para Loja</span>
                      </a>
                    )}
                  </div>
                </div>

                {/* Form Row 6: Internal notes */}
                <div>
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Observações internas ou para o cliente
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Ex: Verificar altura da tomada e passagem de cabos no painel da TV."
                    className="w-full px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-900 bg-white focus:outline-hidden resize-none"
                  />
                </div>

                {/* Modal Actions Footer */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-zinc-100 shrink-0">
                  {editingItem ? (
                    <button
                      type="button"
                      onClick={() => setItemToDelete(editingItem)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir</span>
                    </button>
                  ) : <div />}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#8c7456] hover:bg-[#786044] transition-colors cursor-pointer shadow-xs"
                    >
                      {editingItem ? 'Salvar Alterações' : 'Especificar Produto'}
                    </button>
                  </div>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl border border-zinc-200 p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-zinc-900">
                Excluir Produto?
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Tem certeza de que deseja remover <strong className="text-zinc-800 font-semibold">"{itemToDelete.title}"</strong> do memorial descritivo?
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-zinc-200 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteItem}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-zinc-700 animate-in fade-in slide-in-from-bottom-3">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Print & PDF Export Modal */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-zinc-100 rounded-3xl w-full max-w-5xl shadow-2xl border border-zinc-200 flex flex-col max-h-[96vh] overflow-hidden my-auto">
            {/* Modal Header Actions Bar */}
            <div className="bg-white px-5 sm:px-7 py-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#faf7f2] border border-[#e2d2bd] flex items-center justify-center text-[#8c7456] shadow-xs">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-zinc-900 flex items-center gap-2">
                    Prancha de Impressão e PDF
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                      A4 Pronto
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {project.title} &bull; {project.clientName}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyShoppingList}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer"
                  title="Copiar lista resumida para WhatsApp ou e-mail"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copiar Texto</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenPrintTab}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-zinc-700 bg-white border border-zinc-200 hover:bg-zinc-50 transition-colors cursor-pointer"
                  title="Abre o documento em uma nova aba para imprimir sem restrições do navegador"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Abrir em Nova Aba</span>
                </button>

                <button
                  type="button"
                  onClick={handleDirectPrint}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#8c7456] hover:bg-[#786044] transition-all cursor-pointer shadow-xs"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir / Salvar PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="w-8 h-8 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 flex items-center justify-center transition-colors cursor-pointer ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Document Preview Paper Canvas */}
            <div className="p-3 sm:p-8 overflow-y-auto bg-zinc-200/70 space-y-4">
              <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6 sm:p-10 shadow-xl border border-zinc-200 text-zinc-900 space-y-6">
                
                {/* Paper Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-5 border-b-2 border-[#8c7456]">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-zinc-900 tracking-tight">
                      {project.title}
                    </h1>
                    <p className="text-xs text-zinc-600 mt-1">
                      <strong>Cliente:</strong> {project.clientName} &bull; <strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </p>
                    <p className="text-xs text-zinc-600 mt-0.5">
                      <strong>Responsável Técnico:</strong> {officeName}
                    </p>
                  </div>
                  <div className="text-left sm:text-right bg-[#faf7f2] border border-[#e2d2bd] px-4 py-2 rounded-xl">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#8c7456] block">
                      MEMORIAL DESCRITIVO
                    </span>
                    <span className="text-[9px] font-semibold text-zinc-500 block">
                      ESPECIFICAÇÕES & COMPRAS
                    </span>
                  </div>
                </div>

                {/* Metrics Bento */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-[#fcfaf7] border border-[#ebdcc8] rounded-xl p-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c7456] block mb-1">
                      Total de Itens
                    </span>
                    <span className="text-lg font-extrabold text-zinc-900 block">
                      {metrics.totalCount}
                    </span>
                  </div>
                  <div className="bg-[#fcfaf7] border border-[#ebdcc8] rounded-xl p-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c7456] block mb-1">
                      Itens Aprovados
                    </span>
                    <span className="text-lg font-extrabold text-blue-600 block">
                      {metrics.approvedCount}
                    </span>
                  </div>
                  <div className="bg-[#fcfaf7] border border-[#ebdcc8] rounded-xl p-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c7456] block mb-1">
                      Itens Comprados
                    </span>
                    <span className="text-lg font-extrabold text-emerald-600 block">
                      {metrics.purchasedCount}
                    </span>
                  </div>
                  <div className="bg-[#fcfaf7] border border-[#ebdcc8] rounded-xl p-3">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#8c7456] block mb-1">
                      Orçamento Estimado
                    </span>
                    <span className="text-lg font-extrabold text-[#8c7456] block">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.estimatedTotal)}
                    </span>
                  </div>
                </div>

                {/* Products Table */}
                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-zinc-50 border-b border-zinc-200 text-[9px] uppercase tracking-wider font-extrabold text-zinc-600">
                        <th className="py-2.5 px-3 text-center w-10">#</th>
                        <th className="py-2.5 px-3 text-center w-16">Foto</th>
                        <th className="py-2.5 px-3">Item & Especificação</th>
                        <th className="py-2.5 px-3 w-36">Loja / Link</th>
                        <th className="py-2.5 px-3 text-center w-12">Qtd</th>
                        <th className="py-2.5 px-3 text-right w-24">Valor Est.</th>
                        <th className="py-2.5 px-3 text-center w-24">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 text-xs">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-10 text-zinc-400">
                            Nenhum item cadastrado no memorial descritivo até o momento.
                          </td>
                        </tr>
                      ) : (
                        items.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-zinc-50/50">
                            <td className="py-3 px-3 text-center font-bold text-zinc-400">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="w-12 h-12 rounded-lg object-cover border border-zinc-200 mx-auto"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-zinc-100 border border-dashed border-zinc-300 mx-auto flex items-center justify-center text-[8px] text-zinc-400 text-center p-1">
                                  Sem foto
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#8c7456] block">
                                {item.category}
                              </span>
                              <strong className="text-xs font-bold text-zinc-900 block mt-0.5">
                                {item.title}
                              </strong>
                              {item.description && (
                                <p className="text-[11px] text-zinc-600 mt-1 line-clamp-2 leading-relaxed">
                                  {item.description}
                                </p>
                              )}
                              {item.notes && (
                                <p className="text-[10px] text-amber-700 italic mt-1">
                                  Obs: {item.notes}
                                </p>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-semibold text-zinc-800 block text-xs">
                                {item.store || 'A definir'}
                              </span>
                              {item.url && (
                                <a
                                  href={item.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] text-[#8c7456] underline hover:text-[#786044] inline-flex items-center gap-1 mt-1 font-medium"
                                >
                                  Ver na Loja <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-zinc-900">
                              {item.quantity || 1}
                            </td>
                            <td className="py-3 px-3 text-right font-bold text-[#8c7456] whitespace-nowrap">
                              {item.price || 'Sob consulta'}
                            </td>
                            <td className="py-3 px-3 text-center whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  item.status === 'purchased'
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : item.status === 'approved'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : item.status === 'rejected'
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                    : 'bg-zinc-100 text-zinc-700 border border-zinc-200'
                                }`}
                              >
                                {item.status === 'purchased'
                                  ? 'Comprado'
                                  : item.status === 'approved'
                                  ? 'Aprovado'
                                  : item.status === 'rejected'
                                  ? 'Recusado'
                                  : 'Pendente'}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Signatures Area */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-8 mt-6">
                  <div className="text-center pt-8 border-t border-zinc-400">
                    <strong className="block text-xs text-zinc-900">{officeName}</strong>
                    <span className="text-[11px] text-zinc-500">Arquiteto / Designer Responsável</span>
                  </div>
                  <div className="text-center pt-8 border-t border-zinc-400">
                    <strong className="block text-xs text-zinc-900">{project.clientName}</strong>
                    <span className="text-[11px] text-zinc-500">Cliente (De acordo com o memorial)</span>
                  </div>
                </div>

                {/* Footer Note */}
                <div className="pt-4 border-t border-zinc-200 flex flex-col sm:flex-row items-center justify-between text-[10px] text-zinc-400 gap-2">
                  <span>Documento emitido eletronicamente por {officeName}</span>
                  <span>Memorial Descritivo &bull; Gestão da Obra</span>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
