import { ReactNode } from "react";
import { BottomNav } from "@/components/layout/BottomNav";
import { Sidebar } from "@/components/layout/Sidebar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] w-full bg-gray-50 dark:bg-gray-950 overflow-hidden touch-none">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 landscape:p-2">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0 landscape:pb-14 relative touch-pan-y">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 landscape:h-12 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50">
        <BottomNav />
      </div>
    </div>
  );
}
