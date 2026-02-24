import { SpendeeImporter } from "@/components/import/SpendeeImporter";
import { Upload } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ImportPage() {
    return (
        <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24 md:pb-8">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                        <Upload size={20} />
                    </div>
                    <h1 className="text-3xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">
                        Import Data
                    </h1>
                </div>
                <p className="text-gray-500 ml-13">Migrate your financial history into Zenith Finance.</p>
            </div>

            <SpendeeImporter />
        </div>
    );
}
