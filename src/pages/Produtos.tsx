import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Search, Plus, Edit, Package, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddProductDialog } from "@/components/products/AddProductDialog";
import { EditProductDialog } from "@/components/products/EditProductDialog";
import { cn, normalizeText } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price: number | null;
  current_stock: number | null;
  controls_stock: boolean;
  category: string;
  category_id: string | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  low_stock_threshold: number | null;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
  sort_order: number;
}

export default function Produtos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(["uncategorized"]));
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("is_active", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as Product[];
    },
  });

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

  const handleToggleActive = async (product: Product) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: !product.is_active })
        .eq("id", product.id);

      if (error) throw error;

      toast({
        title: product.is_active ? "Produto desativado" : "Produto ativado",
        description: `${product.name} foi ${product.is_active ? "desativado" : "ativado"} com sucesso.`,
      });

      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (error) {
      console.error("Error toggling product status:", error);
      toast({
        title: "Erro ao atualizar produto",
        description: "Não foi possível alterar o status do produto.",
        variant: "destructive",
      });
    }
  };

  // Filter products with accent normalization
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

  // Root categories with products
  const categoriesWithProducts = useMemo(() => {
    return categories
      .filter((c) => c.parent_id === null)
      .filter((c) => (productsByCategory[c.id]?.length || 0) > 0);
  }, [categories, productsByCategory]);

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

  const getStockStatus = (product: Product) => {
    if (!product.controls_stock) return null;
    if (!product.current_stock || product.current_stock === 0) return "out";
    const threshold = product.low_stock_threshold || 15;
    if (product.current_stock < threshold) return "low";
    return "ok";
  };

  // Render product card
  const renderProductCard = (product: Product) => {
    const stockStatus = getStockStatus(product);
    return (
      <Card 
        key={product.id} 
        className={`shadow-sm hover:shadow-md transition-all ${!product.is_active ? 'opacity-60' : ''}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">{product.name}</h3>
                {!product.is_active && (
                  <Badge variant="secondary" className="text-xs">
                    Inativo
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {product.category}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary">
                {product.price ? (
                  `R$ ${product.price.toFixed(2)}`
                ) : (
                  <span className="text-sm text-muted-foreground">Preço no peso</span>
                )}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => {
                  setSelectedProduct(product);
                  setEditDialogOpen(true);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {product.controls_stock && (
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">
                  Estoque: {product.current_stock || 0} un.
                </span>
              </div>
              {stockStatus === "low" && (
                <Badge variant="destructive" className="text-xs">
                  Baixo
                </Badge>
              )}
              {stockStatus === "out" && (
                <Badge variant="destructive" className="text-xs">
                  Esgotado
                </Badge>
              )}
              {stockStatus === "ok" && (
                <Badge
                  variant="secondary"
                  className="text-xs bg-success/10 text-success hover:bg-success/20"
                >
                  OK
                </Badge>
              )}
            </div>
          )}

          {!product.controls_stock && (
            <div className="flex items-center gap-2 pt-3 border-t">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Estoque não controlado
              </span>
            </div>
          )}

          <div className="flex items-center justify-between pt-3 mt-3 border-t">
            <span className="text-sm text-muted-foreground">
              {product.is_active ? "Produto ativo" : "Produto inativo"}
            </span>
            <Switch
              checked={product.is_active}
              onCheckedChange={() => handleToggleActive(product)}
            />
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render category section
  const renderCategorySection = (category: { id: string; name: string }, isUncategorized = false) => {
    const categoryProducts = productsByCategory[category.id] || [];
    if (categoryProducts.length === 0) return null;

    const isExpanded = expandedCategories.has(category.id);

    return (
      <div key={category.id} className="space-y-3">
        <button
          onClick={() => toggleCategory(category.id)}
          className={cn(
            "flex items-center gap-2 w-full px-4 py-3 rounded-lg transition-colors text-left",
            isExpanded ? "bg-primary/10 text-primary" : "bg-muted/50 hover:bg-muted"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="h-5 w-5 flex-shrink-0" />
          ) : (
            <ChevronUp className="h-5 w-5 flex-shrink-0 rotate-180" />
          )}
          <span className={cn("font-semibold text-lg", isUncategorized && "text-muted-foreground")}>
            {category.name}
          </span>
          <Badge variant="secondary" className="text-sm ml-auto">
            {categoryProducts.length} produto{categoryProducts.length !== 1 ? 's' : ''}
          </Badge>
        </button>

        {isExpanded && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {categoryProducts.map(renderProductCard)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-md md:max-w-7xl mx-auto space-y-4 px-4 md:px-0">
      {/* Search and Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar produto... (ex: acai encontra açaí)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
        <Button 
          size="icon" 
          className="h-12 w-12 shadow-md"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Expand/Collapse buttons */}
      {!hasSearchTerm && categoriesWithProducts.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {filteredProducts.length} produtos em {categoriesWithProducts.length + (productsByCategory["uncategorized"]?.length > 0 ? 1 : 0)} categorias
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={expandAll}
              className="h-8 text-xs"
            >
              Expandir todas
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={collapseAll}
              className="h-8 text-xs"
            >
              Recolher todas
            </Button>
          </div>
        </div>
      )}

      {/* Products List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
        </div>
      ) : hasSearchTerm ? (
        // Search mode: flat list
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map(renderProductCard)}
        </div>
      ) : (
        // Category mode
        <div className="space-y-4">
          {categoriesWithProducts.map((category) =>
            renderCategorySection(category)
          )}
          {productsByCategory["uncategorized"]?.length > 0 &&
            renderCategorySection({ id: "uncategorized", name: "Sem categoria" }, true)}
        </div>
      )}

      <AddProductDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <EditProductDialog 
        product={selectedProduct} 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
      />
    </div>
  );
}
