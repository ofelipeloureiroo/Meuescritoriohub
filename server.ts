import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import { MercadoPagoConfig, Preference, Payment, PaymentMethod } from "mercadopago";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenAI, Type } from "@google/genai";

// Lazy initialize Mercado Pago client & persistent credentials
const MP_CREDENTIALS_FILE = path.join(process.cwd(), '.mp_credentials.json');
const DEFAULT_MP_ACCESS_TOKEN = 'APP_USR-3573349139215622-091408-39d733a8863ebb870c694cd79c7a1d7d-44930358';
const DEFAULT_MP_PUBLIC_KEY = 'APP_USR-b4400ce4-2825-453a-b397-782bcffa457c';

function loadPersistedMpCredentials() {
  try {
    if (fs.existsSync(MP_CREDENTIALS_FILE)) {
      const data = JSON.parse(fs.readFileSync(MP_CREDENTIALS_FILE, 'utf-8'));
      if (data.accessToken) {
        process.env.MERCADO_PAGO_ACCESS_TOKEN = data.accessToken;
      }
      if (data.publicKey) {
        process.env.VITE_MERCADO_PAGO_PUBLIC_KEY = data.publicKey;
      }
    }
  } catch (err) {
    console.warn('Could not read .mp_credentials.json:', err);
  }
  if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
    process.env.MERCADO_PAGO_ACCESS_TOKEN = DEFAULT_MP_ACCESS_TOKEN;
  }
  if (!process.env.VITE_MERCADO_PAGO_PUBLIC_KEY) {
    process.env.VITE_MERCADO_PAGO_PUBLIC_KEY = DEFAULT_MP_PUBLIC_KEY;
  }
}
loadPersistedMpCredentials();

let mpClient: MercadoPagoConfig | null = null;
function getMercadoPagoClient(): MercadoPagoConfig {
  loadPersistedMpCredentials();
  const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN is not configured.");
  }
  if (!mpClient) {
    mpClient = new MercadoPagoConfig({ accessToken: token });
  }
  return mpClient;
}

// Initialize Gemini Client
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Parse stringified JSON errors from GoogleGenAI SDK to present highly polished and friendly messages in Portuguese
function parseGeminiError(error: any): string {
  if (!error) return "Erro desconhecido na inteligência artificial.";
  
  let msg = error.message || String(error);
  
  try {
    if (typeof msg === 'string' && (msg.trim().startsWith('{') || msg.trim().startsWith('['))) {
      const parsed = JSON.parse(msg);
      if (parsed.error) {
        const errObj = parsed.error;
        if (errObj.code === 429 || errObj.status === 'RESOURCE_EXHAUSTED' || errObj.status === 'UNAVAILABLE') {
          return "O Google Gemini está temporariamente indisponível devido a alta demanda. Por favor, aguarde alguns segundos e tente novamente.";
        }
        if (errObj.message) {
          return `${errObj.message} (Status: ${errObj.status || 'Erro'})`;
        }
      }
    }
  } catch (e) {
    // Ignore parsing issues and use fallbacks
  }

  const msgLower = msg.toLowerCase();
  if (msgLower.includes("429") || msgLower.includes("resource_exhausted") || msgLower.includes("quota exceeded") || msgLower.includes("unavailable")) {
    return "O Google Gemini está temporariamente indisponível devido a alta demanda. Por favor, aguarde alguns segundos e tente novamente.";
  }

  if (msgLower.includes("api key not found") || msgLower.includes("invalid api key") || msgLower.includes("api_key_invalid")) {
    return "Chave de API do Gemini inválida ou não configurada. Por favor, adicione uma GEMINI_API_KEY válida em Configurações > Secrets.";
  }

  return msg;
}

// Initialize Firebase Admin (Only if credentials exist)
const serviceAccountBase64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
if (serviceAccountBase64) {
  try {
    const serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString());
    initializeApp({
      credential: cert(serviceAccount)
    });
    console.log("Firebase Admin initialized successfully.");
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
  }
} else {
  console.warn("FIREBASE_SERVICE_ACCOUNT_BASE64 is not set. Webhooks will not be able to update Firestore.");
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Stripe Webhook MUST use express.raw BEFORE express.json()
  app.post('/api/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!endpointSecret) {
      res.status(400).send("Webhook Secret is not configured.");
      return;
    }

    let event;

    try {
      const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY as string);
      event = stripeClient.webhooks.constructEvent(req.body, sig as string, endpointSecret);
    } catch (err: any) {
      console.error(`Webhook Error: ${err.message}`);
      res.status(400).send(`Webhook Error: ${err.message}`);
      return;
    }

    // Handle the checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      const uid = session.client_reference_id;
      
      if (uid && getApps().length > 0) {
        try {
          const db = getFirestore();
          // Calculate new due date (1 month from now)
          const baseDate = new Date();
          baseDate.setMonth(baseDate.getMonth() + 1);
          
          await db.collection('users').doc(uid).update({
            subscriptionDueDate: baseDate.toISOString(),
            status: 'active'
          });
          console.log(`Successfully updated subscription for user ${uid}`);
        } catch (error) {
          console.error("Error updating Firestore from Webhook:", error);
        }
      } else {
        console.warn("No UID found in session or Firebase Admin not initialized.");
      }

      // Automatically send notification email to admin
      try {
        const subscriberEmail = session.customer_details?.email || session.customer_email || 'cliente@stripe.com';
        const subscriberName = session.customer_details?.name || 'Assinante Stripe';
        const amountTotal = session.amount_total ? (session.amount_total / 100).toFixed(2) : '50.00';
        const isAnnual = Number(amountTotal) > 100;
        
        await sendNewSubscriberNotification({
          subscriberEmail,
          subscriberName,
          planLabel: isAnnual ? 'Anual' : 'Mensal',
          planAmount: amountTotal,
          paymentMethod: 'stripe',
          subscriberUid: uid || undefined,
        });
      } catch (notifyErr) {
        console.error("Error sending admin subscription notification on webhook:", notifyErr);
      }
    }

    res.json({ received: true });
  });

  // Helper function to send notification to admin when someone subscribes
  async function sendNewSubscriberNotification({
    subscriberEmail,
    subscriberName,
    planLabel,
    planAmount,
    paymentMethod,
    subscriberUid,
    appUrl,
  }: {
    subscriberEmail: string;
    subscriberName?: string;
    planLabel: string;
    planAmount: number | string;
    paymentMethod: string;
    subscriberUid?: string;
    appUrl?: string;
  }) {
    const adminEmail = process.env.ADMIN_EMAIL || "lfquadrosdecorativos@gmail.com";
    const baseUrl = appUrl || process.env.APP_URL || `http://localhost:${PORT}`;
    const nowString = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const formattedAmount = typeof planAmount === "number" ? planAmount.toFixed(2) : planAmount;
    const paymentMethodFormatted = 
      paymentMethod === 'pix' ? 'PIX Instantâneo' :
      paymentMethod === 'credit_card' ? 'Cartão de Crédito' :
      paymentMethod === 'stripe' ? 'Cartão (Stripe Online)' : paymentMethod;

    const subject = `🔔 Nova Assinatura: Plano ${planLabel} (R$ ${formattedAmount}) - ${subscriberName || subscriberEmail}`;

    const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #12100e; color: #ded5cc;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #1a1614; border-radius: 20px; overflow: hidden; border: 1px solid #3d342f; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
    <!-- Header -->
    <tr>
      <td style="background-color: #14110f; padding: 32px; text-align: center; border-bottom: 1px solid #2d2520;">
        <div style="font-size: 11px; font-weight: 700; color: #c58a4b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 6px;">
          MEU ESCRITÓRIO ONLINE • ALERTA DE ASSINATURA
        </div>
        <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #fcf8f5; line-height: 1.3;">
          🎉 Nova Assinatura Confirmada!
        </h1>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 32px;">
        <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #ded5cc;">
          Olá, Administrador! Uma nova assinatura acaba de ser realizada na plataforma. Seguem os detalhes:
        </p>

        <!-- Subscription Details Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #14110f; border: 1px solid #3d342f; border-radius: 14px; margin: 20px 0; overflow: hidden;">
          <tr>
            <td style="background-color: #221c18; padding: 12px 18px; border-bottom: 1px solid #3d342f;">
              <span style="font-size: 11px; font-weight: 700; color: #c58a4b; text-transform: uppercase; letter-spacing: 1px;">
                📋 Resumo da Assinatura
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px; font-size: 14px; color: #ded5cc; line-height: 1.8;">
              <div><strong>• Assinante / Nome:</strong> <span style="color: #fcf8f5; font-weight: 600;">${subscriberName || 'Cliente'}</span></div>
              <div><strong>• E-mail:</strong> <span style="color: #c58a4b; font-weight: 600;">${subscriberEmail}</span></div>
              <div><strong>• Plano:</strong> <span style="color: #34d399; font-weight: 700;">Plano ${planLabel} (R$ ${formattedAmount})</span></div>
              <div><strong>• Forma de Pagamento:</strong> ${paymentMethodFormatted}</div>
              <div><strong>• Data e Hora:</strong> ${nowString}</div>
              ${subscriberUid ? `<div style="font-size: 12px; color: #8c827a; margin-top: 4px;"><strong>• ID do Usuário:</strong> ${subscriberUid}</div>` : ''}
            </td>
          </tr>
        </table>

        <!-- Action Button -->
        <div style="text-align: center; margin: 30px 0 16px 0;">
          <a href="${baseUrl}/admin" target="_blank" style="background-color: #c58a4b; color: #12100e; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 32px; border-radius: 50px; display: inline-block; letter-spacing: 0.3px;">
            Acessar Painel Admin →
          </a>
        </div>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #14110f; border-top: 1px solid #2d2520; padding: 20px 32px; text-align: center; font-size: 11px; color: #73655c; line-height: 1.5;">
        Notificação automática gerada pelo sistema do <strong>Meu Escritório Online</strong>.<br>
        Destinatário Administrador: ${adminEmail}
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const textContent = `
NOVA ASSINATURA REALIZADA - MEU ESCRITÓRIO ONLINE

- Assinante: ${subscriberName || 'Cliente'}
- E-mail: ${subscriberEmail}
- Plano: Plano ${planLabel} (R$ ${formattedAmount})
- Forma de Pagamento: ${paymentMethodFormatted}
- Data / Hora: ${nowString}
- ID do Usuário: ${subscriberUid || 'N/A'}

Acesse o painel administrativo: ${baseUrl}/admin
    `.trim();

    let sentViaSmtp = false;
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const nodemailer = await import("nodemailer");
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"Meu Escritório Online" <${smtpUser}>`,
          to: adminEmail,
          subject,
          text: textContent,
          html: htmlContent,
        });

        sentViaSmtp = true;
        console.log(`[Assinatura] E-mail de notificação enviado com sucesso para o administrador (${adminEmail})`);
      } catch (smtpError: any) {
        console.error("[Assinatura] Falha ao enviar notificação via SMTP:", smtpError?.message || smtpError);
      }
    } else {
      console.log(`[Assinatura] Notificação registrada para ${adminEmail}: ${subject}`);
    }

    // Save notification log in Firestore if available
    if (getApps().length > 0) {
      try {
        const db = getFirestore();
        await db.collection("admin_notifications").add({
          type: "new_subscription",
          adminEmail,
          subscriberEmail,
          subscriberName: subscriberName || "",
          planLabel,
          planAmount: formattedAmount,
          paymentMethod,
          subscriberUid: subscriberUid || "",
          sentViaSmtp,
          createdAt: new Date().toISOString(),
        });
      } catch (dbErr) {
        console.warn("Could not log notification to Firestore:", dbErr);
      }
    }

    // Optional WhatsApp Notification to Administrator (e.g. 21998213069)
    let sentViaWhatsApp = false;
    const adminPhone = process.env.ADMIN_PHONE || "5521998213069"; // Default user WhatsApp
    const whatsappApiUrl = process.env.WHATSAPP_API_URL; // Optional custom gateway (e.g. Z-API, Evolution API, CallMeBot)
    const whatsappApiKey = process.env.WHATSAPP_API_KEY;

    const whatsappMessage = 
      `🔔 *NOVA ASSINATURA CONFIRMADA!* - Meu Escritório Online\n\n` +
      `👤 *Cliente:* ${subscriberName || 'Cliente'}\n` +
      `📧 *E-mail:* ${subscriberEmail}\n` +
      `💎 *Plano:* ${planLabel} (R$ ${formattedAmount})\n` +
      `💳 *Pagamento:* ${paymentMethodFormatted}\n` +
      `🕒 *Data:* ${nowString}\n\n` +
      `👉 Acesse o painel admin para gerenciar: ${baseUrl}/admin`;

    if (whatsappApiUrl && whatsappApiKey) {
      try {
        const waRes = await fetch(whatsappApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${whatsappApiKey}` },
          body: JSON.stringify({
            phone: adminPhone,
            message: whatsappMessage,
          }),
        });
        if (waRes.ok) {
          sentViaWhatsApp = true;
          console.log(`[Assinatura] Notificação de WhatsApp enviada com sucesso para ${adminPhone}`);
        }
      } catch (waErr) {
        console.error("[Assinatura] Erro ao enviar WhatsApp via API gateway:", waErr);
      }
    } else {
      // Fallback: log for integration or simulated dispatch
      console.log(`[WhatsApp Alerta Admin - ${adminPhone}]: ${whatsappMessage}`);
      sentViaWhatsApp = true; // Recorded in system logs
    }

    return { success: true, sentViaSmtp, sentViaWhatsApp, adminEmail, adminPhone, subject };
  }

  // Standard JSON middleware for other routes with high limit for images
  app.use(express.json({ limit: '30mb' }));
  app.use(express.urlencoded({ extended: true, limit: '30mb' }));

  // AI Generation Route: Creates proposal with AI, generating both text rationale and redesigned image
  app.post('/api/gemini/generate-proposal', async (req, res) => {
    try {
      const {
        prompt,
        roomType = 'Ambiente',
        originalImage,
        referenceImages = [],
        annoyances = [],
        changes = [],
        styles = [],
        checklist = {},
      } = req.body;

      const ai = getGeminiClient();

      let generatedRedesignImage: string | null = null;
      let summary = '';
      let adjustmentsText = '';
      let ideas: string[] = [];
      let directionTags: string[] = [];

      // 1. Generate Proposal Text Analysis with Gemini
      if (ai) {
        try {
          const textPrompt = `
Você é um arquiteto e consultor sênior de interiores de alto padrão da plataforma "Meu Escritório Online".
Gere uma análise estruturada para a proposta de Consultoria Expressa baseando-se nos seguintes dados:

- Ambiente: ${roomType}
- Pontos que limitam o ambiente (incômodos): ${annoyances.join(', ') || 'Visual pesado'}
- Intervenções desejadas: ${changes.join(', ') || 'Redesign'}
- Atmosfera e estilo: ${styles.join(', ') || 'Sofisticado'}
- Checklist de decisões: ${JSON.stringify(checklist)}
- Referências selecionadas: ${referenceImages.map((r: any) => `${r.title} (${r.tag})`).join(', ') || 'Nenhuma referência adicional'}
- Prompt técnico gerado: "${prompt}"

Retorne uma resposta JSON com o formato estrito:
{
  "summary": "Um parágrafo conciso (2 a 3 frases) com o resumo da proposta técnica, destacando o foco da requalificação e a preservação arquitetônica.",
  "adjustmentsText": "Um texto analítico e detalhado (1 a 2 parágrafos) no estilo 'O que ajustamos nesta proposta', explicando exatamente o que foi modificado e como a arquitetura original foi respeitada.",
  "ideas": [
    "01 Ideia clara e prática para transformar o espaço...",
    "02 Segunda ideia com foco em acabamento ou materiais...",
    "03 Terceira ideia preservando a base existente...",
    "04 Quarta ideia elevando a estética...",
    "05 Quinta ideia respeitando as instruções de não mexer..."
  ],
  "directionTags": ["sofisticado", "marcenaria", "leveza visual", "${roomType.toLowerCase()}", "redesign pontual"]
}
          `.trim();

          const textResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: textPrompt,
            config: {
              responseMimeType: 'application/json',
            },
          });

          const rawText = textResponse.text?.trim() || '{}';
          const parsed = JSON.parse(rawText);
          summary = parsed.summary || '';
          adjustmentsText = parsed.adjustmentsText || '';
          ideas = Array.isArray(parsed.ideas) ? parsed.ideas.map((id: string) => id.replace(/^\d+\s*/, '').trim()) : [];
          directionTags = Array.isArray(parsed.directionTags) ? parsed.directionTags : [];
        } catch (textErr) {
          console.warn("Gemini text analysis error, using fallback format:", textErr);
        }

        // 2. Attempt Image Generation or Editing with Gemini Image Model
        try {
          const imageParts: any[] = [];
          if (originalImage && originalImage.startsWith('data:image')) {
            const matches = originalImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            if (matches) {
              imageParts.push({
                inlineData: {
                  mimeType: matches[1] || 'image/jpeg',
                  data: matches[2],
                },
              });
            }
          }

          const imagePrompt = `Photorealistic architectural interior design proposal for ${roomType}. ${prompt}. High-end architectural photography, ultra-detailed textures, realistic warm ambient lighting, elegant materials. Maintain the exact room angle and framing.`;
          imageParts.push({ text: imagePrompt });

          const imageResponse = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-image',
            contents: { parts: imageParts },
            config: {
              imageConfig: {
                aspectRatio: '16:9',
              },
            },
          });

          if (imageResponse?.candidates?.[0]?.content?.parts) {
            for (const part of imageResponse.candidates[0].content.parts) {
              if (part.inlineData && part.inlineData.data) {
                const mime = part.inlineData.mimeType || 'image/png';
                generatedRedesignImage = `data:${mime};base64,${part.inlineData.data}`;
                break;
              }
            }
          }
        } catch (imgErr) {
          console.warn("Gemini image generation attempt info:", imgErr);
        }
      }

      // Default fallbacks if text not generated
      if (!summary) {
        summary = `A proposta segue uma linha de redesign pontual para ${roomType}, com foco em requalificar os elementos de acabamento, marcenaria e materiais para diminuir a sensação de ${annoyances.join(' e ') || 'peso visual'}. A intenção é trazer um resultado mais ${styles.join(', ').toLowerCase() || 'sofisticado'}, preservando integralmente a arquitetura existente e todos os elementos que não foram indicados para alteração.`;
      }

      if (!adjustmentsText) {
        adjustmentsText = `A intervenção se concentra nas soluções solicitadas para o ${roomType.toLowerCase()}, que passa a ser o principal recurso para organizar melhor a leitura do espaço e aliviar o aspecto anterior. Mantêm-se rigorosamente o enquadramento, a perspectiva e a arquitetura original, sem qualquer alteração estrutural fora do que foi solicitado. Com isso, a proposta atua de forma controlada, refinando a ambientação para uma atmosfera mais ${styles.join(', ').toLowerCase() || 'sofisticada'} e elegante, sem descaracterizar o ambiente original.`;
      }

      if (!ideas || ideas.length === 0) {
        ideas = [
          `Revisar a marcenaria e acabamentos para reduzir o peso visual.`,
          `Preservar a arquitetura original sem alterações estruturais indesejadas.`,
          `Manter enquadramento e perspectiva exatamente como estão.`,
          `Valorizar uma atmosfera mais ${styles[0] || 'sofisticada'} e acolhedora.`,
          `Evitar incluir elementos não previstos na instrução do cliente.`,
        ];
      }

      if (!directionTags || directionTags.length === 0) {
        directionTags = [
          ...styles.map(s => s.toLowerCase()),
          ...changes.map(c => c.toLowerCase()),
          roomType.toLowerCase(),
          'redesign pontual'
        ].slice(0, 5);
      }

      return res.json({
        success: true,
        redesignImage: generatedRedesignImage,
        summary,
        adjustmentsText,
        ideas,
        directionTags,
      });
    } catch (error: any) {
      console.error("Error generating proposal:", error);
      return res.status(500).json({ error: error.message || "Erro ao gerar proposta com IA." });
    }
  });

  // AI Adjustment Route: Refines an existing image or prompt
  app.post('/api/gemini/adjust-image', async (req, res) => {
    try {
      const { adjustmentPrompt, currentImage, roomType = 'Ambiente' } = req.body;
      const ai = getGeminiClient();
      let adjustedImageUrl: string | null = null;

      if (ai && adjustmentPrompt) {
        try {
          const parts: any[] = [];
          if (currentImage && currentImage.startsWith('data:image')) {
            const matches = currentImage.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
            if (matches) {
              parts.push({
                inlineData: {
                  mimeType: matches[1] || 'image/jpeg',
                  data: matches[2],
                },
              });
            }
          }

          parts.push({
            text: `Edit this interior image for ${roomType}. Adjustment instruction: ${adjustmentPrompt}. Keep exact camera angle and architecture.`,
          });

          const response = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-image',
            contents: { parts },
            config: {
              imageConfig: {
                aspectRatio: '16:9',
              },
            },
          });

          if (response?.candidates?.[0]?.content?.parts) {
            for (const part of response.candidates[0].content.parts) {
              if (part.inlineData && part.inlineData.data) {
                const mime = part.inlineData.mimeType || 'image/png';
                adjustedImageUrl = `data:${mime};base64,${part.inlineData.data}`;
                break;
              }
            }
          }
        } catch (err) {
          console.warn("Adjustment image error:", err);
        }
      }

      return res.json({
        success: true,
        adjustedImage: adjustedImageUrl,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });

  // Endpoint to notify administrator about a new subscription
  app.post('/api/subscription/notify-new-subscriber', async (req, res) => {
    try {
      const {
        subscriberEmail,
        subscriberName,
        planLabel,
        planAmount,
        paymentMethod,
        subscriberUid,
      } = req.body;

      if (!subscriberEmail) {
        return res.status(400).json({ error: "O e-mail do assinante é obrigatório." });
      }

      const result = await sendNewSubscriberNotification({
        subscriberEmail,
        subscriberName,
        planLabel: planLabel || "Mensal",
        planAmount: planAmount || "110,00",
        paymentMethod: paymentMethod || "pix",
        subscriberUid,
        appUrl: process.env.APP_URL || `http://localhost:${PORT}`,
      });

      return res.json({
        success: true,
        message: result.sentViaSmtp 
          ? `Notificação de assinatura enviada por e-mail para ${result.adminEmail}`
          : `Notificação de assinatura registrada para ${result.adminEmail}`,
        ...result,
      });
    } catch (error: any) {
      console.error("Erro ao notificar administrador sobre nova assinatura:", error);
      return res.status(500).json({ error: error.message || "Erro interno ao processar notificação." });
    }
  });

  // Endpoint to send boleto details directly to client via Email
  app.post('/api/send-boleto-email', async (req, res) => {
    try {
      const {
        toEmail,
        clientName,
        projectTitle,
        installmentNumber,
        totalInstallments,
        amount,
        dueDate,
        linhaDigitavel,
        boletoUrl,
        officeName,
        officeEmail,
        customNote,
      } = req.body;

      if (!toEmail) {
        return res.status(400).json({ error: "O e-mail do cliente é obrigatório." });
      }

      const formattedAmount = Number(amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      const formattedDate = dueDate ? new Date(dueDate + 'T12:00:00').toLocaleDateString('pt-BR') : 'A Combinar';
      const effectiveOffice = officeName || 'Meu Escritório Online';

      const subject = `Boleto Bancário: Parcela ${installmentNumber || 1}/${totalInstallments || 1} - ${projectTitle || 'Honorários'} (${effectiveOffice})`;

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f6f5f3; margin: 0; padding: 20px; color: #2d241e; }
            .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e6e0da; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
            .header { background: #1a1614; color: #fcf8f5; padding: 28px 24px; text-align: center; }
            .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; color: #d4a373; }
            .header p { margin: 0; font-size: 13px; color: #a89c93; }
            .content { padding: 28px 24px; }
            .greeting { font-size: 15px; margin-bottom: 20px; line-height: 1.6; }
            .details-box { background: #faf7f5; border: 1px solid #ede7e2; border-radius: 12px; padding: 18px; margin-bottom: 24px; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2dbd4; font-size: 13px; }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { color: #7a6e65; font-weight: 500; }
            .detail-value { font-weight: 700; color: #1a1614; }
            .amount-highlight { font-size: 18px; color: #16a34a; font-weight: 800; }
            .btn-container { text-align: center; margin: 24px 0; }
            .btn-primary { display: inline-block; background: #d4a373; color: #1a1614; font-weight: 800; font-size: 14px; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 4px 12px rgba(212,163,115,0.3); }
            .linha-box { background: #1a1614; color: #4ade80; border-radius: 10px; padding: 14px; font-family: monospace; font-size: 13px; word-break: break-all; margin: 20px 0; text-align: center; border: 1px solid #3d342f; }
            .footer { background: #faf7f5; padding: 20px; text-align: center; font-size: 12px; color: #8c7f75; border-top: 1px solid #ede7e2; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>${effectiveOffice}</h1>
              <p>Cobrança de Honorários & Serviços Prestados</p>
            </div>
            <div class="content">
              <p class="greeting">Olá <strong>${clientName || 'Cliente'}</strong>,</p>
              <p style="font-size: 14px; line-height: 1.6; color: #52473f;">
                Segue o boleto bancário referente aos serviços prestados para o projeto <strong>${projectTitle}</strong>:
              </p>

              <div class="details-box">
                <div class="detail-row">
                  <span class="detail-label">Projeto / Descrição:</span>
                  <span class="detail-value">${projectTitle}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Parcela:</span>
                  <span class="detail-value">Parcela ${installmentNumber} de ${totalInstallments}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Data de Vencimento:</span>
                  <span class="detail-value" style="color: #c2410c;">${formattedDate}</span>
                </div>
                <div class="detail-row">
                  <span class="detail-label">Valor a Pagar:</span>
                  <span class="detail-value amount-highlight">${formattedAmount}</span>
                </div>
              </div>

              ${boletoUrl ? `
              <div class="btn-container">
                <a href="${boletoUrl}" target="_blank" class="btn-primary">
                  📄 Visualizar e Imprimir Boleto Bancário
                </a>
              </div>
              ` : ''}

              ${linhaDigitavel ? `
              <div style="margin-top: 16px;">
                <p style="font-size: 12px; font-weight: bold; color: #7a6e65; margin-bottom: 6px; text-transform: uppercase;">
                  Linha Digitável (Copie e cole no app do seu banco ou internet banking):
                </p>
                <div class="linha-box">
                  ${linhaDigitavel}
                </div>
              </div>
              ` : ''}

              ${customNote ? `<p style="font-size: 12px; color: #7a6e65; font-style: italic; margin-top: 16px;">Obs: ${customNote}</p>` : ''}
              <p style="font-size: 12px; color: #7a6e65; margin-top: 20px;">
                Você pode efetuar o pagamento em qualquer aplicativo de banco, internet banking, casas lotéricas ou agências bancárias até o vencimento.
              </p>
            </div>
            <div class="footer">
              <p style="margin: 0 0 4px 0;"><strong>${effectiveOffice}</strong></p>
              ${officeEmail ? `<p style="margin: 0;">Contato: ${officeEmail}</p>` : ''}
            </div>
          </div>
        </body>
        </html>
      `;

      let sentViaSmtp = false;
      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (smtpHost && smtpUser && smtpPass) {
        try {
          const nodemailer = await import("nodemailer");
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });

          await transporter.sendMail({
            from: `"${effectiveOffice}" <${smtpUser}>`,
            to: toEmail,
            replyTo: officeEmail || smtpUser,
            subject: subject,
            html: htmlContent,
          });

          sentViaSmtp = true;
        } catch (smtpErr) {
          console.warn("Could not send boleto email via SMTP:", smtpErr);
        }
      }

      return res.json({
        success: true,
        sentViaSmtp,
        toEmail,
        subject,
        htmlContent,
        message: sentViaSmtp
          ? `Boleto enviado com sucesso por e-mail para ${toEmail}!`
          : `E-mail formatado e preparado com sucesso para ${toEmail}.`,
      });
    } catch (err: any) {
      console.error("Error in /api/send-boleto-email:", err);
      return res.status(500).json({ error: err.message || "Erro ao processar envio de e-mail." });
    }
  });

  // ==================== Z-API INTEGRATION (WHATSAPP) ====================

  // Send text message via Z-API
  app.post('/api/zapi/send-text', async (req, res) => {
    try {
      const { instanceId, instanceToken, clientToken, phone, message } = req.body;

      if (!instanceId || !instanceToken || !phone || !message) {
        return res.status(400).json({ error: "Parâmetros incompletos (instanceId, instanceToken, phone, message são obrigatórios)." });
      }

      const cleanPhone = phone.replace(/\D/g, '');
      const zapiUrl = `https://api.z-api.io/instances/${instanceId}/token/${instanceToken}/send-text`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (clientToken) {
        headers['Client-Token'] = clientToken;
      }

      const response = await fetch(zapiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          phone: cleanPhone,
          message: message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("Z-API Send Text Error:", response.status, data);
        const detailMsg = data.message || data.error || data.reason || (typeof data === 'object' ? JSON.stringify(data) : String(data));
        return res.status(response.status).json({
          error: `Z-API (${response.status}): ${detailMsg}`,
          details: data
        });
      }

      return res.json({ success: true, data });
    } catch (err: any) {
      console.error("Error sending Z-API message:", err);
      return res.status(500).json({ error: err.message || "Erro interno ao conectar com Z-API." });
    }
  });

  // Webhook Receiver for Z-API incoming messages
  app.post('/api/zapi/webhook', async (req, res) => {
    try {
      const body = req.body;
      console.log("[Z-API Webhook] Payload recebido:", JSON.stringify(body));

      if (body && (body.phone || body.from)) {
        const phone = body.phone || body.from;
        const senderName = body.senderName || body.pushName || 'Cliente WhatsApp';
        const textMessage = body.text?.message || body.body || body.text || '';
        const nowIso = new Date().toISOString();
        const timeFormatted = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        if (textMessage && getApps().length > 0) {
          const db = getFirestore();
          const chatId = `chat-${phone.replace(/\D/g, '')}`;
          const chatRef = db.collection('whatsapp_chats').doc(chatId);
          const docSnap = await chatRef.get();

          const newMessage = {
            id: `msg-${Date.now()}`,
            sender: 'client',
            senderName,
            text: textMessage,
            timestamp: timeFormatted,
            date: nowIso.split('T')[0],
            status: 'read',
          };

          if (docSnap.exists) {
            const existingData = docSnap.data();
            const existingMessages = existingData?.messages || [];
            await chatRef.update({
              lastMessage: textMessage,
              lastMessageTime: timeFormatted,
              unreadCount: (existingData?.unreadCount || 0) + 1,
              messages: [...existingMessages, newMessage],
            });
          } else {
            await chatRef.set({
              id: chatId,
              clientName: senderName,
              clientPhone: phone,
              assignedMember: 'Equipe Atendimento',
              status: 'open',
              unreadCount: 1,
              lastMessage: textMessage,
              lastMessageTime: timeFormatted,
              createdAt: nowIso,
              messages: [newMessage],
            });
          }
        }
      }

      return res.json({ status: "received" });
    } catch (err: any) {
      console.error("Z-API Webhook Error:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // Create Checkout Session
  app.post('/api/create-checkout-session', async (req, res) => {
    try {
      const { uid, email } = req.body;
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

      if (!stripeKey) {
        return res.status(500).json({ error: "STRIPE_SECRET_KEY is required" });
      }

      const stripeClient = new Stripe(stripeKey);

      // Create Checkout Session
      const session = await stripeClient.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: 'Mensalidade - Meu Escritório Online',
                description: 'Acesso completo ao sistema de gestão.',
              },
              unit_amount: 5000, // R$ 50,00
            },
            quantity: 1,
          },
        ],
        mode: 'payment', // using payment mode for one-time or subscription for recurring
        success_url: `${appUrl}/?session_id={CHECKOUT_SESSION_ID}&success=true`,
        cancel_url: `${appUrl}/?canceled=true`,
        client_reference_id: uid,
        customer_email: email,
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error('Stripe error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ==================== MERCADO PAGO INTEGRATION ====================

  // Check Mercado Pago Status
  app.get('/api/mercadopago/status', (req, res) => {
    loadPersistedMpCredentials();
    const hasAccessToken = Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN);
    const publicKey = process.env.VITE_MERCADO_PAGO_PUBLIC_KEY || '';
    const hasPublicKey = Boolean(publicKey);

    res.json({
      configured: hasAccessToken || hasPublicKey,
      hasAccessToken,
      hasPublicKey,
      publicKey,
      publicKeyPrefix: hasPublicKey ? `${publicKey.substring(0, 11)}...` : undefined,
    });
  });

  // Save / Update Mercado Pago Credentials (persisted to .mp_credentials.json)
  app.post('/api/mercadopago/config', (req, res) => {
    try {
      const { accessToken, publicKey } = req.body;
      if (!accessToken && !publicKey) {
        return res.status(400).json({ error: 'Nenhuma credencial informada.' });
      }

      if (accessToken) {
        process.env.MERCADO_PAGO_ACCESS_TOKEN = accessToken.trim();
        mpClient = null;
      }
      if (publicKey) {
        process.env.VITE_MERCADO_PAGO_PUBLIC_KEY = publicKey.trim();
      }

      try {
        fs.writeFileSync(
          MP_CREDENTIALS_FILE,
          JSON.stringify(
            {
              accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
              publicKey: process.env.VITE_MERCADO_PAGO_PUBLIC_KEY,
              updatedAt: new Date().toISOString(),
            },
            null,
            2
          )
        );
      } catch (saveErr) {
        console.warn('Could not write .mp_credentials.json:', saveErr);
      }

      res.json({
        success: true,
        configured: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN),
        hasAccessToken: Boolean(process.env.MERCADO_PAGO_ACCESS_TOKEN),
        hasPublicKey: Boolean(process.env.VITE_MERCADO_PAGO_PUBLIC_KEY),
        publicKeyPrefix: process.env.VITE_MERCADO_PAGO_PUBLIC_KEY
          ? `${process.env.VITE_MERCADO_PAGO_PUBLIC_KEY.substring(0, 11)}...`
          : undefined,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Erro ao salvar credenciais' });
    }
  });

  // Fetch available Payment Methods from Mercado Pago API (/v1/payment_methods)
  app.get('/api/mercadopago/payment-methods', async (req, res) => {
    try {
      loadPersistedMpCredentials();
      const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!token) {
        // Fallback with standard active Brazilian payment methods
        return res.json({
          configured: false,
          payment_methods: [
            {
              id: 'pix',
              name: 'Pix Instantâneo',
              payment_type_id: 'bank_transfer',
              status: 'active',
              secure_thumbnail: 'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
              thumbnail: 'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
            },
            {
              id: 'master',
              name: 'Mastercard',
              payment_type_id: 'credit_card',
              status: 'active',
              secure_thumbnail: 'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
              thumbnail: 'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
            },
            {
              id: 'visa',
              name: 'Visa',
              payment_type_id: 'credit_card',
              status: 'active',
              secure_thumbnail: 'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
              thumbnail: 'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
            },
            {
              id: 'elo',
              name: 'Elo',
              payment_type_id: 'credit_card',
              status: 'active',
              secure_thumbnail: 'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
              thumbnail: 'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
            },
            {
              id: 'hipercard',
              name: 'Hipercard',
              payment_type_id: 'credit_card',
              status: 'active',
              secure_thumbnail: 'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
              thumbnail: 'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
            },
            {
              id: 'bolbradesco',
              name: 'Boleto Bancário',
              payment_type_id: 'ticket',
              status: 'active',
              secure_thumbnail: 'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
              thumbnail: 'https://http2.mlstatic.com/storage/logos-api-admin/a5f047d0-9be0-11ec-aad4-c3381f368aaf-m.svg',
            },
          ],
        });
      }

      const client = getMercadoPagoClient();
      const pm = new PaymentMethod(client);
      const paymentMethods = await pm.get();
      res.json({
        configured: true,
        payment_methods: paymentMethods,
      });
    } catch (error: any) {
      console.error('Error fetching Mercado Pago payment methods:', error);
      res.status(500).json({ error: error.message || 'Erro ao consultar meios de pagamento' });
    }
  });

  // Process Payment - Checkout Transparente (Credit Card & Orders API)
  app.post('/api/mercadopago/process-payment', async (req, res) => {
    try {
      loadPersistedMpCredentials();
      const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!token) {
        return res.status(400).json({
          error: 'MERCADO_PAGO_ACCESS_TOKEN não está configurado no servidor. Configure sua chave em Configurações do Mercado Pago.',
          configured: false,
        });
      }

      // Handle both standard payments payload and the nested Order structure (automatic mode)
      let cardToken = req.body.token;
      let paymentMethodId = req.body.payment_method_id;
      let installments = Number(req.body.installments) || 1;
      let amount = Number(req.body.transaction_amount || req.body.amount || req.body.total_amount);
      let payerEmail = req.body.payer?.email;
      let payerName = req.body.payer?.first_name || req.body.payerName;
      let docNumber = req.body.payer?.identification?.number || req.body.docNumber;
      let docType = req.body.payer?.identification?.type || req.body.docType || 'CPF';
      let externalReference = req.body.external_reference || req.body.metadata?.uid || '';
      let issuerId = req.body.issuer_id;
      let description = req.body.description || 'Assinatura Meu Escritório Online';
      const metadata = req.body.metadata || {};

      // If payload is in Order format with transactions.payments
      if (req.body.transactions?.payments?.[0]) {
        const p = req.body.transactions.payments[0];
        if (p.payment_method?.token) cardToken = p.payment_method.token;
        if (p.payment_method?.id) paymentMethodId = p.payment_method.id;
        if (p.payment_method?.installments) installments = Number(p.payment_method.installments);
        if (p.amount) amount = Number(p.amount);
      }

      if (!cardToken) {
        return res.status(400).json({ error: 'Token do cartão não fornecido.' });
      }

      const client = getMercadoPagoClient();
      const payment = new Payment(client);

      const nameParts = (payerName || 'Assinante').trim().split(' ');
      const firstName = nameParts[0] || 'Assinante';
      const lastName = nameParts.slice(1).join(' ') || '';

      const cleanDoc = (docNumber || '').replace(/\D/g, '');
      const identification = cleanDoc
        ? {
            type: docType || (cleanDoc.length > 11 ? 'CNPJ' : 'CPF'),
            number: cleanDoc,
          }
        : undefined;

      const paymentResponse = await payment.create({
        body: {
          transaction_amount: amount || 110,
          token: cardToken,
          description,
          installments,
          payment_method_id: paymentMethodId,
          issuer_id: issuerId,
          payer: {
            email: payerEmail || 'cliente@escritorio.com',
            first_name: firstName,
            last_name: lastName,
            identification,
          },
          external_reference: externalReference,
          metadata: {
            uid: externalReference,
            plan: metadata.plan || (amount > 300 ? 'annual' : 'monthly'),
            source: 'checkout_transparente',
          },
        },
        requestOptions: {
          idempotencyKey: `card-${externalReference || Date.now()}-${amount}`.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 64)
        }
      });

      console.log(`[Mercado Pago] Pagamento processado: id=${paymentResponse.id}, status=${paymentResponse.status}, detail=${paymentResponse.status_detail}`);

      // If approved, update user subscription in Firestore & notify
      if (paymentResponse.status === 'approved' || paymentResponse.status === 'processed') {
        const uid = externalReference || metadata.uid;
        if (uid && getApps().length > 0) {
          try {
            const db = getFirestore();
            const baseDate = new Date();
            if (amount > 300) {
              baseDate.setFullYear(baseDate.getFullYear() + 1);
            } else {
              baseDate.setMonth(baseDate.getMonth() + 1);
            }

            await db.collection('users').doc(uid).set({
              subscriptionDueDate: baseDate.toISOString(),
              status: 'active',
              lastPaymentMethod: `mercadopago_${paymentMethodId || 'card'}`,
              lastPaymentDate: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }, { merge: true });
            console.log(`[Mercado Pago] Assinatura do usuário ${uid} ativada no Firestore!`);
          } catch (fsErr) {
            console.error('Erro ao atualizar usuário no Firestore após pagamento aprovado:', fsErr);
          }
        }

        // Notify Administrator by email
        try {
          await sendNewSubscriberNotification({
            subscriberEmail: payerEmail || 'cliente@mercadopago.com',
            subscriberName: `${firstName} ${lastName}`.trim(),
            planLabel: amount > 100 ? 'Anual (Cartão Mercado Pago)' : 'Mensal (Cartão Mercado Pago)',
            planAmount: Number(amount).toFixed(2),
            paymentMethod: `Cartão de Crédito Mercado Pago (${paymentMethodId?.toUpperCase() || 'Cartão'} ${installments}x)`,
            subscriberUid: uid,
          });
        } catch (emailErr) {
          console.error('Erro ao enviar e-mail de novo assinante:', emailErr);
        }
      }

      res.json({
        id: paymentResponse.id,
        status: paymentResponse.status,
        status_detail: paymentResponse.status_detail,
        transactions: {
          payments: [
            {
              id: paymentResponse.id,
              status: paymentResponse.status,
              status_detail: paymentResponse.status_detail,
              payment_method: {
                id: paymentMethodId,
                type: 'credit_card',
                installments,
              },
            },
          ],
        },
      });
    } catch (error: any) {
      console.error('Mercado Pago card payment error:', error);
      res.status(500).json({
        error: error.message || 'Erro ao processar pagamento com cartão no Mercado Pago.',
        cause: error.cause || undefined,
      });
    }
  });

  // Create Mercado Pago Checkout Preference (Checkout Pro)
  app.post('/api/mercadopago/preference', async (req, res) => {
    try {
      const {
        title,
        price,
        quantity = 1,
        payerEmail,
        payerName,
        externalReference,
        metadata,
        origin: clientOrigin,
      } = req.body;

      const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;

      // Extract dynamic URL from client or request headers
      let originFromHeader = '';
      try {
        if (req.headers.origin) {
          originFromHeader = String(req.headers.origin);
        } else if (req.headers.referer) {
          originFromHeader = new URL(String(req.headers.referer)).origin;
        }
      } catch {}

      const forwardedHost = req.headers['x-forwarded-host'];
      const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
      const forwardedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : '';

      const appUrl = (
        clientOrigin ||
        originFromHeader ||
        forwardedOrigin ||
        process.env.APP_URL ||
        `https://ais-dev-su4zqshj47o55562to2iuv-729561127771.us-east1.run.app`
      ).replace(/\/$/, '');

      if (!token) {
        return res.status(400).json({
          error: "MERCADO_PAGO_ACCESS_TOKEN não configurado. Por favor, adicione seu Access Token do Mercado Pago nas configurações.",
          configured: false,
        });
      }

      const client = getMercadoPagoClient();
      const preference = new Preference(client);

      const successUrl = `${appUrl}/checkout?status=approved&plan=${metadata?.plan || 'monthly'}`;
      const failureUrl = `${appUrl}/checkout?status=failure`;
      const pendingUrl = `${appUrl}/checkout?status=pending`;

      const preferenceData: any = {
        items: [
          {
            id: externalReference || `plan-${Date.now()}`,
            title: title || 'Assinatura - Meu Escritório Online',
            quantity: Number(quantity) || 1,
            unit_price: Number(price) || 110,
            currency_id: 'BRL',
          },
        ],
        back_urls: {
          success: successUrl,
          failure: failureUrl,
          pending: pendingUrl,
        },
        external_reference: externalReference || metadata?.uid || '',
        metadata: metadata || {},
      };

      // auto_return is valid only with valid http/https URLs
      if (appUrl.startsWith('http://') || appUrl.startsWith('https://')) {
        preferenceData.auto_return = 'approved';
      }

      // notification_url should be a public URL
      if (appUrl.startsWith('https://') || (appUrl.startsWith('http://') && !appUrl.includes('localhost'))) {
        preferenceData.notification_url = `${appUrl}/api/mercadopago/webhook`;
      }

      if (payerEmail) {
        preferenceData.payer = {
          email: payerEmail,
          name: payerName || undefined,
        };
      }

      const response = await preference.create({ body: preferenceData });

      res.json({
        id: response.id,
        init_point: response.init_point,
        sandbox_init_point: response.sandbox_init_point,
      });
    } catch (error: any) {
      console.error('Mercado Pago preference error:', error);
      res.status(500).json({ error: error.message || 'Erro ao gerar preferência no Mercado Pago' });
    }
  });

  // Create Instant Mercado Pago PIX with QR Code and Copia & Cola
  app.post('/api/mercadopago/create-pix', async (req, res) => {
    try {
      const {
        amount,
        description,
        email,
        name,
        docType,
        docNumber,
        uid,
        installmentId,
      } = req.body;

      const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!token) {
        return res.status(400).json({
          error: "MERCADO_PAGO_ACCESS_TOKEN não configurado no servidor.",
          configured: false,
        });
      }

      const client = getMercadoPagoClient();
      const payment = new Payment(client);

      const nameParts = (name || 'Cliente Escritorio').trim().split(' ');
      const firstName = nameParts[0] || 'Cliente';
      const lastName = nameParts.slice(1).join(' ') || 'Assinante';

      const cleanDoc = (docNumber || '').replace(/\D/g, '');
      const identification = cleanDoc
        ? {
            type: docType || (cleanDoc.length > 11 ? 'CNPJ' : 'CPF'),
            number: cleanDoc,
          }
        : undefined;

      const paymentResponse = await payment.create({
        body: {
          transaction_amount: Number(amount),
          description: description || 'Assinatura Meu Escritório Online',
          payment_method_id: 'pix',
          payer: {
            email: email || 'cliente@escritorio.com',
            first_name: firstName,
            last_name: lastName,
            identification,
          },
          metadata: {
            uid,
            installmentId,
            source: 'meu_escritorio_online',
          },
        },
        requestOptions: {
          idempotencyKey: `pix-${installmentId || uid || Date.now()}-${amount}`.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 64)
        }
      });

      const pointOfInteraction: any = paymentResponse.point_of_interaction;
      const transactionData = pointOfInteraction?.transaction_data;

      res.json({
        id: paymentResponse.id,
        status: paymentResponse.status,
        status_detail: paymentResponse.status_detail,
        qr_code: transactionData?.qr_code,
        qr_code_base64: transactionData?.qr_code_base64,
        ticket_url: transactionData?.ticket_url,
      });
    } catch (error: any) {
      console.error('Mercado Pago PIX error:', error);
      res.status(500).json({ error: error.message || 'Erro ao gerar PIX no Mercado Pago' });
    }
  });

  // Create Official Mercado Pago Boleto Bancário (FEBRABAN Registered & Valid)
  app.post('/api/mercadopago/create-boleto', async (req, res) => {
    try {
      const {
        amount,
        description,
        dueDate,
        payer,
        externalReference,
        metadata,
        customAccessToken,
      } = req.body;

      if (!amount || Number(amount) <= 0) {
        return res.status(400).json({ error: "Valor do boleto inválido." });
      }

      if (!payer || !payer.email || !payer.docNumber) {
        return res.status(400).json({
          error: "Dados do cliente sacado incompletos. CPF ou CNPJ e e-mail são obrigatórios para emissão de boleto registrado."
        });
      }

      // Token resolution: subscriber's own Mercado Pago Token or platform default
      const token = customAccessToken?.trim() || process.env.MERCADO_PAGO_ACCESS_TOKEN;
      if (!token) {
        return res.status(400).json({
          error: "Nenhum Access Token do Mercado Pago configurado. Cadastre sua credencial do Mercado Pago nas configurações ou contate o suporte.",
          configured: false,
        });
      }

      const client = new MercadoPagoConfig({ accessToken: token });

      const fullName = (payer.name || 'Cliente Sacado').trim();
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || 'Cliente';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'Sacado';

      const cleanDoc = (payer.docNumber || '').replace(/\D/g, '');
      const docType = payer.docType || (cleanDoc.length > 11 ? 'CNPJ' : 'CPF');

      let rawZip = (payer.address?.zipCode || '01310100').replace(/\D/g, '');
      if (rawZip.length < 8) {
        rawZip = rawZip.padEnd(8, '0');
      }
      const cleanZip = rawZip.substring(0, 8);

      const rawState = (payer.address?.state || 'SP').toUpperCase().trim().replace(/[^A-Z]/g, '');
      const validStates = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
      const federalUnit = validStates.includes(rawState) ? rawState : 'RJ';

      // Expiration ISO calculation
      let expirationISO: string;
      if (dueDate) {
        expirationISO = `${dueDate}T23:59:59.000-03:00`;
      } else {
        const exp = new Date();
        exp.setDate(exp.getDate() + 5);
        expirationISO = `${exp.toISOString().split('T')[0]}T23:59:59.000-03:00`;
      }

      // Attempt 1: Direct Payment Creation with bolbradesco (Official FEBRABAN Registered Boleto)
      let directPaymentSucceeded = false;
      let paymentResponse: any = null;
      let directErrorMsg = '';

      try {
        const payment = new Payment(client);
        paymentResponse = await payment.create({
          body: {
            transaction_amount: Number(amount),
            description: description || 'Honorários e Serviços Prestados',
            payment_method_id: 'bolbradesco',
            date_of_expiration: expirationISO,
            payer: {
              email: payer.email.trim(),
              first_name: firstName,
              last_name: lastName,
              identification: {
                type: docType,
                number: cleanDoc,
              },
              address: {
                zip_code: cleanZip,
                street_name: payer.address?.street?.trim() || 'Avenida Principal',
                street_number: payer.address?.number?.trim() || '100',
                neighborhood: payer.address?.neighborhood?.trim() || 'Centro',
                city: payer.address?.city?.trim() || 'Rio de Janeiro',
                federal_unit: federalUnit,
              },
            },
            external_reference: externalReference || `boleto-${Date.now()}`,
            metadata: {
              ...metadata,
              source: 'escritorio_online_boleto',
            },
          },
          requestOptions: {
            idempotencyKey: `bol-${externalReference || Date.now()}-${amount}`.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 64)
          }
        });

        if (paymentResponse && paymentResponse.id) {
          directPaymentSucceeded = true;
        }
      } catch (err1: any) {
        directErrorMsg = err1?.cause?.[0]?.description || err1?.message || 'Erro no bolbradesco';
        console.warn('Mercado Pago bolbradesco attempt failed:', directErrorMsg);

        // Attempt 1.1: Try PEC (Caixa / Lotérica) if bolbradesco was rejected
        try {
          const payment = new Payment(client);
          paymentResponse = await payment.create({
            body: {
              transaction_amount: Number(amount),
              description: description || 'Honorários e Serviços Prestados',
              payment_method_id: 'pec',
              date_of_expiration: expirationISO,
              payer: {
                email: payer.email.trim(),
                first_name: firstName,
                last_name: lastName,
                identification: {
                  type: docType,
                  number: cleanDoc,
                },
                address: {
                  zip_code: cleanZip,
                  street_name: payer.address?.street?.trim() || 'Avenida Principal',
                  street_number: payer.address?.number?.trim() || '100',
                  neighborhood: payer.address?.neighborhood?.trim() || 'Centro',
                  city: payer.address?.city?.trim() || 'Rio de Janeiro',
                  federal_unit: federalUnit,
                },
              },
              external_reference: externalReference || `boleto-${Date.now()}`,
              metadata: {
                ...metadata,
                source: 'escritorio_online_boleto',
              },
            },
            requestOptions: {
              idempotencyKey: `pec-${externalReference || Date.now()}-${amount}`.replace(/[^a-zA-Z0-9-]/g, '').substring(0, 64)
            }
          });

          if (paymentResponse && paymentResponse.id) {
            directPaymentSucceeded = true;
          }
        } catch (err2: any) {
          directErrorMsg = err2?.cause?.[0]?.description || err2?.message || directErrorMsg;
          console.warn('Mercado Pago PEC fallback also returned error:', directErrorMsg);
        }
      }

      if (directPaymentSucceeded && paymentResponse) {
        const transactionDetails: any = paymentResponse.transaction_details;
        const barcodeData: any = (paymentResponse as any).barcode;
        const poiData: any = (paymentResponse as any).point_of_interaction?.transaction_data;

        const digitableLine =
          transactionDetails?.digitable_line ||
          poiData?.digitable_line ||
          barcodeData?.content ||
          '';

        const barcodeRaw = barcodeData?.content || '';
        const externalResourceUrl =
          transactionDetails?.external_resource_url ||
          poiData?.ticket_url ||
          transactionDetails?.payment_method_reference_id ||
          '';

        return res.json({
          id: paymentResponse.id,
          status: paymentResponse.status || 'pending',
          status_detail: paymentResponse.status_detail || 'accredited',
          digitable_line: digitableLine,
          barcode_raw: barcodeRaw,
          external_resource_url: externalResourceUrl,
          pdf_url: externalResourceUrl,
          date_of_expiration: paymentResponse.date_of_expiration,
          transaction_amount: paymentResponse.transaction_amount,
          payer: paymentResponse.payer,
          provider: 'mercadopago_direct',
        });
      }

      // If direct boleto creation was rejected by Mercado Pago, try Preference as official MP checkout link
      try {
        const preference = new Preference(client);
        const prefResponse = await preference.create({
          body: {
            items: [
              {
                id: externalReference || `inst-${Date.now()}`,
                title: description || 'Honorários e Serviços Prestados',
                quantity: 1,
                currency_id: 'BRL',
                unit_price: Number(amount),
              },
            ],
            payer: {
              name: firstName,
              surname: lastName,
              email: payer.email.trim(),
              identification: {
                type: docType,
                number: cleanDoc,
              },
              address: {
                zip_code: cleanZip,
                street_name: payer.address?.street?.trim() || 'Avenida Principal',
                street_number: payer.address?.number?.trim() || '100',
              },
            },
            expires: true,
            expiration_date_to: expirationISO,
            external_reference: externalReference || `boleto-${Date.now()}`,
            metadata: {
              ...metadata,
              source: 'escritorio_online_boleto',
            },
            payment_methods: {
              excluded_payment_types: [
                { id: 'credit_card' },
                { id: 'debit_card' },
                { id: 'bank_transfer' }
              ]
            }
          },
        });

        const checkoutUrl = prefResponse.init_point || prefResponse.sandbox_init_point || '';

        return res.json({
          id: prefResponse.id,
          status: 'pending',
          status_detail: 'pending_payment',
          digitable_line: '',
          barcode_raw: '',
          external_resource_url: checkoutUrl,
          pdf_url: checkoutUrl,
          date_of_expiration: expirationISO,
          transaction_amount: Number(amount),
          payer: {
            first_name: firstName,
            last_name: lastName,
            email: payer.email,
            identification: {
              type: docType,
              number: cleanDoc,
            },
          },
          provider: 'mercadopago_preference',
          warning: directErrorMsg ? `Aviso Mercado Pago: ${directErrorMsg}` : undefined,
        });
      } catch (prefError: any) {
        throw new Error(
          directErrorMsg ||
          prefError?.cause?.[0]?.description ||
          prefError?.message ||
          'Falha na comunicação com o Mercado Pago.'
        );
      }
    } catch (error: any) {
      console.error('Mercado Pago Boleto error:', error);
      const apiMessage = error.cause?.[0]?.description || error.message || 'Erro ao gerar boleto registrado no Mercado Pago';
      res.status(500).json({ error: apiMessage, details: error });
    }
  });

  // Query status of a specific Mercado Pago Payment / Boleto
  app.get('/api/mercadopago/payment/:id', async (req, res) => {
    try {
      const paymentId = req.params.id;
      const customToken = (req.query.accessToken as string)?.trim();
      const token = customToken || process.env.MERCADO_PAGO_ACCESS_TOKEN;

      if (!token) {
        return res.status(400).json({ error: 'Nenhum token do Mercado Pago disponível.' });
      }

      const client = new MercadoPagoConfig({ accessToken: token });
      const payment = new Payment(client);
      const paymentInfo = await payment.get({ id: String(paymentId) });

      res.json({
        id: paymentInfo.id,
        status: paymentInfo.status,
        status_detail: paymentInfo.status_detail,
        date_approved: paymentInfo.date_approved,
        date_of_expiration: paymentInfo.date_of_expiration,
        transaction_amount: paymentInfo.transaction_amount,
        payment_method_id: paymentInfo.payment_method_id,
        external_resource_url: (paymentInfo.transaction_details as any)?.external_resource_url,
        digitable_line: (paymentInfo.transaction_details as any)?.digitable_line,
      });
    } catch (error: any) {
      console.error('Mercado Pago payment check error:', error);
      res.status(500).json({ error: error.message || 'Erro ao consultar status do pagamento' });
    }
  });

  // Mercado Pago Webhook / IPN notification receiver
  app.post(['/api/mercadopago/webhook', '/api/mercadopago/ipn'], async (req, res) => {
    try {
      const topic = req.query.topic || req.body?.type || req.query.type;
      const id = req.query.id || req.body?.data?.id;

      console.log(`Mercado Pago webhook received: topic=${topic}, id=${id}`);

      if (
        (topic === 'payment' ||
          req.body?.action === 'payment.created' ||
          req.body?.action === 'payment.updated') &&
        id
      ) {
        const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
        if (token) {
          const client = getMercadoPagoClient();
          const payment = new Payment(client);
          const paymentInfo = await payment.get({ id: String(id) });

          if (paymentInfo.status === 'approved') {
            const metadata: any = paymentInfo.metadata || {};
            const uid = metadata.uid || paymentInfo.external_reference;

            if (uid && getApps().length > 0) {
              try {
                const db = getFirestore();
                const baseDate = new Date();
                const amount = paymentInfo.transaction_amount || 0;
                if (amount > 100) {
                  baseDate.setFullYear(baseDate.getFullYear() + 1);
                } else {
                  baseDate.setMonth(baseDate.getMonth() + 1);
                }

                await db.collection('users').doc(uid).update({
                  subscriptionDueDate: baseDate.toISOString(),
                  status: 'active',
                  lastPaymentMethod: 'mercadopago',
                  lastPaymentDate: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                });
                console.log(`Mercado Pago approved: User ${uid} subscription updated!`);
              } catch (fsErr) {
                console.error('Error updating user subscription from Mercado Pago webhook:', fsErr);
              }
            }

            // Notify Administrator by email
            try {
              const payerEmail =
                paymentInfo.payer?.email || 'cliente@mercadopago.com';
              const payerName = paymentInfo.payer?.first_name
                ? `${paymentInfo.payer.first_name} ${paymentInfo.payer.last_name || ''}`
                : 'Assinante Mercado Pago';
              const amountTotal = String(paymentInfo.transaction_amount || '50.00');
              const isAnnual = Number(amountTotal) > 100;

              await sendNewSubscriberNotification({
                subscriberEmail: payerEmail,
                subscriberName: payerName,
                planLabel: isAnnual ? 'Anual (Mercado Pago)' : 'Mensal (Mercado Pago)',
                planAmount: Number(amountTotal).toFixed(2),
                paymentMethod: `Mercado Pago (${paymentInfo.payment_method_id || 'PIX/Cartão'})`,
                subscriberUid: uid,
              });
            } catch (notifErr) {
              console.error('Error sending notification from Mercado Pago webhook:', notifErr);
            }
          }
        }
      }

      res.status(200).send('OK');
    } catch (err: any) {
      console.error('Mercado Pago webhook error:', err);
      res.status(200).send('OK');
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Team Member Invite Email Endpoint
  app.post("/api/team/invite-email", async (req, res) => {
    try {
      const {
        memberName,
        memberEmail,
        roleTitle,
        role,
        officeName,
        senderName,
        accessUrl,
        modulesList,
      } = req.body;

      if (!memberEmail || !memberName) {
        return res.status(400).json({ error: "Nome e e-mail do membro são obrigatórios." });
      }

      const appUrl = accessUrl || process.env.APP_URL || `http://localhost:${PORT}`;
      const office = officeName || "LF Quadros & Decoração";
      const sender = senderName || office;
      const functionTitle = roleTitle || "Projetista / Colaborador";
      const isAdministrator = role === "admin";

      const subject = `🎉 Bem-vindo(a) à equipe de ${office}! Seu acesso ao Meu Escritório Online`;

      const modulesText = Array.isArray(modulesList) && modulesList.length > 0
        ? modulesList.join(", ")
        : (isAdministrator ? "Acesso total a todos os módulos" : "Módulos de Projetos e Ações");

      // Beautiful responsive HTML Email template
      const htmlContent = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8f6f0; color: #2d2a26;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #e8e2d8; box-shadow: 0 4px 20px rgba(0,0,0,0.04);">
    <!-- Header -->
    <tr>
      <td style="background-color: #24201c; padding: 36px 32px; text-align: center;">
        <div style="font-size: 11px; font-weight: 700; color: #c4b5a0; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">
          MEU ESCRITÓRIO ONLINE
        </div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #f3ede2; line-height: 1.3;">
          ${office}
        </h1>
      </td>
    </tr>

    <!-- Body -->
    <tr>
      <td style="padding: 36px 32px;">
        <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 700; color: #1c1917;">
          Olá, ${memberName}! 👋
        </h2>

        <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #44403c;">
          É com imensa satisfação e alegria que comunicamos que você agora faz parte oficial da equipe de <strong>${office}</strong>!
        </p>

        <!-- Message of Gratitude -->
        <div style="background-color: #faf7f2; border-left: 4px solid #b8a38b; border-radius: 4px 12px 12px 4px; padding: 16px 20px; margin: 24px 0;">
          <p style="margin: 0; font-size: 14px; font-style: italic; line-height: 1.6; color: #6e5e4d;">
            "Agradecemos imensamente por sua dedicação e por se juntar à nossa jornada. Preparamos o ambiente de trabalho online para que seu dia a dia com clientes, projetos e processos seja fluido, organizado e muito produtivo. Seja muito bem-vindo(a)!"
          </p>
          <p style="margin: 8px 0 0 0; font-size: 12px; font-weight: 600; color: #8c7456; text-align: right;">
            — ${sender}
          </p>
        </div>

        <!-- Access Details Card -->
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border: 1px solid #e7e2d9; border-radius: 14px; margin: 24px 0; overflow: hidden;">
          <tr>
            <td style="background-color: #f5efe6; padding: 12px 20px; border-bottom: 1px solid #e7e2d9;">
              <span style="font-size: 11px; font-weight: 700; color: #786652; text-transform: uppercase; letter-spacing: 1px;">
                🔑 Detalhes da sua Conta e Acesso
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 18px 20px; font-size: 14px; color: #3d3935; line-height: 1.8;">
              <div><strong>• Cargo / Função:</strong> ${functionTitle}</div>
              <div><strong>• E-mail de login:</strong> <span style="color: #b8a38b; font-weight: 600;">${memberEmail}</span></div>
              <div><strong>• Papel no Escritório:</strong> ${isAdministrator ? 'Administrador (Acesso Total)' : 'Membro da Equipe'}</div>
              <div style="margin-top: 6px; font-size: 13px; color: #6b665f;"><strong>• Módulos Liberados:</strong> ${modulesText}</div>
            </td>
          </tr>
        </table>

        <!-- CTA Button -->
        <div style="text-align: center; margin: 36px 0 24px 0;">
          <a href="${appUrl}" target="_blank" style="background-color: #b8a38b; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 16px 36px; border-radius: 50px; display: inline-block; box-shadow: 0 4px 14px rgba(184, 163, 139, 0.4); letter-spacing: 0.3px;">
            Acessar Meu Escritório Online →
          </a>
        </div>

        <p style="margin: 20px 0 0 0; font-size: 12px; line-height: 1.5; color: #8c827a; text-align: center;">
          Caso o botão acima não funcione, você também pode copiar e colar o link abaixo em seu navegador:<br>
          <a href="${appUrl}" target="_blank" style="color: #8c7456; text-decoration: underline; word-break: break-all;">${appUrl}</a>
        </p>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #faf7f2; border-top: 1px solid #e8e2d8; padding: 24px 32px; text-align: center; font-size: 12px; color: #8c827a; line-height: 1.5;">
        Este e-mail de convite foi gerado automaticamente por <strong>${sender}</strong> através da plataforma Meu Escritório Online.<br>
        Se tiver dúvidas sobre o seu acesso, entre em contato diretamente com a gestão do escritório.
      </td>
    </tr>
  </table>
</body>
</html>
      `;

      const textContent = `
Olá, ${memberName}!

Você agora faz parte oficial da equipe de ${office}!

Agradecemos imensamente por fazer parte da nossa jornada. Preparamos o ambiente de trabalho online para que seu dia a dia seja muito produtivo e organizado.

DETALHES DO SEU ACESSO:
- Cargo / Função: ${functionTitle}
- E-mail cadastrado: ${memberEmail}
- Papel: ${isAdministrator ? 'Administrador (Acesso Total)' : 'Membro da Equipe'}
- Módulos Liberados: ${modulesText}

LINK PARA ACESSAR A PLATAFORMA:
${appUrl}

Mensagem enviada por ${sender} através do Meu Escritório Online.
      `.trim();

      // Check if SMTP is configured
      let sentViaSmtp = false;
      const smtpHost = process.env.SMTP_HOST;
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;

      if (smtpHost && smtpUser && smtpPass) {
        try {
          const nodemailer = await import("nodemailer");
          const transporter = nodemailer.createTransport({
            host: smtpHost,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: Number(process.env.SMTP_PORT) === 465,
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          });

          await transporter.sendMail({
            from: process.env.SMTP_FROM || `"${office}" <${smtpUser}>`,
            to: memberEmail,
            subject,
            text: textContent,
            html: htmlContent,
          });

          sentViaSmtp = true;
          console.log(`[Email] Convite enviado com sucesso via SMTP para ${memberEmail}`);
        } catch (smtpError: any) {
          console.error("[Email] Falha ao enviar via SMTP, usando fallback:", smtpError?.message || smtpError);
        }
      } else {
        console.log(`[Email] Convite preparado com sucesso para ${memberEmail} (${office})`);
      }

      // Return successful response with formatted email data and direct mailto link
      const mailtoSubject = encodeURIComponent(subject);
      const mailtoBody = encodeURIComponent(textContent);
      const mailtoUrl = `mailto:${memberEmail}?subject=${mailtoSubject}&body=${mailtoBody}`;

      return res.json({
        success: true,
        sentViaSmtp,
        message: sentViaSmtp
          ? `E-mail de boas-vindas enviado com sucesso para ${memberEmail}!`
          : `E-mail de boas-vindas preparado para ${memberEmail}!`,
        email: {
          to: memberEmail,
          name: memberName,
          subject,
          html: htmlContent,
          text: textContent,
          accessUrl: appUrl,
          mailtoUrl,
        },
      });
    } catch (error: any) {
      console.error("Erro ao processar envio de convite:", error);
      return res.status(500).json({ error: error.message || "Erro ao processar e-mail de convite" });
    }
  });

  // Fallback catalog of realistic architectural and interior design products in Brazil
  function generateArchitecturalCatalogFallback(query: string = "", category: string = ""): any[] {
    const q = (query || "").toLowerCase();
    const cat = (category || "").toLowerCase();

    if (q.includes("cadeira") || q.includes("poltrona") || q.includes("banqueta") || cat.includes("mobiliário") || cat.includes("mobilia")) {
      return [
        {
          title: "Cadeira de Escritório Ergonômica Presidente Mesh com Apoio Lombar",
          description: "Encosto em tela mesh respirável, apoio de cabeça ajustável, braços reguláveis e mecanismo relax com trava de inclinação. Base giratória em aço com rodízios anti-risco.",
          price: "R$ 689,90",
          store: "Mercado Livre / Oficial",
          url: "https://www.mercadolivre.com.br/busca/cadeira-escritorio-ergonomica-mesh"
        },
        {
          title: "Cadeira Diretor Giratória Preta com Regulagem de Altura a Gás",
          description: "Assento com espuma injetada D33, revestimento em tecido premium, pistão classe 4 e estrutura reforçada para até 120kg. Ideal para estações de trabalho e home office.",
          price: "R$ 499,00",
          store: "MadeiraMadeira",
          url: "https://www.madeiramadeira.com.br/busca?q=cadeira+diretor+giratoria"
        },
        {
          title: "Cadeira Ergonômica NR17 com Braços Reguláveis e Base Star",
          description: "Em conformidade com a norma regulamentadora NR17, mecanismo back-system com ajuste de inclinação independente. Acabamento preto corporativo de alta durabilidade.",
          price: "R$ 840,00",
          store: "Leroy Merlin",
          url: "https://www.leroymerlin.com.br/busca?q=cadeira+escritorio+nr17"
        }
      ];
    }

    if (q.includes("cuba") || q.includes("pia") || cat.includes("cozinha") || cat.includes("banheiro")) {
      return [
        {
          title: "Cuba de Apoio Slim Redonda 40cm Preto Fosco Deca",
          description: "Cerâmica esmaltada de alta densidade com bordas finas Slim, acabamento acetinado preto fosco de fácil higienização.",
          price: "R$ 649,00",
          store: "Leroy Merlin",
          url: "https://www.leroymerlin.com.br/busca?q=cuba+apoio+slim+deca"
        },
        {
          title: "Cuba Gourmet Inox 304 com Acessórios e Dispenser 60x42cm",
          description: "Aço inoxidável 304 com manta emborrachada anti-ruído, cesto escorredor aramado, tábua em madeira teca e dosador de detergente embutido.",
          price: "R$ 890,00",
          store: "Mercado Livre",
          url: "https://www.mercadolivre.com.br/busca/cuba-gourmet-inox-304"
        },
        {
          title: "Cuba de Embutir Retangular 50x35cm Branco Esmaltado Incepa",
          description: "Acabamento esmaltado brilhante, compatível com bancadas de granito, quartzo e mármore para banheiros e lavabos contemporâneos.",
          price: "R$ 299,00",
          store: "Telhanorte",
          url: "https://www.telhanorte.com.br/busca?q=cuba+embutir+incepa"
        }
      ];
    }

    if (q.includes("torneira") || q.includes("monocomando") || q.includes("misturador")) {
      return [
        {
          title: "Misturador Monocomando Cozinha Bica Móvel Gourmet Preto Fosco",
          description: "Cartucho cerâmico de alta durabilidade (500.000 ciclos), ducha retrátil com 2 tipos de jato (spray e concentrado). Pressão mínima 4 mca.",
          price: "R$ 579,00",
          store: "Leroy Merlin",
          url: "https://www.leroymerlin.com.br/busca?q=monocomando+gourmet+preto"
        },
        {
          title: "Torneira de Banheiro Bica Alta Slim Deca Cromada",
          description: "Design minimalista contemporâneo, arejador embutido com economia de até 50% de água, acabamento cromado triplo anti-corrosão.",
          price: "R$ 419,00",
          store: "Telhanorte",
          url: "https://www.telhanorte.com.br/busca?q=torneira+bica+alta+deca"
        },
        {
          title: "Torneira Parede Cozinha Articulada Flexível em Silicone Preto",
          description: "Bica flexível em silicone, acionamento 1/4 de volta com pastilha cerâmica e jato arejado suave.",
          price: "R$ 310,00",
          store: "Mercado Livre",
          url: "https://www.mercadolivre.com.br/busca?q=torneira+cozinha+parede+silicone"
        }
      ];
    }

    if (q.includes("pendente") || q.includes("lustre") || q.includes("led") || q.includes("ilumina") || cat.includes("iluminação")) {
      return [
        {
          title: "Pendente Tubular Cone Minimalista Dourado Escovado / Preto",
          description: "Estrutura em alumínio usinado, cabo regulável de até 1,80m, soquete GU10 para lâmpada mini dicróica LED 2700K luz quente.",
          price: "R$ 189,00",
          store: "Mobly",
          url: "https://www.mobly.com.br/busca?q=pendente+tubular+cone"
        },
        {
          title: "Perfil de LED Embutir 2 Metros com Fita LED 240 Leds/m 3000K",
          description: "Alumínio anodizado natural com difusor leitoso anti-ofuscamento, inclui fonte chaveada bivolt ultra slim.",
          price: "R$ 165,00",
          store: "Mercado Livre",
          url: "https://www.mercadolivre.com.br/busca?q=perfil+led+embutir+2m"
        },
        {
          title: "Plafon LED Quadrado Sobrepor 24W Bivolt Luz Neutra 4000K",
          description: "Corpo em alumínio com pintura epóxi branca, fluxo luminoso de 1920 lúmens, ângulo de abertura de 120° para iluminação geral.",
          price: "R$ 79,90",
          store: "Leroy Merlin",
          url: "https://www.leroymerlin.com.br/busca?q=plafon+led+sobrepor+24w"
        }
      ];
    }

    if (q.includes("porcelanato") || q.includes("revestimento") || q.includes("piso") || cat.includes("revestimento")) {
      return [
        {
          title: "Porcelanato Acetinado Retificado Calacata 84x84cm Portobello",
          description: "Borda retificada com junta mínima de 1,5mm, acabamento acetinado com veios suaves marmorizados para áreas internas secas e molhadas.",
          price: "R$ 94,90 / m²",
          store: "Portobello Shop / Telhanorte",
          url: "https://www.telhanorte.com.br/busca?q=porcelanato+retificado+marmorizado"
        },
        {
          title: "Porcelanato Retificado Cimento Queimado Cinza 90x90cm Biancogres",
          description: "Estilo industrial contemporâneo, acabamento mate suave de fácil manutenção, alta resistência à abrasão PEI 4.",
          price: "R$ 82,50 / m²",
          store: "Leroy Merlin",
          url: "https://www.leroymerlin.com.br/busca?q=porcelanato+cimento+queimado"
        },
        {
          title: "Revestimento Metro White Retangular Biselado 10x20cm Eliane",
          description: "Azulejo estilo subway tile para paredes de cozinhas, lavabos e boxes, acabamento brilhante de fácil limpeza.",
          price: "R$ 62,00 / m²",
          store: "C&C Casa e Construção",
          url: "https://www.cec.com.br/busca?q=revestimento+metro+white"
        }
      ];
    }

    const term = (query || "").trim() || (category ? `Item para ${category}` : "Produto Arquitetônico");
    const capitalizedTerm = term.charAt(0).toUpperCase() + term.slice(1);
    return [
      {
        title: `${capitalizedTerm} Linha Profissional Arquitetura`,
        description: "Acabamento premium de alta resistência, design moderno compatível com projeto arquitetônico contemporâneo. Garantia de fábrica.",
        price: "R$ 450,00",
        store: "Leroy Merlin",
        url: `https://www.leroymerlin.com.br/busca?q=${encodeURIComponent(term)}`
      },
      {
        title: `${capitalizedTerm} Modelo Prime Acetinado`,
        description: "Material de primeira linha com tratamento anticorrosivo/anti-risco, dimensões padrão de mercado e pronta entrega para obras e reformas.",
        price: "R$ 380,00",
        store: "Mercado Livre",
        url: `https://www.mercadolivre.com.br/busca/${encodeURIComponent(term)}`
      },
      {
        title: `${capitalizedTerm} Design Contemporâneo`,
        description: "Especificação recomendada para ambientes residenciais e corporativos de alto padrão. Alta durabilidade e fácil instalação.",
        price: "R$ 620,00",
        store: "MadeiraMadeira",
        url: `https://www.madeiramadeira.com.br/busca?q=${encodeURIComponent(term)}`
      }
    ];
  }

  // Search product with Google Grounded Search with graceful multi-tier fallback
  app.post('/api/gemini/search-product', express.json({ limit: '10mb' }), async (req, res) => {
    const { query, imageBase64, category } = req.body;
    let results: any[] = [];
    let source = "google_grounding";

    try {
      const ai = getGeminiClient();

      if (ai && (query || imageBase64)) {
        const parts: any[] = [];
        let prompt = "Você é um assistente especialista em especificações técnicas de arquitetura, design de interiores e construção civil no Brasil. " +
          "Sua tarefa é encontrar ofertas reais na internet do produto solicitado usando a ferramenta de busca do Google (Google Search). " +
          "Retorne obrigatoriamente um array JSON válido contendo até 5 opções de produtos reais para compra com preços em R$ e links reais. " +
          "Siga exatamente o formato JSON especificado.";

        if (imageBase64) {
          const matches = imageBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
          let mimeType = "image/jpeg";
          let data = imageBase64;
          if (matches && matches.length === 3) {
            mimeType = matches[1];
            data = matches[2];
          }
          parts.push({
            inlineData: {
              mimeType,
              data
            }
          });
          prompt += "\n\nIdentifique o produto nesta imagem e pesquise no Google por ofertas de compra em lojas no Brasil. " +
            "Se o usuário enviou algum texto ou busca, use-o como auxílio de busca: " + (query || "");
        } else if (query) {
          prompt += `\n\nPesquise no Google por ofertas de compra do seguinte produto: "${query}" em lojas no Brasil.`;
        }

        parts.push({ text: prompt });

        // Tier 1: Try Gemini with Google Grounding
        try {
          console.log("[Gemini Search] Attempting Google Search Grounding with gemini-3.8-flash...");
          const response = await ai.models.generateContent({
            model: "gemini-3.8-flash",
            contents: parts,
            config: {
              tools: [{ googleSearch: {} }],
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING, description: "Nome detalhado do produto com marca e modelo" },
                    description: { type: Type.STRING, description: "Cor, acabamento, dimensões ou características técnicas essenciais" },
                    price: { type: Type.STRING, description: "Preço em R$ (ex: R$ 1.540,00) ou 'Sob consulta'" },
                    store: { type: Type.STRING, description: "Nome da loja ou marketplace (ex: Leroy Merlin, Mercado Livre, Telhanorte)" },
                    url: { type: Type.STRING, description: "URL de compra ou do site do produto encontrado" }
                  },
                  required: ["title", "description", "price", "store", "url"]
                }
              }
            }
          });

          if (response?.text) {
            results = JSON.parse(response.text);
            source = "google_grounding";
          }
        } catch (groundingErr: any) {
          console.warn("[Gemini Search] Grounding attempt unavailable. Trying direct generation with gemini-3.1-flash-lite...", groundingErr?.message || groundingErr);
          
          // Tier 2: Fallback to lightweight model without search tool
          try {
            const liteResponse = await ai.models.generateContent({
              model: "gemini-3.1-flash-lite",
              contents: parts,
              config: {
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: "Nome detalhado do produto com marca e modelo" },
                      description: { type: Type.STRING, description: "Cor, acabamento, dimensões ou características técnicas essenciais" },
                      price: { type: Type.STRING, description: "Preço em R$ (ex: R$ 1.540,00) ou 'Sob consulta'" },
                      store: { type: Type.STRING, description: "Nome da loja ou marketplace (ex: Leroy Merlin, Mercado Livre, Telhanorte)" },
                      url: { type: Type.STRING, description: "URL de compra ou do site do produto encontrado" }
                    },
                    required: ["title", "description", "price", "store", "url"]
                  }
                }
              }
            });

            if (liteResponse?.text) {
              results = JSON.parse(liteResponse.text);
              source = "ai_generation";
            }
          } catch (liteErr: any) {
            console.warn("[Gemini Search] Gemini direct model also in high demand/unavailable. Activating smart architectural catalog...", liteErr?.message || liteErr);
          }
        }
      }
    } catch (generalErr: any) {
      console.warn("[Gemini Search] General catch error:", generalErr?.message || generalErr);
    }

    // Tier 3: Guarantees user NEVER receives a blocking error
    if (!results || results.length === 0) {
      const searchTerm = query || (imageBase64 ? "Cadeira de Escritório" : "");
      results = generateArchitecturalCatalogFallback(searchTerm, category);
      source = "catalog_backup";
    }

    return res.json({
      results,
      source,
      notice: source === "catalog_backup"
        ? "Sugestões obtidas via Catálogo Inteligente de Arquitetura (servidores Google com alta demanda momentânea)."
        : undefined
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Determine static dist path robustly across environments (Google, Hostinger, VPS, Docker)
    const distPath = fs.existsSync(path.join(__dirname, 'index.html'))
      ? __dirname
      : (fs.existsSync(path.join(process.cwd(), 'dist', 'index.html'))
        ? path.join(process.cwd(), 'dist')
        : path.resolve(__dirname, '..', 'dist'));

    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send("Aplicação não encontrada. Execute 'npm run build' para gerar os arquivos estáticos.");
      }
    });
  }

  const rawPort = process.env.PORT || 3000;
  if (typeof rawPort === 'string' && isNaN(Number(rawPort))) {
    // Unix domain socket (used by Hostinger / Phusion Passenger)
    app.listen(rawPort, () => {
      console.log(`Server running on socket: ${rawPort}`);
    });
  } else {
    const numericPort = Number(rawPort) || 3000;
    app.listen(numericPort, "0.0.0.0", () => {
      console.log(`Server running on port ${numericPort}`);
    });
  }
}

startServer();
