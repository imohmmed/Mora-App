import { useState } from "react";
import { useAdminListDiscounts } from "@workspace/api-client-react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tags, Plus } from "lucide-react";
import { format } from "date-fns";

export default function Discounts() {
  const { data: response, isLoading } = useAdminListDiscounts();

  const discounts = response?.data ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Discounts</h1>
          <p className="text-muted-foreground mt-1">Manage discount codes and automatic discounts.</p>
        </div>
        <Button data-testid="btn-add-discount">
          <Plus className="w-4 h-4 mr-2" />
          Create Discount
        </Button>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type/Value</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Active Dates</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : discounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Tags className="h-8 w-8 mb-2 opacity-50" />
                    <p>No discounts found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              discounts.map((discount) => (
                <TableRow key={discount.id} className="cursor-pointer group relative">
                  <TableCell className="font-medium font-mono">
                    {discount.code}
                  </TableCell>
                  <TableCell>
                    <Badge variant={discount.status === "active" ? "default" : discount.status === "scheduled" ? "outline" : "secondary"}>
                      {discount.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {discount.type === "percentage" ? `${discount.value}%` : `$${discount.value.toFixed(2)}`}
                  </TableCell>
                  <TableCell>
                    {discount.usageCount ?? 0} {discount.usageLimit ? `/ ${discount.usageLimit}` : "used"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {discount.startsAt ? format(new Date(discount.startsAt), "MMM d") : "-"} 
                    {discount.endsAt ? ` – ${format(new Date(discount.endsAt), "MMM d, yyyy")}` : ""}
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