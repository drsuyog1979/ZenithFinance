"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

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
