"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, PlusCircle, PieChart } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Wallets", href: "/wallets", icon: Wallet },
    { name: "Add", href: "/transactions/new", icon: PlusCircle, special: true },
    { name: "Analytics", href: "/analytics", icon: PieChart },
  ];

  return (
    <div className="flex justify-around items-center h-full px-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");

        if (item.special) {
          return (
            <Link key={item.name} href={item.href} className="relative flex items-center justify-center w-16">
              <div className="absolute -top-6 landscape:-top-4 bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] rounded-full p-3 landscape:p-2 shadow-lg text-white transition-colors">
                <Icon size={28} className="landscape:hidden" />
                <Icon size={20} className="hidden landscape:block" />
              </div>
            </Link>
          );
        }

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center w-16 h-full gap-1 landscape:gap-0 transition-colors ${isActive
              ? "text-[var(--color-brand-navy)] dark:text-[var(--color-brand-navy-light)] font-medium"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
          >
            <Icon size={20} className="landscape:hidden" strokeWidth={isActive ? 2.5 : 2} />
            <Icon size={16} className="hidden landscape:block" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] landscape:text-[8px]">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
