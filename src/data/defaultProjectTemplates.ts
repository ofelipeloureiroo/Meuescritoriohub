import { ProjectTemplate, TemplateStage, TemplateTask } from '../types';

export function normalizeTemplateStages(rawStages: (TemplateStage | string)[]): TemplateStage[] {
  if (!rawStages) return [];
  return rawStages.map((stg, idx) => {
    if (typeof stg === 'string') {
      return {
        id: `stg-${idx + 1}`,
        name: stg,
        items: []
      };
    }
    return {
      ...stg,
      items: (stg.items || []).map((item, iIdx) => ({
        ...item,
        id: item.id || `tsk-${idx + 1}-${iIdx + 1}`,
        estimatedDays: item.estimatedDays ?? 0,
        dayType: item.dayType || 'business',
        startMode: item.startMode || 'automatic'
      }))
    };
  });
}

export function countTemplateItems(template: ProjectTemplate): number {
  const normalized = normalizeTemplateStages(template.stages);
  return normalized.reduce((acc, stg) => acc + (stg.items ? stg.items.length : 0), 0);
}

export const DEFAULT_PROJECT_TEMPLATES: ProjectTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Projeto Arquitetônico + Interiores',
    type: 'Projeto Arquitetônico',
    date: '16/06/2026',
    isSystem: true,
    stages: [
      {
        id: 'stg-1',
        name: 'Inicial',
        items: [
          { id: 'tsk-1-1', name: 'Receber dados do cliente', description: 'Instruções detalhadas, critérios de execução e orientações para recebimento de arquivos.', estimatedDays: 0, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-1-2', name: 'Criar pasta do projeto (Drive/servidor)', description: 'Organizar estrutura de pastas de arquivos para a equipe.', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-1-3', name: 'Criar estrutura de arquivos padrão', description: 'Templates CAD/BIM e arquivos base do projeto.', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-1-4', name: 'Definir responsáveis', description: 'Atribuir gerente de projeto e equipe de suporte.', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-1-5', name: 'Criar cronograma inicial', description: 'Estipular prazos macro de cada etapa.', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-1-6', name: 'Criar grupo de comunicação (WhatsApp/Email)', description: 'Canal direto com o cliente.', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-2',
        name: 'Briefing',
        items: [
          { id: 'tsk-2-1', name: 'Enviar formulário de briefing para o cliente', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-2-2', name: 'Agendar reunião de alinhamento e expectativas', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-2-3', name: 'Realizar entrevista de necessidades', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-2-4', name: 'Organizar referências visuais e moodboard', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-2-5', name: 'Validar briefing com o cliente', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-2-6', name: 'Registrar ata de aprovação do briefing', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-3',
        name: 'Levantamento Técnico',
        items: [
          { id: 'tsk-3-1', name: 'Agendar medição no local com o cliente', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-3-2', name: 'Medir ambientes e registrar cotas reais', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-3-3', name: 'Fazer relatório fotográfico detalhado', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-3-4', name: 'Verificar pontos hidráulicos, elétricos e estruturais', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-3-5', name: 'Desenhar planta baixa de levantamento CAD/BIM', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-3-6', name: 'Desenhar cortes estruturais e aberturas existentes', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-3-7', name: 'Validar levantamento com a equipe técnica', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-4',
        name: 'Estudo de Layout - ARQ + FLUXOS',
        items: [
          { id: 'tsk-4-1', name: 'Analisar circulação, ergonomia e insolação', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-4-2', name: 'Criar opções de planta baixa de layout', estimatedDays: 4, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-4-3', name: 'Definir zoneamento funcional e eixos estruturais', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-4-4', name: 'Apresentar opções ao cliente', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-4-5', name: 'Ajustar versão escolhida pelo cliente', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-4-6', name: 'Aprovação do layout final pelo cliente', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-4-7', name: 'Congelar planta baixa para início da modelagem 3D', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-5',
        name: 'Estudo Preliminar R00',
        items: [
          { id: 'tsk-5-1', name: 'Modelagem 3D volumétrica inicial no SketchUp/Revit', estimatedDays: 5, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-5-2', name: 'Definição do partido arquitetônico e conceito', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-5-3', name: 'Estudo de fachadas, telhado e volumetria externa', estimatedDays: 4, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-5-4', name: 'Renderização rascunho de apresentação R00', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-5-5', name: 'Montar caderno de apresentação R00', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-5-6', name: 'Reunião de apresentação presencial ou online', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-5-7', name: 'Coleta de feedbacks e anotações de ajustes', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-6',
        name: 'Imagens Realistas - ARQUITETÔNICO',
        items: [
          { id: 'tsk-6-1', name: 'Ajustar materiais, texturas e maquete 3D', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-6-2', name: 'Inserir iluminação natural, artificial e vegetação', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-6-3', name: 'Configurar enquadramento das câmeras', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-6-4', name: 'Renderização em alta resolução', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-6-5', name: 'Pós-produção das imagens', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-6-6', name: 'Montagem da prancha de maquete eletrônica', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-6-7', name: 'Validação interna e envio para o cliente', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-7',
        name: 'Estudo Preliminar R01',
        items: [
          { id: 'tsk-7-1', name: 'Aplicar revisões solicitadas na apresentação R00', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-7-2', name: 'Atualizar modelo 3D e pranchas', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-7-3', name: 'Re-renderizar pontos alterados', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-7-4', name: 'Apresentação da revisão R01 ao cliente', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-7-5', name: 'Assinatura do termo de aprovação preliminar', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-7-6', name: 'Envio de cópia digital em PDF para o cliente', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-7-7', name: 'Liberação para Projeto Legal e Executivo', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-8',
        name: 'Projeto Legal (Prefeitura)',
        items: [
          { id: 'tsk-8-1', name: 'Consultar código de obras e legislação municipal', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-8-2', name: 'Desenhar prancha de aprovação (A1/A0)', estimatedDays: 4, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-8-3', name: 'Elaborar quadro de áreas e índices urbanísticos', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-8-4', name: 'Preencher requerimentos da prefeitura', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-8-5', name: 'Emitir RRT / ART de projeto', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-8-6', name: 'Coletar assinatura do cliente nas plantas', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-8-7', name: 'Protocolar processo no órgão municipal', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-8-8', name: 'Acompanhar análise técnica da prefeitura', estimatedDays: 5, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-8-9', name: 'Atender eventuais comunique-se', estimatedDays: 3, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-9',
        name: 'Memorial Descritivo',
        items: [
          { id: 'tsk-9-1', name: 'Especificação técnica dos materiais', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-9-2', name: 'Descrição dos sistemas construtivos', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-9-3', name: 'Critérios de execução e normas aplicáveis', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-9-4', name: 'Recomendações para mão de obra', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-9-5', name: 'Manual de manutenção e garantia', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-9-6', name: 'Revisão e formatação do documento', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-9-7', name: 'Envio para o cliente e construtora', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-10',
        name: 'Projeto Executivo',
        items: [
          { id: 'tsk-10-1', name: 'Planta baixa executiva dimensionada', estimatedDays: 5, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-10-2', name: 'Planta de demolição e construção', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-10-3', name: 'Planta de pontos elétricos e iluminação', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-10-4', name: 'Planta de pontos hidráulicos', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-10-5', name: 'Planta de piso e paginação', estimatedDays: 4, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-10-6', name: 'Planta de forro e gesso', estimatedDays: 4, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-10-7', name: 'Cortes gerais e fachadas executivas', estimatedDays: 4, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-10-8', name: 'Detalhamento de esquadrias e portas', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-10-9', name: 'Detalhamento de impermeabilização', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-10-10', name: 'Emissão de pranchas finais para obra', estimatedDays: 2, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-11',
        name: 'Estudo Preliminar R00 - INTERIORES',
        items: [
          { id: 'tsk-11-1', name: 'Conceituação do design de interiores e moodboard', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-11-2', name: 'Modelagem 3D dos ambientes internos', estimatedDays: 5, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-11-3', name: 'Apresentação inicial de interiores', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-12',
        name: 'Imagens Realistas - INTERIORES',
        items: [
          { id: 'tsk-12-1', name: 'Aplicação de texturas de revestimentos e tecidos', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-12-2', name: 'Iluminação cênica de interiores', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-12-3', name: 'Renderização 3D fotorrealista', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-12-4', name: 'Pós-produção e diagramação', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-13',
        name: 'Estudo Preliminar R01 - INTERIORES',
        items: [
          { id: 'tsk-13-1', name: 'Ajustes de mobiliário e materiais', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-13-2', name: 'Aprovação final do 3D de interiores', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-13-3', name: 'Emissão do caderno de conceito', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-13-4', name: 'Assinatura de aprovação de interiores', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-13-5', name: 'Liberação para detalhamento de marcenaria', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-14',
        name: 'Detalhamento de Marcenaria',
        items: [
          { id: 'tsk-14-1', name: 'Desenho de vistas e cortes de marcenaria', estimatedDays: 4, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-14-2', name: 'Especificação de ferragens, puxadores e MDF', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-14-3', name: 'Planta de iluminação embutida na marcenaria', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-14-4', name: 'Quadro de quantitativos para marcenaria', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-14-5', name: 'Envio para orçamentação de fornecedores', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-15',
        name: 'Entrega Final & As Built',
        items: [
          { id: 'tsk-15-1', name: 'Organização da pasta digital de entrega', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-15-2', name: 'Manual do proprietário', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-15-3', name: 'Visita final de recebimento da obra', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-15-4', name: 'Fotografia final do projeto concluído', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-15-5', name: 'Envio do kit de boas-vindas / termo de encerramento', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      }
    ]
  },
  {
    id: 'tpl-2',
    name: 'Reforma Completa',
    type: 'Reforma',
    date: '16/06/2026',
    isSystem: true,
    stages: [
      {
        id: 'stg-r1',
        name: 'Inicial',
        items: [
          { id: 'tsk-r1-1', name: 'Receber dados e contrato do cliente', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-r1-2', name: 'Criar pasta da reforma e repositório', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-r1-3', name: 'Verificar regras e horários do condomínio', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-r1-4', name: 'Definir responsável técnico e fiscalização', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-r2',
        name: 'Demolição e Construção',
        items: [
          { id: 'tsk-r2-1', name: 'Desenhar planta de demolição e construção', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-r2-2', name: 'Emitir RRT de reforma (norma NBR 16280)', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-r2-3', name: 'Entregar plano de reforma para o síndico', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-r2-4', name: 'Acompanhar início das demolições', estimatedDays: 2, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-r3',
        name: 'Elétrica e Hidráulica',
        items: [
          { id: 'tsk-r3-1', name: 'Planta de adequação de pontos de tomada e iluminação', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-r3-2', name: 'Planta de adaptação de tubulações de água e esgoto', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-r3-3', name: 'Conferência dos quadros de disjuntores', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-r4',
        name: 'Revestimentos e Acabamentos',
        items: [
          { id: 'tsk-r4-1', name: 'Paginação de porcelanato e azulejos', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-r4-2', name: 'Especificação de argamassa e rejunte', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-r4-3', name: 'Acompanhar impermeabilização', estimatedDays: 2, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-r5',
        name: 'Marcenaria e Marmoraria',
        items: [
          { id: 'tsk-r5-1', name: 'Medição pós-revestimento para marcenaria', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-r5-2', name: 'Detalhamento técnico de armários e bancadas', estimatedDays: 4, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-r5-3', name: 'Acompanhar montagem na obra', estimatedDays: 3, dayType: 'business', startMode: 'automatic' }
        ]
      }
    ]
  },
  {
    id: 'tpl-3',
    name: 'Projeto Arquitetônico',
    type: 'Projeto Arquitetônico',
    date: '06/08/2026',
    isSystem: true,
    stages: [
      {
        id: 'stg-a1',
        name: 'Inicial',
        items: [
          { id: 'tsk-a1-1', name: 'Receber dados do cliente', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-a1-2', name: 'Criar pasta do projeto no servidor', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-a1-3', name: 'Montar equipe de projeto', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-a2',
        name: 'Levantamento Técnico',
        items: [
          { id: 'tsk-a2-1', name: 'Medição presencial e relatório fotográfico', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-a2-2', name: 'Desenhar planta de levantamento', estimatedDays: 3, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-a3',
        name: 'Briefing',
        items: [
          { id: 'tsk-a3-1', name: 'Reunião de programa de necessidades', estimatedDays: 1, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-a3-2', name: 'Sintetizar briefing e obter aprovação', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-a4',
        name: 'Estudo de Layout',
        items: [
          { id: 'tsk-a4-1', name: 'Elaboração das opções de layout em planta', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-a4-2', name: 'Apresentação e escolha do cliente', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-a5',
        name: 'Estudo Preliminar R00',
        items: [
          { id: 'tsk-a5-1', name: 'Modelagem 3D volumétrica', estimatedDays: 4, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-a5-2', name: 'Apresentação inicial do conceito', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-a6',
        name: 'Estudo Preliminar R01',
        items: [
          { id: 'tsk-a6-1', name: 'Ajustes no modelo 3D conforme reunião', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-a6-2', name: 'Aprovação final do estudo preliminar', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-a7',
        name: 'Projeto Legal (Prefeitura)',
        items: [
          { id: 'tsk-a7-1', name: 'Prancha de aprovação e emissão de RRT', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-a7-2', name: 'Protocolo na prefeitura', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-a8',
        name: 'Memorial Descritivo',
        items: [
          { id: 'tsk-a8-1', name: 'Redação das especificações técnicas', estimatedDays: 2, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-a9',
        name: 'Imagens Realistas',
        items: [
          { id: 'tsk-a9-1', name: 'Renderização em alta resolução', estimatedDays: 3, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-a10',
        name: 'Projeto Executivo',
        items: [
          { id: 'tsk-a10-1', name: 'Pranchas técnicas executivas para obra', estimatedDays: 5, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-a11',
        name: 'Entrega',
        items: [
          { id: 'tsk-a11-1', name: 'Envio das pranchas finais e encerramento', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      }
    ]
  },
  {
    id: 'tpl-4',
    name: 'Projeto de Interiores',
    type: 'Projeto de Interiores',
    date: '06/08/2026',
    isSystem: true,
    stages: [
      {
        id: 'stg-i1',
        name: 'Definição de Layout',
        items: [
          { id: 'tsk-i1-1', name: 'Análise funcional e opções de layout', estimatedDays: 3, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-i1-2', name: 'Validação de dimensões e circulação', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-i2',
        name: 'Paleta de Cores e Materiais',
        items: [
          { id: 'tsk-i2-1', name: 'Montagem da física/digital board de amostras', estimatedDays: 2, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-i2-2', name: 'Aprovação de revestimentos e acabamentos', estimatedDays: 1, dayType: 'business', startMode: 'automatic' }
        ]
      },
      {
        id: 'stg-i3',
        name: 'Detalhamento Técnico',
        items: [
          { id: 'tsk-i3-1', name: 'Detalhamento de marcenaria e marmoraria', estimatedDays: 4, dayType: 'business', startMode: 'automatic' },
          { id: 'tsk-i3-2', name: 'Especificação de iluminação e móveis soltos', estimatedDays: 3, dayType: 'business', startMode: 'automatic' }
        ]
      }
    ]
  }
];
