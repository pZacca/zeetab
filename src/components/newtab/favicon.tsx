"use client";

import { useState } from "react";
import type { IconSource } from "@/lib/newtab/types";
import {
  resolveFaviconUrl,
  hashToColor,
  initialOf,
} from "@/lib/newtab/favicon";
import { hostnameOf } from "@/lib/newtab/url-normalize";

type Props = {
  icon: IconSource;
  url: string;
  label: string;
  size?: number;
};

export function Favicon({ icon, url, label, size = 64 }: Props) {
  const [errored, setErrored] = useState(false);

  if (icon.kind === "upload") {
    return (
      <img
        src={icon.dataUrl}
        alt=""
        width={size}
        height={size}
        className="rounded-lg object-cover"
        style={{ width: size, height: size }}
        draggable={false}
      />
    );
  }

  const host = hostnameOf(url);
  const faviconUrl = resolveFaviconUrl(url);

  if (!errored && faviconUrl) {
    return (
      <img
        src={faviconUrl}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className="rounded-lg bg-zinc-800 object-cover"
        style={{ width: size, height: size }}
        draggable={false}
        onError={() => setErrored(true)}
      />
    );
  }

  return (
    <div
      aria-hidden
      className="flex items-center justify-center rounded-lg font-ibm-plex-mono text-xl font-semibold text-white"
      style={{
        width: size,
        height: size,
        backgroundColor: hashToColor(host || label),
      }}
    >
      {initialOf(label, host)}
    </div>
  );
}
