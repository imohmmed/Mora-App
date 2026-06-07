import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/layout/admin-layout";
import NotFound from "@/pages/not-found";

// Pages
import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/orders/detail";
import Products from "@/pages/products";
import ProductDetail from "@/pages/products/detail";
import Customers from "@/pages/customers";
import CustomerDetail from "@/pages/customers/detail";
import Collections from "@/pages/collections";
import Discounts from "@/pages/discounts";
import Campaigns from "@/pages/campaigns";
import ContentHub from "@/pages/content";
import Markets from "@/pages/markets";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/orders" component={Orders} />
        <Route path="/orders/:id" component={OrderDetail} />
        <Route path="/products" component={Products} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/customers" component={Customers} />
        <Route path="/customers/:id" component={CustomerDetail} />
        <Route path="/collections" component={Collections} />
        <Route path="/discounts" component={Discounts} />
        <Route path="/campaigns" component={Campaigns} />
        <Route path="/content" component={ContentHub} />
        <Route path="/markets" component={Markets} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;