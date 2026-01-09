import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ImagePlus, X } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { unformatCurrency, formatNumberToBRL } from "@/lib/formatters";
import { CategorySelect } from "@/components/categories/CategorySelect";

interface Product {
  id: string;
  name: string;
  price: number;
  current_stock: number | null;
  controls_stock: boolean;
  category: string;
  category_id?: string | null;
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
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [controlsStock, setControlsStock] = useState(false);
  const [currentStock, setCurrentStock] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (product) {
      setName(product.name);
      setPrice(product.price ? formatNumberToBRL(product.price) : "");
      setCategoryId(product.category_id || "");
      setDescription(product.description || "");
      setControlsStock(product.controls_stock);
      setCurrentStock(product.current_stock?.toString() || "0");
      setLowStockThreshold(product.low_stock_threshold?.toString() || "15");
      setExistingImageUrl(product.image_url);
      setImagePreview(product.image_url);
      setImageFile(null);
    }
  }, [product]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro",
          description: "A imagem deve ter no máximo 5MB",
          variant: "destructive",
        });
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) return;

    setIsLoading(true);

    try {
      let imageUrl: string | null = existingImageUrl;

      // Upload new image if selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast({
            title: "Erro ao fazer upload",
            description: "Não foi possível fazer upload da imagem",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }

        const { data: publicUrl } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl.publicUrl;
      }

      // If image was removed
      if (!imagePreview && !imageFile) {
        imageUrl = null;
      }

      const priceValue = price ? unformatCurrency(price) : null;

      const { error } = await supabase
        .from("products")
        .update({
          name,
          price: priceValue && priceValue > 0 ? priceValue : null,
          category_id: categoryId || null,
          description: description || null,
          image_url: imageUrl,
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
      queryClient.invalidateQueries({ queryKey: ["products-active"] });
      queryClient.invalidateQueries({ queryKey: ["category-product-counts"] });
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
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>Foto do Produto</Label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-24 h-24 object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-6 w-6"
                    onClick={removeImage}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-24 h-24 border-2 border-dashed rounded-lg flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <ImagePlus className="h-6 w-6 mb-1" />
                  <span className="text-xs">Adicionar</span>
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

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
            <CurrencyInput
              id="edit-price"
              value={price}
              onChange={setPrice}
              placeholder="Deixe vazio para produtos no peso"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-category">Categoria</Label>
            <CategorySelect
              value={categoryId}
              onValueChange={setCategoryId}
              placeholder="Selecione uma categoria"
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
