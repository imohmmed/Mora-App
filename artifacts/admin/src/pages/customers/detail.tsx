import { useAdminGetCustomer, useAdminUpdateCustomer } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, Mail, MapPin, ShoppingBag } from "lucide-react";
import { format } from "date-fns";
import { fmt } from "@/lib/date";

export default function CustomerDetail() {
  const { id } = useParams();
  
  const { data: response, isLoading } = useAdminGetCustomer(id!);
  
  const customerDetail = response?.data;
  const customer = customerDetail; // It is CustomerDetail type which extends Customer and adds orders[]

  if (isLoading) {
    return <div className="p-6 md:p-8">Loading customer...</div>;
  }

  if (!customer) {
    return <div className="p-6 md:p-8">Customer not found.</div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/customers" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">
            {customer.firstName} {customer.lastName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customer since {customer.createdAt ? fmt(customer.createdAt, "MMMM yyyy") : "Unknown"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {customer.firstName[0]}{customer.lastName[0]}
                </div>
                <div>
                  <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                  <div className="text-sm text-muted-foreground">{customer.ordersCount ?? 0} orders</div>
                </div>
              </div>
              
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-start gap-3">
                  <Mail className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div className="text-sm">
                    <div>{customer.email}</div>
                    {customer.acceptsMarketing && (
                      <Badge variant="secondary" className="mt-1 font-normal text-xs">Subscribed</Badge>
                    )}
                  </div>
                </div>
                
                {customer.phone && (
                  <div className="flex items-start gap-3">
                    <User className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm">{customer.phone}</div>
                  </div>
                )}
                
                {customer.address && Object.keys(customer.address).length > 0 && (
                  <div className="flex items-start gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                    <div className="text-sm text-muted-foreground">
                      <p>{(customer.address as any).address1}</p>
                      <p>{(customer.address as any).city}, {(customer.address as any).province}</p>
                      <p>{(customer.address as any).country}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Tags & Segments</CardTitle>
            </CardHeader>
            <CardContent>
              {customer.segment && (
                <div className="mb-4">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Segment</span>
                  <Badge variant="outline">{customer.segment}</Badge>
                </div>
              )}
              
              <div>
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">Tags</span>
                {customer.tags && customer.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {customer.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="font-normal">{tag}</Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">No tags</span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Spent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${(customer.totalSpent ?? 0).toFixed(2)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customer.ordersCount ?? 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Order History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* @ts-ignore - The detail endpoint includes orders but it might not be in the typings fully based on API usage */}
              {customer.orders && customer.orders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {/* @ts-ignore */}
                    {customer.orders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <Link href={`/orders/${order.id}`} className="font-medium hover:underline text-primary">
                            {order.orderNumber}
                          </Link>
                        </TableCell>
                        <TableCell>
                          {order.createdAt ? fmt(order.createdAt, "MMM d, yyyy") : "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={order.financialStatus === "paid" ? "default" : "secondary"}>
                            {order.financialStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          ${order.total.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground border rounded-md">
                  This customer hasn't placed any orders yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}