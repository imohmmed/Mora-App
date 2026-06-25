import { useState, useEffect } from "react";
import { useAdminGetSettings, useAdminUpdateSettings } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageContainer, PageHeader, SectionCard } from "@/components/ui/page-primitives";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Users as UsersIcon } from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useT } from "@/i18n/LanguageContext";
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
  const { t } = useT();
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
          toast({ title: t("toast.saved"), description: t("settings.toast.saved.desc") });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
        },
        onError: () => {
          toast({ title: t("toast.error"), description: t("settings.toast.error.desc"), variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <PageContainer className="max-w-3xl">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="max-w-3xl">
      <PageHeader title={t("nav.settings")} subtitle={t("settings.subtitle")} />

      <Tabs defaultValue="general">
        <TabsList className="mb-6">
          <TabsTrigger value="general" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            {t("settings.tab.general")}
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="team" className="gap-2">
              <UsersIcon className="w-4 h-4" />
              {t("settings.tab.team")}
            </TabsTrigger>
          )}
        </TabsList>

        {/* GENERAL */}
        <TabsContent value="general" className="space-y-6">
          <SectionCard title={t("settings.storeInfo.title")} description={t("settings.storeInfo.desc")}>
            <div className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="storeName">{t("settings.field.storeName")}</Label>
                <Input
                  id="storeName"
                  value={formData.storeName}
                  onChange={(e) => setFormData((p) => ({ ...p, storeName: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="storeEmail">{t("common.email")}</Label>
                  <Input
                    id="storeEmail"
                    type="email"
                    value={formData.storeEmail}
                    onChange={(e) => setFormData((p) => ({ ...p, storeEmail: e.target.value }))}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="storePhone">{t("common.phone")}</Label>
                  <Input
                    id="storePhone"
                    value={formData.storePhone}
                    onChange={(e) => setFormData((p) => ({ ...p, storePhone: e.target.value }))}
                  />
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard title={t("settings.region.title")} description={t("settings.region.desc")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label>{t("settings.field.currency")}</Label>
                <Select value={formData.currency} onValueChange={(v) => setFormData((p) => ({ ...p, currency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IQD">{t("settings.currency.iqd")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>{t("settings.field.timezone")}</Label>
                <Select value={formData.timezone} onValueChange={(v) => setFormData((p) => ({ ...p, timezone: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Baghdad">{t("settings.tz.baghdad")}</SelectItem>
                    <SelectItem value="Asia/Dubai">{t("settings.tz.dubai")}</SelectItem>
                    <SelectItem value="UTC">{t("settings.tz.utc")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SectionCard>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateSettings.isPending} data-testid="btn-save-settings">
              {updateSettings.isPending ? t("action.saving") : t("action.saveChanges")}
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
    </PageContainer>
  );
}
