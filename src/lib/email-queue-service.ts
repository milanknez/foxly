import { db } from "@/lib/db";
import { sendEmail, SmtpConfig } from "@/lib/email-service";
import { Prisma } from "@prisma/client";

export interface QueueEmailInput {
  workspaceId: string;
  automationId?: string | null;
  recordId?: string | null;
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content?: Buffer | string;
    path?: string;
    contentType?: string;
  }>;
  delaySeconds?: number;
}

/**
 * Zařadí e-mail do fronty pro daný workspace.
 * Čas odeslání (scheduledFor) se nastaví s ohledem na dosud naplánované položky a požadovanou prodlevu.
 */
export async function enqueueEmail(input: QueueEmailInput) {
  const { workspaceId, automationId, recordId, to, subject, body, html, attachments, delaySeconds = 60 } = input;

  const now = new Date();

  // Najdeme poslední naplánovaný čekající e-mail pro workspace
  const lastPending = await db.emailQueueItem.findFirst({
    where: {
      workspaceId,
      status: "PENDING",
    },
    orderBy: { scheduledFor: "desc" },
    select: { scheduledFor: true },
  });

  let scheduledFor = now;

  if (lastPending && lastPending.scheduledFor > now) {
    // Navážeme za poslední položku s prodlevou
    scheduledFor = new Date(lastPending.scheduledFor.getTime() + delaySeconds * 1000);
  } else if (lastPending) {
    // Poslední položka už je v minulosti / právě na řadě -> novou naplánujeme po prodlevě
    scheduledFor = new Date(now.getTime() + delaySeconds * 1000);
  } else {
    // Fronta byla prázdná – první položku lze odeslat ihned
    scheduledFor = now;
  }

  const item = await db.emailQueueItem.create({
    data: {
      workspaceId,
      automationId: automationId || null,
      recordId: recordId || null,
      to,
      subject,
      body,
      html: html || body,
      attachments: (attachments && attachments.length > 0 ? (attachments as unknown as Prisma.InputJsonValue) : []),
      status: "PENDING",
      scheduledFor,
    },
  });

  return item;
}

/**
 * Hromadné zařazení e-mailů do fronty (např. při spuštění workflow nad více záznamy)
 */
export async function enqueueEmailBatch(
  workspaceId: string,
  items: Array<{
    automationId?: string | null;
    recordId?: string | null;
    to: string;
    subject: string;
    body: string;
    html?: string;
    attachments?: any[];
  }>,
  delaySeconds = 60
) {
  const now = new Date();

  // Zjistíme, zda už ve frontě něco čeká
  const lastPending = await db.emailQueueItem.findFirst({
    where: {
      workspaceId,
      status: "PENDING",
    },
    orderBy: { scheduledFor: "desc" },
    select: { scheduledFor: true },
  });

  let currentSchedule = (lastPending && lastPending.scheduledFor > now)
    ? new Date(lastPending.scheduledFor.getTime() + delaySeconds * 1000)
    : now;

  const createdItems = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const scheduledFor = i === 0 ? currentSchedule : new Date(currentSchedule.getTime() + i * delaySeconds * 1000);

    const created = await db.emailQueueItem.create({
      data: {
        workspaceId,
        automationId: it.automationId || null,
        recordId: it.recordId || null,
        to: it.to,
        subject: it.subject,
        body: it.body,
        html: it.html || it.body,
        attachments: (it.attachments && it.attachments.length > 0 ? (it.attachments as unknown as Prisma.InputJsonValue) : []),
        status: "PENDING",
        scheduledFor,
      },
    });
    createdItems.push(created);
  }

  return createdItems;
}

/**
 * Zpracuje nejstarší čekající položku, která má scheduledFor <= now.
 */
export async function processNextPendingItem(workspaceId: string) {
  const now = new Date();

  // Atomicky najdeme a uzamkneme položku přes stav PROCESSING
  const item = await db.emailQueueItem.findFirst({
    where: {
      workspaceId,
      status: "PENDING",
      scheduledFor: { lte: now },
    },
    orderBy: { scheduledFor: "asc" },
  });

  if (!item) {
    return { processed: false, reason: "NO_PENDING_ITEMS" };
  }

  // Změníme stav na PROCESSING
  await db.emailQueueItem.update({
    where: { id: item.id },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });

  // Načteme SMTP konfiguraci workspace
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { companyDetails: true },
  });

  const companyDetails = (workspace?.companyDetails as Record<string, any>) || {};
  const smtpConfig = companyDetails.smtp as SmtpConfig | undefined;

  const attachments = Array.isArray(item.attachments) ? (item.attachments as any[]) : [];

  const sendRes = await sendEmail({
    smtpConfig,
    to: item.to,
    subject: item.subject,
    text: item.body,
    html: item.html || item.body,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  if (sendRes.success) {
    await db.emailQueueItem.update({
      where: { id: item.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        error: null,
      },
    });

    return { processed: true, success: true, item: { id: item.id, to: item.to, subject: item.subject } };
  } else {
    await db.emailQueueItem.update({
      where: { id: item.id },
      data: {
        status: "FAILED",
        error: sendRes.error || "Neznámá chyba SMTP",
      },
    });

    return { processed: true, success: false, error: sendRes.error, item: { id: item.id, to: item.to } };
  }
}

/**
 * Vynucené okamžité odeslání konkrétní položky (tlačítko 'Odeslat ihned')
 */
export async function forceSendItem(itemId: string, workspaceId: string) {
  const item = await db.emailQueueItem.findFirst({
    where: { id: itemId, workspaceId },
  });

  if (!item) {
    return { success: false, error: "Položka ve frontě nebyla nalezena." };
  }

  await db.emailQueueItem.update({
    where: { id: item.id },
    data: { status: "PROCESSING", attempts: { increment: 1 } },
  });

  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { companyDetails: true },
  });

  const companyDetails = (workspace?.companyDetails as Record<string, any>) || {};
  const smtpConfig = companyDetails.smtp as SmtpConfig | undefined;
  const attachments = Array.isArray(item.attachments) ? (item.attachments as any[]) : [];

  const sendRes = await sendEmail({
    smtpConfig,
    to: item.to,
    subject: item.subject,
    text: item.body,
    html: item.html || item.body,
    attachments: attachments.length > 0 ? attachments : undefined,
  });

  if (sendRes.success) {
    const updated = await db.emailQueueItem.update({
      where: { id: item.id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        error: null,
      },
    });
    return { success: true, item: updated };
  } else {
    const updated = await db.emailQueueItem.update({
      where: { id: item.id },
      data: {
        status: "FAILED",
        error: sendRes.error || "Neznámá chyba SMTP",
      },
    });
    return { success: false, error: sendRes.error, item: updated };
  }
}

/**
 * Znovu zařadit neúspěšný e-mail do fronty
 */
export async function retryQueueItem(itemId: string, workspaceId: string) {
  const item = await db.emailQueueItem.findFirst({
    where: { id: itemId, workspaceId },
  });

  if (!item) {
    return { success: false, error: "Položka nebyla nalezena." };
  }

  const updated = await db.emailQueueItem.update({
    where: { id: item.id },
    data: {
      status: "PENDING",
      scheduledFor: new Date(),
      error: null,
    },
  });

  return { success: true, item: updated };
}

/**
 * Zrušit položku ve frontě
 */
export async function cancelQueueItem(itemId: string, workspaceId: string) {
  const updated = await db.emailQueueItem.updateMany({
    where: { id: itemId, workspaceId, status: { in: ["PENDING", "FAILED"] } },
    data: { status: "CANCELLED" },
  });

  return { success: updated.count > 0 };
}

/**
 * Smazat položku
 */
export async function deleteQueueItem(itemId: string, workspaceId: string) {
  const deleted = await db.emailQueueItem.deleteMany({
    where: { id: itemId, workspaceId },
  });

  return { success: deleted.count > 0 };
}

/**
 * Vyčistit dokončené (SENT a CANCELLED)
 */
export async function clearCompletedItems(workspaceId: string) {
  const res = await db.emailQueueItem.deleteMany({
    where: {
      workspaceId,
      status: { in: ["SENT", "CANCELLED"] },
    },
  });

  return { deletedCount: res.count };
}

/**
 * Znovu zkusit všechny FAILED e-maily
 */
export async function retryAllFailed(workspaceId: string) {
  const now = new Date();
  const res = await db.emailQueueItem.updateMany({
    where: {
      workspaceId,
      status: "FAILED",
    },
    data: {
      status: "PENDING",
      scheduledFor: now,
      error: null,
    },
  });

  return { retriedCount: res.count };
}

/**
 * Získat statistiky a položky fronty
 */
export async function getQueueData(workspaceId: string, limit = 100) {
  const [items, counts, workspace] = await Promise.all([
    db.emailQueueItem.findMany({
      where: { workspaceId },
      orderBy: { scheduledFor: "desc" },
      take: limit,
      include: {
        automation: {
          select: { id: true, name: true },
        },
      },
    }),
    db.emailQueueItem.groupBy({
      by: ["status"],
      where: { workspaceId },
      _count: true,
    }),
    db.workspace.findUnique({
      where: { id: workspaceId },
      select: { companyDetails: true, plugins: true },
    }),
  ]);

  const stats = {
    PENDING: 0,
    PROCESSING: 0,
    SENT: 0,
    FAILED: 0,
    CANCELLED: 0,
    total: 0,
  };

  counts.forEach((c) => {
    const st = c.status as keyof typeof stats;
    if (stats[st] !== undefined) {
      stats[st] = c._count;
    }
    stats.total += c._count;
  });

  const companyDetails = (workspace?.companyDetails as Record<string, any>) || {};
  const currentDelay = Number(companyDetails.emailQueueDelay || 60);
  const plugins = (Array.isArray(workspace?.plugins) ? workspace?.plugins : []) as string[];
  const isPluginEnabled = plugins.includes("email_queue");

  return {
    items,
    stats,
    currentDelay,
    isPluginEnabled,
  };
}
