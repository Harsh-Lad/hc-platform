export type ImageAttachment = {
  base64: string;       // data:image/...;base64,xxx
  name: string;
  preview: string;      // object URL or same base64 for thumbnail
};

export type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "image_result";
  content: string;
  prompt?: string;
  urls?: string[];
  images?: ImageAttachment[];   // user-attached images for vision
  model?: string;
  time: number;
};

export type Conversation = {
  id: string;
  title: string;
  type: "chat" | "image";
  model: string;
  messages: Message[];
  created: number;
  updated: number;
};

export type Settings = {
  temperature: number;
  maxTokens: number;
  topP: number;
  freqPenalty: number;
  presPenalty: number;
  systemPrompt: string;
  imgSize: string;
  streaming: boolean;
  ttsVoice: string;
  autoTTS: boolean;
};
