import { useState } from "react";
import { useAdminListMarkets } from "@workspace/api-client-react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Globe, Plus } from "lucide-react";

export default function Markets() {
  const { data: response, isLoading } = useAdminListMarkets();

  const markets = response?.data ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Markets</h1>
          <p className="text-muted-foreground mt-1">Manage international markets and currencies.</p>
        </div>
        <Button data-testid="btn-add-market">
          <Plus className="w-4 h-4 mr-2" />
          Add Market
        </Button>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Market Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Countries</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : markets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Globe className="h-8 w-8 mb-2 opacity-50" />
                    <p>No markets found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              markets.map((market) => (
                <TableRow key={market.id} className="cursor-pointer group relative">
                  <TableCell className="font-medium">
                    {market.name}
                  </TableCell>
                  <TableCell>
                    <Badge variant={market.status === "active" ? "default" : "secondary"}>
                      {market.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {market.currency}
                  </TableCell>
                  <TableCell>
                    {market.countries?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {market.countries.slice(0, 3).map(c => (
                          <Badge key={c} variant="outline" className="text-xs font-normal px-1.5 py-0">
                            {c}
                          </Badge>
                        ))}
                        {market.countries.length > 3 && (
                          <span className="text-xs text-muted-foreground self-center ml-1">+{market.countries.length - 3} more</span>
                        )}
                      </div>
                    ) : "-"}
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