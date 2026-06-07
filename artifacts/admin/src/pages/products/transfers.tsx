import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, ArrowLeftRight } from "lucide-react";

export default function Transfers() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transfers</h1>
          <p className="text-muted-foreground mt-1">
            Move inventory between locations.
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Transfer
        </Button>
      </div>

      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 text-center gap-3">
          <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center">
            <ArrowLeftRight className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">No transfers yet</h3>
          <p className="text-muted-foreground max-w-sm text-sm">
            Transfers let you move products between locations. Set up multiple locations in Settings to get started.
          </p>
          <Button className="mt-2">
            <Plus className="w-4 h-4 mr-2" />
            Create Transfer
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
