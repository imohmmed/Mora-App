import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/hooks/use-cart";
import { WishlistProvider } from "@/hooks/use-wishlist";

import Home from "@/pages/home";
import Products from "@/pages/products";
import ProductDetail from "@/pages/product-detail";
import Collections from "@/pages/collections";
import CollectionDetail from "@/pages/collection-detail";
import Search from "@/pages/search";
import Cart from "@/pages/cart";
import Checkout from "@/pages/checkout";
import CheckoutComplete from "@/pages/checkout-complete";
import Blog from "@/pages/blog";
import BlogDetail from "@/pages/blog-detail";
import Account from "@/pages/account";
import AccountOrders from "@/pages/account-orders";
import AccountProfile from "@/pages/account-profile";
import OrderDetail from "@/pages/order-detail";
import Wishlist from "@/pages/wishlist";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />

      {/* Primary product routes */}
      <Route path="/products" component={Products} />
      <Route path="/products/:id" component={ProductDetail} />

      {/* Alias routes matching /category/:slug and /product/:id conventions */}
      <Route path="/category/:slug">
        {(params) => <Redirect to={`/products?category=${params.slug}`} />}
      </Route>
      <Route path="/product/:id">
        {(params) => <Redirect to={`/products/${params.id}`} />}
      </Route>

      <Route path="/collections" component={Collections} />
      <Route path="/collections/:id" component={CollectionDetail} />
      <Route path="/search" component={Search} />
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/checkout/complete" component={CheckoutComplete} />
      <Route path="/blog" component={Blog} />
      <Route path="/blog/:id" component={BlogDetail} />
      <Route path="/account/orders" component={AccountOrders} />
      <Route path="/account/orders/:id" component={OrderDetail} />
      <Route path="/account/profile" component={AccountProfile} />
      <Route path="/account" component={Account} />
      <Route path="/wishlist" component={Wishlist} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WishlistProvider>
          <CartProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster position="bottom-right" />
          </CartProvider>
        </WishlistProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
