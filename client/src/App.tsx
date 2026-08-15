import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Checkout from "@/pages/Checkout";
import Account from "@/pages/Account";
import AdminOrders from "@/pages/AdminOrders";
import OperationsCenter from "@/pages/OperationsCenter";
import TestCustomerAccount from "@/pages/TestCustomerAccount";
import PetTramTool from "@/pages/PetTramTool";
import ToolsLibrary from "@/pages/ToolsLibrary";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/products/:slug"} component={ProductDetail} />
      <Route path={"/products"} component={Products} />
      <Route path={"/product/:slug"} component={ProductDetail} />
      <Route path={"/cart"} component={Checkout} />
      <Route path={"/checkout"} component={Checkout} />
      <Route path={"/tools"} component={ToolsLibrary} />
      <Route path={"/tools/pet-tram"} component={PetTramTool} />
      <Route path={"/account"} component={Account} />
      <Route path={"/admin"} component={AdminOrders} />
      <Route path={"/admin/operations"} component={OperationsCenter} />
      <Route path={"/admin/test-customer"} component={TestCustomerAccount} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster position="top-right" richColors />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
