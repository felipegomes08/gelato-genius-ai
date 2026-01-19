import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GripVertical, ChevronUp, ChevronDown, Save, Package, FolderTree } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

interface Product {
  id: string;
  name: string;
  sort_order: number;
  category: string;
}

export function MenuOrderSettings() {
  const queryClient = useQueryClient();
  const [categoriesOrder, setCategoriesOrder] = useState<Category[]>([]);
  const [productsOrder, setProductsOrder] = useState<Product[]>([]);
  const [hasChanges, setHasChanges] = useState({ categories: false, products: false });

  // Fetch categories
  const { isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories-order"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, sort_order")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      setCategoriesOrder(data || []);
      return data;
    },
  });

  // Fetch products
  const { isLoading: productsLoading } = useQuery({
    queryKey: ["products-order"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, sort_order, category")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      setProductsOrder(data || []);
      return data;
    },
  });

  // Save categories order
  const saveCategoriesMutation = useMutation({
    mutationFn: async (categories: Category[]) => {
      const updates = categories.map((cat, index) => ({
        id: cat.id,
        sort_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("categories")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories-order"] });
      queryClient.invalidateQueries({ queryKey: ["public-categories"] });
      setHasChanges((prev) => ({ ...prev, categories: false }));
      toast.success("Ordem das categorias salva!");
    },
    onError: () => {
      toast.error("Erro ao salvar ordem das categorias");
    },
  });

  // Save products order
  const saveProductsMutation = useMutation({
    mutationFn: async (products: Product[]) => {
      const updates = products.map((prod, index) => ({
        id: prod.id,
        sort_order: index + 1,
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from("products")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-order"] });
      queryClient.invalidateQueries({ queryKey: ["public-products"] });
      setHasChanges((prev) => ({ ...prev, products: false }));
      toast.success("Ordem dos produtos salva!");
    },
    onError: () => {
      toast.error("Erro ao salvar ordem dos produtos");
    },
  });

  const moveCategory = (index: number, direction: "up" | "down") => {
    const newOrder = [...categoriesOrder];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setCategoriesOrder(newOrder);
    setHasChanges((prev) => ({ ...prev, categories: true }));
  };

  const moveProduct = (index: number, direction: "up" | "down") => {
    const newOrder = [...productsOrder];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newOrder.length) return;
    
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setProductsOrder(newOrder);
    setHasChanges((prev) => ({ ...prev, products: true }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ordenação do Cardápio</CardTitle>
        <CardDescription>
          Defina a ordem de exibição das categorias e produtos no cardápio online
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="categories" className="flex items-center gap-2">
              <FolderTree className="h-4 w-4" />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produtos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-4 space-y-4">
            {categoriesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : categoriesOrder.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma categoria ativa encontrada
              </p>
            ) : (
              <>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {categoriesOrder.map((category, index) => (
                    <div
                      key={category.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border bg-card",
                        "transition-colors hover:bg-accent/50"
                      )}
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <span className="flex-1 font-medium truncate">{category.name}</span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveCategory(index, "up")}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveCategory(index, "down")}
                          disabled={index === categoriesOrder.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => saveCategoriesMutation.mutate(categoriesOrder)}
                  disabled={!hasChanges.categories || saveCategoriesMutation.isPending}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Ordem das Categorias
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="products" className="mt-4 space-y-4">
            {productsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : productsOrder.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum produto ativo encontrado
              </p>
            ) : (
              <>
                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                  {productsOrder.map((product, index) => (
                    <div
                      key={product.id}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border bg-card",
                        "transition-colors hover:bg-accent/50"
                      )}
                    >
                      <GripVertical className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        {index + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {product.category}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveProduct(index, "up")}
                          disabled={index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => moveProduct(index, "down")}
                          disabled={index === productsOrder.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                <Button
                  onClick={() => saveProductsMutation.mutate(productsOrder)}
                  disabled={!hasChanges.products || saveProductsMutation.isPending}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Ordem dos Produtos
                </Button>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
