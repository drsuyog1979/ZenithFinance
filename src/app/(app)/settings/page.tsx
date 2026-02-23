import { createClient } from "@/utils/supabase/server";
import { SettingsClient } from "./client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    return (
        <div className="p-4 md:p-8 max-w-3xl mx-auto pb-24 md:pb-8">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">Settings</h1>
                <p className="text-gray-500 mt-1">Manage app preferences and data.</p>
            </div>

            <SettingsClient userEmail={user?.email || "Unknown User"} />
        </div>
    );
}
