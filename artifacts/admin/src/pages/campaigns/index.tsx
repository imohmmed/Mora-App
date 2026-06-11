import { useAdminListCampaigns, useAdminDeleteCampaign } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fmt } from "@/lib/date";
import { useToast } from "@/hooks/use-toast";

export default function Campaigns() {
  const { data: response, isLoading } = useAdminListCampaigns();
  const campaigns = response?.data ?? [];
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const deleteCampaign = useAdminDeleteCampaign();

  const handleDelete = (id: string) => {
    deleteCampaign.mutate(
      { id },
      {
        onSuccess: () => {
          toast({ title: "Campaign deleted" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/campaigns"] });
        },
        onError: () => toast({ title: "Error deleting campaign", variant: "destructive" }),
      }
    );
  };

  const spendPct = (spent: number | undefined, budget: number | undefined) => {
    if (!budget || !spent) return 0;
    return Math.min(100, Math.round((spent / budget) * 100));
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Manage marketing campaigns and track performance.</p>
        </div>
        <Button data-testid="btn-add-campaign">
          <Plus className="w-4 h-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Budget</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Conversions</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">Loading...</TableCell>
              </TableRow>
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Megaphone className="h-8 w-8 mb-2 opacity-50" />
                    <p>No campaigns found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.id} className="cursor-pointer group relative">
                  <TableCell>
                    <Link href={`/campaigns/${campaign.id}`} className="absolute inset-0">
                      <span className="sr-only">View {campaign.title}</span>
                    </Link>
                    <div className="font-medium">{campaign.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {campaign.createdAt ? fmt(campaign.createdAt, "MMM d, yyyy") : "—"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">{campaign.type}</TableCell>
                  <TableCell>
                    {campaign.budget ? (
                      <div className="space-y-1 min-w-[100px]">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>${(campaign.spent ?? 0).toFixed(2)}</span>
                          <span>${campaign.budget.toFixed(2)}</span>
                        </div>
                        <Progress value={spendPct(campaign.spent, campaign.budget)} className="h-1.5" />
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No limit</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat().format(campaign.impressions ?? 0)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {new Intl.NumberFormat().format(campaign.conversions ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="relative z-10 h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                          data-testid={`btn-delete-campaign-${campaign.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete campaign “{campaign.title}”?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. The campaign will be permanently removed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(campaign.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {isLoading ? (
          <p className="text-center text-muted-foreground py-8">Loading...</p>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>No campaigns yet.</p>
          </div>
        ) : (
          campaigns.map((campaign) => (
            <Link key={campaign.id} href={`/campaigns/${campaign.id}`}>
              <Card className="cursor-pointer hover:shadow-sm transition-shadow active:opacity-80">
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{campaign.title}</p>
                      <p className="text-xs text-muted-foreground capitalize">{campaign.type}</p>
                    </div>
                    <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                      {campaign.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Impressions</p>
                      <p className="font-medium">{new Intl.NumberFormat().format(campaign.impressions ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Conversions</p>
                      <p className="font-medium">{new Intl.NumberFormat().format(campaign.conversions ?? 0)}</p>
                    </div>
                  </div>
                  {campaign.budget && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Spent: ${(campaign.spent ?? 0).toFixed(2)}</span>
                        <span>Budget: ${campaign.budget.toFixed(2)}</span>
                      </div>
                      <Progress value={spendPct(campaign.spent, campaign.budget)} className="h-1.5" />
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
