import { useState } from "react";
import { useAdminGetSettings, useAdminUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  const { data: response, isLoading } = useAdminGetSettings();
  const updateSettings = useAdminUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const settings = response?.data;

  const [formData, setFormData] = useState({
    storeName: "",
    storeEmail: "",
    storePhone: "",
    currency: "",
    timezone: "",
  });

  // Sync form data when loaded
  import("react").then((React) => {
    React.useEffect(() => {
      if (settings) {
        setFormData({
          storeName: settings.storeName || "",
          storeEmail: settings.storeEmail || "",
          storePhone: settings.storePhone || "",
          currency: settings.currency || "USD",
          timezone: settings.timezone || "UTC",
        });
      }
    }, [settings]);
  });

  const handleSave = () => {
    updateSettings.mutate(
      { data: formData },
      {
        onSuccess: () => {
          toast({ title: "Settings saved", description: "Your store settings have been updated." });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return <div className="p-6 md:p-8">Loading settings...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your store's general preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            Store Details
          </CardTitle>
          <CardDescription>
            Your store's basic information and contact details.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="storeName">Store Name</Label>
            <Input 
              id="storeName" 
              value={formData.storeName}
              onChange={e => setFormData(p => ({ ...p, storeName: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label htmlFor="storeEmail">Contact Email</Label>
              <Input 
                id="storeEmail" 
                type="email"
                value={formData.storeEmail}
                onChange={e => setFormData(p => ({ ...p, storeEmail: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="storePhone">Phone Number</Label>
              <Input 
                id="storePhone" 
                value={formData.storePhone}
                onChange={e => setFormData(p => ({ ...p, storePhone: e.target.value }))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Regional</CardTitle>
          <CardDescription>
            Configure your store's currency and timezone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="grid gap-2">
              <Label>Store Currency</Label>
              <Select value={formData.currency} onValueChange={v => setFormData(p => ({ ...p, currency: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                  <SelectItem value="JPY">JPY (¥)</SelectItem>
                  <SelectItem value="CAD">CAD (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Timezone</Label>
              <Select value={formData.timezone} onValueChange={v => setFormData(p => ({ ...p, timezone: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="btn-save-settings">
          {updateSettings.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>
    </div>
  );
}