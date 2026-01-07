import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown, ChevronRight, Package, Loader2 } from "lucide-react";
import { cn, normalizeText } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number | null;
  category_id: string | null;
  category: string | null;
  controls_stock: boolean;
  current_stock: number | null;
  is_active: boolean;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
  coupon_id: string | null;
}

interface ProductsByCategoryProps {
  products: Product[];
  onProductClick: (product: Product) => void;
  renderProduct?: (product: Product) => React.ReactNode;
  showSearch?: boolean;
  searchPlaceholder?: string;
}

export function ProductsByCategory({
  products,
  onProductClick,
  renderProduct,
  showSearch = true,
  searchPlaceholder = "Buscar produto...",
}: ProductsByCategoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["uncategorized"]));

  const { data: categories = [], isLoading: loadingCategories } = useQuery({
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

  // Filter products by search with accent normalization
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

  // Build category tree
  const getCategoryChildren = (parentId: string | null): Category[] => {
    return categories.filter((c) => c.parent_id === parentId);
  };

  const hasProductsInTree = (categoryId: string): boolean => {
    if (productsByCategory[categoryId]?.length > 0) return true;
    const children = getCategoryChildren(categoryId);
    return children.some((child) => hasProductsInTree(child.id));
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategorySection = (category: Category, level: number = 0) => {
    const categoryProducts = productsByCategory[category.id] || [];
    const children = getCategoryChildren(category.id);
    const isExpanded = expandedCategories.has(category.id);
    const hasProducts = hasProductsInTree(category.id);

    if (!hasProducts) return null;

    return (
      <div key={category.id} className={cn("space-y-2", level > 0 && "ml-4")}>
        <button
          onClick={() => toggleCategory(category.id)}
          className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 flex-shrink-0" />
          ) : (
            <ChevronRight className="h-4 w-4 flex-shrink-0" />
          )}
          <span className="font-medium">{category.name}</span>
          <Badge variant="secondary" className="text-xs ml-auto">
            {categoryProducts.length}
          </Badge>
          {category.coupon_id && (
            <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
              Desconto
            </Badge>
          )}
        </button>

        {isExpanded && (
          <div className="space-y-2 pl-6">
            {/* Products in this category */}
            {categoryProducts.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {categoryProducts.map((product) =>
                  renderProduct ? (
                    <div key={product.id} onClick={() => onProductClick(product)}>
                      {renderProduct(product)}
                    </div>
                  ) : (
                    <Card
                      key={product.id}
                      className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => onProductClick(product)}
                    >
                      <div className="font-medium text-sm line-clamp-2 mb-2">
                        {product.name}
                      </div>
                      <div className="text-primary font-bold">
                        {product.price !== null ? (
                          `R$ ${product.price.toFixed(2)}`
                        ) : (
                          <span className="text-muted-foreground text-xs">Preço no peso</span>
                        )}
                      </div>
                      {product.controls_stock && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                          <Package className="h-3 w-3" />
                          <span>{product.current_stock || 0} un</span>
                        </div>
                      )}
                    </Card>
                  )
                )}
              </div>
            )}

            {/* Subcategories */}
            {children.map((child) => renderCategorySection(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  // Root categories
  const rootCategories = getCategoryChildren(null);

  // Uncategorized products
  const uncategorizedProducts = productsByCategory["uncategorized"] || [];

  if (loadingCategories) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {showSearch && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      <div className="space-y-4">
        {/* Categorized products */}
        {rootCategories.map((category) => renderCategorySection(category))}

        {/* Uncategorized products */}
        {uncategorizedProducts.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => toggleCategory("uncategorized")}
              className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
            >
              {expandedCategories.has("uncategorized") ? (
                <ChevronDown className="h-4 w-4 flex-shrink-0" />
              ) : (
                <ChevronRight className="h-4 w-4 flex-shrink-0" />
              )}
              <span className="font-medium text-muted-foreground">Sem categoria</span>
              <Badge variant="secondary" className="text-xs ml-auto">
                {uncategorizedProducts.length}
              </Badge>
            </button>

            {expandedCategories.has("uncategorized") && (
              <div className="pl-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {uncategorizedProducts.map((product) =>
                    renderProduct ? (
                      <div key={product.id} onClick={() => onProductClick(product)}>
                        {renderProduct(product)}
                      </div>
                    ) : (
                      <Card
                        key={product.id}
                        className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => onProductClick(product)}
                      >
                        <div className="font-medium text-sm line-clamp-2 mb-2">
                          {product.name}
                        </div>
                        <div className="text-primary font-bold">
                          {product.price !== null ? (
                            `R$ ${product.price.toFixed(2)}`
                          ) : (
                            <span className="text-muted-foreground text-xs">Preço no peso</span>
                          )}
                        </div>
                        {product.controls_stock && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <Package className="h-3 w-3" />
                            <span>{product.current_stock || 0} un</span>
                          </div>
                        )}
                      </Card>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {filteredProducts.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto disponível"}
          </div>
        )}
      </div>
    </div>
  );
}
