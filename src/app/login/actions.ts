"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function signInWithGitHub() {
    const supabase = await createClient();
    const headersList = await headers();
    const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    if (data.url) {
        redirect(data.url);
    }
}

export async function signInWithGoogle() {
    const supabase = await createClient();
    const headersList = await headers();
    const origin = headersList.get("origin") || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
            redirectTo: `${origin}/auth/callback`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    if (data.url) {
        redirect(data.url);
    }
}

export async function sendOTP(formData: FormData) {
    const email = formData.get("email") as string;
    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            shouldCreateUser: true,
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    return { success: true, email };
}

export async function verifyOTP(formData: FormData) {
    const email = formData.get("email") as string;
    const token = formData.get("token") as string;
    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
    });

    if (error) {
        return { error: error.message };
    }

    // After successful login, redirect to dashboard
    redirect("/dashboard");
}

export async function signInWithPassword(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
        return { error: error.message };
    }

    if (user) {
        const { prisma } = await import('@/lib/prisma');
        await prisma.user.upsert({
            where: { id: user.id },
            update: { email: user.email! },
            create: {
                id: user.id,
                email: user.email!,
            },
        });
    }

    redirect("/dashboard");
}

export async function signUpWithPassword(formData: FormData) {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
        },
    });

    if (error) {
        return { error: error.message };
    }

    if (user) {
        const { prisma } = await import('@/lib/prisma');
        await prisma.user.upsert({
            where: { id: user.id },
            update: { email: user.email! },
            create: {
                id: user.id,
                email: user.email!,
            },
        });
    }

    return { success: true, message: "Account created! Check your email to confirm." };
}
