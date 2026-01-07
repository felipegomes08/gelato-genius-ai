import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Package, ChevronDown, ChevronUp, ShoppingCart } from "lucide-react";
import { cn, normalizeText } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number | null;
  category_id: string | null;
  controls_stock: boolean;
  current_stock: number | null;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
}

interface SalesProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  isLoading?: boolean;
}

export function SalesProductGrid({ products, onProductClick, isLoading }: SalesProductGridProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  const { data: categories = [] } = useQuery({
    queryKey: ["categories-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order")
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
  });

  // Normalize and filter products
  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const normalizedSearch = normalizeText(searchTerm);
    return products.filter((p) =>
      normalizeText(p.name).includes(normalizedSearch)
    );
  }, [products, searchTerm]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    const groups: Record<string, Product[]> = {};
    
    for (const product of filteredProducts) {
      const categoryId = product.category_id || "uncategorized";
      if (!groups[categoryId]) {
        groups[categoryId] = [];
      }
      groups[categoryId].push(product);
    }

    return groups;
  }, [filteredProducts]);

  // Get root categories (no parent)
  const rootCategories = useMemo(() => {
    return categories.filter((c) => c.parent_id === null);
  }, [categories]);

  // Check if category has products (recursively)
  const hasProductsInCategory = (categoryId: string): boolean => {
    if (productsByCategory[categoryId]?.length > 0) return true;
    const children = categories.filter((c) => c.parent_id === categoryId);
    return children.some((child) => hasProductsInCategory(child.id));
  };

  // Get all categories with products (for chips)
  const categoriesWithProducts = useMemo(() => {
    return rootCategories.filter((c) => hasProductsInCategory(c.id));
  }, [rootCategories, productsByCategory, categories]);

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    const allCategoryIds = new Set(categoriesWithProducts.map(c => c.id));
    if (productsByCategory["uncategorized"]?.length > 0) {
      allCategoryIds.add("uncategorized");
    }
    setExpandedCategories(allCategoryIds);
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const hasSearchTerm = searchTerm.trim().length > 0;

  // Render products grid
  const renderProductsGrid = (productsToRender: Product[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {productsToRender.map((product) => (
        <button
          key={product.id}
          onClick={() => onProductClick(product)}
          className="group relative flex flex-col gap-1 p-3 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all text-left"
        >
          <div className="flex items-start justify-between gap-1">
            <p className="font-medium text-sm leading-tight line-clamp-2 flex-1">
              {product.name}
            </p>
            <ShoppingCart className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-primary text-sm">
              {product.price !== null ? (
                `R$ ${product.price.toFixed(2)}`
              ) : (
                <span className="text-xs text-muted-foreground">Preço no peso</span>
              )}
            </p>
            {product.controls_stock && (
              <Badge 
                variant={product.current_stock && product.current_stock > 0 ? "secondary" : "destructive"}
                className="text-[10px] h-4 px-1"
              >
                {product.current_stock || 0}
              </Badge>
            )}
          </div>
        </button>
      ))}
    </div>
  );

  // Render category section
  const renderCategorySection = (category: { id: string; name: string }, isUncategorized = false) => {
    const categoryProducts = productsByCategory[category.id] || [];
    if (categoryProducts.length === 0) return null;

    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className="space-y-2">
        <button
          onClick={() => toggleCategory(category.id)}
          className={cn(
            "flex items-center gap-2 w-full px-3 py-2 rounded-lg transition-colors text-left",
            isExpanded ? "bg-primary/10 text-primary" : "bg-muted/50 hover:bg-muted"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronUp className="h-4 w-4 flex-shrink-0 rotate-180" />
          )}
          <span className={cn("font-medium", isUncategorized && "text-muted-foreground")}>
            {category.name}
          </span>
          <Badge variant="secondary" className="text-xs ml-auto">
            {categoryProducts.length}
          </Badge>
        </button>

        {isExpanded && (
          <div className="pl-2">
            {renderProductsGrid(categoryProducts)}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">Carregando produtos...</p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Buscar produto... (ex: acai encontra açaí)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-12"
        />
      </div>

      {/* Category chips + Expand/Collapse buttons */}
      {!hasSearchTerm && categoriesWithProducts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Categorias:</span>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={expandAll}
                className="h-7 text-xs"
              >
                Expandir
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAll}
                className="h-7 text-xs"
              >
                Recolher
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {categoriesWithProducts.map((category) => {
              const isExpanded = expandedCategories.has(category.id);
              const count = productsByCategory[category.id]?.length || 0;
              return (
                <button
                  key={category.id}
                  onClick={() => toggleCategory(category.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    isExpanded
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted hover:bg-muted/80 text-foreground"
                  )}
                >
                  {category.name}
                  <span className="ml-1.5 opacity-70">({count})</span>
                </button>
              );
            })}
            {productsByCategory["uncategorized"]?.length > 0 && (
              <button
                onClick={() => toggleCategory("uncategorized")}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  expandedCategories.has("uncategorized")
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted hover:bg-muted/80 text-muted-foreground"
                )}
              >
                Sem categoria
                <span className="ml-1.5 opacity-70">({productsByCategory["uncategorized"].length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="space-y-3">
        {hasSearchTerm ? (
          // Search mode: show flat list
          filteredProducts.length > 0 ? (
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  {filteredProducts.length} produto(s) encontrado(s)
                </span>
              </div>
              {renderProductsGrid(filteredProducts)}
            </div>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Nenhum produto encontrado</p>
            </Card>
          )
        ) : (
          // Category mode
          <>
            {categoriesWithProducts.map((category) =>
              renderCategorySection(category)
            )}
            {productsByCategory["uncategorized"]?.length > 0 &&
              renderCategorySection({ id: "uncategorized", name: "Sem categoria" }, true)}
            
            {filteredProducts.length === 0 && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Nenhum produto cadastrado</p>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
