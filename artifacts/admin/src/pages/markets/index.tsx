import { useAdminListMarkets } from "@workspace/api-client-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Plus, BookOpen, Rocket } from "lucide-react";

const CATALOGS = [
  {
    id: "c1",
    name: "Primary Catalog",
    status: "active",
    products: 22,
    market: "All Markets",
    desc: "Default product catalog available in all markets.",
  },
  {
    id: "c2",
    name: "Middle East Collection",
    status: "active",
    products: 12,
    market: "Iraq · UAE · Saudi Arabia",
    desc: "Curated selection tailored for the Middle East region.",
  },
];

const ROLLOUTS = [
  {
    id: "r1",
    name: "Summer 2025 Launch",
    status: "scheduled",
    startDate: "2025-06-15",
    markets: 3,
    products: 8,
  },
  {
    id: "r2",
    name: "Back-to-School Push",
    status: "draft",
    startDate: "2025-08-01",
    markets: 2,
    products: 5,
  },
];

export default function Markets() {
  const { data: response, isLoading } = useAdminListMarkets();
  const markets = response?.data ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Markets</h1>
          <p className="text-muted-foreground mt-1">Manage international markets, catalogs, and rollouts.</p>
        </div>
        <Button data-testid="btn-add-market">
          <Plus className="w-4 h-4 mr-2" />
          Add Market
        </Button>
      </div>

      <Tabs defaultValue="markets">
        <TabsList>
          <TabsTrigger value="markets" className="gap-2">
            <Globe className="w-4 h-4" />
            Markets
          </TabsTrigger>
          <TabsTrigger value="catalogs" className="gap-2">
            <BookOpen className="w-4 h-4" />
            Catalogs
          </TabsTrigger>
          <TabsTrigger value="rollouts" className="gap-2">
            <Rocket className="w-4 h-4" />
            Rollouts
          </TabsTrigger>
        </TabsList>

        {/* MARKETS */}
        <TabsContent value="markets" className="mt-6">
          {/* Desktop */}
          <div className="hidden md:block border rounded-lg overflow-hidden bg-card">
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
                    <TableCell colSpan={4} className="h-24 text-center">Loading...</TableCell>
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
                    <TableRow key={market.id} className="cursor-pointer">
                      <TableCell className="font-medium">{market.name}</TableCell>
                      <TableCell>
                        <Badge variant={market.status === "active" ? "default" : "secondary"}>
                          {market.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{market.currency}</TableCell>
                      <TableCell>
                        {market.countries?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {market.countries.slice(0, 3).map((c) => (
                              <Badge key={c} variant="outline" className="text-xs font-normal">
                                {c}
                              </Badge>
                            ))}
                            {market.countries.length > 3 && (
                              <span className="text-xs text-muted-foreground self-center">
                                +{market.countries.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : "—"}
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
            ) : markets.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Globe className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No markets yet.</p>
              </div>
            ) : markets.map((market) => (
              <Card key={market.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{market.name}</span>
                    <Badge variant={market.status === "active" ? "default" : "secondary"}>
                      {market.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-mono">{market.currency}</span>
                    {market.countries?.length ? (
                      <span>· {market.countries.slice(0, 2).join(", ")}{market.countries.length > 2 ? ` +${market.countries.length - 2}` : ""}</span>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* CATALOGS */}
        <TabsContent value="catalogs" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Catalog
            </Button>
          </div>
          <div className="space-y-4">
            {CATALOGS.map((catalog) => (
              <Card key={catalog.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{catalog.name}</CardTitle>
                    <Badge variant={catalog.status === "active" ? "default" : "secondary"}>
                      {catalog.status}
                    </Badge>
                  </div>
                  <CardDescription>{catalog.desc}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{catalog.products} products</span>
                    <span>·</span>
                    <span>{catalog.market}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ROLLOUTS */}
        <TabsContent value="rollouts" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Plan Rollout
            </Button>
          </div>
          <div className="space-y-4">
            {ROLLOUTS.map((rollout) => (
              <Card key={rollout.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-medium">{rollout.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {rollout.products} products · {rollout.markets} markets · Starts {rollout.startDate}
                      </div>
                    </div>
                    <Badge variant={rollout.status === "scheduled" ? "default" : "secondary"} className="capitalize">
                      {rollout.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
