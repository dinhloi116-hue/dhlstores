import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import { Route, Switch } from "wouter";
import { lazy, Suspense } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const NotFound = lazy(() => import("@/pages/NotFound"));
const Products = lazy(() => import("@/pages/Products"));
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const CompareProducts = lazy(() => import("@/pages/CompareProducts"));
const Checkout = lazy(() => import("@/pages/Checkout"));
const Account = lazy(() => import("@/pages/Account"));
const AdminOrders = lazy(() => import("@/pages/AdminOrders"));
const OperationsCenter = lazy(() => import("@/pages/OperationsCenter"));
const TestCustomerAccount = lazy(() => import("@/pages/TestCustomerAccount"));
const PetTramTool = lazy(() => import("@/pages/PetTramTool"));
const ToolsLibrary = lazy(() => import("@/pages/ToolsLibrary"));
const NotebookLabelMaker = lazy(() => import("@/pages/NotebookLabelMaker"));
const VideoCutterJoiner = lazy(() => import("@/pages/VideoCutterJoiner"));

function VideoCutterRoute() {
  return <Suspense fallback={<main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center text-sm font-semibold text-slate-600">Đang tải Công cụ Cắt & Nối Video…</main>}><VideoCutterJoiner /></Suspense>;
}

function Router() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center bg-slate-50 p-6 text-center text-sm font-semibold text-slate-600">Đang tải trang…</main>}><Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/products/:slug"} component={ProductDetail} />
      <Route path={"/products"} component={Products} />
      <Route path={"/product/:slug"} component={ProductDetail} />
      <Route path={"/compare"} component={CompareProducts} />
      <Route path={"/cart"} component={Checkout} />
      <Route path={"/checkout"} component={Checkout} />
      <Route path={"/tools"} component={ToolsLibrary} />
      <Route path={"/tools/pet-tram"} component={PetTramTool} />
      <Route path={"/tools/notebook-labels"} component={NotebookLabelMaker} />
      <Route path={"/tools/video-cutter"} component={VideoCutterRoute} />
      <Route path={"/account"} component={Account} />
      <Route path={"/admin"} component={AdminOrders} />
      <Route path={"/admin/operations"} component={OperationsCenter} />
      <Route path={"/admin/test-customer"} component={TestCustomerAccount} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch></Suspense>
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
