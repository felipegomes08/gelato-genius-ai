import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, ShoppingCart, ArrowLeft, Zap } from "lucide-react";
import { cn, normalizeText } from "@/lib/utils";
import { toast } from "sonner";
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
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  // Fetch top selling products
  const { data: topSellers = [] } = useQuery({
    queryKey: ["top-sellers", products],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_items")
        .select("product_id, quantity");

      if (error) throw error;

      // Aggregate quantities by product_id
      const counts: Record<string, number> = {};
      data.forEach((item) => {
        counts[item.product_id] = (counts[item.product_id] || 0) + item.quantity;
      });

      // Get top 6 product IDs sorted by total sold
      const topIds = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([id]) => id);

      // Match with active products from props
      return topIds
        .map((id) => products.find((p) => p.id === id))
        .filter((p): p is Product => p !== undefined);
    },
    enabled: products.length > 0,
  });

  const handleProductClick = (product: Product) => {
    onProductClick(product);
    toast.success(`${product.name} adicionado`, { duration: 1000 });
  };

  // Clear selected category when search is active
  useEffect(() => {
    if (searchTerm.trim()) {
      setSelectedCategory(null);
    }
  }, [searchTerm]);

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

  const selectCategory = (categoryId: string) => {
    setSelectedCategory(categoryId);
  };

  const clearSelection = () => {
    setSelectedCategory(null);
  };

  const hasSearchTerm = searchTerm.trim().length > 0;

  // Get selected category info
  const selectedCategoryInfo = useMemo(() => {
    if (!selectedCategory) return null;
    if (selectedCategory === "uncategorized") {
      return { id: "uncategorized", name: "Sem categoria" };
    }
    return categories.find((c) => c.id === selectedCategory);
  }, [selectedCategory, categories]);

  const selectedCategoryProducts = selectedCategory ? (productsByCategory[selectedCategory] || []) : [];

  // Render products grid
  const renderProductsGrid = (productsToRender: Product[]) => (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
      {productsToRender.map((product) => (
        <button
          key={product.id}
          onClick={() => handleProductClick(product)}
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

  // Render top sellers section
  const renderTopSellers = () => {
    if (topSellers.length === 0) return null;
    
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="text-sm font-medium text-muted-foreground">Mais vendidos</span>
        </div>
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex gap-2 pb-2">
            {topSellers.map((product) => (
              <button
                key={product.id}
                onClick={() => handleProductClick(product)}
                className="flex-shrink-0 flex flex-col items-start gap-0.5 p-2 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all text-left min-w-[100px] max-w-[120px]"
              >
                <p className="font-medium text-xs leading-tight line-clamp-2 w-full">
                  {product.name}
                </p>
                <p className="font-bold text-primary text-xs">
                  {product.price !== null ? `R$ ${product.price.toFixed(2)}` : "—"}
                </p>
              </button>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
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

      {/* Content */}
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
        ) : selectedCategory ? (
          // Focus mode: show only selected category
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelection}
                className="h-9 px-3"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-lg">{selectedCategoryInfo?.name}</span>
                <Badge variant="secondary">{selectedCategoryProducts.length}</Badge>
              </div>
            </div>
            {selectedCategoryProducts.length > 0 ? (
              renderProductsGrid(selectedCategoryProducts)
            ) : (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Nenhum produto nesta categoria</p>
              </Card>
            )}
          </div>
        ) : (
          // Category selection mode: show top sellers + chips
          <div className="space-y-4">
            {renderTopSellers()}
            <span className="text-sm text-muted-foreground">Selecione uma categoria:</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categoriesWithProducts.map((category) => {
                const count = productsByCategory[category.id]?.length || 0;
                return (
                  <button
                    key={category.id}
                    onClick={() => selectCategory(category.id)}
                    className="flex items-center justify-between gap-2 px-4 py-3 rounded-lg bg-muted hover:bg-primary/10 hover:text-primary transition-all text-left border hover:border-primary/30"
                  >
                    <span className="font-medium truncate">{category.name}</span>
                    <Badge variant="secondary" className="flex-shrink-0">{count}</Badge>
                  </button>
                );
              })}
              {productsByCategory["uncategorized"]?.length > 0 && (
                <button
                  onClick={() => selectCategory("uncategorized")}
                  className="flex items-center justify-between gap-2 px-4 py-3 rounded-lg bg-muted/50 hover:bg-primary/10 hover:text-primary transition-all text-left border hover:border-primary/30"
                >
                  <span className="font-medium text-muted-foreground truncate">Sem categoria</span>
                  <Badge variant="secondary" className="flex-shrink-0">
                    {productsByCategory["uncategorized"].length}
                  </Badge>
                </button>
              )}
            </div>
            
            {categoriesWithProducts.length === 0 && !productsByCategory["uncategorized"]?.length && (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">Nenhum produto cadastrado</p>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
