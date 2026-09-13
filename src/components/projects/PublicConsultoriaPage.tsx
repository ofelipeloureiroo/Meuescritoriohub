import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ExpressConsultation, BeforeAfterSlider } from './ExpressConsultingTab';
import { MessageCircle, Download, ArrowLeft, Building2 } from 'lucide-react';

export const PublicConsultoriaPage: React.FC = () => {
  const { consultationId } = useParams<{ consultationId: string }>();
  const [consultation, setConsultation] = useState<ExpressConsultation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('obra_express_consultations');
      if (stored) {
        const list: ExpressConsultation[] = JSON.parse(stored);
        const match = list.find((c) => c.id === consultationId || c.id === `cons_${consultationId}`);
        if (match) {
          setConsultation(match);
        } else if (list.length > 0) {
          // If id is a mock hash, show the most recent consultation
          setConsultation(list[0]);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [consultationId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#12100e] text-[#fcf8f5] flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-2 border-[#c58a4b] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-[#a89c93]">Carregando apresentação da consultoria...</p>
        </div>
      </div>
    );
  }

  const officeName = consultation?.officeName || 'Meu Escritório Online';
  const clientName = consultation?.clientName || 'Cliente';
  const roomType = consultation?.roomType || 'Ambiente';
  const consultantName = consultation?.consultantName || 'Arquiteto';

  return (
    <div className="min-h-screen bg-[#12100e] text-[#1c1917] font-sans antialiased py-6 px-3 sm:px-6 flex justify-center">
      <div className="bg-[#f7f5f0] text-[#1c1917] w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl border border-[#3d342f] relative">
        {/* PRESENTATION TOP SECTION (DARK HERO & IDENTIFICATION) */}
        <div className="bg-[#14110f] text-[#fcf8f5] p-6 sm:p-10 md:p-12 space-y-6 relative border-b border-[#2e2621]">
          <div className="text-center space-y-2">
            <div className="font-serif text-xl sm:text-2xl font-bold tracking-[0.2em] text-[#c58a4b] uppercase">
              {officeName}
            </div>
            <span className="text-[10px] font-bold tracking-[0.25em] uppercase text-[#a89c93] block">
              CONSULTORIA EXPRESSA DE ARQUITETURA
            </span>

            <h1 className="text-2xl sm:text-4xl md:text-5xl font-serif font-normal max-w-2xl mx-auto leading-tight text-[#fcf8f5] pt-2">
              Uma nova possibilidade para o seu espaço.
            </h1>

            <div className="text-xs text-[#a89c93] font-medium pt-1">
              {clientName} • {roomType} | Consultor: {consultantName}
            </div>
          </div>

          {/* IDENTIFIED & DESIRED CARDS IN DARK CONTAINER */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            {/* O QUE IDENTIFICAMOS */}
            <div className="bg-[#0e0c0b] border border-[#2e2621] p-5 sm:p-6 rounded-2xl space-y-3">
              <div>
                <span className="text-[10px] font-bold text-[#c58a4b] uppercase tracking-[0.15em] block">
                  O QUE IDENTIFICAMOS
                </span>
                <p className="text-xs text-[#a89c93] mt-0.5">Pontos que hoje limitam o ambiente.</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {(consultation?.annoyances && consultation.annoyances.length > 0) ? (
                  consultation.annoyances.map((item, i) => (
                    <span
                      key={i}
                      className="px-3.5 py-1.5 rounded-xl border border-[#3d342f] bg-[#1c1815] text-xs font-medium text-[#fcf8f5]"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="px-3.5 py-1.5 rounded-xl border border-[#3d342f] bg-[#1c1815] text-xs font-medium text-[#a89c93]">
                    Visual pesado
                  </span>
                )}
              </div>
            </div>

            {/* O QUE VOCÊ GOSTARIA DE MELHORAR */}
            <div className="bg-[#0e0c0b] border border-[#2e2621] p-5 sm:p-6 rounded-2xl space-y-3">
              <div>
                <span className="text-[10px] font-bold text-[#c58a4b] uppercase tracking-[0.15em] block">
                  O QUE VOCÊ GOSTARIA DE MELHORAR
                </span>
                <p className="text-xs text-[#a89c93] mt-0.5">Mudanças e sensações desejadas para o espaço.</p>
              </div>
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  ...(consultation?.desiredChanges || []),
                  ...(consultation?.desiredStyle || []),
                ].length > 0 ? (
                  [
                    ...(consultation?.desiredChanges || []),
                    ...(consultation?.desiredStyle || []),
                  ].map((item, i) => (
                    <span
                      key={i}
                      className="px-3.5 py-1.5 rounded-xl border border-[#c58a4b]/30 bg-[#c58a4b]/10 text-xs font-medium text-[#c58a4b]"
                    >
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="px-3.5 py-1.5 rounded-xl border border-[#c58a4b]/30 bg-[#c58a4b]/10 text-xs font-medium text-[#c58a4b]">
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
          {consultation?.redesignImage && (
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-[#8c7e73] uppercase tracking-[0.15em] block">
                NOSSA PROPOSTA
              </span>

              <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border border-[#e5dfd8] bg-[#e5dfd8]/30">
                <img
                  src={consultation.redesignImage}
                  alt="Proposta de Redesign com IA"
                  className="w-full h-auto max-h-[550px] object-cover"
                />
              </div>
            </div>
          )}

          {/* SECTION: RESUMO DA PROPOSTA & O QUE AJUSTAMOS */}
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-[#8c7e73] uppercase tracking-[0.15em] block">
                RESUMO DA PROPOSTA
              </span>
              <p className="text-sm sm:text-base text-[#4a443e] leading-relaxed font-sans">
                {consultation?.summaryText ||
                  `A proposta segue uma linha de redesign pontual para ${roomType}, com foco em requalificar os acabamentos e marcenaria para diminuir a sensação de peso visual. A intenção é trazer um resultado mais sofisticado, preservando integralmente a arquitetura existente.`}
              </p>
            </div>

            {/* CARD: O QUE AJUSTAMOS NESTA PROPOSTA */}
            <div className="bg-white border border-[#e5dfd8] rounded-2xl p-6 sm:p-8 space-y-3 shadow-xs">
              <span className="text-[11px] font-bold text-[#8c7e73] uppercase tracking-[0.15em] block">
                O QUE AJUSTAMOS NESTA PROPOSTA
              </span>
              <p className="text-xs sm:text-sm text-[#4a443e] leading-relaxed whitespace-pre-line font-sans">
                {consultation?.adjustmentsText ||
                  `A intervenção se concentra nas soluções solicitadas para o ${roomType.toLowerCase()}, que passa a ser o principal recurso para organizar melhor a leitura do espaço e aliviar o aspecto anterior. Mantêm-se rigorosamente o enquadramento, a perspectiva e a arquitetura original, sem qualquer alteração estrutural ou de composição espacial fora do que foi solicitado. Com isso, a proposta atua de forma controlada, sem modificar os demais elementos do cenário. Não há indicação de mudanças em iluminação, decoração ou mobiliário além do que for inerente ao que foi acordado. A leitura geral buscada é mais elegante, limpa e bem resolvida, sem descaracterizar o ambiente original.`}
              </p>
            </div>
          </div>

          {/* SECTION: REFERÊNCIAS VISUAIS SELECIONADAS (SE HOUVER) */}
          {consultation?.userReferences && consultation.userReferences.length > 0 && (
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-[#8c7e73] uppercase tracking-[0.15em] block">
                REFERÊNCIAS VISUAIS SELECIONADAS DO PROJETO
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {consultation.userReferences.map((ref, idx) => (
                  <div
                    key={idx}
                    className="relative rounded-2xl overflow-hidden border border-[#e5dfd8] bg-white shadow-2xs"
                  >
                    <img src={ref.url} alt={ref.title} className="w-full h-36 object-cover" />
                    <div className="p-3 bg-white border-t border-[#e5dfd8] flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#1c1917] block truncate">{ref.title}</span>
                        {ref.tag && (
                          <span className="text-[10px] text-[#c58a4b] font-semibold">{ref.tag}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION: ANTES E DEPOIS COMPARADOR */}
          {consultation?.originalImage && consultation?.redesignImage && (
            <div className="space-y-4">
              <span className="text-[10px] font-bold text-[#8c7e73] uppercase tracking-[0.15em] block">
                ARRASTE PARA COMPARAR
              </span>

              <BeforeAfterSlider
                beforeImage={consultation.originalImage}
                afterImage={consultation.redesignImage}
                title="ARRASTE PARA COMPARAR"
                aspectRatioClass="h-[380px] sm:h-[500px]"
              />
            </div>
          )}

          {/* SECTION: IDEIAS PARA TRANSFORMAR SEU ESPAÇO */}
          <div className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1c1917]">
              Ideias para transformar seu espaço
            </h2>

            <div className="space-y-3">
              {(consultation?.ideas || [
                'Revisar a marcenaria para reduzir o peso visual.',
                'Preservar a arquitetura original sem alterações.',
                'Manter enquadramento e perspectiva exatamente como estão.',
                'Valorizar uma atmosfera mais sofisticada.',
                'Evitar incluir elementos não previstos na instrução.',
              ]).map((idea, idx) => (
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
              {(consultation?.directionTags || ['sofisticado', 'marcenaria', 'leveza visual', roomType.toLowerCase(), 'redesign pontual']).map((tag, i) => (
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
                  `Olá! Gostaria de evoluir a minha Consultoria Expressa para um Projeto Completo com o ${officeName}.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="px-7 py-3.5 bg-[#1c2e24] hover:bg-[#253e30] text-[#fcf8f5] text-xs font-bold rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <MessageCircle className="w-4 h-4 text-[#25d366]" />
                <span>Falar com o {officeName}</span>
              </a>

              <button
                onClick={() => window.print()}
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
              {officeName}
            </div>
            <p className="text-[11px] text-[#8c7e73] max-w-lg mx-auto">
              Imagem conceitual desenvolvida durante a Consultoria Expressa. Materiais e soluções devem ser validados em projeto antes da execução.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
