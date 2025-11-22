import { Home, ShoppingCart, Package, DollarSign, Users, UserCircle, ClipboardList } from "lucide-react";
import { NavLink } from "./NavLink";

const navItems = [
  { to: "/", icon: Home, label: "Início" },
  { to: "/vendas", icon: ShoppingCart, label: "Vendas" },
  { to: "/comandas", icon: ClipboardList, label: "Comandas" },
  { to: "/produtos", icon: Package, label: "Produtos" },
  { to: "/financeiro", icon: DollarSign, label: "Financeiro" },
  { to: "/clientes", icon: UserCircle, label: "Clientes" },
  { to: "/funcionarios", icon: Users, label: "Equipe" },
];

export const BottomNav = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t border-border z-50">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {navItems.map((item) => (
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
