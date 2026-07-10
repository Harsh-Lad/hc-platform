"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Conversation, Message, Settings } from "@/lib/types";

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

interface Store {
  conversations: Conversation[];
  activeId: string | null;
  settings: Settings;
  isStreaming: boolean;

  // Getters
  active: () => Conversation | undefined;

  // Conversation actions
  create: (model: string) => string;
  select: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  setModel: (model: string) => void;
  setType: (type: "chat" | "image") => void;
  rename: (title: string) => void;

  // Message actions
  push: (msg: Omit<Message, "id">) => void;
  patchLast: (content: string) => void;
  removeMsg: (idx: number) => void;
  truncate: (idx: number) => void;

  // State
  setStreaming: (v: boolean) => void;
  patch: (s: Partial<Settings>) => void;
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeId: null,
      isStreaming: false,
      settings: {
        temperature: 0.7,
        maxTokens: 4096,
        topP: 1,
        freqPenalty: 0,
        presPenalty: 0,
        systemPrompt: "",
        imgSize: "1024x1024",
        streaming: true,
        ttsVoice: "wenrounvsheng",
        autoTTS: false,
      },

      active: () => {
        const { conversations, activeId } = get();
        return conversations.find((c) => c.id === activeId);
      },

      create: (model) => {
        const id = uid();
        set((s) => ({
          conversations: [
            {
              id,
              title: "New Chat",
              type: "chat",
              model,
              messages: [],
              created: Date.now(),
              updated: Date.now(),
            },
            ...s.conversations,
          ],
          activeId: id,
        }));
        return id;
      },

      select: (id) => set({ activeId: id }),

      remove: (id) =>
        set((s) => ({
          conversations: s.conversations.filter((c) => c.id !== id),
          activeId: s.activeId === id ? null : s.activeId,
        })),

      clear: () =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === s.activeId ? { ...c, messages: [], updated: Date.now() } : c
          ),
        })),

      setModel: (model) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === s.activeId ? { ...c, model } : c
          ),
        })),

      setType: (type) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === s.activeId ? { ...c, type } : c
          ),
        })),

      rename: (title) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === s.activeId ? { ...c, title } : c
          ),
        })),

      push: (msg) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === s.activeId
              ? { ...c, messages: [...c.messages, { ...msg, id: uid() }], updated: Date.now() }
              : c
          ),
        })),

      patchLast: (content) =>
        set((s) => ({
          conversations: s.conversations.map((c) => {
            if (c.id !== s.activeId) return c;
            const msgs = [...c.messages];
            if (msgs.length && msgs[msgs.length - 1].role === "assistant") {
              msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
            }
            return { ...c, messages: msgs };
          }),
        })),

      removeMsg: (idx) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === s.activeId
              ? { ...c, messages: c.messages.filter((_, i) => i !== idx), updated: Date.now() }
              : c
          ),
        })),

      truncate: (idx) =>
        set((s) => ({
          conversations: s.conversations.map((c) =>
            c.id === s.activeId
              ? { ...c, messages: c.messages.slice(0, idx + 1), updated: Date.now() }
              : c
          ),
        })),

      setStreaming: (v) => set({ isStreaming: v }),

      patch: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
    }),
    {
      name: "hc-platform-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (s: Store) => ({
        conversations: s.conversations,
        activeId: s.activeId,
        settings: s.settings,
      }),
    }
  )
);
