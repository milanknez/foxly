import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sendEmail, SmtpConfig } from "@/lib/email-service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceSlug: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Neautorizováno" }, { status: 401 });
    }

    const body = await req.json();
    const { smtpConfig, testEmail } = body as { smtpConfig: SmtpConfig; testEmail: string };

    if (!testEmail || !testEmail.includes("@")) {
      return NextResponse.json({ error: "Zadejte platnou e-mailovou adresu příjemce" }, { status: 400 });
    }

    if (!smtpConfig?.host) {
      return NextResponse.json({ error: "Vyplňte SMTP Host serveru" }, { status: 400 });
    }

    const result = await sendEmail({
      smtpConfig,
      to: testEmail,
      subject: "Testovací e-mail z Foxly",
      text: "Gratulujeme! Vaše SMTP nastavení v systému Foxly funguje správně.",
      html: `
        <div style="font-family: sans-serif; padding: 24px; max-width: 500px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
          <h2 style="color: #1e60f0; margin-top: 0;">Testovací e-mail z Foxly</h2>
          <p style="color: #334155; font-size: 14px; line-height: 1.6;">
            Vaše SMTP nastavení pro automatizované odesílání e-mailů bylo úspěšně ověřeno a funguje bezchybně.
          </p>
          <div style="background-color: #f8fafc; border-left: 4px solid #1e60f0; padding: 12px; margin: 16px 0; font-size: 12px; font-family: monospace; color: #475569;">
            Host: ${smtpConfig.host}:${smtpConfig.port || 587}<br />
            Odesílatel: ${smtpConfig.fromEmail || "automations@foxly.cz"}
          </div>
          <p style="color: #94a3b8; font-size: 11px; margin-top: 24px;">
            Vygenerováno systémem Foxly.
          </p>
        </div>
      `,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Odeslání selhalo" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Testovací e-mail byl úspěšně odeslán na ${testEmail}`,
      messageId: result.messageId,
    });
  } catch (err: any) {
    console.error("Test SMTP error:", err);
    return NextResponse.json({ error: err?.message || "Chyba při testování SMTP" }, { status: 500 });
  }
}
