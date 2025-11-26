import { Home, ShoppingCart, Package, DollarSign, Users, UserCircle, ClipboardList } from "lucide-react";
import { NavLink } from "./NavLink";
import { usePermissions } from "@/hooks/usePermissions";

type PermissionKey = 
  | "can_access_sales"
  | "can_access_products"
  | "can_access_stock"
  | "can_access_financial"
  | "can_access_reports"
  | "can_access_settings";

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
  { to: "/produtos", icon: Package, label: "Produtos", permission: "can_access_products" },
  { to: "/financeiro", icon: DollarSign, label: "Financeiro", permission: "can_access_financial" },
  { to: "/clientes", icon: UserCircle, label: "Clientes", permission: "can_access_sales" },
  { to: "/funcionarios", icon: Users, label: "Equipe", requireMaster: true },
];

export const BottomNav = () => {
  const { isMaster, hasPermission, loading } = usePermissions();

  if (loading) return null;

  const visibleItems = navItems.filter((item) => {
    // Always show items without permission requirements
    if (!item.permission && !item.requireMaster) return true;
    
    // Check if master is required
    if (item.requireMaster) return isMaster;
    
    // Check specific permission
    if (item.permission) return hasPermission(item.permission);
    
    return false;
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {visibleItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors hover:bg-muted/50"
            activeClassName="text-primary bg-accent/10"
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
