import { useState, useEffect } from "react";
import { useAdminGetSettings, useAdminUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Users as UsersIcon } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { TeamTab } from "./TeamTab";

type SettingsForm = {
  storeName: string;
  storeEmail: string;
  storePhone: string;
  currency: string;
  timezone: string;
};

type ExtendedSettings = {
  storeName?: string;
  storeEmail?: string;
  storePhone?: string;
  currency?: string;
  timezone?: string;
};

export default function Settings() {
  const { isOwner } = useAdminAuth();
  const { data: response, isLoading } = useAdminGetSettings();
  const updateSettings = useAdminUpdateSettings();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const settings = response?.data as ExtendedSettings | undefined;

  const [formData, setFormData] = useState<SettingsForm>({
    storeName: "",
    storeEmail: "",
    storePhone: "",
    currency: "IQD",
    timezone: "Asia/Baghdad",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        storeName: settings.storeName || "",
        storeEmail: settings.storeEmail || "",
        storePhone: settings.storePhone || "",
        currency: settings.currency || "IQD",
        timezone: settings.timezone || "Asia/Baghdad",
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(
      { data: formData },
      {
        onSuccess: () => {
          toast({ title: "تم الحفظ", description: "تم تحديث إعدادات المتجر." });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
        },
        onError: () => {
          toast({ title: "خطأ", description: "فشل حفظ الإعدادات.", variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return <div className="p-6 md:p-8">جاري التحميل...</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">الإعدادات</h1>
        <p className="text-muted-foreground mt-1">إدارة إعدادات المتجر.</p>
      </div>

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            عام
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="team" className="gap-2">
              <UsersIcon className="w-4 h-4" />
              الفريق
            </TabsTrigger>
          )}
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>بيانات المتجر</CardTitle>
              <CardDescription>المعلومات الأساسية وبيانات التواصل.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="storeName">اسم المتجر</Label>
                <Input
                  id="storeName"
                  value={formData.storeName}
                  onChange={(e) => setFormData((p) => ({ ...p, storeName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="storeEmail">البريد الإلكتروني</Label>
                  <Input
                    id="storeEmail"
                    type="email"
                    value={formData.storeEmail}
                    onChange={(e) => setFormData((p) => ({ ...p, storeEmail: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="storePhone">رقم الهاتف</Label>
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
              <CardTitle>الإقليم</CardTitle>
              <CardDescription>العملة والمنطقة الزمنية للمتجر.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label>العملة</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData((p) => ({ ...p, currency: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IQD">IQD — الدينار العراقي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>المنطقة الزمنية</Label>
                  <Select value={formData.timezone} onValueChange={(v) => setFormData((p) => ({ ...p, timezone: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Asia/Baghdad">Asia/Baghdad (توقيت العراق)</SelectItem>
                      <SelectItem value="Asia/Dubai">Asia/Dubai (GST+4)</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="btn-save-settings">
              {updateSettings.isPending ? "جاري الحفظ..." : "حفظ التغييرات"}
            </Button>
          </div>
        </TabsContent>

        {/* TEAM */}
        {isOwner && (
          <TabsContent value="team">
            <TeamTab />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
