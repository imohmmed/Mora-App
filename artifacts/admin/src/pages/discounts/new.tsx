import { useState } from "react";
import { useAdminCreateDiscount } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, RefreshCw } from "lucide-react";

function randomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 10 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export default function NewDiscount() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const createDiscount = useAdminCreateDiscount();

  const [form, setForm] = useState({
    code: "",
    type: "percentage" as "percentage" | "fixed",
    value: "",
    hasLimit: false,
    usageLimit: "",
    hasEnd: false,
    endsAt: "",
  });

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = parseFloat(form.value);
    if (!form.code || isNaN(value) || value <= 0) {
      toast({ title: "Missing fields", description: "Code and value are required.", variant: "destructive" });
      return;
    }
    if (form.type === "percentage" && value > 100) {
      toast({ title: "Invalid value", description: "Percentage cannot exceed 100%.", variant: "destructive" });
      return;
    }
    createDiscount.mutate(
      {
        data: {
          code: form.code.toUpperCase(),
          type: form.type,
          value,
          usageLimit: form.hasLimit && form.usageLimit ? parseInt(form.usageLimit, 10) : null,
          endsAt: form.hasEnd && form.endsAt ? form.endsAt : null,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Discount created" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/discounts"] });
          navigate("/discounts");
        },
        onError: () =>
          toast({ title: "Error", description: "Failed to create discount.", variant: "destructive" }),
      }
    );
  };

  const preview =
    form.value
      ? form.type === "percentage"
        ? `${form.value}% off`
        : `${parseFloat(form.value || "0").toLocaleString("en-US")} IQD off`
      : "—";

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/discounts" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Create Discount</h1>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Discount Code</CardTitle>
              <CardDescription>Customers enter this code at checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="code">Code *</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    placeholder="e.g. SUMMER25"
                    value={form.code}
                    onChange={(e) => set("code", e.target.value.toUpperCase())}
                    className="font-mono uppercase"
                    required
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => set("code", randomCode())}
                    title="Generate random code"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Value</CardTitle>
              <CardDescription>Set the discount type and amount.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Discount Type</Label>
                <Select value={form.type} onValueChange={(v: "percentage" | "fixed") => set("type", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="value">
                  {form.type === "percentage" ? "Percentage Off *" : "Amount Off ($) *"}
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {form.type === "percentage" ? "%" : "$"}
                  </span>
                  <Input
                    id="value"
                    type="number"
                    step={form.type === "percentage" ? "1" : "0.01"}
                    min="0"
                    max={form.type === "percentage" ? "100" : undefined}
                    className="pl-8"
                    placeholder={form.type === "percentage" ? "10" : "0.00"}
                    value={form.value}
                    onChange={(e) => set("value", e.target.value)}
                    required
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage Limits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hasLimit">Limit total uses</Label>
                <Switch
                  id="hasLimit"
                  checked={form.hasLimit}
                  onCheckedChange={(v) => set("hasLimit", v)}
                />
              </div>
              {form.hasLimit && (
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 100"
                  value={form.usageLimit}
                  onChange={(e) => set("usageLimit", e.target.value)}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Dates</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="hasEnd">Set end date</Label>
                <Switch
                  id="hasEnd"
                  checked={form.hasEnd}
                  onCheckedChange={(v) => set("hasEnd", v)}
                />
              </div>
              {form.hasEnd && (
                <div className="grid gap-2">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={form.endsAt}
                    onChange={(e) => set("endsAt", e.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar — summary */}
        <div className="space-y-4">
          <Card className="sticky top-6">
            <CardHeader><CardTitle>Summary</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Code</span>
                <span className="font-mono font-semibold">{form.code || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Value</span>
                <span className="font-semibold">{preview}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Usage Limit</span>
                <span>{form.hasLimit ? (form.usageLimit || "—") : "Unlimited"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ends</span>
                <span>{form.hasEnd ? (form.endsAt || "—") : "No end date"}</span>
              </div>
              <div className="pt-3 border-t space-y-2">
                <Button type="submit" disabled={createDiscount.isPending} className="w-full">
                  {createDiscount.isPending ? "Saving..." : "Create Discount"}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/discounts")}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </form>
    </div>
  );
}
