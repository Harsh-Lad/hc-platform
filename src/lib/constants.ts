export const MODELS = [
  { id: "DeepSeek-V4-Pro", cat: "chat" },
  { id: "DeepSeek-V4-Flash", cat: "chat" },
  { id: "Qwen3.5-397B-A17B", cat: "chat" },
  { id: "Qwen3.6-35B-A3B", cat: "chat" },
  { id: "Qwen3-Coder-Next-FP8", cat: "chat" },
  { id: "MiniMax-M3", cat: "chat" },
  { id: "MiniMax-M2.7", cat: "chat" },
  { id: "glm-5.2", cat: "chat" },
  { id: "glm-5.1", cat: "chat" },
  { id: "glm-4.7", cat: "chat" },
  { id: "kat-coder-pro-v2", cat: "chat" },
  { id: "Kimi-K2.6", cat: "chat" },
  { id: "step-3.7-flash", cat: "chat" },
  { id: "step-3.5-flash", cat: "chat" },
  { id: "step-3.5-flash-2603", cat: "chat" },
  { id: "step-router-v1", cat: "chat" },
  { id: "Spark-X2-Flash", cat: "chat" },
  { id: "sensenova-6.7-flash-lite", cat: "chat" },
  { id: "sensenova-u1-fast", cat: "chat" },
  { id: "stepaudio-2.5-chat", cat: "audio" },
  { id: "stepaudio-2.5-tts", cat: "audio" },
  { id: "stepaudio-2.5-asr", cat: "audio" },
  { id: "stepaudio-2.5-realtime", cat: "audio" },
  { id: "step-image-edit-2", cat: "image" },
] as const;

export const IMG_MODEL = "step-image-edit-2";

export const IMG_SIZES = [
  { value: "1024x1024", label: "1024×1024 (Square)" },
  { value: "1360x768", label: "1360×768 (Landscape)" },
  { value: "768x1360", label: "768×1360 (Portrait)" },
  { value: "1184x896", label: "1184×896 (Wide)" },
  { value: "896x1184", label: "896×1184 (Tall)" },
];

export const TTS_VOICES = [
  { id: "cixingnansheng", label: "Magnetic Male" },
  { id: "zhengpaiqingnian", label: "Young Male" },
  { id: "yuanqishaonv", label: "Energetic Female" },
  { id: "wenrounvsheng", label: "Gentle Female" },
];

// Models confirmed to support vision (base64 images in messages)
export const VISION_MODELS = [
  "step-3.7-flash",
  "step-3.5-flash",
  "step-3.5-flash-2603",
  "DeepSeek-V4-Pro",
  "DeepSeek-V4-Flash",
  "Qwen3.5-397B-A17B",
  "Qwen3-Coder-Next-FP8",
  "MiniMax-M3",
];
