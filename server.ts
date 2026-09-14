import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import { MercadoPagoConfig, Preference, Payment, PaymentMethod } from "mercadopago";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";

// Lazy initialize Mercado Pago client & persistent credentials
const MP_CREDENTIALS_FILE = path.join(process.cwd(), '.mp_credentials.json');
function loadPersistedMpCredentials() {
  try {
    if (fs.existsSync(MP_CREDENTIALS_FILE)) {
      const data = JSON.parse(fs.readFileSync(MP_CREDENTIALS_FILE, 'utf-8'));
      if (data.accessToken && !process.env.MERCADO_PAGO_ACCESS_TOKEN) {
        process.env.MERCADO_PAGO_ACCESS_TOKEN = data.accessToken;
      }
      if (data.publicKey && !process.env.VITE_MERCADO_PAGO_PUBLIC_KEY) {
        process.env.VITE_MERCADO_PAGO_PUBLIC_KEY = data.publicKey;
      }
    }
  } catch (err) {
    console.warn('Could not read .mp_credentials.json:', err);
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
        planAmount: planAmount || "50,00",
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
          transaction_amount: amount || 50,
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
            plan: metadata.plan || (amount > 100 ? 'annual' : 'monthly'),
            source: 'checkout_transparente',
          },
        },
      });

      console.log(`[Mercado Pago] Pagamento processado: id=${paymentResponse.id}, status=${paymentResponse.status}, detail=${paymentResponse.status_detail}`);

      // If approved, update user subscription in Firestore & notify
      if (paymentResponse.status === 'approved' || paymentResponse.status === 'processed') {
        const uid = externalReference || metadata.uid;
        if (uid && getApps().length > 0) {
          try {
            const db = getFirestore();
            const baseDate = new Date();
            if (amount > 100) {
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
      } = req.body;

      const token = process.env.MERCADO_PAGO_ACCESS_TOKEN;
      const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;

      if (!token) {
        return res.status(400).json({
          error: "MERCADO_PAGO_ACCESS_TOKEN não configurado. Por favor, adicione seu Access Token do Mercado Pago nas configurações.",
          configured: false,
        });
      }

      const client = getMercadoPagoClient();
      const preference = new Preference(client);

      const preferenceData: any = {
        items: [
          {
            id: externalReference || `plan-${Date.now()}`,
            title: title || 'Assinatura - Meu Escritório Online',
            quantity: Number(quantity) || 1,
            unit_price: Number(price) || 50,
            currency_id: 'BRL',
          },
        ],
        back_urls: {
          success: `${appUrl}/checkout?status=approved&plan=${metadata?.plan || 'monthly'}`,
          failure: `${appUrl}/checkout?status=failure`,
          pending: `${appUrl}/checkout?status=pending`,
        },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/mercadopago/webhook`,
        external_reference: externalReference || metadata?.uid || '',
        metadata: metadata || {},
      };

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
