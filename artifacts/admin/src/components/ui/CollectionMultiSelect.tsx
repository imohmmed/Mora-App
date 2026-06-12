import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/api";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search } from "lucide-react";

interface Collection {
  id: string;
  title: string;
}

interface CollectionMultiSelectProps {
  selected: string[];
  onChange: (ids: string[]) => void;
}

export function CollectionMultiSelect({ selected, onChange }: CollectionMultiSelectProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    adminFetch<Collection[]>("/admin/collections")
      .then((r) => setCollections(r.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = collections.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  };

  const selectedTitles = collections.filter((c) => selected.includes(c.id)).map((c) => c.title);

  return (
    <div className="space-y-2">
      {selectedTitles.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTitles.map((t) => (
            <Badge key={t} variant="secondary" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
      )}

      <div className="border rounded-lg bg-background">
        <div className="flex items-center px-3 border-b">
          <Search className="w-3.5 h-3.5 text-muted-foreground mr-2 shrink-0" />
          <Input
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 h-9 px-0 text-sm focus-visible:ring-0 bg-transparent"
          />
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          {loading ? (
            <div className="flex items-center justify-center py-4 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Loading...
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {collections.length === 0 ? "No collections yet" : "No results"}
            </p>
          ) : (
            filtered.map((c) => (
              <div
                key={c.id}
                className="flex items-center gap-2.5 px-2 py-2 rounded hover:bg-muted cursor-pointer"
                onClick={() => toggle(c.id)}
              >
                <Checkbox
                  checked={selected.includes(c.id)}
                  onCheckedChange={() => toggle(c.id)}
                  id={`col-${c.id}`}
                />
                <Label htmlFor={`col-${c.id}`} className="text-sm cursor-pointer flex-1">
                  {c.title}
                </Label>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
