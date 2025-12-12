import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Search, Plus, Edit, Package, Loader2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AddProductDialog } from "@/components/products/AddProductDialog";
import { EditProductDialog } from "@/components/products/EditProductDialog";

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

export default function Produtos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
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

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (product: Product) => {
    if (!product.controls_stock) return null;
    if (!product.current_stock || product.current_stock === 0) return "out";
    const threshold = product.low_stock_threshold || 15;
    if (product.current_stock < threshold) return "low";
    return "ok";
  };

  return (
    <div className="max-w-md md:max-w-7xl mx-auto space-y-4 px-4 md:px-0">
      {/* Search and Add */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
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

      {/* Products List */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredProducts.map((product) => {
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
        })}
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
