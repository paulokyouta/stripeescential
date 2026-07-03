import React, { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AppProvider, useApp } from "@/contexts/AppContext";
import { CartProvider } from "@/contexts/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import BoxDrawer from "@/components/BoxDrawer";
import FavoritesDrawer from "@/components/FavoritesDrawer";
import Home from "@/pages/Home";
import Shop from "@/pages/Shop";
import ProtectedRoute from "@/components/ProtectedRoute";
import DynamicPage from "@/pages/DynamicPage";

// Rotas pesadas / pouco frequentes -> carregadas a pedido (code-splitting).
// O editor Puck (Editor + Admin) sai do bundle inicial dos visitantes.
const ProductDetail = lazy(() => import("@/pages/ProductDetail"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminDashboard = lazy(() => import("@/pages/AdminDashboard"));
const Editor = lazy(() => import("@/pages/Editor"));
const FAQ = lazy(() => import("@/pages/FAQ"));
const PrivacyPolicy = lazy(() => import("@/pages/PrivacyPolicy"));
const Feedback = lazy(() => import("@/pages/Feedback"));

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
};

const RouteFallback = () => (
  <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#8B5E3C", fontSize: 12, letterSpacing: "0.2em", textTransform: "uppercase" }}>
    A carregar…
  </div>
);

// Liga o carrinho ao whatsappNumber das settings (provider ativo de checkout).
const CartBridge = ({ children }) => {
  const { whatsappNumber, currency } = useApp();
  return <CartProvider whatsappNumber={whatsappNumber} currency={currency}>{children}</CartProvider>;
};

function App() {
  return (
    <AppProvider>
      <CartBridge>
      <BrowserRouter>
        <ScrollToTop />
        <Header />
        <CartDrawer />
        <BoxDrawer />
        <FavoritesDrawer />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/fragrances" element={<Navigate to="/scent" replace />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/editor"
              element={
                <ProtectedRoute>
                  <Editor />
                </ProtectedRoute>
              }
            />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/review" element={<Feedback />} />
            <Route path="*" element={<DynamicPage />} />
          </Routes>
        </Suspense>
        <Footer />
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "#F9F6F0",
              color: "#3B2618",
              border: "1px solid #E0D3C3",
              borderRadius: 0,
              fontFamily: "Manrope, sans-serif",
            },
          }}
        />
      </BrowserRouter>
      </CartBridge>
    </AppProvider>
  );
}

export default App;
