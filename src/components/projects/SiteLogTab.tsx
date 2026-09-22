import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Camera,
  CheckCircle2,
  Cloud,
  CloudRain,
  Eye,
  FileText,
  Filter,
  Image as ImageIcon,
  Plus,
  Printer,
  Search,
  Share2,
  Sun,
  Trash2,
  Users,
  X,
  AlertTriangle,
  Edit2,
  Clock,
  Sparkles,
  Check,
} from 'lucide-react';
import { ArchitectureProject, SiteLogReport } from '../../types';
import { useFinance } from '../../context/FinanceContext';

interface SiteLogTabProps {
  project: ArchitectureProject;
}

export const SiteLogTab: React.FC<SiteLogTabProps> = ({ project }) => {
  const { siteLogReports = [], addSiteLogReport, updateSiteLogReport, deleteSiteLogReport } = useFinance();

  // Filter reports for current project
  const projectReports = useMemo(() => {
    return (siteLogReports || [])
      .filter((r) => r.projectId === project.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [siteLogReports, project.id]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [weatherFilter, setWeatherFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<SiteLogReport | null>(null);

  // Form Fields
  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<SiteLogReport['shift']>('manha');
  const [weather, setWeather] = useState<SiteLogReport['weather']>('claro');
  const [condition, setCondition] = useState<SiteLogReport['condition']>('praticavel');
  const [workforceCount, setWorkforceCount] = useState<string>('');
  const [activities, setActivities] = useState('');
  const [observations, setObservations] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  // Preview Image Overlay State
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered List
  const filteredReports = useMemo(() => {
    return projectReports.filter((r) => {
      // Date Range Filter
      if (startDate && r.date < startDate) return false;
      if (endDate && r.date > endDate) return false;

      // Weather & Condition Filter
      if (weatherFilter !== 'all' && r.weather !== weatherFilter) return false;
      if (conditionFilter !== 'all' && r.condition !== conditionFilter) return false;

      // Search Query
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const codeMatch = r.code.toLowerCase().includes(query);
        const obsMatch = (r.observations || '').toLowerCase().includes(query);
        const actMatch = (r.activities || '').toLowerCase().includes(query);
        return codeMatch || obsMatch || actMatch;
      }

      return true;
    });
  }, [projectReports, startDate, endDate, weatherFilter, conditionFilter, searchTerm]);

  // Open modal for NEW report
  const handleOpenNewModal = () => {
    setEditingReport(null);
    setReportDate(new Date().toISOString().split('T')[0]);
    setShift('manha');
    setWeather('claro');
    setCondition('praticavel');
    setWorkforceCount('');
    setActivities('');
    setObservations('');
    setPhotos([]);
    setIsModalOpen(true);
  };

  // Open modal for EDITING report
  const handleOpenEditModal = (report: SiteLogReport) => {
    setEditingReport(report);
    setReportDate(report.date);
    setShift(report.shift);
    setWeather(report.weather);
    setCondition(report.condition);
    setWorkforceCount(report.workforceCount ? String(report.workforceCount) : '');
    setActivities(report.activities || '');
    setObservations(report.observations || '');
    setPhotos(report.photos || []);
    setIsModalOpen(true);
  };

  // Handle Image File Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            setPhotos((prev) => [...prev, reader.result as string]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  // Save Report
  const handleSaveReport = (e: React.FormEvent) => {
    e.preventDefault();

    const reportCode = editingReport
      ? editingReport.code
      : `Relatório de obra - ${String(projectReports.length + 1).padStart(3, '0')}`;

    if (editingReport) {
      updateSiteLogReport(editingReport.id, {
        date: reportDate,
        shift,
        weather,
        condition,
        workforceCount: workforceCount ? Number(workforceCount) : undefined,
        activities,
        observations,
        photos,
      });
      showToast('Relatório atualizado com sucesso!');
    } else {
      addSiteLogReport({
        projectId: project.id,
        code: reportCode,
        date: reportDate,
        shift,
        weather,
        condition,
        workforceCount: workforceCount ? Number(workforceCount) : undefined,
        activities,
        observations,
        photos,
      });
      showToast('Relatório de obra criado com sucesso!');
    }

    setIsModalOpen(false);
  };

  // Share WhatsApp / Copy Summary
  const handleShareReport = (report: SiteLogReport) => {
    const formattedDate = new Date(report.date + 'T00:00:00').toLocaleDateString('pt-BR');
    const text = `*${report.code} - ${project.title}*\n📅 Data: ${formattedDate}\n🌤️ Turno/Clima: ${getShiftLabel(report.shift)} - ${getWeatherLabel(report.weather)}\n🏗️ Condição da Obra: ${getConditionLabel(report.condition)}\n${report.activities ? `\n📝 *Atividades:*\n${report.activities}\n` : ''}${report.observations ? `\n⚠️ *Observações:*\n${report.observations}\n` : ''}\nCompartilhado via Meu Escritório Online`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      showToast('Resumo copiado para a área de transferência!');
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  // Print Report
  const handlePrintReport = (report: SiteLogReport) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const formattedDate = new Date(report.date + 'T00:00:00').toLocaleDateString('pt-BR');

    printWindow.document.write(`
      <html>
        <head>
          <title>${report.code} - ${project.title}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 30px; color: #18181b; }
            h1 { font-size: 22px; margin-bottom: 5px; color: #09090b; }
            .subtitle { font-size: 14px; color: #71717a; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px; background: #f4f4f5; padding: 15px; border-radius: 8px; }
            .label { font-size: 11px; text-transform: uppercase; color: #71717a; font-weight: bold; }
            .value { font-size: 14px; font-weight: 600; margin-top: 2px; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #27272a; border-bottom: 2px solid #e4e4e7; padding-bottom: 4px; }
            .text-box { background: #fafafa; border: 1px solid #e4e4e7; padding: 12px; border-radius: 8px; font-size: 13px; line-height: 1.5; white-space: pre-wrap; }
            .gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px; }
            .gallery img { width: 100%; height: 160px; object-fit: cover; border-radius: 6px; border: 1px solid #e4e4e7; }
          </style>
        </head>
        <body>
          <h1>${project.title} — ${report.code}</h1>
          <div class="subtitle">Cliente: ${project.clientName || 'N/A'} | Data do Relatório: ${formattedDate}</div>
          
          <div class="grid">
            <div>
              <div class="label">Turno</div>
              <div class="value">${getShiftLabel(report.shift)}</div>
            </div>
            <div>
              <div class="label">Clima</div>
              <div class="value">${getWeatherLabel(report.weather)}</div>
            </div>
            <div>
              <div class="label">Condição da Obra</div>
              <div class="value">${getConditionLabel(report.condition)}</div>
            </div>
          </div>

          ${report.activities ? `
            <div class="section">
              <div class="section-title">Atividades Realizadas</div>
              <div class="text-box">${report.activities}</div>
            </div>
          ` : ''}

          ${report.observations ? `
            <div class="section">
              <div class="section-title">Observações / Ocorrências</div>
              <div class="text-box">${report.observations}</div>
            </div>
          ` : ''}

          ${report.photos && report.photos.length > 0 ? `
            <div class="section">
              <div class="section-title">Registro Fotográfico (${report.photos.length})</div>
              <div class="gallery">
                ${report.photos.map(p => `<img src="${p}" />`).join('')}
              </div>
            </div>
          ` : ''}

          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Helpers for text labels
  function getShiftLabel(s: SiteLogReport['shift']) {
    switch (s) {
      case 'manha': return 'Manhã';
      case 'tarde': return 'Tarde';
      case 'noite': return 'Noite';
      case 'dia_todo': return 'Dia Todo';
      default: return 'Manhã';
    }
  }

  function getWeatherLabel(w: SiteLogReport['weather']) {
    switch (w) {
      case 'claro': return 'Claro / Ensolarado';
      case 'sol': return 'Sol Forte';
      case 'nublado': return 'Nublado';
      case 'chuvoso': return 'Chuvoso';
      case 'tempestade': return 'Tempestade';
      default: return 'Claro';
    }
  }

  function getConditionLabel(c: SiteLogReport['condition']) {
    switch (c) {
      case 'praticavel': return 'Praticável';
      case 'impraticavel': return 'Impraticável';
      case 'parcial': return 'Parcialmente Praticável';
      default: return 'Praticável';
    }
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white px-4 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-medium flex items-center gap-2 animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner Matching Vobi Style Reference */}
      <div className="bg-white rounded-2xl p-5 border border-zinc-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <h3 className="text-lg font-bold text-zinc-900">Diário de Obra</h3>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 max-w-2xl">
            Registre o progresso da obra através de fotos e relatórios e compartilhe em tempo real com seus clientes ou equipe.
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-colors shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Relatório</span>
        </button>
      </div>

      {/* Filter and Search Bar matching Reference Image 1 */}
      <div className="bg-white rounded-2xl p-4 border border-zinc-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Date Range Inputs */}
          <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 w-full sm:w-auto">
            <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Inicial"
              className="bg-transparent focus:outline-hidden text-xs text-zinc-700 cursor-pointer w-28"
            />
            <span className="text-zinc-400">→</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Final"
              className="bg-transparent focus:outline-hidden text-xs text-zinc-700 cursor-pointer w-28"
            />
          </div>

          {/* Search Field */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Pesquisar pelo código ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-zinc-50 border border-zinc-200 rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-hidden focus:border-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Weather Dropdown */}
          <select
            value={weatherFilter}
            onChange={(e) => setWeatherFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">Todos os Climas</option>
            <option value="claro">☀️ Claro / Ensolarado</option>
            <option value="sol">🌤️ Sol Forte</option>
            <option value="nublado">☁️ Nublado</option>
            <option value="chuvoso">🌧️ Chuvoso</option>
          </select>

          {/* Condition Dropdown */}
          <select
            value={conditionFilter}
            onChange={(e) => setConditionFilter(e.target.value)}
            className="bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 focus:outline-hidden cursor-pointer"
          >
            <option value="all">Todas as Condições</option>
            <option value="praticavel">✅ Praticável</option>
            <option value="impraticavel">❌ Impraticável</option>
            <option value="parcial">⚠️ Parcialmente Praticável</option>
          </select>
        </div>

        {/* Clear Filters indicator */}
        {(startDate || endDate || weatherFilter !== 'all' || conditionFilter !== 'all' || searchTerm) && (
          <div className="flex items-center justify-between text-xs text-zinc-500 pt-1 border-t border-zinc-100">
            <span>
              Exibindo <strong>{filteredReports.length}</strong> de {projectReports.length} relatórios
            </span>
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setWeatherFilter('all');
                setConditionFilter('all');
                setSearchTerm('');
              }}
              className="text-blue-600 hover:underline font-semibold cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Reports List Feed */}
      {filteredReports.length === 0 ? (
        <div className="bg-white border border-dashed border-zinc-200 rounded-2xl p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Camera className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-zinc-800 mb-1">
            Nenhum relatório de obra registrado
          </h4>
          <p className="text-xs text-zinc-500 max-w-md mx-auto mb-4">
            Registre o primeiro diário de obra para acompanhar o andamento, fotos da construção e apontamentos da equipe.
          </p>
          <button
            onClick={handleOpenNewModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-xl text-xs inline-flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Criar Primeiro Relatório</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report) => {
            const formattedDate = new Date(report.date + 'T00:00:00').toLocaleDateString('pt-BR');

            return (
              <div
                key={report.id}
                className="bg-white border border-zinc-200 rounded-2xl p-5 shadow-xs hover:border-zinc-300 transition-all space-y-4"
              >
                {/* Header Row: Green Dot + Date + Report Code + Weather Indicators */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span className="text-xs font-bold text-zinc-500">{formattedDate}</span>
                    <span className="text-zinc-300">•</span>
                    <h4 className="text-sm font-bold text-zinc-900">{report.code}</h4>
                  </div>

                  {/* Weather & Condition Badges Row (as shown in reference image 1) */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg font-medium">
                      ☀️ Turno: <strong>{getShiftLabel(report.shift)}</strong>
                    </span>

                    <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg font-medium">
                      🌤️ Clima: <strong>{getWeatherLabel(report.weather)}</strong>
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium border ${
                        report.condition === 'praticavel'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : report.condition === 'impraticavel'
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200'
                      }`}
                    >
                      {report.condition === 'praticavel' && '✅ Praticável'}
                      {report.condition === 'impraticavel' && '❌ Impraticável'}
                      {report.condition === 'parcial' && '⚠️ Parcial'}
                    </span>

                    {report.workforceCount ? (
                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-lg font-medium">
                        <Users className="w-3.5 h-3.5 text-purple-600" />
                        <strong>{report.workforceCount}</strong> em obra
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Activities Section */}
                {report.activities && (
                  <div>
                    <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">
                      Atividades Realizadas
                    </h5>
                    <p className="text-xs sm:text-sm text-zinc-800 whitespace-pre-wrap leading-relaxed bg-zinc-50/80 p-3 rounded-xl border border-zinc-100">
                      {report.activities}
                    </p>
                  </div>
                )}

                {/* Photo Gallery & Highlight Observation Box (Matching Image 1) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  {/* Photo Thumbnails */}
                  <div className="md:col-span-2">
                    {report.photos && report.photos.length > 0 ? (
                      <div>
                        <h5 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                          <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                          <span>Registro Fotográfico ({report.photos.length})</span>
                        </h5>
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                          {report.photos.map((photo, pIdx) => (
                            <div
                              key={pIdx}
                              onClick={() => setSelectedImage(photo)}
                              className="group relative aspect-4/3 rounded-xl overflow-hidden bg-zinc-100 border border-zinc-200 cursor-pointer shadow-xs hover:shadow-md transition-all"
                            >
                              <img
                                src={photo}
                                alt={`Foto ${pIdx + 1}`}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                                <Eye className="w-5 h-5" />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-zinc-50 border border-zinc-100 rounded-xl text-center text-xs text-zinc-400">
                        Nenhuma foto anexada a este relatório
                      </div>
                    )}
                  </div>

                  {/* Observations Box with callout design matching Reference Image 1 */}
                  <div className="md:col-span-1">
                    {report.observations ? (
                      <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 space-y-2">
                        <div className="flex items-center gap-1.5 text-amber-800 text-xs font-bold">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Observações / Ocorrências</span>
                        </div>
                        <p className="text-xs text-amber-950 leading-relaxed font-medium">
                          {report.observations}
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-zinc-50 border border-zinc-100 rounded-xl text-xs text-zinc-400">
                        Sem ocorrências registradas
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Icons Row: Print, Edit, Delete, Share */}
                <div className="flex items-center justify-between border-t border-zinc-100 pt-3 text-xs">
                  <span className="text-[11px] text-zinc-400">
                    Cadastrado em {new Date(report.createdAt).toLocaleDateString('pt-BR')}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleShareReport(report)}
                      title="Compartilhar resumo"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Compartilhar</span>
                    </button>

                    <button
                      onClick={() => handlePrintReport(report)}
                      title="Imprimir relatório"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Imprimir</span>
                    </button>

                    <button
                      onClick={() => handleOpenEditModal(report)}
                      title="Editar relatório"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Editar</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Tem certeza que deseja excluir o ${report.code}?`)) {
                          deleteSiteLogReport(report.id);
                          showToast('Relatório excluído');
                        }
                      }}
                      title="Excluir relatório"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
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

      {/* Image Preview Overlay Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-zinc-900 p-2 border border-zinc-800">
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-4 right-4 bg-black/60 hover:bg-black text-white p-2 rounded-full cursor-pointer transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={selectedImage}
              alt="Ampliação foto da obra"
              className="max-w-full max-h-[85vh] object-contain rounded-xl mx-auto"
            />
          </div>
        </div>
      )}

      {/* New / Edit Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-zinc-200 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <Camera className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-zinc-900">
                    {editingReport ? `Editar ${editingReport.code}` : 'Novo Relatório de Obra'}
                  </h3>
                  <p className="text-xs text-zinc-500">{project.title}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1.5 rounded-lg hover:bg-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReport} className="space-y-4 text-xs sm:text-sm">
              {/* Date & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Data do Relatório *</label>
                  <input
                    type="date"
                    required
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Turno / Período *</label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  >
                    <option value="manha">☀️ Manhã</option>
                    <option value="tarde">🌤️ Tarde</option>
                    <option value="noite">🌙 Noite</option>
                    <option value="dia_todo">📅 Dia Todo</option>
                  </select>
                </div>
              </div>

              {/* Weather & Workability & Workforce */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Clima *</label>
                  <select
                    value={weather}
                    onChange={(e) => setWeather(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  >
                    <option value="claro">☀️ Claro / Ensolarado</option>
                    <option value="sol">🌤️ Sol Forte</option>
                    <option value="nublado">☁️ Nublado</option>
                    <option value="chuvoso">🌧️ Chuvoso</option>
                    <option value="tempestade">⛈️ Tempestade</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Condição da Obra *</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value as any)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-hidden focus:border-blue-500 cursor-pointer"
                  >
                    <option value="praticavel">✅ Praticável</option>
                    <option value="impraticavel">❌ Impraticável</option>
                    <option value="parcial">⚠️ Parcialmente Praticável</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">Equipe na Obra (Qtd)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 6"
                    value={workforceCount}
                    onChange={(e) => setWorkforceCount(e.target.value)}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-hidden focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Activities Performed */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Atividades Realizadas</label>
                <textarea
                  rows={3}
                  placeholder="Descreva os serviços executados no dia (ex: Concretagem das colunas, alvenaria no 1º andar...)"
                  value={activities}
                  onChange={(e) => setActivities(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-zinc-800 focus:outline-hidden focus:border-blue-500 placeholder-zinc-400"
                />
              </div>

              {/* Observations / Incidents */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1">Observações / Ocorrências</label>
                <textarea
                  rows={2}
                  placeholder="Apontamentos técnicos, divergências de projeto ou orientações (ex: Não identificada a viga da fachada...)"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="w-full bg-amber-50/50 border border-amber-200 rounded-xl p-3 text-zinc-800 focus:outline-hidden focus:border-amber-400 placeholder-amber-400/80"
                />
              </div>

              {/* Photo Upload Section */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 mb-1.5 flex items-center justify-between">
                  <span>Fotos do Acompanhamento</span>
                  <span className="text-zinc-400 font-normal">{photos.length} fotos anexadas</span>
                </label>

                <div className="border-2 border-dashed border-zinc-200 hover:border-blue-400 rounded-2xl p-4 text-center bg-zinc-50/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    id="photo-upload-input"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  <label
                    htmlFor="photo-upload-input"
                    className="cursor-pointer flex flex-col items-center justify-center gap-1.5 text-zinc-600"
                  >
                    <Camera className="w-6 h-6 text-blue-600" />
                    <span className="text-xs font-bold text-blue-600 hover:underline">
                      Clique para selecionar ou tirar fotos
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      Suporta JPG, PNG, WEBP (múltiplos arquivos)
                    </span>
                  </label>
                </div>

                {/* Photo Previews inside modal */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mt-3">
                    {photos.map((p, idx) => (
                      <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-200 bg-zinc-100">
                        <img src={p} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="absolute top-1 right-1 bg-rose-600 text-white p-1 rounded-full shadow-md hover:bg-rose-700 transition-colors cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-200 text-zinc-700 font-bold hover:bg-zinc-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingReport ? 'Salvar Alterações' : 'Confirmar Relatório'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
