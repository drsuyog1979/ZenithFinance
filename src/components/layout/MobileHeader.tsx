"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreVertical, Settings, Upload, X, PieChart } from "lucide-react";

export function MobileHeader() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();

    const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
    const closeMenu = () => setIsMenuOpen(false);

    // Close menu when route changes
    if (isMenuOpen && typeof window !== "undefined") {
        // Optional: Prevent body scroll when menu is open
        document.body.style.overflow = "hidden";
    } else if (typeof window !== "undefined") {
        document.body.style.overflow = "";
    }

    const menuItems = [
        { name: "Analytics", href: "/analytics", icon: PieChart },
        { name: "Import Data", href: "/import", icon: Upload },
        { name: "Settings", href: "/settings", icon: Settings },
    ];

    return (
        <>
            <header className="md:hidden fixed top-0 left-0 right-0 h-16 landscape:h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-50 flex items-center justify-between px-4">
                {/* Branding */}
                <Link href="/dashboard" onClick={closeMenu} className="flex items-center gap-2">
                    <div className="w-8 h-8 landscape:w-7 landscape:h-7 rounded-lg bg-[var(--color-brand-navy)] flex items-center justify-center text-white font-bold text-lg landscape:text-base">
                        Z
                    </div>
                    <span className="text-xl landscape:text-lg font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">
                        Zenith
                    </span>
                </Link>

                {/* Action Menu Toggle */}
                <button
                    onClick={toggleMenu}
                    className="p-2 -mr-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                    aria-label="Menu"
                >
                    {isMenuOpen ? <X size={24} /> : <MoreVertical size={24} />}
                </button>
            </header>

            {/* Dropdown / Overlay Menu */}
            {isMenuOpen && (
                <div className="md:hidden fixed inset-0 z-40 bg-black/20 dark:bg-black/40 backdrop-blur-sm" onClick={closeMenu}>
                    <div
                        className="absolute top-16 landscape:top-14 right-2 w-56 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden transform transition-all"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="py-2">
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;

                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        onClick={closeMenu}
                                        className={`flex items-center gap-3 px-4 py-3 mx-2 my-1 rounded-xl transition-colors ${isActive
                                            ? "bg-blue-50 dark:bg-[#1a3c5e]/20 text-[var(--color-brand-navy)] dark:text-blue-400 font-medium"
                                            : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                                            }`}
                                    >
                                        <Icon size={20} />
                                        <span>{item.name}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
