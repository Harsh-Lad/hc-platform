"use client";

import { useStore } from "@/store/use-store";
import { IMG_SIZES, TTS_VOICES } from "@/lib/constants";
import { X } from "lucide-react";

export default function SettingsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { settings, patch, conversations } = useStore();

  if (!open) return null;

  const exportAll = () => {
    const blob = new Blob([JSON.stringify(conversations, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hc-chats-export.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const sliders: {
    key: keyof typeof settings;
    label: string;
    min: number;
    max: number;
    step: number;
  }[] = [
    { key: "temperature", label: "Temperature", min: 0, max: 2, step: 0.05 },
    { key: "maxTokens", label: "Max Tokens", min: 256, max: 16384, step: 256 },
    { key: "topP", label: "Top P", min: 0, max: 1, step: 0.05 },
    { key: "freqPenalty", label: "Freq Penalty", min: 0, max: 2, step: 0.1 },
    { key: "presPenalty", label: "Pres Penalty", min: 0, max: 2, step: 0.1 },
  ];

  return (
    <div className="fixed right-0 inset-y-0 w-full sm:w-80 bg-surface border-l border-edge z-50 overflow-y-auto p-4 anim-fade-up">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-violet-light">Settings</h3>
        <button onClick={onClose} className="text-dim hover:text-primary">
          <X size={16} />
        </button>
      </div>

      <div className="space-y-4">
        <Field label="System Prompt">
          <textarea
            value={settings.systemPrompt}
            onChange={(e) => patch({ systemPrompt: e.target.value })}
            placeholder="You are a helpful assistant..."
            className="w-full p-2 min-h-20 resize-y bg-surface-2 border border-edge rounded-md text-xs outline-none focus:border-violet text-primary"
          />
        </Field>

        {sliders.map((s) => (
          <Field key={String(s.key)} label={s.label}>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={s.min}
                max={s.max}
                step={s.step}
                value={settings[s.key] as number}
                onChange={(e) =>
                  patch({ [s.key]: parseFloat(e.target.value) })
                }
                className="flex-1 accent-violet"
              />
              <span className="text-xs text-violet-light w-10 text-right">
                {settings[s.key]}
              </span>
            </div>
          </Field>
        ))}

        <Field label="Image Size">
          <select
            value={settings.imgSize}
            onChange={(e) => patch({ imgSize: e.target.value })}
            className="w-full p-2 bg-surface-2 border border-edge rounded-md text-xs text-primary outline-none focus:border-violet"
          >
            {IMG_SIZES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Conversational Mode">
          <button
            onClick={() => patch({ autoTTS: !settings.autoTTS })}
            className={`w-full py-2 rounded-md text-xs border transition-colors ${
              settings.autoTTS
                ? "border-violet text-violet-light bg-violet-bg"
                : "border-edge text-muted hover:border-violet"
            }`}
          >
            {settings.autoTTS ? "ON — Auto-read responses aloud" : "OFF — Text only"}
          </button>
          <p className="text-[10px] text-dim mt-1">
            When on, AI responses are automatically spoken. Voice input also triggers auto-read.
          </p>
        </Field>

        <Field label="TTS Voice">
          <select
            value={settings.ttsVoice}
            onChange={(e) => patch({ ttsVoice: e.target.value })}
            className="w-full p-2 bg-surface-2 border border-edge rounded-md text-xs text-primary outline-none focus:border-violet"
          >
            {TTS_VOICES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </Field>

        <button
          onClick={exportAll}
          className="w-full py-2 border border-edge-2 rounded-md text-xs text-muted hover:text-violet-light hover:border-violet transition-colors"
        >
          Export All Chats
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-wider text-dim mb-1">
        {label}
      </label>
      {children}
    </div>
  );
}
