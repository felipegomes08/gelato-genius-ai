import { Home, ShoppingCart, Package, DollarSign, Users, UserCircle } from "lucide-react";
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

const navItems = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/vendas", icon: ShoppingCart, label: "Vendas" },
  { to: "/produtos", icon: Package, label: "Produtos" },
  { to: "/financeiro", icon: DollarSign, label: "Financeiro" },
  { to: "/clientes", icon: UserCircle, label: "Clientes" },
  { to: "/funcionarios", icon: Users, label: "Equipe" },
];

export function AppSidebar() {
  const { open } = useSidebar();

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
              {navItems.map((item) => (
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
