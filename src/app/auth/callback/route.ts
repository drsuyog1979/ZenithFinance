import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    const next = searchParams.get('next') ?? '/dashboard'

    if (code) {
        const supabase = await createClient()
        const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)

        if (!error && user) {
            // Sync user with Prisma
            const { prisma } = await import('@/lib/prisma')
            await prisma.user.upsert({
                where: { id: user.id },
                update: { email: user.email! },
                create: {
                    id: user.id,
                    email: user.email!,
                },
            })

            return NextResponse.redirect(`${origin}${next}`)
        }
    }

    // Redirect to login page if token exchange failed
    return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`)
}
