"use client";

import { useState, useEffect, useTransition } from "react";
import { searchTransactions } from "@/app/actions/transactions";
import { getWallets } from "@/app/actions/wallets";
import { TransactionList } from "@/components/transactions/TransactionList";
import { Search as SearchIcon, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function SearchPage() {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);
    const [wallets, setWallets] = useState<any[]>([]);
    const [isPending, startTransition] = useTransition();
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        // Load wallets for the TransactionList component
        getWallets().then(res => {
            if (res.data) setWallets(res.data);
        });
    }, []);

    // Debounced search trigger
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setHasSearched(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            startTransition(async () => {
                const res = await searchTransactions(query);
                if (res.data) {
                    setResults(res.data);
                }
                setHasSearched(true);
            });
        }, 300); // 300ms debounce

        return () => clearTimeout(timeoutId);
    }, [query]);

    return (
        <div className="flex flex-col min-h-[100dvh]">
            {/* Search Top Bar */}
            <div className="sticky top-0 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 p-4 pt-16 md:pt-6 landscape:pt-4">
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                        aria-label="Go back"
                    >
                        <ArrowLeft size={24} />
                    </button>

                    <div className="relative flex-1">
                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by category or description..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                            className="w-full pl-10 pr-10 py-3 bg-gray-100 dark:bg-gray-800 border-transparent rounded-xl focus:bg-white dark:focus:bg-gray-900 focus:border-[var(--color-brand-navy)] focus:ring-2 focus:ring-[var(--color-brand-navy)]/20 outline-none transition-all"
                        />
                        {isPending && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-brand-navy)]">
                                <Loader2 size={18} className="animate-spin" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 p-4 md:p-8 max-w-4xl w-full mx-auto pb-24 md:pb-8">
                {!query.trim() && !hasSearched ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center mt-12">
                        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-4">
                            <SearchIcon size={32} className="text-[var(--color-brand-navy)] dark:text-blue-400 opacity-50" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Search Transactions</h2>
                        <p className="text-gray-500 max-w-sm">Find any transaction instantly by searching for keywords in its description or category name.</p>
                    </div>
                ) : results.length === 0 && hasSearched && !isPending ? (
                    <div className="text-center py-16 mt-12">
                        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">No results found for "{query}"</p>
                        <p className="text-gray-500 mt-2">Try adjusting your search terms.</p>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {query.trim() && (
                            <p className="text-sm font-medium text-gray-500 mb-4 px-1">
                                Found {results.length} result{results.length !== 1 ? 's' : ''}
                            </p>
                        )}
                        {results.length > 0 && (
                            <TransactionList
                                initialTransactions={results}
                                wallets={wallets}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
