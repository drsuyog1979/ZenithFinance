import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { addDays, startOfDay, endOfDay } from "date-fns";

export async function GET(request: Request) {
    // Basic auth check for Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new Response('Unauthorized', { status: 401 });
    }

    try {
        const today = startOfDay(new Date());

        // Target dates: 15 days and 3 days from now
        const target15 = addDays(today, 15);
        const target3 = addDays(today, 3);

        const reminders = await prisma.reminder.findMany({
            where: {
                isPaid: false,
                OR: [
                    {
                        dueDate: {
                            gte: startOfDay(target15),
                            lte: endOfDay(target15)
                        }
                    },
                    {
                        dueDate: {
                            gte: startOfDay(target3),
                            lte: endOfDay(target3)
                        }
                    }
                ]
            },
            include: {
                user: true
            }
        });

        console.log(`[Cron] Found ${reminders.length} reminders to notify.`);

        // Notification logic placeholder
        for (const rem of reminders) {
            console.log(`[Notification] To ${rem.userId}: ${rem.title} is due on ${format(rem.dueDate, 'PPP')}`);
            // TODO: Integrated with Supabase/Email service
        }

        return NextResponse.json({ success: true, processed: reminders.length });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

function format(date: Date, str: string) {
    // Simple formatter or use date-fns
    return date.toDateString();
}
