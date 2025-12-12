import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { MainLayout } from "@/components/MainLayout";
import { PermissionRoute } from "@/components/PermissionRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Vendas from "./pages/Vendas";
import Comandas from "./pages/Comandas";
import Produtos from "./pages/Produtos";
import Categorias from "./pages/Categorias";
import Financeiro from "./pages/Financeiro";
import Funcionarios from "./pages/Funcionarios";
import Clientes from "./pages/Clientes";
import Tarefas from "./pages/Tarefas";
import Notificacoes from "./pages/Notificacoes";
import Configuracoes from "./pages/Configuracoes";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            {/* Protected routes with persistent layout */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/vendas" element={<PermissionRoute permission="can_access_sales"><Vendas /></PermissionRoute>} />
              <Route path="/comandas" element={<PermissionRoute permission="can_access_sales"><Comandas /></PermissionRoute>} />
              <Route path="/tarefas" element={<Tarefas />} />
              <Route path="/produtos" element={<PermissionRoute permission="can_access_products"><Produtos /></PermissionRoute>} />
              <Route path="/categorias" element={<PermissionRoute permission="can_access_products"><Categorias /></PermissionRoute>} />
              <Route path="/financeiro" element={<PermissionRoute permission="can_access_financial"><Financeiro /></PermissionRoute>} />
              <Route path="/funcionarios" element={<PermissionRoute requireMaster><Funcionarios /></PermissionRoute>} />
              <Route path="/clientes" element={<PermissionRoute permission="can_access_sales"><Clientes /></PermissionRoute>} />
              <Route path="/notificacoes" element={<PermissionRoute permission="can_access_notifications"><Notificacoes /></PermissionRoute>} />
              <Route path="/configuracoes" element={<PermissionRoute requireMaster><Configuracoes /></PermissionRoute>} />
            </Route>
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
