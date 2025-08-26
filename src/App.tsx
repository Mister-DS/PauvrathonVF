import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import Discovery from "./pages/Discovery";
import Following from "./pages/Following";
import Profile from "./pages/Profile";
import StreamerRequest from "./pages/StreamerRequest";
import StreamerPanel from "./pages/StreamerPanel";
import AdminPanel from "./pages/AdminPanel";
import SubathonPage from "./pages/SubathonPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/decouverte" element={<Discovery />} />
            <Route path="/suivis" element={<Following />} />
            <Route path="/profil" element={<Profile />} />
            <Route path="/demande-streamer" element={<StreamerRequest />} />
            <Route path="/streamer" element={<StreamerPanel />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/streamer/:id" element={<SubathonPage />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
