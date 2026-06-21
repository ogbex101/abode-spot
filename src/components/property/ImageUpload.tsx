// Multi-image upload with drag-drop, preview, reorder, delete.
// Uploads to Supabase Storage bucket `property-images` when configured;
// otherwise falls back to keeping object URLs in memory (mock mode).
import { useCallback, useRef, useState } from "react";
import { Upload, X, GripVertical, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase, isSupabaseConfigured } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/errors";

interface Props {
  value: string[];
  onChange: (urls: string[]) => void;
  max?: number;
  bucket?: string;
  pathPrefix?: string; // e.g. user id
}

export function ImageUpload({
  value,
  onChange,
  max = 12,
  bucket = "property-images",
  pathPrefix = "uploads",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(
    async (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!arr.length) return;
      if (value.length + arr.length > max) {
        toast.error(`Max ${max} images`);
        return;
      }
      setUploading(true);
      try {
        const uploaded: string[] = [];
        for (const file of arr) {
          if (file.size > 10 * 1024 * 1024) {
            toast.error(`${file.name} exceeds 10MB`);
            continue;
          }
          if (isSupabaseConfigured && supabase) {
            const ext = file.name.split(".").pop() ?? "jpg";
            const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
            const { error } = await supabase.storage.from(bucket).upload(path, file, {
              cacheControl: "3600",
              upsert: false,
              contentType: file.type,
            });
            if (error) {
              toast.error(getErrorMessage(error, "Could not upload this image. Please try again."));
              continue;
            }
            const { data } = supabase.storage.from(bucket).getPublicUrl(path);
            uploaded.push(data.publicUrl);
          } else {
            // Mock mode: use object URLs (lost on reload — fine for local dev).
            uploaded.push(URL.createObjectURL(file));
          }
        }
        if (uploaded.length) onChange([...value, ...uploaded]);
      } finally {
        setUploading(false);
      }
    },
    [value, onChange, max, bucket, pathPrefix]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files.length) upload(e.dataTransfer.files);
  };

  const remove = (idx: number) => onChange(value.filter((_, i) => i !== idx));

  const reorder = (from: number, to: number) => {
    if (from === to) return;
    const next = [...value];
    const [m] = next.splice(from, 1);
    next.splice(to, 0, m);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 px-4 py-8 text-center transition hover:border-primary hover:bg-muted/50"
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <Upload className="h-6 w-6 text-muted-foreground" />
        )}
        <p className="mt-2 text-sm font-medium">
          {uploading ? "Uploading…" : "Drop images here or click to upload"}
        </p>
        <p className="text-xs text-muted-foreground">
          PNG/JPG up to 10MB · max {max} images · drag the first one to reorder
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {value.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {value.map((url, i) => (
            <div
              key={url + i}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragIdx !== null) reorder(dragIdx, i);
                setDragIdx(null);
              }}
              className={cn(
                "group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted",
                dragIdx === i && "opacity-50"
              )}
            >
              <img src={url} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  COVER
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                <GripVertical className="h-4 w-4 cursor-grab text-white" />
                <Button
                  size="icon"
                  variant="destructive"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(i);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
