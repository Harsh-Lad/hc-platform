"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const Sidebar = dynamic(() => import("@/components/sidebar"), { ssr: false });
const Chat = dynamic(() => import("@/components/chat"), { ssr: false });

export default function Page() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden">
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar: hidden on mobile unless open, always visible on md+ */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-200 md:relative md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onSelectChat={() => setSidebarOpen(false)} />
      </div>

      <Chat onMenuClick={() => setSidebarOpen(true)} />
    </div>
  );
}
