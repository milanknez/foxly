export interface SmtpConfig {
  host?: string;
  port?: number | string;
  secure?: boolean; // true for 465, false for 587/25
  user?: string;
  pass?: string;
  fromEmail?: string;
  fromName?: string;
}

export interface SendEmailOptions {
  smtpConfig?: SmtpConfig;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string; // URL or local path
    contentType?: string;
  }>;
}

export async function sendEmail(options: SendEmailOptions): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const { smtpConfig, to, subject, text, html, attachments } = options;

  const host = smtpConfig?.host?.trim() || process.env.SMTP_HOST?.trim();
  const port = Number(smtpConfig?.port || process.env.SMTP_PORT || 587);
  const secure = smtpConfig?.secure !== undefined ? Boolean(smtpConfig.secure) : (port === 465);
  const user = smtpConfig?.user?.trim() || process.env.SMTP_USER?.trim();
  const pass = smtpConfig?.pass?.trim() || process.env.SMTP_PASS?.trim();
  const fromEmail = smtpConfig?.fromEmail?.trim() || process.env.SMTP_FROM_EMAIL?.trim() || "automations@foxly.cz";
  const fromName = smtpConfig?.fromName?.trim() || process.env.SMTP_FROM_NAME?.trim() || "Foxly Automatizace";

  // 1. Pokud je nakonfigurován externí SMTP server
  if (host) {
    try {
      const nodemailerModule = await import("nodemailer");
      const nodemailer = nodemailerModule.default || nodemailerModule;

      const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user ? { user, pass } : undefined,
        tls: {
          rejectUnauthorized: false, // Umožňuje self-signed certifikáty pro firemní servery
        },
      });

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to,
        subject,
        text,
        html: html || text,
        attachments: attachments && attachments.length > 0 ? attachments : undefined,
      });

      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error("Nodemailer SMTP send error:", err);
      return { success: false, error: err?.message || String(err) };
    }
  }

  // 2. Fallback na lokální Mailpit (port 8025 / 8026)
  const mailpitEndpoints = [
    "http://mailpit:8025/api/v1/send",
    "http://localhost:8025/api/v1/send",
    "http://localhost:8026/api/v1/send",
  ];

  for (const endpoint of mailpitEndpoints) {
    try {
      const mailRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          From: { Email: fromEmail, Name: fromName },
          To: [{ Email: to }],
          Subject: subject,
          Text: text,
          HTML: html || text,
        }),
      });

      if (mailRes.ok) {
        const resJson = await mailRes.json().catch(() => ({}));
        return { success: true, messageId: resJson.ID || "mailpit-sent" };
      }
    } catch {
      // Zkusit další endpoint
    }
  }

  // 3. Fallback log
  console.log(`[EMAIL QUEUE] E-mail pro ${to} předmět: "${subject}" (není nakonfigurován SMTP server)`);
  return { success: true, messageId: "queued-no-smtp" };
}
