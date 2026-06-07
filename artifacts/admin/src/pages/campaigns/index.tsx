import { useState } from "react";
import { useAdminListCampaigns } from "@workspace/api-client-react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, Plus } from "lucide-react";
import { format } from "date-fns";

export default function Campaigns() {
  const { data: response, isLoading } = useAdminListCampaigns();

  const campaigns = response?.data ?? [];

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

      <div className="bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Spend / Budget</TableHead>
              <TableHead className="text-right">Impressions</TableHead>
              <TableHead className="text-right">Conversions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : campaigns.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Megaphone className="h-8 w-8 mb-2 opacity-50" />
                    <p>No campaigns found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              campaigns.map((campaign) => (
                <TableRow key={campaign.id} className="cursor-pointer group relative">
                  <TableCell className="font-medium">
                    {campaign.title}
                    <div className="text-xs text-muted-foreground font-normal mt-1">
                      {campaign.createdAt ? format(new Date(campaign.createdAt), "MMM d, yyyy") : "-"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={campaign.status === "active" ? "default" : "secondary"}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    {campaign.type}
                  </TableCell>
                  <TableCell className="text-right">
                    ${(campaign.spent ?? 0).toFixed(2)} / {campaign.budget ? `$${campaign.budget.toFixed(2)}` : "No limit"}
                  </TableCell>
                  <TableCell className="text-right">
                    {new Intl.NumberFormat().format(campaign.impressions ?? 0)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {new Intl.NumberFormat().format(campaign.conversions ?? 0)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}