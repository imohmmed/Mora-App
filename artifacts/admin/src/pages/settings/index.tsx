import { useState, useEffect } from "react";
import { useAdminGetSettings, useAdminUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Truck, Receipt, MapPin, Bell } from "lucide-react";

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
    currency: "USD",
    timezone: "UTC",
  });

  useEffect(() => {
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
        },
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
        <p className="text-muted-foreground mt-1">Manage your store configuration.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="shipping" className="gap-2">
            <Truck className="w-4 h-4" />
            Shipping
          </TabsTrigger>
          <TabsTrigger value="taxes" className="gap-2">
            <Receipt className="w-4 h-4" />
            Taxes
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-2">
            <MapPin className="w-4 h-4" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="w-4 h-4" />
            Notifications
          </TabsTrigger>
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Details</CardTitle>
              <CardDescription>Your store's basic information and contact details.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  value={formData.storeName}
                  onChange={(e) => setFormData((p) => ({ ...p, storeName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="storeEmail">Contact Email</Label>
                  <Input
                    id="storeEmail"
                    type="email"
                    value={formData.storeEmail}
                    onChange={(e) => setFormData((p) => ({ ...p, storeEmail: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="storePhone">Phone Number</Label>
                  <Input
                    id="storePhone"
                    value={formData.storePhone}
                    onChange={(e) => setFormData((p) => ({ ...p, storePhone: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Regional</CardTitle>
              <CardDescription>Configure your store's currency and timezone.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label>Store Currency</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData((p) => ({ ...p, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD — US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR — Euro</SelectItem>
                      <SelectItem value="GBP">GBP — British Pound</SelectItem>
                      <SelectItem value="JPY">JPY — Japanese Yen</SelectItem>
                      <SelectItem value="CAD">CAD — Canadian Dollar</SelectItem>
                      <SelectItem value="AED">AED — UAE Dirham</SelectItem>
                      <SelectItem value="SAR">SAR — Saudi Riyal</SelectItem>
                      <SelectItem value="IQD">IQD — Iraqi Dinar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Timezone</Label>
                  <Select value={formData.timezone} onValueChange={(v) => setFormData((p) => ({ ...p, timezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                      <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                      <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                      <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GST+4)</SelectItem>
                      <SelectItem value="Asia/Baghdad">Asia/Baghdad (AST+3)</SelectItem>
                      <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="btn-save-settings">
              {updateSettings.isPending ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </TabsContent>

        {/* SHIPPING */}
        <TabsContent value="shipping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Zones</CardTitle>
              <CardDescription>Set shipping rates for different regions and countries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { zone: "Domestic", rate: "Free shipping over $50", price: "$5.99 flat" },
                { zone: "Middle East", rate: "Standard", price: "$12.99" },
                { zone: "International", rate: "Standard", price: "$24.99" },
              ].map((z) => (
                <div key={z.zone} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{z.zone}</p>
                    <p className="text-sm text-muted-foreground">{z.rate}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{z.price}</p>
                    <Button variant="link" className="h-auto p-0 text-sm">Edit</Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full">
                <Truck className="w-4 h-4 mr-2" />
                Add Shipping Zone
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Carriers</CardTitle>
              <CardDescription>Connect carrier accounts for calculated rates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {["DHL Express", "FedEx", "UPS", "Aramex"].map((carrier) => (
                <div key={carrier} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium text-sm">{carrier}</span>
                  <Button variant="outline" size="sm">Connect</Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAXES */}
        <TabsContent value="taxes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tax Configuration</CardTitle>
              <CardDescription>Set up tax rates for your store's regions.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Charge tax on products</p>
                  <p className="text-sm text-muted-foreground">Tax will be collected on eligible products</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show prices including tax</p>
                  <p className="text-sm text-muted-foreground">Tax-inclusive prices shown in your storefront</p>
                </div>
                <Switch />
              </div>
              <div className="border-t pt-4 space-y-3">
                {[
                  { region: "United States", rate: "Automatic (varies by state)" },
                  { region: "Iraq", rate: "15% VAT" },
                  { region: "UAE", rate: "5% VAT" },
                  { region: "European Union", rate: "Varies by country" },
                ].map((t) => (
                  <div key={t.region} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{t.region}</p>
                      <p className="text-xs text-muted-foreground">{t.rate}</p>
                    </div>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LOCATIONS */}
        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Locations</CardTitle>
              <CardDescription>Manage warehouses, offices, and fulfillment centers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 border rounded-lg bg-card">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium">Mora HQ — Baghdad</p>
                    <p className="text-sm text-muted-foreground">Al-Mansour District, Baghdad, Iraq</p>
                    <p className="text-xs text-muted-foreground mt-1">Primary location · Fulfills online orders</p>
                  </div>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </div>
              <Button variant="outline" className="w-full">
                <MapPin className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Control which events trigger email alerts to staff and customers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { label: "New order placed", desc: "Send to store owner when a customer places an order", on: true },
                { label: "Order fulfilled", desc: "Send to customer when their order ships", on: true },
                { label: "Order refunded", desc: "Send to customer when a refund is issued", on: true },
                { label: "Low inventory alert", desc: "Notify when product stock falls below 5 units", on: false },
                { label: "New customer registered", desc: "Notify store owner of new account registrations", on: false },
                { label: "Abandoned cart recovery", desc: "Email customers who left items in their cart", on: false },
              ].map((n) => (
                <div key={n.label} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Switch defaultChecked={n.on} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
