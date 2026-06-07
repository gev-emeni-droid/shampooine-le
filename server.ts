import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware
  app.use(express.json());

  // API route to send emails with RESEND_API_KEY
  app.post("/api/emails/send", async (req, res) => {
    try {
      const { recipientEmail, subject, body, fromName } = req.body;
      const resendApiKey = process.env.RESEND_API_KEY;

      if (!resendApiKey) {
        console.warn("[Resend Engine] API key missing in environment.");
        return res.status(400).json({ 
          success: false, 
          error: "La clé API Resend n'est pas configurée dans les variables d'environnement de l'application." 
        });
      }

      // Valid form name or default
      const validatedFromName = fromName || "Shampooine Le";
      // Onboarding sender address, standard for Resend sandbox accounts
      const fromEmail = "onboarding@resend.dev";
      const from = `${validatedFromName} <${fromEmail}>`;

      console.log(`[Resend Engine] Sending email to: ${recipientEmail}, subject: ${subject}`);

      // Parse text lines to HTML paragraphs
      const htmlBody = `
        <div style="font-family: sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f1f5f9; rounded-corners: 12px;">
          <h2 style="color: #0ea5e9; font-weight: 800; border-bottom: 2px solid #f1f5f9; padding-bottom: 10px;">${validatedFromName}</h2>
          <div style="white-space: pre-wrap; line-height: 1.6; font-size: 14px;">
            ${body.replace(/\n/g, "<br/>")}
          </div>
          <hr style="border: none; border-top: 1px solid #f1f5f9; margin: 20px 0;" />
          <p style="font-size: 10px; color: #94a3b8; text-align: center;">
            Cet email a été envoyé automatiquement depuis votre espace Shampooine Le.
          </p>
        </div>
      `;

      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          from,
          to: [recipientEmail],
          subject,
          html: htmlBody
        })
      });

      const data = await response.json() as any;

      if (!response.ok) {
        console.error("[Resend Error Payload]", data);
        return res.status(response.status).json({
          success: false,
          error: data.message || "Erreur lors de l'envoi de l'e-mail via Resend.",
          raw: data
        });
      }

      return res.json({
        success: true,
        message: "E-mail envoyé avec succès !",
        data
      });
    } catch (error: any) {
      console.error("[Server Send Email Error]", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Une erreur interne est survenue lors de l'envoi de l'e-mail."
      });
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
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
