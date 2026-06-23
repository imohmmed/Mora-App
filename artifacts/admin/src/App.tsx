import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { getAdminToken, clearAdminToken } from "@/lib/api";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminLayout } from "@/components/layout/admin-layout";
import { AdminAuthProvider, useAdminAuth } from "@/context/AdminAuthContext";
import { Loader2 } from "lucide-react";
import NotFound from "@/pages/not-found";
import Login from "@/pages/login";

import Dashboard from "@/pages/dashboard";
import Orders from "@/pages/orders";
import OrderDetail from "@/pages/orders/detail";
import Products from "@/pages/products";
import NewProduct from "@/pages/products/new";
import ProductDetail from "@/pages/products/detail";
import Inventory from "@/pages/products/inventory";
import PurchaseOrders from "@/pages/products/purchase-orders";
import Transfers from "@/pages/products/transfers";
import GiftCards from "@/pages/products/gift-cards";
import Customers from "@/pages/customers";
import CustomerDetail from "@/pages/customers/detail";
import CustomerSegments from "@/pages/customers/segments";
import Companies from "@/pages/customers/companies";
import CollectionsHub from "@/pages/collections/hub";
import CollectionForm from "@/pages/collections/collection-form";
import Discounts from "@/pages/discounts";
import NewDiscount from "@/pages/discounts/new";
import ContentHub from "@/pages/content";
import BlogPostEditor from "@/pages/content/blog-new";
import MenuEditor from "@/pages/content/menu-editor";
import Analytics from "@/pages/analytics";
import Settings from "@/pages/settings";
import ShippingSettings from "@/pages/settings/shipping";
import Notifications from "@/pages/notifications";

function handleApiError(error: unknown) {
  const status = (error as { status?: number } | null)?.status;
  // A 401 while a token is present means the stored session is stale/expired —
  // clear it and reload so the auth gate falls back to the login screen.
  if (status === 401 && getAdminToken()) {
    clearAdminToken();
    window.location.reload();
  }
}

const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleApiError }),
  mutationCache: new MutationCache({ onError: handleApiError }),
});

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function Router() {
  const { user, isLoading } = useAdminAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Login />;

  return (
    <AdminLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/orders" component={Orders} />
        <Route path="/orders/:id" component={OrderDetail} />
        <Route path="/products/new" component={NewProduct} />
        <Route path="/products/inventory" component={Inventory} />
        <Route path="/products/purchase-orders" component={PurchaseOrders} />
        <Route path="/products/transfers" component={Transfers} />
        <Route path="/products/gift-cards" component={GiftCards} />
        <Route path="/products/:id" component={ProductDetail} />
        <Route path="/products" component={Products} />
        <Route path="/customers/segments" component={CustomerSegments} />
        <Route path="/customers/companies" component={Companies} />
        <Route path="/customers/:id" component={CustomerDetail} />
        <Route path="/customers" component={Customers} />
        <Route path="/collections/new" component={CollectionForm} />
        <Route path="/collections/:id/edit" component={CollectionForm} />
        <Route path="/collections/special" component={CollectionsHub} />
        <Route path="/collections" component={CollectionsHub} />
        <Route path="/discounts/new" component={NewDiscount} />
        <Route path="/discounts" component={Discounts} />
        <Route path="/content/blog/new" component={BlogPostEditor} />
        <Route path="/content/menus/new" component={MenuEditor} />
        <Route path="/content/menus/:id" component={MenuEditor} />
        <Route path="/content" component={ContentHub} />
        <Route path="/notifications" component={Notifications} />
        <Route path="/settings/shipping" component={ShippingSettings} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AdminLayout>
  );
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <AdminAuthProvider>
          <TooltipProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster />
          </TooltipProvider>
        </AdminAuthProvider>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
