import type { ReactNode } from "react";
import { 
  useAdminGetAnalyticsSummary, 
  useAdminGetRevenueChart, 
  useAdminGetTopProducts,
  useAdminGetLiveOrders,
  useAdminGetAnalyticsReports
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";
import { Package, ShoppingCart, Users, DollarSign, Clock } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { data: summaryRes, isLoading: loadingSummary } = useAdminGetAnalyticsSummary();
  const { data: chartRes, isLoading: loadingChart } = useAdminGetRevenueChart({ days: 14 });
  const { data: topProductsRes, isLoading: loadingTopProducts } = useAdminGetTopProducts({ limit: 5 });
  const { data: liveOrdersRes, isLoading: loadingLiveOrders } = useAdminGetLiveOrders();
  const { data: reportsRes, isLoading: loadingReports } = useAdminGetAnalyticsReports();

  const summary = summaryRes?.data;
  const revenueData = chartRes?.data ?? [];
  const topProducts = topProductsRes?.data ?? [];
  const liveOrders = liveOrdersRes?.data ?? [];
  const reports = reportsRes?.data ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Here's what's happening with your store today.</p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="Total Revenue" 
          value={summary ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summary.revenue) : ""} 
          icon={<DollarSign className="w-4 h-4 text-muted-foreground" />} 
          loading={loadingSummary} 
        />
        <MetricCard 
          title="Orders" 
          value={summary?.orders.toString() ?? ""} 
          icon={<ShoppingCart className="w-4 h-4 text-muted-foreground" />} 
          loading={loadingSummary} 
        />
        <MetricCard 
          title="Customers" 
          value={summary?.customers.toString() ?? ""} 
          icon={<Users className="w-4 h-4 text-muted-foreground" />} 
          loading={loadingSummary} 
        />
        <MetricCard 
          title="Avg Order Value" 
          value={summary ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summary.avgOrderValue) : ""} 
          icon={<Package className="w-4 h-4 text-muted-foreground" />} 
          loading={loadingSummary} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <Card className="col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue (Last 14 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingChart ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
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
                      contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
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
            )}
          </CardContent>
        </Card>

        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingTopProducts ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (
              <div className="space-y-6">
                {topProducts.map((product) => (
                  <div key={product.id} className="flex items-center justify-between">
                    <div className="space-y-1 overflow-hidden pr-4">
                      <p className="text-sm font-medium leading-none truncate" title={product.title}>
                        <Link href={`/products/${product.id}`} className="hover:underline">
                          {product.title}
                        </Link>
                      </p>
                      <p className="text-sm text-muted-foreground">{product.unitsSold} units</p>
                    </div>
                    <div className="font-medium">
                      ${product.revenue.toFixed(2)}
                    </div>
                  </div>
                ))}
                {topProducts.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-4">No data available</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Orders Feed */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle>Recent Orders</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingLiveOrders ? (
              <div className="space-y-4 mt-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4 mt-4">
                {liveOrders.slice(0, 5).map(order => (
                  <div key={order.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div>
                      <Link href={`/orders/${order.id}`} className="font-medium hover:underline">
                        {order.orderNumber}
                      </Link>
                      <p className="text-sm text-muted-foreground">{order.email}</p>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${order.total.toFixed(2)}</div>
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(order.createdAt!), "MMM d, h:mm a")}
                      </div>
                    </div>
                  </div>
                ))}
                {liveOrders.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-4">No recent orders</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Reports */}
        <Card>
          <CardHeader>
            <CardTitle>Key Reports</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingReports ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {reports.map((report, i) => (
                  <div key={i} className="p-4 border rounded-lg bg-card">
                    <div className="text-sm font-medium text-muted-foreground">{report.name}</div>
                    <div className="mt-2 flex items-baseline gap-2">
                      <span className="text-2xl font-bold">{String(report.value)}</span>
                      <span className={cn("text-xs font-medium", report.change.startsWith('+') ? "text-green-600" : report.change.startsWith('-') ? "text-red-600" : "text-muted-foreground")}>
                        {report.change}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, loading }: { title: string, value: string, icon: ReactNode, loading: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

