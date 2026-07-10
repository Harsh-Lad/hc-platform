"use client";

import { useState, useRef, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import type { Message } from "@/lib/types";
import { useStore } from "@/store/use-store";
import { Copy, Check, RotateCcw, Trash2, Volume2, Loader2, Pencil } from "lucide-react";

interface Props {
  msg: Message;
  idx: number;
  onDelete: (i: number) => void;
  onRetry: (i: number) => void;
  onEditImage?: (url: string) => void;
}

const ROLE_COLOR: Record<string, string> = {
  user: "text-cyan-400",
  assistant: "text-violet-light",
  system: "text-yellow-400",
  image_result: "text-pink-400",
};
const BORDER: Record<string, string> = {
  user: "border-l-cyan-500",
  assistant: "border-l-violet",
  system: "border-l-yellow-500",
  image_result: "border-l-pink-500",
};
const BG: Record<string, string> = {
  user: "bg-surface-2",
  assistant: "bg-surface",
  system: "bg-yellow-500/5",
  image_result: "bg-surface",
};

export default function MessageBubble({ msg, idx, onDelete, onRetry, onEditImage }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [ttsPlaying, setTtsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const { settings } = useStore();

  const copy = (text: string, id = "msg") => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  };

  const playTTS = async () => {
    // If already playing, stop
    if (audioRef.current && ttsPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setTtsPlaying(false);
      return;
    }

    setTtsLoading(true);
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: msg.content.slice(0, 4000), // limit length
          voice: settings.ttsVoice,
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        setTtsPlaying(false);
        URL.revokeObjectURL(url);
      };

      await audio.play();
      setTtsPlaying(true);
    } catch (e) {
      console.error("TTS error:", e);
    }
    setTtsLoading(false);
  };

  const label = msg.role === "image_result" ? "image" : msg.role;

  return (
    <>
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 cursor-pointer"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt=""
            className="max-w-[90vw] max-h-[90vh] rounded-lg"
          />
        </div>
      )}

      <div className="anim-fade-up mb-5 group">
        {/* header */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[11px] font-bold uppercase tracking-wider ${ROLE_COLOR[msg.role] ?? "text-muted"}`}
          >
            {label}
          </span>
          {msg.model && (
            <span className="text-[10px] text-dim bg-surface-2 px-1.5 rounded">
              {msg.model}
            </span>
          )}

          {/* hover actions */}
          <div className="hidden group-hover:flex items-center gap-1 ml-auto">
            <Btn
              onClick={() => copy(msg.content || msg.prompt || "")}
              title="Copy"
            >
              {copied === "msg" ? <Check size={10} /> : <Copy size={10} />}
            </Btn>
            {msg.role === "assistant" && msg.content && (
              <Btn
                onClick={playTTS}
                title={ttsPlaying ? "Stop TTS" : "Read aloud"}
              >
                {ttsLoading ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Volume2 size={10} className={ttsPlaying ? "text-violet-light" : ""} />
                )}
              </Btn>
            )}
            {msg.role !== "system" && msg.role !== "image_result" && (
              <Btn onClick={() => onRetry(idx)} title="Retry">
                <RotateCcw size={10} />
              </Btn>
            )}
            <Btn
              onClick={() => onDelete(idx)}
              title="Delete"
              className="hover:!text-red-400 hover:!border-red-500"
            >
              <Trash2 size={10} />
            </Btn>
          </div>

          <span className="text-[10px] text-dim ml-auto group-hover:hidden">
            {msg.time ? new Date(msg.time).toLocaleTimeString() : ""}
          </span>
        </div>

        {/* body */}
        <div
          className={`px-3 py-2.5 rounded-lg border-l-2 text-[13px] leading-relaxed ${BORDER[msg.role] ?? ""} ${BG[msg.role] ?? "bg-surface"}`}
        >
          {msg.role === "user" && (
            <div>
              {/* attached images */}
              {msg.images && msg.images.length > 0 && (
                <div className="flex gap-2 mb-2 flex-wrap">
                  {msg.images.map((img, i) => (
                    <img
                      key={i}
                      src={img.preview}
                      alt={img.name}
                      className="max-w-[200px] max-h-[150px] rounded-lg border border-edge cursor-pointer hover:scale-[1.02] transition-transform object-cover"
                      onClick={() => setLightbox(img.base64)}
                    />
                  ))}
                </div>
              )}
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          )}

          {msg.role === "system" && (
            <div className="italic text-muted whitespace-pre-wrap">
              {msg.content}
            </div>
          )}

          {msg.role === "assistant" && (
            <div className="prose-chat">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ className, children, ...rest }) {
                    const lang = /language-(\w+)/.exec(className || "")?.[1];
                    const code = String(children).replace(/\n$/, "");
                    const cid = `c${idx}-${Math.random().toString(36).slice(2, 6)}`;

                    if (lang) {
                      return (
                        <div className="my-2 rounded-md border border-edge overflow-hidden bg-[#0d0d0d]">
                          <div className="flex items-center justify-between px-3 py-1 bg-surface-2 border-b border-edge text-[10px] text-dim">
                            <span>{lang}</span>
                            <button
                              onClick={() => copy(code, cid)}
                              className="hover:text-violet-light"
                            >
                              {copied === cid ? "copied!" : "copy"}
                            </button>
                          </div>
                          <SyntaxHighlighter
                            style={oneDark}
                            language={lang}
                            PreTag="div"
                            customStyle={{
                              margin: 0,
                              padding: "12px",
                              background: "transparent",
                              fontSize: "12px",
                            }}
                          >
                            {code}
                          </SyntaxHighlighter>
                        </div>
                      );
                    }

                    return (
                      <code
                        className="bg-surface-3 px-1.5 py-0.5 rounded text-[12px] text-orange-400"
                        {...rest}
                      >
                        {children}
                      </code>
                    );
                  },
                }}
              />
            </div>
          )}

          {msg.role === "image_result" && (
            <div>
              <p className="text-muted mb-2">{msg.prompt}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {msg.urls?.map((url, i) => (
                  <div key={i} className="relative group/img">
                    <img
                      src={url}
                      alt={msg.prompt || ""}
                      className="w-full rounded-lg border border-edge cursor-pointer hover:scale-[1.02] transition-transform"
                      onClick={() => setLightbox(url)}
                    />
                    {onEditImage && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditImage(url); }}
                        title="Edit this image"
                        className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/70 text-white text-[10px] border border-white/20 opacity-0 group-hover/img:opacity-100 transition-opacity hover:bg-violet/80"
                      >
                        <Pencil size={10} />
                        Edit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Btn({
  children,
  onClick,
  title,
  className = "",
}: {
  children: ReactNode;
  onClick: () => void;
  title: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-1 rounded bg-surface-2 border border-edge text-dim hover:text-primary hover:border-violet transition-colors ${className}`}
    >
      {children}
    </button>
  );
}
