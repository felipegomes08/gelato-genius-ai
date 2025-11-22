import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  current_stock: number | null;
  controls_stock: boolean;
  category: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  low_stock_threshold: number | null;
}

interface EditProductDialogProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProductDialog({ product, open, onOpenChange }: EditProductDialogProps) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [controlsStock, setControlsStock] = useState(false);
  const [currentStock, setCurrentStock] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (product) {
      setName(product.name);
      setPrice(product.price ? product.price.toString() : "");
      setCategory(product.category);
      setDescription(product.description || "");
      setControlsStock(product.controls_stock);
      setCurrentStock(product.current_stock?.toString() || "0");
      setLowStockThreshold(product.low_stock_threshold?.toString() || "15");
    }
  }, [product]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from("products")
        .update({
          name,
          price: price ? parseFloat(price) : null,
          category,
          description: description || null,
          controls_stock: controlsStock,
          current_stock: controlsStock ? parseInt(currentStock) : null,
          low_stock_threshold: controlsStock ? parseInt(lowStockThreshold) : null,
        })
        .eq("id", product.id);

      if (error) throw error;

      toast({
        title: "Produto atualizado",
        description: "As informações do produto foram atualizadas com sucesso.",
      });

      queryClient.invalidateQueries({ queryKey: ["products"] });
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating product:", error);
      toast({
        title: "Erro ao atualizar produto",
        description: "Ocorreu um erro ao atualizar o produto. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome do Produto *</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Camisa Polo"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-price">Preço (R$) - Opcional</Label>
            <Input
              id="edit-price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Deixe vazio para produtos no peso"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-category">Categoria *</Label>
            <Input
              id="edit-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ex: Roupas"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do produto (opcional)"
              rows={3}
            />
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-controls-stock" className="cursor-pointer">
                Controlar estoque
              </Label>
              <Switch
                id="edit-controls-stock"
                checked={controlsStock}
                onCheckedChange={setControlsStock}
              />
            </div>

            {controlsStock && (
              <div className="space-y-3 pl-4 border-l-2 border-border">
                <div className="space-y-2">
                  <Label htmlFor="edit-stock">Quantidade em Estoque *</Label>
                  <Input
                    id="edit-stock"
                    type="number"
                    min="0"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    placeholder="0"
                    required={controlsStock}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-threshold">Limiar de Estoque Baixo</Label>
                  <Input
                    id="edit-threshold"
                    type="number"
                    min="0"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    placeholder="15"
                  />
                  <p className="text-xs text-muted-foreground">
                    Você será alertado quando o estoque estiver abaixo deste valor
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
