import { GoogleGenAI, Type } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('No GEMINI_API_KEY');
    return;
  }
  const ai = new GoogleGenAI({ apiKey });

  const finalSearchTerm = "Geladeira Electrolux Side by Side Inox 435L";
  console.log(`\n================ TESTE BUSCA GEMINI COM GROUNDING ================\nProduto: "${finalSearchTerm}"\n`);

  const searchPrompt = "Você é um assistente sênior especialista em compras de produtos no Brasil.\n" +
    `Pesquise no Google onde comprar no Brasil o produto: "${finalSearchTerm}".\n` +
    "Encontre e liste até 6 opções reais nas principais lojas do Brasil (Mercado Livre Oficial, Magazine Luiza, Amazon Brasil, Casas Bahia, Leroy Merlin, Loja Oficial da Marca).\n" +
    "REGRAS:\n" +
    "1. Para cada opção, indique: Nome oficial completo do produto, Especificações técnicas principais (voltagem, acabamento, medidas), Preço médio real em R$, Nome da loja e a URL exata do produto encontrada na busca.\n" +
    "2. SÓ inclua uma URL se ela for real e vier da busca. NUNCA invente ou monte URLs manualmente.\n" +
    "3. Retorne a resposta em texto claro e detalhado.";

  let searchResponse: any = null;
  const modelsToTry = ["gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.1-pro-preview"];
  for (const m of modelsToTry) {
    try {
      console.log(`[Google Grounding Search] Tentando modelo ${m}...`);
      searchResponse = await ai.models.generateContent({
        model: m,
        contents: [{ text: searchPrompt }],
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
      if (searchResponse?.text) break;
    } catch (e: any) {
      console.warn(`[${m} falhou: ${e?.message?.slice(0, 80)}]`);
      await new Promise(r => setTimeout(r, 1200));
    }
  }

  const step1RawText = searchResponse?.text || "";
  console.log("[CHAMADA 1 Raw Text Length]:", step1RawText.length);

  const rawChunks = searchResponse?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const extractedGroundingChunks: Array<{ uri: string; title: string }> = [];
  if (Array.isArray(rawChunks)) {
    for (const chunk of rawChunks) {
      if (chunk?.web?.uri) {
        extractedGroundingChunks.push({
          uri: chunk.web.uri,
          title: chunk.web.title || ""
        });
      }
    }
  }

  console.log(`\n[Google Grounding Chunks Encontrados: ${extractedGroundingChunks.length}]`);
  extractedGroundingChunks.forEach((c, idx) => {
    console.log(`  Chunk #${idx + 1}: [${c.title}] -> ${c.uri}`);
  });

  const jsonSchema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        price: { type: Type.STRING },
        store: { type: Type.STRING },
        url: { type: Type.STRING },
        category: { type: Type.STRING }
      },
      required: ["title", "description", "price", "store"]
    }
  };

  let groundingSourcesPrompt = "\n\nLISTA DE FONTES REAIS E OFICIAIS ENCONTRADAS NA BUSCA DO GOOGLE:\n" +
    extractedGroundingChunks.map((c, i) => `${i + 1}. [${c.title}] ${c.uri}`).join("\n") +
    "\n\nINSTRUÇÃO OBRIGATÓRIA DE LINKS:\n" +
    "No campo 'url', use APENAS um dos links da lista de FONTES REAIS acima, copiado exatamente como está, sem alterar nenhum caractere.\n" +
    "Nunca invente ou monte uma URL diferente. Se não houver fonte real correspondente a alguma loja, deixe o campo 'url' vazio (\"\").";

  const structuringPrompt = "Organize as informações abaixo neste schema JSON exato, sem alterar nenhuma URL, preço ou nome de produto:\n\n" +
    step1RawText +
    groundingSourcesPrompt;

  let structuringResponse: any = null;
  const structModels = ["gemini-flash-latest", "gemini-3.1-flash-lite", "gemini-3.8-flash"];
  for (const sm of structModels) {
    try {
      structuringResponse = await ai.models.generateContent({
        model: sm,
        contents: [{ text: structuringPrompt }],
        config: {
          responseMimeType: "application/json",
          responseSchema: jsonSchema
        }
      });
      if (structuringResponse?.text) break;
    } catch (e: any) {
      console.warn(`[${sm} structuring error]:`, e?.message?.slice(0, 80));
    }
  }

  const results = JSON.parse(structuringResponse.text || "[]");
  console.log(`\n[CHAMADA 2] Ofertas Estruturadas: ${results.length}`);

  // Helpers
  const extractSignificantKeywords = (text: string): string[] => {
    if (!text) return [];
    const stopWords = new Set([
      "de", "da", "do", "das", "dos", "com", "em", "para", "por", "sem", "ou",
      "um", "uma", "uns", "umas", "no", "na", "nos", "nas", "ao", "aos", "que",
      "sobre", "item", "produto", "oficial", "brasil", "loja", "compre", "online",
      "frete", "gratis", "promocao", "oferta"
    ]);
    const normalized = text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, " ");
    
    return Array.from(new Set(normalized.split(/[\s-]+/).filter(t => t.length >= 2 && !stopWords.has(t))));
  };

  const matchStoreWithGroundingChunks = (
    storeName: string, 
    itemTitle: string, 
    productContext: string, 
    chunks: Array<{ uri: string; title: string }>
  ): { uri: string; matchedKeywords: string[] } | null => {
    if (!storeName || !chunks || chunks.length === 0) return null;

    const normalize = (str: string) => str
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");

    const normStore = normalize(storeName);
    const targetKeywords = extractSignificantKeywords(`${productContext} ${itemTitle}`);

    const storeAliases: Record<string, string[]> = {
      "mercadolivre": ["mercadolivre", "mercadolibre", "produto.mercadolivre", "ml"],
      "magazineluiza": ["magazineluiza", "magalu", "magazine"],
      "amazon": ["amazon", "amazonbr"],
      "casasbahia": ["casasbahia", "bahia"],
      "electrolux": ["electrolux", "lojaelectrolux"],
      "leroymerlin": ["leroymerlin", "leroy"],
      "ponto": ["ponto", "pontofrio"],
      "fastshop": ["fastshop", "fast"],
      "americanas": ["americanas"],
      "madeiramadeira": ["madeiramadeira", "madeira"],
      "mobly": ["mobly"],
      "telhanorte": ["telhanorte"],
      "brastemp": ["brastemp", "lojabrastemp"],
      "consul": ["consul", "lojaconsul"],
      "samsung": ["samsung", "lojasamsung"],
      "philco": ["philco", "lojaphilco"],
      "deca": ["deca", "lojadeca"],
      "docol": ["docol"],
      "lg": ["lg.com", "lgcom", "lg"]
    };

    for (const chunk of chunks) {
      const normChunkTitle = normalize(chunk.title || "");
      const normChunkUri = normalize(chunk.uri || "");

      let storeMatch = false;
      for (const [, aliases] of Object.entries(storeAliases)) {
        const matchesStore = aliases.some(alias => normStore.includes(alias) || alias.includes(normStore));
        if (matchesStore && aliases.some(alias => normChunkTitle.includes(alias) || normChunkUri.includes(alias))) {
          storeMatch = true;
          break;
        }
      }

      if (!storeMatch) {
        if (
          (normStore.length >= 3 && normChunkTitle.includes(normStore)) ||
          (normChunkTitle.length >= 3 && normStore.includes(normChunkTitle)) ||
          (normStore.length >= 3 && normChunkUri.includes(normStore))
        ) {
          storeMatch = true;
        }
      }

      if (!storeMatch) continue;

      const chunkFullText = `${chunk.title} ${chunk.uri}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const matchedKw = targetKeywords.filter(kw => {
        if (kw.length <= 2) return false;
        return chunkFullText.includes(kw);
      });

      if (matchedKw.length > 0) {
        console.log(`[JS Matching Aceito] Loja "${storeName}" -> Chunk [${chunk.title}] (Palavras-chave: ${matchedKw.join(', ')})`);
        return { uri: chunk.uri, matchedKeywords: matchedKw };
      } else {
        console.log(`[JS Matching Rejeitado] Chunk [${chunk.title}] é da loja "${storeName}", mas NÃO contém palavras-chave do produto (${targetKeywords.slice(0, 5).join(', ')}...). Descartado.`);
      }
    }

    return null;
  };

  const validateDirectProductUrl = async (rawUrl?: string): Promise<{ valid: boolean; status?: number; finalUrl?: string; reason?: string }> => {
    if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.startsWith('http')) {
      return { valid: false, reason: 'URL vazia ou inválida' };
    }
    const lower = rawUrl.toLowerCase();
    
    if (
      lower.includes('/busca') ||
      lower.includes('/search') ||
      lower.includes('?q=') ||
      lower.includes('&q=') ||
      lower.includes('?k=') ||
      lower.includes('&k=') ||
      lower.includes('lista.mercadolivre') ||
      lower.includes('google.com') ||
      lower.includes('example.com')
    ) {
      return { valid: false, reason: 'Página genérica de busca ou listagem' };
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);
      const resp = await fetch(rawUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal,
        redirect: 'follow'
      });
      clearTimeout(timeoutId);

      if (resp.status >= 200 && resp.status < 300) {
        const finalUrl = (resp.url || '').toLowerCase();
        if (
          finalUrl.includes('/busca') ||
          finalUrl.includes('/search') ||
          finalUrl.includes('?q=') ||
          finalUrl.includes('lista.mercadolivre') ||
          finalUrl.includes('/404') ||
          finalUrl.includes('nao-encontrado') ||
          finalUrl.includes('sku-nao-encontrado')
        ) {
          return { valid: false, status: resp.status, finalUrl: resp.url, reason: 'Redirecionou para página de busca/404' };
        }
        return { valid: true, status: resp.status, finalUrl: resp.url };
      }
      return { valid: false, status: resp.status, finalUrl: resp.url, reason: `HTTP status ${resp.status}` };
    } catch (err: any) {
      return { valid: false, reason: `Erro na conexão / timeout: ${err?.message || err}` };
    }
  };

  const validGroundingUris = new Set(extractedGroundingChunks.map(c => c.uri));
  console.log("\n================ ETAPA DE FILTROS E VALIDAÇÃO ================\n");

  const validatedResults = await Promise.all(results.map(async (item: any, idx: number) => {
    let candidateUrl = (item.url || "").trim();
    let discardReason = "";

    // FILTRO 1: Validação de String Idêntica
    if (candidateUrl) {
      const isExactGrounding = validGroundingUris.has(candidateUrl);
      console.log(`[Item #${idx + 1} - ${item.store}] URL sugerida pelo modelo: "${candidateUrl}" -> É IDÊNTICA a groundingChunk real? ${isExactGrounding ? 'SIM (Aprovada para teste)' : 'NÃO (Descartada - alucinação/modificação do modelo)'}`);
      if (!isExactGrounding) {
        discardReason = "URL gerada pelo modelo não é idêntica a nenhum groundingChunk real da busca";
        candidateUrl = "";
      }
    }

    // FILTRO 2: Matching por Loja + Palavra-Chave do Produto
    if (!candidateUrl && extractedGroundingChunks.length > 0) {
      const match = matchStoreWithGroundingChunks(
        item.store, 
        item.title || "", 
        finalSearchTerm, 
        extractedGroundingChunks
      );
      if (match && validGroundingUris.has(match.uri)) {
        candidateUrl = match.uri;
        console.log(`[Item #${idx + 1} - ${item.store}] URL atribuída via matching seguro: ${candidateUrl}`);
      } else {
        if (!discardReason) {
          discardReason = "Nenhum groundingChunk da busca bate simultaneamente com a loja E com o produto especificado";
        }
      }
    }

    // FILTRO 3: Validação HTTP GET real (Status 200)
    let isDirect = false;
    let finalValidatedUrl = "";

    if (candidateUrl) {
      console.log(`[Item #${idx + 1} - ${item.store}] Testando URL candidata via HTTP GET: "${candidateUrl}"...`);
      const httpCheck = await validateDirectProductUrl(candidateUrl);
      
      if (httpCheck.valid) {
        isDirect = true;
        finalValidatedUrl = candidateUrl;
        console.log(`[Item #${idx + 1} - ${item.store}] -> ✅ URL ACEITA! Status HTTP ${httpCheck.status || 200} (link_direto: true)`);
      } else {
        isDirect = false;
        finalValidatedUrl = "";
        discardReason = `Falha na requisição HTTP: ${httpCheck.reason}`;
        console.log(`[Item #${idx + 1} - ${item.store}] -> ❌ URL DESCARTADA! ${httpCheck.reason}`);
      }
    } else {
      console.log(`[Item #${idx + 1} - ${item.store}] -> ⚠️ Sem URL válida. Motivo: ${discardReason || 'Sem link disponível'}`);
    }

    return {
      title: item.title,
      description: item.description,
      price: item.price,
      store: item.store,
      category: item.category,
      link_direto: isDirect,
      url: finalValidatedUrl,
      imageUrl: ""
    };
  }));

  console.log("\n================ RESULTADO FINAL EM JSON ================\n");
  console.log(JSON.stringify(validatedResults, null, 2));
}

run().catch(console.error);
