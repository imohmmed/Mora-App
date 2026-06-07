import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ClipboardList } from "lucide-react";

export default function PurchaseOrders() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Purchase Orders</h1>
          <p className="text-muted-foreground mt-1">
            Order stock from your suppliers and track incoming shipments.
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Purchase Order
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <ClipboardList className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No purchase orders yet</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Create a purchase order to replenish inventory. Track costs and expected arrival dates with your suppliers.
          </p>
          <Button className="mt-2">
            <Plus className="w-4 h-4 mr-2" />
            Create Purchase Order
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
