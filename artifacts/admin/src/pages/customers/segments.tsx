import { useAdminListCustomers } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { Users, TrendingUp, ShoppingBag, Star } from "lucide-react";

type Segment = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  filter: (c: { totalSpent?: number | null; ordersCount?: number | null }) => boolean;
};

const SEGMENTS: Segment[] = [
  {
    id: "vip",
    name: "VIP Customers",
    description: "Spent over $500 in total",
    icon: <Star className="w-5 h-5" />,
    color: "bg-yellow-50 border-yellow-200 text-yellow-800",
    filter: (c) => (c.totalSpent ?? 0) > 500,
  },
  {
    id: "loyal",
    name: "Loyal Customers",
    description: "3 or more orders placed",
    icon: <TrendingUp className="w-5 h-5" />,
    color: "bg-blue-50 border-blue-200 text-blue-800",
    filter: (c) => (c.ordersCount ?? 0) >= 3,
  },
  {
    id: "active",
    name: "Active Buyers",
    description: "At least 1 order placed",
    icon: <ShoppingBag className="w-5 h-5" />,
    color: "bg-green-50 border-green-200 text-green-800",
    filter: (c) => (c.ordersCount ?? 0) >= 1,
  },
  {
    id: "new",
    name: "New Customers",
    description: "Exactly 1 order placed",
    icon: <Users className="w-5 h-5" />,
    color: "bg-purple-50 border-purple-200 text-purple-800",
    filter: (c) => (c.ordersCount ?? 0) === 1,
  },
];

export default function CustomerSegments() {
  const { data: response, isLoading } = useAdminListCustomers({});
  const allCustomers = response?.data ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Customer Segments</h1>
        <p className="text-muted-foreground mt-1">
          Group your customers by behavior to target the right audience.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {SEGMENTS.map((seg) => {
          const count = isLoading ? null : allCustomers.filter(seg.filter).length;
          return (
            <a key={seg.id} href={`#${seg.id}`} className="block">
              <Card className={`border-2 transition-shadow hover:shadow-md cursor-pointer`}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${seg.color}`}>{seg.icon}</div>
                    {count !== null && (
                      <Badge variant="secondary" className="text-base font-bold px-3 py-1">
                        {count}
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-base mt-3">{seg.name}</CardTitle>
                  <CardDescription className="text-xs">{seg.description}</CardDescription>
                </CardHeader>
              </Card>
            </a>
          );
        })}
      </div>

      <div className="space-y-10">
        {SEGMENTS.map((seg) => {
          const segCustomers = isLoading ? [] : allCustomers.filter(seg.filter);
          return (
            <div key={seg.id} id={seg.id}>
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-1.5 rounded-md ${seg.color}`}>{seg.icon}</div>
                <div>
                  <h2 className="text-lg font-semibold">{seg.name}</h2>
                  <p className="text-sm text-muted-foreground">{seg.description}</p>
                </div>
                <Badge variant="outline" className="ml-auto">{segCustomers.length} customers</Badge>
              </div>

              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Amount Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                          Loading...
                        </TableCell>
                      </TableRow>
                    ) : segCustomers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                          No customers in this segment yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      segCustomers.map((c) => (
                        <TableRow key={c.id} className="relative cursor-pointer">
                          <TableCell className="font-medium">
                            <Link href={`/customers/${c.id}`} className="absolute inset-0">
                              <span className="sr-only">View {c.firstName} {c.lastName}</span>
                            </Link>
                            {c.firstName} {c.lastName}
                          </TableCell>
                          <TableCell>{c.email}</TableCell>
                          <TableCell className="text-right">{c.ordersCount ?? 0}</TableCell>
                          <TableCell className="text-right font-medium">
                            ${(c.totalSpent ?? 0).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
