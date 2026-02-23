"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, Target, PieChart, Settings, LayoutList } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Wallets", href: "/wallets", icon: Wallet },
    { name: "Transactions", href: "/transactions", icon: LayoutList },
    { name: "Budgets", href: "/budgets", icon: Target },
    { name: "Analytics", href: "/analytics", icon: PieChart },
  ];

  const bottomItems = [
    { name: "Settings", href: "/settings", icon: Settings },
  ]

  const Logo = () => (
    <div className="flex items-center gap-3 px-6 py-8">
      <div className="w-8 h-8 rounded-lg bg-[var(--color-brand-navy)] flex items-center justify-center text-white font-bold text-xl">
        Z
      </div>
      <span className="text-xl font-bold tracking-tight text-[var(--color-brand-navy)] dark:text-white">
        Zenith
      </span>
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <Logo />
      
      <div className="px-4 py-2">
        <Link 
          href="/transactions/new" 
          className="flex items-center justify-center gap-2 w-full bg-[var(--color-brand-navy)] hover:bg-[var(--color-brand-navy-light)] text-white px-4 py-3 rounded-xl transition-colors font-medium shadow-sm"
        >
          Add Transaction
        </Link>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');

          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                isActive 
                  ? "bg-blue-50 dark:bg-[#1a3c5e]/20 text-[var(--color-brand-navy)] dark:text-blue-400 font-medium" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200"
              }`}
            >
              <Icon size={20} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-6 mt-auto border-t border-gray-200 dark:border-gray-800">
        {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  isActive 
                    ? "bg-blue-50 dark:bg-[#1a3c5e]/20 text-[var(--color-brand-navy)] dark:text-blue-400 font-medium" 
                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-200"
                }`}
              >
                <Icon size={20} />
                <span>{item.name}</span>
              </Link>
            )
        })}
      </div>
    </div>
  );
}
