import { 
  useAdminGetAnalyticsSummary, 
  useAdminGetRevenueChart, 
  useAdminGetTopProducts,
  useAdminGetAnalyticsReports,
  useAdminGetLiveOrders
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import { format } from "date-fns";
import { TrendingUp, DollarSign, ShoppingCart, Users, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

export default function Analytics() {
  const { data: summaryRes, isLoading: loadingSummary } = useAdminGetAnalyticsSummary();
  const { data: chartRes14, isLoading: loadingChart14 } = useAdminGetRevenueChart({ days: 14 });
  const { data: chartRes30 } = useAdminGetRevenueChart({ days: 30 });
  const { data: topProductsRes, isLoading: loadingTopProducts } = useAdminGetTopProducts({ limit: 10 });
  const { data: reportsRes, isLoading: loadingReports } = useAdminGetAnalyticsReports();
  const { data: liveOrdersRes, isLoading: loadingLiveOrders } = useAdminGetLiveOrders();

  const summary = summaryRes?.data;
  const revenueData14 = chartRes14?.data ?? [];
  const revenueData30 = chartRes30?.data ?? [];
  const topProducts = topProductsRes?.data ?? [];
  const reports = reportsRes?.data ?? [];
  const liveOrders = liveOrdersRes?.data ?? [];

  const metricCards = [
    {
      title: "Total Revenue",
      value: summary ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(summary.revenue) : "—",
      icon: <DollarSign className="w-4 h-4 text-muted-foreground" />,
    },
    {
      title: "Total Orders",
      value: summary?.orders.toString() ?? "—",
      icon: <ShoppingCart className="w-4 h-4 text-muted-foreground" />,
    },
    {
      title: "Total Customers",
      value: summary?.customers.toString() ?? "—",
      icon: <Users className="w-4 h-4 text-muted-foreground" />,
    },
    {
      title: "Avg Order Value",
      value: summary ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(summary.avgOrderValue) : "—",
      icon: <Package className="w-4 h-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track your store performance and growth.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{card.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="live">Live Orders</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue — Last 14 Days</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingChart14 ? (
                  <Skeleton className="h-[280px] w-full" />
                ) : (
                  <RevenueChart data={revenueData14} />
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue — Last 30 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <RevenueChart data={revenueData30} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loadingReports ? (
              [...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
            ) : (
              reports.map((report, i) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-muted-foreground">{report.name}</div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-3xl font-bold">{String(report.value)}</span>
                      <span className={cn(
                        "text-sm font-medium",
                        report.change.startsWith("+") ? "text-green-600" : 
                        report.change.startsWith("-") ? "text-red-600" : 
                        "text-muted-foreground"
                      )}>
                        {report.change}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="live" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Orders Feed</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLiveOrders ? (
                <div className="space-y-3">
                  {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
              ) : liveOrders.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No orders yet.</div>
              ) : (
                <div className="divide-y">
                  {liveOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between py-3">
                      <div>
                        <Link href={`/orders/${order.id}`} className="font-medium hover:underline text-primary">
                          {order.orderNumber}
                        </Link>
                        <p className="text-sm text-muted-foreground">{order.email}</p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${order.total.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(order.createdAt!), "MMM d, h:mm a")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Products by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingTopProducts ? (
                <Skeleton className="h-[400px] w-full" />
              ) : topProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">No data available.</div>
              ) : (
                <div className="space-y-4">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topProducts} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                          dataKey="title"
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                          tick={{ dy: 8 }}
                          interval={0}
                          width={60}
                        />
                        <YAxis
                          tickFormatter={(v) => `$${v}`}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                          contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                        />
                        <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="divide-y border rounded-lg overflow-hidden">
                    {topProducts.map((product, i) => (
                      <div key={product.id} className="flex items-center gap-4 px-4 py-3">
                        <span className="text-muted-foreground text-sm w-5 text-right">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <Link href={`/products/${product.id}`} className="font-medium hover:underline truncate block">
                            {product.title}
                          </Link>
                          <p className="text-sm text-muted-foreground">{product.unitsSold} units sold</p>
                        </div>
                        <span className="font-semibold">${product.revenue.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RevenueChart({ data }: { data: Array<{ date: string; revenue: number }> }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
          <XAxis
            dataKey="date"
            tickFormatter={(val) => format(new Date(val), "MMM d")}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tickFormatter={(val) => `$${val}`}
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
            labelFormatter={(label) => format(new Date(label), "MMM d, yyyy")}
            contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
          />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: "hsl(var(--primary))" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
