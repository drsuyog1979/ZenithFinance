"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, PlusCircle, Target, PieChart, Settings } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const leftItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Wallets", href: "/wallets", icon: Wallet },
  ];

  const rightItems = [
    { name: "Budgets", href: "/budgets", icon: Target },
    { name: "Analytics", href: "/analytics", icon: PieChart },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <div className="flex justify-around items-center h-full px-1">
      {/* Left items */}
      {leftItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${isActive
                ? "text-[var(--color-brand-navy)] dark:text-[var(--color-brand-navy-light)] font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] leading-tight">{item.name}</span>
          </Link>
        );
      })}

      {/* Center Add button */}
      <Link
        href="/transactions/new"
        className="relative flex flex-col items-center justify-center flex-shrink-0 w-14"
        aria-label="Add Transaction"
      >
        <div className="absolute -top-5 bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] rounded-full p-3 shadow-lg text-white transition-colors">
          <PlusCircle size={26} />
        </div>
        {/* Empty placeholder to preserve spacing */}
        <span className="text-[10px] leading-tight mt-7 text-transparent select-none">Add</span>
      </Link>

      {/* Right items */}
      {rightItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
        return (
          <Link
            key={item.name}
            href={item.href}
            className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-colors ${isActive
                ? "text-[var(--color-brand-navy)] dark:text-[var(--color-brand-navy-light)] font-medium"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
          >
            <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] leading-tight">{item.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
