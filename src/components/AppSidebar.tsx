import { Home, ShoppingCart, Package, DollarSign, Users, UserCircle, ClipboardList, CalendarCheck, Bell } from "lucide-react";
import { NavLink } from "./NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar";
import logo from "@/assets/logo-churrosteria.png";
import { usePermissions } from "@/hooks/usePermissions";

type PermissionKey = 
  | "can_access_sales"
  | "can_access_products"
  | "can_access_stock"
  | "can_access_financial"
  | "can_access_reports"
  | "can_access_settings"
  | "can_access_tasks"
  | "can_access_notifications";

interface NavItem {
  to: string;
  icon: typeof Home;
  label: string;
  permission?: PermissionKey;
  requireMaster?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/vendas", icon: ShoppingCart, label: "Vendas", permission: "can_access_sales" },
  { to: "/comandas", icon: ClipboardList, label: "Comandas", permission: "can_access_sales" },
  { to: "/tarefas", icon: CalendarCheck, label: "Tarefas", permission: "can_access_tasks" },
  { to: "/produtos", icon: Package, label: "Produtos", permission: "can_access_products" },
  { to: "/financeiro", icon: DollarSign, label: "Financeiro", permission: "can_access_financial" },
  { to: "/clientes", icon: UserCircle, label: "Clientes", permission: "can_access_sales" },
  { to: "/notificacoes", icon: Bell, label: "Notificações", permission: "can_access_notifications" },
  { to: "/funcionarios", icon: Users, label: "Equipe", requireMaster: true },
];

export function AppSidebar() {
  const { open } = useSidebar();
  const { isMaster, hasPermission, loading } = usePermissions();

  const visibleItems = navItems.filter((item) => {
    if (loading) return !item.permission && !item.requireMaster;
    if (!item.permission && !item.requireMaster) return true;
    if (item.requireMaster) return isMaster;
    if (item.permission) return hasPermission(item.permission);
    return false;
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <img 
              src={logo} 
              alt="Churrosteria" 
              className="h-8 w-8 rounded-full object-cover flex-shrink-0" 
            />
            {open && (
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Churrosteria
              </h1>
            )}
          </div>
        </div>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.to} 
                      end
                      className="flex items-center gap-3 hover:bg-accent/50"
                      activeClassName="bg-accent text-primary font-medium"
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
