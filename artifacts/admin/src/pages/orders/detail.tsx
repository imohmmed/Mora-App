import { useAdminGetOrder, useAdminUpdateOrder } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Card, CardContent, CardHeader, CardTitle, CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, CreditCard, Truck, Calendar, CheckCircle2, Clock, Package, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { fmt } from "@/lib/date";
import { cn } from "@/lib/utils";

export default function OrderDetail() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const { data: response, isLoading } = useAdminGetOrder(id!);
  const updateOrder = useAdminUpdateOrder();
  
  const order = response?.data;

  const handleStatusChange = (status: string) => {
    if (!id) return;
    updateOrder.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          toast({ title: "Order status updated" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/orders", id] });
        },
        onError: () => {
          toast({ title: "Error updating status", variant: "destructive" });
        }
      }
    );
  };

  const handleFulfillmentChange = (fulfillmentStatus: string) => {
    if (!id) return;
    updateOrder.mutate(
      { id, data: { fulfillmentStatus } },
      {
        onSuccess: () => {
          toast({ title: "Fulfillment status updated" });
          queryClient.invalidateQueries({ queryKey: ["/api/admin/orders", id] });
        },
        onError: () => {
          toast({ title: "Error updating status", variant: "destructive" });
        }
      }
    );
  };

  if (isLoading) {
    return <div className="p-6 md:p-8">Loading order...</div>;
  }

  if (!order) {
    return <div className="p-6 md:p-8">Order not found.</div>;
  }

  // Build fulfillment timeline from order data
  const isPaid = order.financialStatus === "paid";
  const isFulfilled = order.fulfillmentStatus === "fulfilled";
  const isCancelled = order.status === "cancelled";

  type TimelineStep = {
    icon: React.ReactNode;
    label: string;
    description: string;
    done: boolean;
    cancelled?: boolean;
    time?: string;
  };

  const timelineSteps: TimelineStep[] = [
    {
      icon: <ShoppingCart className="w-4 h-4" />,
      label: "Order placed",
      description: "Customer submitted the order",
      done: true,
      time: order.createdAt ? fmt(order.createdAt, "MMM d, yyyy 'at' h:mm a") : undefined,
    },
    {
      icon: <CreditCard className="w-4 h-4" />,
      label: "Payment",
      description: isPaid ? "Payment collected" : "Awaiting payment",
      done: isPaid,
      cancelled: isCancelled,
    },
    {
      icon: <Package className="w-4 h-4" />,
      label: "Fulfillment",
      description: isFulfilled ? "Order fulfilled and shipped" : "Preparing order for shipment",
      done: isFulfilled,
      cancelled: isCancelled,
    },
    {
      icon: <Truck className="w-4 h-4" />,
      label: "Delivered",
      description: isFulfilled ? "Order delivered to customer" : "Not yet delivered",
      done: isFulfilled,
      cancelled: isCancelled,
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/orders" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            {order.orderNumber}
            <Badge variant={order.status === "open" ? "default" : "secondary"}>
              {order.status}
            </Badge>
          </h1>
          {order.createdAt && (
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {fmt(order.createdAt, "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          {/* Order Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Order Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.lineItems?.map((item: any, i) => (
                  <div key={i} className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-md flex items-center justify-center border">
                        <span className="text-xs text-muted-foreground">{item.quantity}x</span>
                      </div>
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.variantTitle || "Default Title"}</p>
                      </div>
                    </div>
                    <div className="font-medium">
                      ${((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <Separator />
            <CardFooter className="flex-col items-stretch p-6 gap-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>${(order.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>${(order.shipping || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>${(order.tax || 0).toFixed(2)}</span>
              </div>
              <Separator className="my-2" />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${order.total.toFixed(2)} {order.currency || "USD"}</span>
              </div>
            </CardFooter>
          </Card>

          {/* Fulfillment Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Fulfillment Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="relative border-l border-muted ml-4 space-y-6">
                {timelineSteps.map((step, i) => (
                  <li key={i} className="ml-6">
                    <span className={cn(
                      "absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background",
                      step.cancelled
                        ? "bg-muted text-muted-foreground"
                        : step.done
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {step.done && !step.cancelled
                        ? <CheckCircle2 className="w-3.5 h-3.5" />
                        : step.icon}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <p className={cn(
                        "font-medium text-sm",
                        step.done && !step.cancelled ? "text-foreground" : "text-muted-foreground"
                      )}>
                        {step.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                      {step.time && (
                        <p className="text-xs text-muted-foreground/70">{step.time}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Link href={order.customerId ? `/customers/${order.customerId}` : "#"} className="font-medium hover:underline text-primary">
                  {order.email}
                </Link>
              </div>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-1">Shipping Address</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {order.shippingAddress ? (
                    <>
                      <p>{(order.shippingAddress as any).firstName} {(order.shippingAddress as any).lastName}</p>
                      <p>{(order.shippingAddress as any).address1}</p>
                      {(order.shippingAddress as any).address2 && <p>{(order.shippingAddress as any).address2}</p>}
                      <p>{(order.shippingAddress as any).city}, {(order.shippingAddress as any).province} {(order.shippingAddress as any).zip}</p>
                      <p>{(order.shippingAddress as any).country}</p>
                    </>
                  ) : (
                    <p>No shipping address provided.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge variant={order.financialStatus === "paid" ? "default" : "secondary"}>
                {order.financialStatus || "unpaid"}
              </Badge>
              {order.financialStatus !== "paid" && (
                <Button variant="outline" className="w-full" size="sm" disabled>
                  Mark as Paid
                </Button>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Fulfillment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Badge variant={order.fulfillmentStatus === "fulfilled" ? "outline" : "secondary"}>
                {order.fulfillmentStatus || "unfulfilled"}
              </Badge>
              <Select value={order.fulfillmentStatus || "unfulfilled"} onValueChange={handleFulfillmentChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unfulfilled">Unfulfilled</SelectItem>
                  <SelectItem value="fulfilled">Fulfilled</SelectItem>
                </SelectContent>
              </Select>
              <Select value={order.status || "open"} onValueChange={handleStatusChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Order status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
