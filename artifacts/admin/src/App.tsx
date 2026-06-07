import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/layout/admin-layout";
import NotFound from "@/pages/not-found";

import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/orders/detail";
import Products from "@/pages/products";
import ProductDetail from "@/pages/products/detail";
import Inventory from "@/pages/products/inventory";
import PurchaseOrders from "@/pages/products/purchase-orders";
import Transfers from "@/pages/products/transfers";
import GiftCards from "@/pages/products/gift-cards";
import Customers from "@/pages/customers";
import CustomerDetail from "@/pages/customers/detail";
import CustomerSegments from "@/pages/customers/segments";
import Companies from "@/pages/customers/companies";
import Collections from "@/pages/collections";
import Discounts from "@/pages/discounts";
import Campaigns from "@/pages/campaigns";
import ContentHub from "@/pages/content";
import Markets from "@/pages/markets";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";

const queryClient = new QueryClient();

function Router() {
  return (
    <AdminLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/orders" component={Orders} />
        <Route path="/orders/:id" component={OrderDetail} />
        {/* Products + sub-pages — specific routes first */}
        <Route path="/products/inventory" component={Inventory} />
        <Route path="/products/purchase-orders" component={PurchaseOrders} />
        <Route path="/products/transfers" component={Transfers} />
        <Route path="/products/gift-cards" component={GiftCards} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/products" component={Products} />
        {/* Customers + sub-pages — specific routes first */}
        <Route path="/customers/segments" component={CustomerSegments} />
        <Route path="/customers/companies" component={Companies} />
        <Route path="/customers/:id" component={CustomerDetail} />
        <Route path="/customers" component={Customers} />
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
