import { useState } from "react";
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, sortableKeyboardCoordinates, useSortable,
  rectSortingStrategy, arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, Plus, Package } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SortableImageGridProps {
  images: string[];
  onChange: (images: string[]) => void;
}

function SortableImage({
  url, index, onRemove,
}: { url: string; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: url });

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

export function SortableImageGrid({ images, onChange }: SortableImageGridProps) {
  const [urlInput, setUrlInput] = useState("");

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

  const addImage = () => {
    const url = urlInput.trim();
    if (url && !images.includes(url)) {
      onChange([...images, url]);
    }
    setUrlInput("");
  };

  const removeImage = (url: string) => onChange(images.filter((i) => i !== url));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Paste image URL..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addImage(); } }}
        />
        <Button type="button" variant="outline" onClick={addImage}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {images.length > 0 ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-3 gap-2">
              {images.map((url, i) => (
                <SortableImage key={url} url={url} index={i} onRemove={() => removeImage(url)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <div className="border-2 border-dashed rounded-lg flex flex-col items-center justify-center py-10 text-muted-foreground bg-muted/20">
          <Package className="w-8 h-8 mb-2 opacity-40" />
          <p className="text-sm">No images yet — paste a URL above</p>
          <p className="text-xs opacity-60 mt-0.5">First image becomes the main cover</p>
        </div>
      )}
    </div>
  );
}
