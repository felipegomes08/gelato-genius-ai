import { Home, ShoppingCart, Package, DollarSign, Users, UserCircle, ClipboardList, MoreHorizontal, CalendarCheck, Bell } from "lucide-react";
import { NavLink } from "./NavLink";
import { usePermissions } from "@/hooks/usePermissions";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

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

// Primary items (always visible in bottom bar)
const primaryItems: NavItem[] = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/vendas", icon: ShoppingCart, label: "Vendas", permission: "can_access_sales" },
  { to: "/comandas", icon: ClipboardList, label: "Comandas", permission: "can_access_sales" },
  { to: "/clientes", icon: UserCircle, label: "Clientes", permission: "can_access_sales" },
];

// Secondary items (shown in "Mais" drawer)
const secondaryItems: NavItem[] = [
  { to: "/tarefas", icon: CalendarCheck, label: "Tarefas", permission: "can_access_tasks" },
  { to: "/produtos", icon: Package, label: "Produtos", permission: "can_access_products" },
  { to: "/financeiro", icon: DollarSign, label: "Financeiro", permission: "can_access_financial" },
  { to: "/notificacoes", icon: Bell, label: "Notificações", permission: "can_access_notifications" },
  { to: "/funcionarios", icon: Users, label: "Equipe", requireMaster: true },
];

const MAX_VISIBLE_ITEMS = 5;

export const BottomNav = () => {
  const { isMaster, hasPermission, loading } = usePermissions();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const location = useLocation();

  if (loading) return null;

  const filterItems = (items: NavItem[]) => items.filter((item) => {
    if (!item.permission && !item.requireMaster) return true;
    if (item.requireMaster) return isMaster;
    if (item.permission) return hasPermission(item.permission);
    return false;
  });

  const visiblePrimaryItems = filterItems(primaryItems);
  const visibleSecondaryItems = filterItems(secondaryItems);

  // Check if current route is in secondary items
  const isOnSecondaryRoute = visibleSecondaryItems.some(
    (item) => location.pathname === item.to
  );

  // If total items <= MAX_VISIBLE_ITEMS, show all without "Mais" button
  const totalItems = visiblePrimaryItems.length + visibleSecondaryItems.length;
  const needsMoreButton = totalItems > MAX_VISIBLE_ITEMS;

  // If no need for "Mais" button, show all items
  const itemsToShow = needsMoreButton 
    ? visiblePrimaryItems 
    : [...visiblePrimaryItems, ...visibleSecondaryItems];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50">
        <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
          {itemsToShow.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors hover:bg-muted/50 text-muted-foreground"
              activeClassName="text-primary bg-accent/10"
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </NavLink>
          ))}
          
          {needsMoreButton && visibleSecondaryItems.length > 0 && (
            <button
              onClick={() => setIsSheetOpen(true)}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors hover:bg-muted/50 ${
                isOnSecondaryRoute 
                  ? "text-primary bg-accent/10" 
                  : "text-muted-foreground"
              }`}
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-xs font-medium">Mais</span>
            </button>
          )}
        </div>
      </nav>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="grid gap-2 py-4">
            {visibleSecondaryItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsSheetOpen(false)}
                className="flex items-center gap-4 px-4 py-3 rounded-lg transition-colors hover:bg-muted/50 text-foreground"
                activeClassName="text-primary bg-accent/10"
              >
                <item.icon className="h-5 w-5" />
                <span className="text-base font-medium">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
