"use client";

import { useState } from "react";
import { useStore } from "@/store/use-store";
import { MODELS } from "@/lib/constants";
import {
  Plus,
  Search,
  Trash2,
  MessageSquare,
  ImageIcon,
} from "lucide-react";

export default function Sidebar({ onSelectChat }: { onSelectChat?: () => void }) {
  const store = useStore();
  const [filter, setFilter] = useState<"all" | "chat" | "image">("all");
  const [query, setQuery] = useState("");

  const list = store.conversations.filter((c) => {
    if (filter !== "all" && c.type !== filter) return false;
    if (query && !c.title.toLowerCase().includes(query.toLowerCase()))
      return false;
    return true;
  });

  return (
    <aside className="w-64 shrink-0 flex flex-col h-full bg-surface border-r border-edge">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-3 border-b border-edge">
        <span className="text-sm font-bold tracking-tight text-violet-light">
          HC<span className="text-dim font-normal">.ai</span>
        </span>
        <button
          onClick={() => { store.create(MODELS[0].id); onSelectChat?.(); }}
          className="ml-auto w-7 h-7 flex items-center justify-center rounded-md border border-edge-2 text-muted hover:text-violet-light hover:border-violet transition-colors"
          title="New Chat"
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-px px-2 pt-2">
        {(["all", "chat", "image"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`flex-1 py-1.5 text-[11px] rounded-t border-b-2 transition-colors capitalize ${
              filter === t
                ? "text-violet-light border-violet bg-surface-2"
                : "text-dim border-transparent hover:text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="px-2 py-1.5">
        <div className="relative">
          <Search
            size={11}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-dim"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search..."
            className="w-full pl-6 pr-2 py-1.5 text-xs bg-surface-2 border border-edge rounded-md outline-none focus:border-violet text-primary placeholder:text-dim"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
        {list.map((c) => (
          <div
            key={c.id}
            onClick={() => { store.select(c.id); onSelectChat?.(); }}
            className={`group flex items-center gap-2 px-2.5 py-2 rounded-md cursor-pointer transition-colors ${
              c.id === store.activeId
                ? "bg-violet-bg"
                : "hover:bg-surface-2"
            }`}
          >
            <span className="shrink-0 opacity-50">
              {c.type === "image" ? (
                <ImageIcon size={12} />
              ) : (
                <MessageSquare size={12} />
              )}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-xs truncate">{c.title}</div>
              <div className="text-[10px] text-dim mt-0.5">
                {new Date(c.updated).toLocaleDateString()} ·{" "}
                {c.messages.length} msgs
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                store.remove(c.id);
              }}
              className="hidden group-hover:block text-dim hover:text-red-400"
            >
              <Trash2 size={11} />
            </button>
          </div>
        ))}
        {list.length === 0 && (
          <p className="text-center text-dim text-[11px] py-8">
            {query ? "No matches" : "No chats yet"}
          </p>
        )}
      </div>

      <div className="px-3 py-2 border-t border-edge text-[10px] text-dim">
        {store.conversations.length} chats
      </div>
    </aside>
  );
}
