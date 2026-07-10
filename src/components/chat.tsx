"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { useStore } from "@/store/use-store";
import { MODELS, IMG_MODEL, VISION_MODELS } from "@/lib/constants";
import type { ImageAttachment } from "@/lib/types";
import MessageBubble from "./message";
import SettingsPanel from "./settings";
import {
  Settings,
  Eraser,
  Zap,
  ZapOff,
  Send,
  Square,
  Lightbulb,
  Code,
  ImageIcon,
  Paperclip,
  X,
  Mic,
  MicOff,
  Eye,
  Pencil,
  MessageCircle,
  Menu,
} from "lucide-react";

type AttachMode = "vision" | "edit";

export default function Chat({ onMenuClick }: { onMenuClick?: () => void }) {
  const s = useStore();
  const [showSettings, setShowSettings] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [attachments, setAttachments] = useState<ImageAttachment[]>([]);
  const [attachMode, setAttachMode] = useState<AttachMode>("vision");
  const [recording, setRecording] = useState(false);
  const [voiceUsed, setVoiceUsed] = useState(false); // track if last input was voice
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const chat = s.active();
  const model = chat?.model ?? MODELS[0].id;

  const scroll = useCallback(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scroll, [chat?.messages?.length, streamText, scroll]);

  // Global shortcuts
  useEffect(() => {
    const fn = (e: globalThis.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        s.create(model);
      }
      if (e.key === "Escape") setShowSettings(false);
    };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [model, s]);

  // ── Token estimate ──
  const tokens = chat
    ? Math.round(
        chat.messages.reduce(
          (n, m) => n + (m.content || m.prompt || "").length,
          0
        ) / 4
      )
    : 0;
  const ctxPct = Math.min(100, (tokens / 128_000) * 100);

  // ── Voice input (Web Speech API) ──
  const toggleVoice = () => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition not supported in this browser. Use Chrome or Edge.");
      return;
    }

    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.continuous = true;
    recognitionRef.current = rec;

    let finalTranscript = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += t + " ";
        } else {
          interim = t;
        }
      }
      if (inputRef.current) {
        inputRef.current.value = (finalTranscript + interim).trim();
        resize(inputRef.current);
      }
    };

    rec.onend = () => {
      setRecording(false);
      // Auto-send if we have text
      if (inputRef.current?.value.trim()) {
        setVoiceUsed(true);
        setTimeout(() => send(true), 100);
      }
    };

    rec.onerror = () => {
      setRecording(false);
    };

    rec.start();
    setRecording(true);
  };

  // ── File attach ──
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach((f) => {
      if (!f.type.startsWith("image/")) return;
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setAttachments((prev) => [
          ...prev,
          { base64, name: f.name, preview: base64 },
        ]);
      };
      reader.readAsDataURL(f);
    });
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Send ──
  const send = async (fromVoice = false) => {
    const raw = inputRef.current?.value.trim();
    if ((!raw && !attachments.length) || s.isStreaming) return;
    inputRef.current!.value = "";
    resize(inputRef.current!);

    if (raw?.startsWith("/") && !attachments.length) return command(raw);

    if (!chat) s.create(model);

    const imgs = attachments.length ? [...attachments] : undefined;
    const currentMode = attachMode;
    s.push({
      role: "user",
      content: raw || "(image)",
      images: imgs,
      time: Date.now(),
      model,
    });
    setAttachments([]);

    await new Promise((r) => setTimeout(r, 0));

    // If images attached in edit mode → image edit API
    if (imgs?.length && currentMode === "edit" && raw) {
      await editImage(raw, imgs);
    } else {
      await streamChat(imgs, fromVoice || voiceUsed);
    }
    setVoiceUsed(false);
  };

  // ── Commands ──
  const command = (raw: string) => {
    const [cmd, ...rest] = raw.split(" ");
    const arg = rest.join(" ").trim();

    switch (cmd.toLowerCase()) {
      case "/image":
        if (!arg) return sys("Usage: /image <prompt>");
        if (!chat) s.create(IMG_MODEL);
        s.setType("image");
        s.push({ role: "user", content: raw, time: Date.now(), model: IMG_MODEL });
        genImage(arg);
        break;
      case "/system":
        if (!arg) return sys("Usage: /system <prompt>");
        s.patch({ systemPrompt: arg });
        sys("System prompt set: " + arg);
        break;
      case "/clear":
        s.clear();
        break;
      case "/model":
        if (arg) {
          const found = MODELS.find((m) =>
            m.id.toLowerCase().includes(arg.toLowerCase())
          );
          if (found) {
            s.setModel(found.id);
            sys("Switched to " + found.id);
          } else {
            sys("Not found. Available:\n" + MODELS.map((m) => m.id).join(", "));
          }
        } else {
          sys(
            "Models:\n" +
              MODELS.map((m) => `  ${m.id} [${m.cat}]`).join("\n")
          );
        }
        break;
      case "/voice":
        s.patch({ autoTTS: !s.settings.autoTTS });
        sys(`Conversational mode ${!s.settings.autoTTS ? "ON" : "OFF"} — responses will ${!s.settings.autoTTS ? "" : "not "}be read aloud`);
        break;
      case "/help":
        sys(
          `/image <prompt> — Generate image
/system <prompt> — Set system prompt
/model [name] — List / switch models
/voice — Toggle conversational mode (auto-TTS)
/clear — Clear chat
/help — This help

Mic button: hold to speak, release to send
Attach images: paperclip or drag & drop
Toggle Vision/Edit mode when images attached`
        );
        break;
      default:
        sys("Unknown: " + cmd);
    }
  };

  const sys = (content: string) => {
    if (!chat) s.create(model);
    s.push({ role: "system", content, time: Date.now() });
  };

  // ── Auto-TTS helper ──
  const playTTSForText = async (text: string) => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: text.slice(0, 4000),
          voice: s.settings.ttsVoice,
        }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch {}
  };

  // ── Stream chat ──
  const streamChat = async (images?: ImageAttachment[], shouldAutoTTS = false) => {
    const c = s.active();
    if (!c) return;

    s.setStreaming(true);
    setStreamText("");

    // Build messages with vision support
    const msgs: { role: string; content: unknown }[] = [];
    if (s.settings.systemPrompt)
      msgs.push({ role: "system", content: s.settings.systemPrompt });

    for (const m of c.messages) {
      if (m.role === "user" || m.role === "assistant") {
        if (m.images?.length && m.role === "user") {
          const parts: unknown[] = [];
          if (m.content && m.content !== "(image)") {
            parts.push({ type: "text", text: m.content });
          }
          for (const img of m.images) {
            parts.push({
              type: "image_url",
              image_url: { url: img.base64 },
            });
          }
          msgs.push({ role: "user", content: parts });
        } else {
          msgs.push({ role: m.role, content: m.content });
        }
      }
    }

    let useModel = c.model;
    if (images?.length && !VISION_MODELS.includes(c.model)) {
      useModel = "step-3.7-flash";
    }

    s.push({ role: "assistant", content: "", time: Date.now(), model: useModel });

    abortRef.current = new AbortController();
    let full = "";

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: useModel,
          messages: msgs,
          stream: s.settings.streaming,
          temperature: s.settings.temperature,
          max_tokens: s.settings.maxTokens,
          top_p: s.settings.topP,
          frequency_penalty: s.settings.freqPenalty,
          presence_penalty: s.settings.presPenalty,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);

      if (s.settings.streaming && res.body) {
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const lines = buf.split("\n");
          buf = lines.pop() || "";

          for (const ln of lines) {
            const t = ln.trim();
            if (!t.startsWith("data: ")) continue;
            const d = t.slice(6);
            if (d === "[DONE]") continue;
            try {
              const chunk = JSON.parse(d);
              const delta = chunk.choices?.[0]?.delta;
              if (delta && typeof delta.content === "string" && delta.content) {
                full += delta.content;
                setStreamText(full);
                s.patchLast(full);
              }
            } catch (parseErr) {
              console.warn("[stream parse]", parseErr, "raw:", d.slice(0, 200));
            }
          }
        }
      } else {
        const json = await res.json();
        full = json.choices?.[0]?.message?.content || "No response";
        s.patchLast(full);
      }
    } catch (e: unknown) {
      const err = e as Error;
      if (err.name === "AbortError") {
        full += "\n\n*[Stopped]*";
      } else {
        full = `**Error:** ${err.message}`;
      }
      s.patchLast(full);
    }

    // auto-title
    const updated = s.active();
    if (updated?.title === "New Chat") {
      const first = updated.messages.find((m) => m.role === "user");
      if (first)
        s.rename(
          first.content.slice(0, 50) + (first.content.length > 50 ? "..." : "")
        );
    }

    s.setStreaming(false);
    setStreamText("");
    abortRef.current = null;

    // Auto-TTS if voice was used or conversational mode is on
    if ((shouldAutoTTS || s.settings.autoTTS) && full && !full.startsWith("**Error")) {
      playTTSForText(full);
    }
  };

  // ── Image gen ──
  const genImage = async (prompt: string) => {
    s.setStreaming(true);
    sys(`Generating: "${prompt}"...`);

    try {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: IMG_MODEL,
          prompt,
          n: 1,
          size: s.settings.imgSize,
        }),
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const json = await res.json();
      const urls: string[] =
        json.data?.map((d: { url: string }) => d.url).filter(Boolean) ?? [];
      if (!urls.length) throw new Error("No images returned");

      const cur = s.active();
      if (cur) {
        const last = cur.messages.length - 1;
        if (cur.messages[last]?.role === "system") s.removeMsg(last);
      }

      s.push({
        role: "image_result",
        content: "",
        prompt,
        urls,
        time: Date.now(),
        model: IMG_MODEL,
      });
    } catch (e: unknown) {
      sys("Image failed: " + (e as Error).message);
    }

    s.setStreaming(false);
  };

  // ── Image edit ──
  const editImage = async (prompt: string, images: ImageAttachment[]) => {
    s.setStreaming(true);
    sys(`Editing image: "${prompt}"...`);

    try {
      // Convert base64 data URI to blob
      const dataUri = images[0].base64;
      const resp = await fetch(dataUri);
      const blob = await resp.blob();

      const formData = new FormData();
      formData.append("image", blob, images[0].name || "image.png");
      formData.append("prompt", prompt);
      formData.append("model", IMG_MODEL);
      formData.append("n", "1");
      formData.append("size", s.settings.imgSize);

      const res = await fetch("/api/images-edit", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      const json = await res.json();
      const urls: string[] =
        json.data?.map((d: { url: string }) => d.url).filter(Boolean) ?? [];
      if (!urls.length) throw new Error("No edited images returned");

      const cur = s.active();
      if (cur) {
        const last = cur.messages.length - 1;
        if (cur.messages[last]?.role === "system") s.removeMsg(last);
      }

      s.push({
        role: "image_result",
        content: "",
        prompt: `Edit: ${prompt}`,
        urls,
        time: Date.now(),
        model: IMG_MODEL,
      });
    } catch (e: unknown) {
      sys("Image edit failed: " + (e as Error).message);
    }

    s.setStreaming(false);
  };

  // ── Edit from generated image URL ──
  const editFromUrl = async (url: string) => {
    try {
      // Fetch the image and convert to base64
      const res = await fetch(url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result as string;
        setAttachments([{ base64, name: "generated.png", preview: base64 }]);
        setAttachMode("edit");
        inputRef.current?.focus();
      };
      reader.readAsDataURL(blob);
    } catch {
      sys("Failed to load image for editing");
    }
  };

  const retry = (idx: number) => {
    if (s.isStreaming) return;
    const c = s.active();
    if (!c) return;
    for (let i = idx; i >= 0; i--) {
      if (c.messages[i].role === "user") {
        s.truncate(i);
        streamChat();
        return;
      }
    }
  };

  const resize = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 300) + "px";
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const slash = (cmd: string) => {
    if (!inputRef.current) return;
    inputRef.current.value = cmd;
    inputRef.current.focus();
    if (["/clear", "/help"].includes(cmd.trim())) send();
  };

  // ── Drag & drop ──
  const [dragging, setDragging] = useState(false);
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // ── Render ──
  return (
    <main
      className="flex-1 flex flex-col min-w-0 h-dvh"
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
    >
      <SettingsPanel open={showSettings} onClose={() => setShowSettings(false)} />

      {dragging && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 pointer-events-none">
          <div className="text-violet-light text-lg font-semibold border-2 border-dashed border-violet rounded-xl px-10 py-8">
            Drop images here
          </div>
        </div>
      )}

      {/* ─ Top bar ─ */}
      <header className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 border-b border-edge bg-surface flex-wrap">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded border border-edge text-muted hover:text-violet-light hover:border-violet transition-colors"
        >
          <Menu size={16} />
        </button>

        <select
          value={model}
          onChange={(e) => {
            s.setModel(e.target.value);
            if (!chat) s.create(e.target.value);
          }}
          className="px-2 py-1 bg-surface-2 border border-edge rounded text-xs outline-none focus:border-violet text-primary cursor-pointer"
        >
          {["chat", "image", "audio"].map((cat) => {
            const items = MODELS.filter((m) => m.cat === cat);
            if (!items.length) return null;
            return (
              <optgroup key={cat} label={cat.charAt(0).toUpperCase() + cat.slice(1)}>
                {items.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>

        <div className="w-px h-5 bg-edge" />

        <TopBtn
          active={s.settings.streaming}
          onClick={() => s.patch({ streaming: !s.settings.streaming })}
        >
          {s.settings.streaming ? <Zap size={11} /> : <ZapOff size={11} />}
          <span className="hidden sm:inline">Stream</span>
        </TopBtn>

        <TopBtn
          active={s.settings.autoTTS}
          onClick={() => s.patch({ autoTTS: !s.settings.autoTTS })}
        >
          <MessageCircle size={11} />
          <span className="hidden sm:inline">Voice</span>
        </TopBtn>

        <TopBtn onClick={() => setShowSettings(true)}>
          <Settings size={11} />
        </TopBtn>

        <TopBtn onClick={s.clear}>
          <Eraser size={11} />
        </TopBtn>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:inline text-[10px] text-dim bg-surface-2 px-2 py-0.5 rounded border border-edge">
            ~{tokens.toLocaleString()} tokens
          </span>
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              s.isStreaming ? "bg-violet pulse-glow" : "bg-green-500"
            }`}
          />
        </div>
      </header>

      {/* ─ Messages ─ */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[900px] mx-auto px-3 sm:px-6 py-3 sm:py-5">
          {(!chat || !chat.messages.length) && <Welcome onPick={slug => { if (inputRef.current) { inputRef.current.value = slug; send(); } }} />}

          {chat?.messages.map((m, i) => (
            <MessageBubble
              key={m.id}
              msg={m}
              idx={i}
              onDelete={s.removeMsg}
              onRetry={retry}
              onEditImage={editFromUrl}
            />
          ))}

          {s.isStreaming && !streamText && (
            <div className="anim-fade-up mb-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-violet-light mb-1">
                assistant
              </div>
              <div className="px-3 py-2.5 rounded-lg border-l-2 border-l-violet bg-surface streaming-cursor text-dim text-sm">
                Thinking
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>
      </div>

      {/* ─ Input ─ */}
      <footer className="border-t border-edge bg-surface px-2 sm:px-4 py-2 sm:py-3">
        <div className="max-w-[900px] mx-auto">
          {/* context bar */}
          <div className="flex items-center gap-2 text-[10px] text-dim mb-2">
            <span>Context:</span>
            <div className="flex-1 h-0.5 bg-edge rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all duration-300 ${
                  ctxPct > 80
                    ? "bg-red-500"
                    : ctxPct > 50
                      ? "bg-orange-500"
                      : "bg-violet"
                }`}
                style={{ width: `${ctxPct}%` }}
              />
            </div>
            <span>{ctxPct.toFixed(1)}%</span>
          </div>

          {/* slash buttons */}
          <div className="flex gap-1 mb-1.5 overflow-x-auto scrollbar-none">
            {["/image ", "/system ", "/clear", "/model ", "/voice", "/help"].map((c) => (
              <button
                key={c}
                onClick={() => slash(c)}
                className="px-2 py-0.5 bg-surface-2 border border-edge rounded text-[10px] text-dim hover:text-primary hover:border-violet transition-colors"
              >
                {c.trim()}
              </button>
            ))}
          </div>

          {/* image attachments preview + mode toggle */}
          {attachments.length > 0 && (
            <div className="mb-2">
              {/* mode toggle */}
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[10px] text-dim mr-1">Mode:</span>
                <button
                  onClick={() => setAttachMode("vision")}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-colors ${
                    attachMode === "vision"
                      ? "border-cyan-500 text-cyan-400 bg-cyan-500/10"
                      : "border-edge text-dim hover:border-cyan-500"
                  }`}
                >
                  <Eye size={10} />
                  Vision (chat about image)
                </button>
                <button
                  onClick={() => setAttachMode("edit")}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border transition-colors ${
                    attachMode === "edit"
                      ? "border-pink-500 text-pink-400 bg-pink-500/10"
                      : "border-edge text-dim hover:border-pink-500"
                  }`}
                >
                  <Pencil size={10} />
                  Edit (modify image)
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                {attachments.map((att, i) => (
                  <div key={i} className="relative group/att">
                    <img
                      src={att.preview}
                      alt={att.name}
                      className="w-16 h-16 object-cover rounded-lg border border-edge"
                    />
                    <button
                      onClick={() => removeAttachment(i)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover/att:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                    <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-white text-center truncate rounded-b-lg px-0.5">
                      {att.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* textarea + attach + mic + send */}
          <div className="flex gap-1.5 items-end">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              title="Attach images"
              className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border border-edge text-muted hover:text-violet-light hover:border-violet transition-colors"
            >
              <Paperclip size={16} />
            </button>

            <textarea
              ref={inputRef}
              rows={1}
              placeholder={
                recording
                  ? "Listening... (click mic to stop & send)"
                  : attachments.length
                    ? attachMode === "edit"
                      ? "Describe how to edit this image..."
                      : "Ask about this image..."
                    : "Message... (Enter to send, Shift+Enter newline, / commands)"
              }
              onKeyDown={onKey}
              onInput={(e) => resize(e.currentTarget)}
              onPaste={(e) => {
                const items = e.clipboardData?.items;
                if (!items) return;
                for (const item of Array.from(items)) {
                  if (item.type.startsWith("image/")) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (file) {
                      const dt = new DataTransfer();
                      dt.items.add(file);
                      handleFiles(dt.files);
                    }
                  }
                }
              }}
              className={`flex-1 px-3 py-2.5 bg-surface-2 border rounded-lg text-[13px] leading-relaxed outline-none resize-none min-h-10 max-h-[300px] text-primary placeholder:text-dim transition-colors ${
                recording ? "border-red-500 bg-red-500/5" : "border-edge focus:border-violet"
              }`}
            />

            {/* Mic button */}
            <button
              onClick={toggleVoice}
              title={recording ? "Stop recording" : "Voice input"}
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                recording
                  ? "bg-red-500 border-red-500 text-white animate-pulse"
                  : "border-edge text-muted hover:text-violet-light hover:border-violet"
              }`}
            >
              {recording ? <MicOff size={16} /> : <Mic size={16} />}
            </button>

            <button
              onClick={s.isStreaming ? () => abortRef.current?.abort() : () => send()}
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white transition-colors ${
                s.isStreaming
                  ? "bg-red-500 hover:bg-red-600"
                  : "bg-violet hover:bg-violet-light"
              }`}
            >
              {s.isStreaming ? <Square size={14} /> : <Send size={14} />}
            </button>
          </div>

          <div className="flex justify-between mt-1 text-[10px] text-dim">
            <span>
              {s.settings.autoTTS ? "Voice mode ON · " : ""}
              Mic for voice · / commands · Drag & drop images
            </span>
            <span>Shift+Enter newline</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* ── Sub-components ── */

function TopBtn({
  children,
  onClick,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 px-2 py-1 border rounded text-[11px] transition-colors ${
        active
          ? "border-violet text-violet-light bg-violet-bg"
          : "border-edge text-muted hover:border-violet hover:text-violet-light"
      }`}
    >
      {children}
    </button>
  );
}

function Welcome({ onPick }: { onPick: (s: string) => void }) {
  const cards = [
    {
      icon: <Lightbulb size={18} />,
      title: "Explain",
      desc: "Ask complex questions",
      prompt: "Explain quantum computing in simple terms",
    },
    {
      icon: <Code size={18} />,
      title: "Code",
      desc: "Generate & debug code",
      prompt: "Write a Python function to merge two sorted lists",
    },
    {
      icon: <ImageIcon size={18} />,
      title: "Create",
      desc: "Generate images",
      prompt: "/image A futuristic city at sunset, cyberpunk style",
    },
    {
      icon: <Mic size={18} />,
      title: "Talk",
      desc: "Voice conversation",
      prompt: "Hello! Tell me something interesting about space",
    },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <h1 className="text-2xl font-semibold text-violet-light mb-1 tracking-tight">
        HC AI Platform
      </h1>
      <p className="text-dim text-sm mb-5">
        Chat, voice, vision, image gen & edit
      </p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 max-w-[700px] w-full px-4 sm:px-0">
        {cards.map((c) => (
          <button
            key={c.title}
            onClick={() => onPick(c.prompt)}
            className="bg-surface-2 border border-edge rounded-lg p-3.5 text-left hover:border-violet hover:bg-violet-bg transition-colors"
          >
            <div className="mb-1.5 text-violet-light">{c.icon}</div>
            <div className="text-xs font-semibold mb-0.5">{c.title}</div>
            <div className="text-[11px] text-dim leading-snug">{c.desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
