import { useAdminGetCampaign, useAdminUpdateCampaign } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Megaphone, TrendingUp, MousePointer, Eye, ShoppingCart } from "lucide-react";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { fmt } from "@/lib/date";

export default function CampaignDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: response, isLoading } = useAdminGetCampaign(id!);
  const updateCampaign = useAdminUpdateCampaign();
  const campaign = response?.data;

  const [status, setStatus] = useState("");
  const [budget, setBudget] = useState("");

  useEffect(() => {
    if (campaign) {
      setStatus(campaign.status);
      setBudget(campaign.budget?.toString() ?? "");
    }
  }, [campaign]);

  const handleSave = () => {
    if (!id) return;
    updateCampaign.mutate(
      {
        id,
        data: {
          status,
          budget: budget ? parseFloat(budget) : undefined,
        },
      },
      {
        onSuccess: () => {
          toast({ title: "Campaign updated" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns", id] });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
        },
        onError: () => toast({ title: "Error", description: "Failed to update campaign.", variant: "destructive" }),
      }
    );
  };

  if (isLoading) return <div className="p-6 md:p-8">Loading...</div>;
  if (!campaign) return <div className="p-6 md:p-8">Campaign not found.</div>;

  const spendPct = campaign.budget && campaign.spent
    ? Math.min(100, Math.round((campaign.spent / campaign.budget) * 100))
    : 0;

  const metrics = [
    { label: "Impressions", value: new Intl.NumberFormat().format(campaign.impressions ?? 0), icon: Eye },
    { label: "Clicks", value: new Intl.NumberFormat().format(campaign.clicks ?? 0), icon: MousePointer },
    { label: "Conversions", value: new Intl.NumberFormat().format(campaign.conversions ?? 0), icon: ShoppingCart },
    {
      label: "Click-through Rate",
      value: campaign.impressions && campaign.clicks
        ? `${((campaign.clicks / campaign.impressions) * 100).toFixed(2)}%`
        : "—",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/campaigns" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Megaphone className="w-6 h-6 text-primary" />
            {campaign.title}
            <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
              {campaign.status}
            </Badge>
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5 capitalize">
            {campaign.type} campaign
            {campaign.createdAt && ` · Created ${fmt(campaign.createdAt, "MMM d, yyyy")}`}
          </p>
        </div>
        <Button onClick={handleSave} disabled={updateCampaign.isPending}>
          {updateCampaign.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs text-muted-foreground">{m.label}</span>
                <m.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold">{m.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Budget card */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Budget & Spend</CardTitle>
              <CardDescription>Track campaign spending against its budget.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {campaign.budget ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Spent: <strong>${(campaign.spent ?? 0).toFixed(2)}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      Budget: <strong>${campaign.budget.toFixed(2)}</strong>
                    </span>
                  </div>
                  <Progress value={spendPct} />
                  <p className="text-sm text-muted-foreground">{spendPct}% of budget used</p>
                </>
              ) : (
                <p className="text-muted-foreground text-sm">No budget limit set.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: "Total Impressions", value: new Intl.NumberFormat().format(campaign.impressions ?? 0) },
                  { label: "Total Clicks", value: new Intl.NumberFormat().format(campaign.clicks ?? 0) },
                  { label: "Conversions", value: new Intl.NumberFormat().format(campaign.conversions ?? 0) },
                  {
                    label: "Cost Per Click",
                    value: campaign.clicks && campaign.spent
                      ? `$${(campaign.spent / campaign.clicks).toFixed(2)}`
                      : "—",
                  },
                  {
                    label: "Cost Per Conversion",
                    value: campaign.conversions && campaign.spent
                      ? `$${(campaign.spent / campaign.conversions).toFixed(2)}`
                      : "—",
                  },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="text-sm text-muted-foreground">{row.label}</span>
                    <span className="font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Budget ($)</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    className="pl-7"
                    placeholder="No limit"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Type</Label>
                <div className="text-sm px-3 py-2 border rounded-md bg-muted capitalize">{campaign.type}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
