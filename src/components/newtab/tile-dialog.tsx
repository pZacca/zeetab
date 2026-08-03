"use client";

import { useState } from "react";
import { toast } from "sonner";
import type { IconSource, Shortcut } from "@/lib/newtab/types";
import {
  UPLOAD_MAX_BYTES,
  ALLOWED_UPLOAD_MIME,
} from "@/lib/newtab/types";
import { normalizeUrl, hostnameOf } from "@/lib/newtab/url-normalize";
import { useNewtab } from "./newtab-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type Props = {
  sectionId: string;
  editingId?: string | undefined;
  onClose: () => void;
};

export function TileDialog({ sectionId, editingId, onClose }: Props) {
  const { state, actions } = useNewtab();
  const editing: Shortcut | undefined = editingId
    ? state.config.sections
        .flatMap((s) => s.shortcuts)
        .find((t) => t.id === editingId)
    : undefined;

  const [url, setUrl] = useState(editing?.url ?? "");
  const [label, setLabel] = useState(editing?.label ?? "");
  const [iconMode, setIconMode] = useState<"auto" | "upload">(
    editing?.icon.kind === "upload" ? "upload" : "auto"
  );
  const [uploadDataUrl, setUploadDataUrl] = useState<string | undefined>(
    editing?.icon.kind === "upload" ? editing.icon.dataUrl : undefined
  );
  const [error, setError] = useState<string | undefined>();

  function onUrlBlur() {
    if (!label && url) {
      const h = hostnameOf(url);
      if (h) setLabel(h);
    }
  }

  function handleFile(file: File) {
    if (!(ALLOWED_UPLOAD_MIME as readonly string[]).includes(file.type)) {
      setError("use png, jpeg, webp, or svg");
      return;
    }
    if (file.size > UPLOAD_MAX_BYTES) {
      setError(`file too large (max ${UPLOAD_MAX_BYTES / 1024} KB)`);
      return;
    }
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      if (typeof reader.result === "string") {
        setUploadDataUrl(reader.result);
        setError(undefined);
      }
    });
    reader.addEventListener('error', () => setError("failed to read file"));
    reader.readAsDataURL(file);
  }

  function submit() {
    const normalized = normalizeUrl(url);
    if (!normalized.ok) {
      setError(normalized.reason);
      return;
    }
    if (iconMode === "upload" && !uploadDataUrl) {
      setError("upload an image or switch to automatic");
      return;
    }
    const icon: IconSource =
      iconMode === "upload" && uploadDataUrl
        ? { kind: "upload", dataUrl: uploadDataUrl }
        : { kind: "auto" };

    if (editing) {
      actions.updateShortcut(editing.id, {
        url: normalized.url,
        label,
        icon,
      });
    } else {
      actions.addShortcut(sectionId, {
        url: normalized.url,
        label,
        icon,
      });
    }
    toast.success(editing ? "Shortcut updated" : "Shortcut added");
    onClose();
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-border/40 bg-secondary text-zinc-100 sm:max-w-md [&>button[data-slot='dialog-close']]:text-zinc-500 [&>button[data-slot='dialog-close']]:opacity-100 [&>button[data-slot='dialog-close']]:hover:text-zinc-100">
        <DialogHeader>
          <DialogTitle className="font-ibm-plex-mono text-base text-zinc-100">
            {editing ? "edit shortcut" : "new shortcut"}
          </DialogTitle>
          <DialogDescription className="text-xs text-zinc-500">
            url is required; label defaults to hostname.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label
              htmlFor="newtab-url"
              className="font-ibm-plex-mono text-[11px] uppercase tracking-wider text-zinc-500"
            >
              url
            </Label>
            <Input
              id="newtab-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={onUrlBlur}
              placeholder="https://github.com"
              maxLength={2048}
              autoFocus
              className="h-9 border-border/60 bg-zinc-900/50 text-sm focus-visible:border-primary/60 focus-visible:ring-primary/20"
            />
          </div>

          <div className="grid gap-1.5">
            <Label
              htmlFor="newtab-label"
              className="font-ibm-plex-mono text-[11px] uppercase tracking-wider text-zinc-500"
            >
              label
            </Label>
            <Input
              id="newtab-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="optional"
              className="h-9 border-border/60 bg-zinc-900/50 text-sm focus-visible:border-primary/60 focus-visible:ring-primary/20"
            />
          </div>

          <fieldset className="grid gap-2">
            <legend className="mb-1 font-ibm-plex-mono text-[11px] uppercase tracking-wider text-zinc-500">
              icon
            </legend>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIconMode("auto")}
                className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition ${
                  iconMode === "auto"
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/60 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                automatic
                <span className="ml-1 text-[11px] opacity-70">(favicon)</span>
              </button>
              <button
                type="button"
                onClick={() => setIconMode("upload")}
                className={`flex-1 rounded-md border px-3 py-2 text-left text-sm transition ${
                  iconMode === "upload"
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border/60 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                }`}
              >
                upload
                <span className="ml-1 text-[11px] opacity-70">(image)</span>
              </button>
            </div>

            {iconMode === "upload" && (
              <div className="mt-1 flex items-center gap-3 rounded-md border border-border/40 bg-zinc-900/30 p-2">
                {uploadDataUrl ? (
                  <img
                    src={uploadDataUrl}
                    alt=""
                    className="size-12 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <div className="grid size-12 shrink-0 place-items-center rounded-md border border-dashed border-border/60 text-[10px] text-zinc-600">
                    none
                  </div>
                )}
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <Input
                    type="file"
                    accept={ALLOWED_UPLOAD_MIME.join(",")}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                    className="h-8 cursor-pointer border-border/60 bg-transparent text-xs file:mr-2 file:cursor-pointer file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-zinc-300 hover:file:bg-zinc-700"
                  />
                  <p className="text-[10px] text-zinc-600">
                    png, jpeg, webp, svg · max {UPLOAD_MAX_BYTES / 1024} KB
                  </p>
                </div>
                {uploadDataUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setUploadDataUrl(undefined)}
                    className="shrink-0 text-zinc-400 hover:text-destructive"
                  >
                    remove
                  </Button>
                )}
              </div>
            )}
          </fieldset>

          {error && (
            <p className="rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100"
          >
            cancel
          </Button>
          <Button size="sm" onClick={submit}>
            {editing ? "save" : "add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
