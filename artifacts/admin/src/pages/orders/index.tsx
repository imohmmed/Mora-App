import { useState, useEffect } from "react";
import { useAdminListOrders } from "@workspace/api-client-react";
import { Link } from "wouter";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Inbox } from "lucide-react";
import { format } from "date-fns";

export default function Orders() {
  const [status, setStatus] = useState<string>("all");
  const [type, setType] = useState<"orders" | "drafts" | "abandoned" | "all">("all");

  const { data: response, isLoading } = useAdminListOrders({
    status: status !== "all" ? status : undefined,
    type: type !== "all" ? (type as any) : undefined,
  });

  const orders = response?.data ?? [];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
        <p className="text-muted-foreground mt-1">Manage and fulfill customer orders.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center bg-card p-4 rounded-lg border">
        <div className="flex gap-4 w-full sm:w-auto">
          <Select value={type} onValueChange={(v: any) => setType(v)}>
            <SelectTrigger className="w-full sm:w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="orders">Completed</SelectItem>
              <SelectItem value="drafts">Drafts</SelectItem>
              <SelectItem value="abandoned">Abandoned Checkouts</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any Status</SelectItem>
              <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Fulfillment</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  Loading...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Inbox className="h-8 w-8 mb-2 opacity-50" />
                    <p>No orders found.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.id} className="cursor-pointer group relative">
                  <TableCell className="font-medium">
                    <Link href={`/orders/${order.id}`} className="absolute inset-0">
                      <span className="sr-only">View Order {order.orderNumber}</span>
                    </Link>
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    {order.createdAt ? format(new Date(order.createdAt), "MMM d, h:mm a") : "-"}
                  </TableCell>
                  <TableCell>{order.email}</TableCell>
                  <TableCell>
                    <Badge variant={order.financialStatus === "paid" ? "default" : "secondary"}>
                      {order.financialStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={order.fulfillmentStatus === "fulfilled" ? "outline" : "secondary"}>
                      {order.fulfillmentStatus || "unfulfilled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${order.total.toFixed(2)}
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