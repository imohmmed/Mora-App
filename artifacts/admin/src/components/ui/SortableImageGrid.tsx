import { useState, useRef, useCallback } from "react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  rectSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Upload, Loader2, ImagePlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const adminToken = () => {
  try { return localStorage.getItem("mora_admin_token") || ""; } catch { return ""; }
};

interface SortableImageGridProps {
  images: string[];
  onChange: (images: string[]) => void;
}

function SortableImage({
  url, index, onRemove,
}: { url: string; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: url });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "relative group aspect-square rounded-lg overflow-hidden border bg-muted",
        isDragging && "opacity-50 z-50 shadow-xl"
      )}
    >
      <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />

      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 cursor-grab active:cursor-grabbing bg-background/70 backdrop-blur-sm rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="w-3 h-3 text-foreground" />
      </div>

      {index === 0 && (
        <Badge className="absolute top-1 right-7 text-[10px] px-1.5 py-0 h-5 bg-primary">
          Main
        </Badge>
      )}

      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-background/80 backdrop-blur-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shadow-sm"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

function UploadPlaceholder() {
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
    </div>
  );
}

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch("/api/admin/uploads", {
    method: "POST",
    headers: { Authorization: `Bearer ${adminToken()}` },
    body: form,
  });
  if (!res.ok) throw new Error("Upload failed");
  const json = (await res.json()) as { data: { url: string } | null; error: string | null };
  if (!json.data?.url) throw new Error(json.error ?? "Upload failed");
  return json.data.url;
}

export function SortableImageGrid({ images, onChange }: SortableImageGridProps) {
  const [uploading, setUploading] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = images.indexOf(active.id as string);
      const newIndex = images.indexOf(over.id as string);
      onChange(arrayMove(images, oldIndex, newIndex));
    }
  };

  const removeImage = (url: string) => onChange(images.filter((i) => i !== url));

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!imageFiles.length) return;
      setUploading((n) => n + imageFiles.length);
      const results = await Promise.allSettled(imageFiles.map(uploadImage));
      const urls: string[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") urls.push(r.value);
      }
      setUploading((n) => n - imageFiles.length);
      if (urls.length) onChange([...images, ...urls]);
    },
    [images, onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) handleFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const hasContent = images.length > 0 || uploading > 0;

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleInputChange}
      />

      {!hasContent ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          className={cn(
            "border-2 border-dashed rounded-xl flex flex-col items-center justify-center py-12 cursor-pointer transition-colors select-none",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 bg-muted/20 hover:border-primary/50 hover:bg-muted/40"
          )}
        >
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <ImagePlus className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium">Drop images here or click to upload</p>
          <p className="text-xs text-muted-foreground mt-1">
            Auto-compressed · First image becomes the cover
          </p>
        </div>
      ) : (
        <>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={images} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 gap-2">
                {images.map((url, i) => (
                  <SortableImage
                    key={url}
                    url={url}
                    index={i}
                    onRemove={() => removeImage(url)}
                  />
                ))}
                {Array.from({ length: uploading }).map((_, i) => (
                  <UploadPlaceholder key={`uploading-${i}`} />
                ))}
              </div>
            </SortableContext>
          </DndContext>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={() => setIsDragOver(false)}
            className={cn(
              "w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 border-dashed text-sm text-muted-foreground transition-colors",
              isDragOver
                ? "border-primary bg-primary/5 text-primary"
                : "border-muted-foreground/20 hover:border-primary/50 hover:text-foreground"
            )}
          >
            <Upload className="w-4 h-4" />
            Add more images
          </button>
        </>
      )}
    </div>
  );
}
