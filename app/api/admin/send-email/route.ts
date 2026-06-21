import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminUser = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (!adminUser || adminUser.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { to, subject, message, sendToAll, planFilter } = await req.json();

  try {
    let recipients: string[] = [];

    if (sendToAll) {
      const where = planFilter && planFilter !== "all" ? { plan: planFilter } : {};
      const users = await prisma.user.findMany({ where, select: { email: true } });
      recipients = users.map(u => u.email).filter(Boolean);
    } else if (to) {
      recipients = Array.isArray(to) ? to : [to];
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients" }, { status: 400 });
    }

    // Send in batches of 50 to avoid rate limits
    const batchSize = 50;
    let sent = 0;
    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);
      await resend.emails.send({
        from: "Elite Labs <noreply@elitelabs.es>",
        to: batch,
        subject,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #ffffff; padding: 40px; border-radius: 12px;">
            <div style="margin-bottom: 32px;">
              <img src="https://elitelabs.es/logo.png" alt="Elite Labs" style="height: 32px;" />
            </div>
            <div style="font-size: 15px; line-height: 1.7; color: #e5e7eb; white-space: pre-wrap;">${message.replace(/\n/g, '<br>')}</div>
            <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #1a1a1a; font-size: 12px; color: #555;">
              © ${new Date().getFullYear()} Elite Labs · <a href="https://elitelabs.es" style="color: #555;">elitelabs.es</a>
            </div>
          </div>
        `,
      });
      sent += batch.length;
    }

    return NextResponse.json({ success: true, sent });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[admin/send-email]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
