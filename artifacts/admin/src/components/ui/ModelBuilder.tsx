import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X, Image as ImageIcon, Check } from "lucide-react";

export interface ProductModel {
  id: string;
  nameEn: string;
  nameAr: string;
  image: string;
}

interface Props {
  models: ProductModel[];
  onChange: (models: ProductModel[]) => void;
  productImages: string[];
}

export function ModelBuilder({ models, onChange, productImages }: Props) {
  const [pickerFor, setPickerFor] = useState<string | null>(null);

  const addModel = () => {
    const newModel: ProductModel = { id: `m_${Date.now()}`, nameEn: "", nameAr: "", image: "" };
    onChange([...models, newModel]);
  };

  const updateModel = (id: string, patch: Partial<ProductModel>) =>
    onChange(models.map((m) => (m.id === id ? { ...m, ...patch } : m)));

  const removeModel = (id: string) => {
    onChange(models.filter((m) => m.id !== id));
    if (pickerFor === id) setPickerFor(null);
  };

  return (
    <div className="space-y-3">
      {models.length === 0 && (
        <div className="border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="w-7 h-7 opacity-40" />
          <p className="text-sm">Add models to showcase different looks</p>
          <p className="text-xs opacity-60">Each model can have a name (EN + AR) and a photo from the product images</p>
        </div>
      )}

      {models.map((model, idx) => (
        <div key={model.id} className="border border-border rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Model {idx + 1}
            </span>
            <button
              type="button"
              onClick={() => removeModel(model.id)}
              className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-3">
            {/* Names */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Name (EN)</Label>
                <Input
                  placeholder="e.g. Ahmed"
                  value={model.nameEn}
                  onChange={(e) => updateModel(model.id, { nameEn: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">الاسم (AR)</Label>
                <Input
                  dir="rtl"
                  placeholder="مثال: أحمد"
                  value={model.nameAr}
                  onChange={(e) => updateModel(model.id, { nameAr: e.target.value })}
                />
              </div>
            </div>

            {/* Image selector button */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Model photo</Label>
              <button
                type="button"
                onClick={() => setPickerFor(pickerFor === model.id ? null : model.id)}
                className="w-full flex items-center gap-3 border border-border rounded-lg p-2 hover:bg-muted/40 transition-colors text-start"
              >
                {model.image ? (
                  <img src={model.image} alt="" className="w-12 h-14 object-cover rounded-md flex-shrink-0" />
                ) : (
                  <div className="w-12 h-14 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                )}
                <span className="text-sm text-muted-foreground">
                  {model.image
                    ? pickerFor === model.id ? "Hide picker" : "Change photo"
                    : productImages.length === 0
                      ? "Upload product images first"
                      : "Select from product images"}
                </span>
              </button>
            </div>

            {/* Image picker dropdown */}
            {pickerFor === model.id && (
              <div className="border border-border rounded-xl p-3 bg-muted/20">
                {productImages.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">
                    No images yet — add product images in the Media section above first
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {productImages.map((url, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          updateModel(model.id, { image: url });
                          setPickerFor(null);
                        }}
                        className="relative rounded-lg overflow-hidden focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <img
                          src={url}
                          alt={`Image ${i + 1}`}
                          className="w-full aspect-[3/4] object-cover"
                        />
                        <div
                          className={`absolute inset-0 border-2 rounded-lg transition-colors ${
                            model.image === url
                              ? "border-primary"
                              : "border-transparent hover:border-muted-foreground/40"
                          }`}
                        />
                        {model.image === url && (
                          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={addModel}
        className="w-full gap-2"
      >
        <Plus className="w-4 h-4" />
        Add model
      </Button>
    </div>
  );
}
