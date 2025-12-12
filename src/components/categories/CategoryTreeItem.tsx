import { ReactNode } from "react";
import { Category } from "@/pages/Categorias";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronDown, Edit, Plus, Package, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";

interface CategoryTreeItemProps {
  category: Category;
  level: number;
  isExpanded: boolean;
  hasChildren: boolean;
  productCount: number;
  onToggle: () => void;
  onEdit: () => void;
  onAddSubcategory: () => void;
  children?: ReactNode;
}

export function CategoryTreeItem({
  category,
  level,
  isExpanded,
  hasChildren,
  productCount,
  onToggle,
  onEdit,
  onAddSubcategory,
  children,
}: CategoryTreeItemProps) {
  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group",
          !category.is_active && "opacity-50"
        )}
      >
        {/* Expand/Collapse button */}
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-6 w-6 flex-shrink-0", !hasChildren && "invisible")}
          onClick={onToggle}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>

        {/* Category name */}
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <span className="font-medium truncate">{category.name}</span>
          
          {!category.is_active && (
            <Badge variant="secondary" className="text-xs flex-shrink-0">
              Inativa
            </Badge>
          )}
          
          {category.coupon_id && (
            <Badge variant="outline" className="text-xs flex-shrink-0 bg-primary/10 text-primary border-primary/20">
              <Ticket className="h-3 w-3 mr-1" />
              Cupom
            </Badge>
          )}
        </div>

        {/* Product count */}
        <div className="flex items-center gap-1 text-muted-foreground text-sm flex-shrink-0">
          <Package className="h-4 w-4" />
          <span>{productCount}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onAddSubcategory}
            title="Adicionar subcategoria"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
            title="Editar categoria"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {children}
    </div>
  );
}
