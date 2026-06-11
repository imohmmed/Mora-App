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
import { Settings as SettingsIcon, Truck, Receipt, MapPin, Bell, Wallet, Trash2, Plus } from "lucide-react";

type ShippingMethod = { id: string; label: string; duration: string; price: number };
type TaxRegion = { id: string; region: string; rate: number };
type TaxConfig = { enabled: boolean; inclusive: boolean; regions: TaxRegion[] };
type StoreLocation = { id: string; name: string; address: string; primary: boolean };
type NotificationSettings = {
  newOrder: boolean;
  orderFulfilled: boolean;
  orderRefunded: boolean;
  lowInventory: boolean;
  newCustomer: boolean;
  abandonedCart: boolean;
};
type PaymentMethods = { card: boolean; cod: boolean; applePay: boolean; paypal: boolean };

type SettingsForm = {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  currency: string;
  timezone: string;
  shippingMethods: ShippingMethod[];
  tax: TaxConfig;
  locations: StoreLocation[];
  notifications: NotificationSettings;
  paymentMethods: PaymentMethods;
};

type ExtendedSettings = {
  storeName?: string;
  storeEmail?: string;
  storePhone?: string;
  currency?: string;
  timezone?: string;
  shippingMethods?: ShippingMethod[];
  tax?: TaxConfig;
  locations?: StoreLocation[];
  notifications?: Partial<NotificationSettings>;
  paymentMethods?: Partial<PaymentMethods>;
};

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  newOrder: true,
  orderFulfilled: true,
  orderRefunded: true,
  lowInventory: false,
  newCustomer: false,
  abandonedCart: false,
};

const DEFAULT_PAYMENTS: PaymentMethods = { card: true, cod: true, applePay: false, paypal: false };

const NOTIFICATION_FIELDS: { key: keyof NotificationSettings; label: string; desc: string }[] = [
  { key: "newOrder", label: "New order placed", desc: "Send to store owner when a customer places an order" },
  { key: "orderFulfilled", label: "Order fulfilled", desc: "Send to customer when their order ships" },
  { key: "orderRefunded", label: "Order refunded", desc: "Send to customer when a refund is issued" },
  { key: "lowInventory", label: "Low inventory alert", desc: "Notify when product stock falls below 5 units" },
  { key: "newCustomer", label: "New customer registered", desc: "Notify store owner of new account registrations" },
  { key: "abandonedCart", label: "Abandoned cart recovery", desc: "Email customers who left items in their cart" },
];

const PAYMENT_FIELDS: { key: keyof PaymentMethods; label: string; desc: string }[] = [
  { key: "card", label: "Credit / Debit Card", desc: "Accept Visa, Mastercard and other cards" },
  { key: "cod", label: "Cash on Delivery", desc: "Let customers pay when their order arrives" },
  { key: "applePay", label: "Apple Pay", desc: "Fast checkout for Apple devices" },
  { key: "paypal", label: "PayPal", desc: "Accept payments through PayPal" },
];

const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

export default function Settings() {
  const { data: response, isLoading } = useAdminGetSettings();
  const updateSettings = useAdminUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const settings = response?.data as ExtendedSettings | undefined;

  const [formData, setFormData] = useState<SettingsForm>({
    storeName: "",
    storeEmail: "",
    storePhone: "",
    currency: "USD",
    timezone: "UTC",
    shippingMethods: [],
    tax: { enabled: true, inclusive: false, regions: [] },
    locations: [],
    notifications: { ...DEFAULT_NOTIFICATIONS },
    paymentMethods: { ...DEFAULT_PAYMENTS },
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        storeName: settings.storeName || "",
        storeEmail: settings.storeEmail || "",
        storePhone: settings.storePhone || "",
        currency: settings.currency || "USD",
        timezone: settings.timezone || "UTC",
        shippingMethods: settings.shippingMethods ?? [],
        tax: {
          enabled: settings.tax?.enabled ?? true,
          inclusive: settings.tax?.inclusive ?? false,
          regions: settings.tax?.regions ?? [],
        },
        locations: settings.locations ?? [],
        notifications: { ...DEFAULT_NOTIFICATIONS, ...settings.notifications },
        paymentMethods: { ...DEFAULT_PAYMENTS, ...settings.paymentMethods },
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

  // ─── Shipping helpers ───────────────────────────────────────────────────────
  const updateShipping = (id: string, patch: Partial<ShippingMethod>) =>
    setFormData((p) => ({
      ...p,
      shippingMethods: p.shippingMethods.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
  const addShipping = () =>
    setFormData((p) => ({
      ...p,
      shippingMethods: [...p.shippingMethods, { id: genId("ship"), label: "New Method", duration: "", price: 0 }],
    }));
  const removeShipping = (id: string) =>
    setFormData((p) => ({ ...p, shippingMethods: p.shippingMethods.filter((m) => m.id !== id) }));

  // ─── Tax helpers ────────────────────────────────────────────────────────────
  const updateTaxRegion = (id: string, patch: Partial<TaxRegion>) =>
    setFormData((p) => ({
      ...p,
      tax: { ...p.tax, regions: p.tax.regions.map((r) => (r.id === id ? { ...r, ...patch } : r)) },
    }));
  const addTaxRegion = () =>
    setFormData((p) => ({
      ...p,
      tax: { ...p.tax, regions: [...p.tax.regions, { id: genId("tax"), region: "New Region", rate: 0 }] },
    }));
  const removeTaxRegion = (id: string) =>
    setFormData((p) => ({ ...p, tax: { ...p.tax, regions: p.tax.regions.filter((r) => r.id !== id) } }));

  // ─── Location helpers ───────────────────────────────────────────────────────
  const updateLocation = (id: string, patch: Partial<StoreLocation>) =>
    setFormData((p) => ({
      ...p,
      locations: p.locations.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  const addLocation = () =>
    setFormData((p) => ({
      ...p,
      locations: [...p.locations, { id: genId("loc"), name: "New Location", address: "", primary: false }],
    }));
  const removeLocation = (id: string) =>
    setFormData((p) => ({ ...p, locations: p.locations.filter((l) => l.id !== id) }));

  const saveButton = (
    <div className="flex justify-end">
      <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="btn-save-settings">
        {updateSettings.isPending ? "Saving..." : "Save changes"}
      </Button>
    </div>
  );

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
          <TabsTrigger value="payments" className="gap-2">
            <Wallet className="w-4 h-4" />
            Payments
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

          {saveButton}
        </TabsContent>

        {/* SHIPPING */}
        <TabsContent value="shipping" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Shipping Methods</CardTitle>
              <CardDescription>Set the shipping options and rates offered at checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.shippingMethods.length === 0 && (
                <p className="text-sm text-muted-foreground">No shipping methods yet. Add one below.</p>
              )}
              {formData.shippingMethods.map((m) => (
                <div key={m.id} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_auto] gap-3 items-end p-4 border rounded-lg">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Label</Label>
                    <Input
                      value={m.label}
                      onChange={(e) => updateShipping(m.id, { label: e.target.value })}
                      data-testid={`input-shipping-label-${m.id}`}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Delivery Time</Label>
                    <Input
                      value={m.duration}
                      onChange={(e) => updateShipping(m.id, { duration: e.target.value })}
                      data-testid={`input-shipping-duration-${m.id}`}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={m.price}
                      onChange={(e) => updateShipping(m.id, { price: parseFloat(e.target.value) || 0 })}
                      data-testid={`input-shipping-price-${m.id}`}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => removeShipping(m.id)}
                    data-testid={`btn-remove-shipping-${m.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={addShipping} data-testid="btn-add-shipping">
                <Plus className="w-4 h-4 mr-2" />
                Add Shipping Method
              </Button>
            </CardContent>
          </Card>

          {saveButton}
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
                <Switch
                  checked={formData.tax.enabled}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, tax: { ...p.tax, enabled: v } }))}
                  data-testid="switch-tax-enabled"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Show prices including tax</p>
                  <p className="text-sm text-muted-foreground">Tax-inclusive prices shown in your storefront</p>
                </div>
                <Switch
                  checked={formData.tax.inclusive}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, tax: { ...p.tax, inclusive: v } }))}
                  data-testid="switch-tax-inclusive"
                />
              </div>
              <div className="border-t pt-4 space-y-3">
                {formData.tax.regions.length === 0 && (
                  <p className="text-sm text-muted-foreground">No tax regions yet. Add one below.</p>
                )}
                {formData.tax.regions.map((t) => (
                  <div key={t.id} className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-3 items-end p-3 border rounded-lg">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Region</Label>
                      <Input
                        value={t.region}
                        onChange={(e) => updateTaxRegion(t.id, { region: e.target.value })}
                        data-testid={`input-tax-region-${t.id}`}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={t.rate}
                        onChange={(e) => updateTaxRegion(t.id, { rate: parseFloat(e.target.value) || 0 })}
                        data-testid={`input-tax-rate-${t.id}`}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeTaxRegion(t.id)}
                      data-testid={`btn-remove-tax-${t.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" className="w-full" onClick={addTaxRegion} data-testid="btn-add-tax">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Tax Region
                </Button>
              </div>
            </CardContent>
          </Card>

          {saveButton}
        </TabsContent>

        {/* LOCATIONS */}
        <TabsContent value="locations" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Store Locations</CardTitle>
              <CardDescription>Manage warehouses, offices, and fulfillment centers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {formData.locations.length === 0 && (
                <p className="text-sm text-muted-foreground">No locations yet. Add one below.</p>
              )}
              {formData.locations.map((l) => (
                <div key={l.id} className="p-4 border rounded-lg space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Name</Label>
                      <Input
                        value={l.name}
                        onChange={(e) => updateLocation(l.id, { name: e.target.value })}
                        data-testid={`input-location-name-${l.id}`}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Address</Label>
                      <Input
                        value={l.address}
                        onChange={(e) => updateLocation(l.id, { address: e.target.value })}
                        data-testid={`input-location-address-${l.id}`}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <Switch
                        checked={l.primary}
                        onCheckedChange={(v) => setFormData((p) => ({
                          ...p,
                          locations: p.locations.map((loc) => ({ ...loc, primary: loc.id === l.id ? v : v ? false : loc.primary })),
                        }))}
                        data-testid={`switch-location-primary-${l.id}`}
                      />
                      Primary location
                    </label>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => removeLocation(l.id)}
                      data-testid={`btn-remove-location-${l.id}`}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" onClick={addLocation} data-testid="btn-add-location">
                <Plus className="w-4 h-4 mr-2" />
                Add Location
              </Button>
            </CardContent>
          </Card>

          {saveButton}
        </TabsContent>

        {/* NOTIFICATIONS */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
              <CardDescription>Control which events trigger email alerts to staff and customers.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {NOTIFICATION_FIELDS.map((n) => (
                <div key={n.key} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{n.label}</p>
                    <p className="text-xs text-muted-foreground">{n.desc}</p>
                  </div>
                  <Switch
                    checked={formData.notifications[n.key]}
                    onCheckedChange={(v) =>
                      setFormData((p) => ({ ...p, notifications: { ...p.notifications, [n.key]: v } }))
                    }
                    data-testid={`switch-notification-${n.key}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {saveButton}
        </TabsContent>

        {/* PAYMENTS */}
        <TabsContent value="payments" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Choose which payment options are available at checkout.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {PAYMENT_FIELDS.map((m) => (
                <div key={m.key} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                  <Switch
                    checked={formData.paymentMethods[m.key]}
                    onCheckedChange={(v) =>
                      setFormData((p) => ({ ...p, paymentMethods: { ...p.paymentMethods, [m.key]: v } }))
                    }
                    data-testid={`switch-payment-${m.key}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {saveButton}
        </TabsContent>
      </Tabs>
    </div>
  );
}
