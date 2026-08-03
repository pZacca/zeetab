// src/lib/newtab/types.ts

export type IconSource =
  | { kind: "auto" }
  | { kind: "upload"; dataUrl: string };

export type Shortcut = {
  id: string;
  url: string;
  label: string;
  icon: IconSource;
};

export type Section = {
  id: string;
  name: string | null;
  collapsed: boolean;
  shortcuts: Shortcut[];
};

export type Config = {
  version: 1;
  sections: Section[];
};

export const CONFIG_VERSION = 1 as const;
export const STORAGE_KEY = "zacca.newtab.config.v1";
export const STORAGE_KEY_PREFIX_CORRUPTED = "zacca.newtab.config.corrupted.";

export const UPLOAD_MAX_BYTES = 100 * 1024; // 100 KB
export const ALLOWED_UPLOAD_MIME = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
] as const;
export type AllowedUploadMime = (typeof ALLOWED_UPLOAD_MIME)[number];
