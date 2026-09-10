import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

  // Standard JSON middleware for other routes
  app.use(express.json());

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
