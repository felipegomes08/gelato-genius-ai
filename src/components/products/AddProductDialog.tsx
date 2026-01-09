import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, ImagePlus, X } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { CurrencyInput } from "@/components/ui/currency-input";
import { unformatCurrency } from "@/lib/formatters";
import { CategorySelect } from "@/components/categories/CategorySelect";

const productSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(100, "Nome deve ter no máximo 100 caracteres"),
  price: z.string().optional(),
  category_id: z.string().optional(),
  description: z.string()
    .trim()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .optional(),
  controls_stock: z.boolean().default(true),
  current_stock: z.string().optional(),
  low_stock_threshold: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

interface AddProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddProductDialog({ open, onOpenChange }: AddProductDialogProps) {
  const queryClient = useQueryClient();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      price: "",
      category_id: "",
      description: "",
      controls_stock: true,
      current_stock: "0",
      low_stock_threshold: "15",
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("A imagem deve ter no máximo 5MB");
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const controlsStock = form.watch("controls_stock");

  const onSubmit = async (data: ProductFormData) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("Você precisa estar autenticado");
        return;
      }

      let imageUrl: string | null = null;

      // Upload image if exists
      if (imageFile) {
        setUploadingImage(true);
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile);

        if (uploadError) {
          console.error('Upload error:', uploadError);
          toast.error("Erro ao fazer upload da imagem");
          setUploadingImage(false);
          return;
        }

        const { data: publicUrl } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);
        
        imageUrl = publicUrl.publicUrl;
        setUploadingImage(false);
      }

      const priceValue = data.price ? unformatCurrency(data.price) : null;

      const { error } = await supabase.from("products").insert({
        name: data.name,
        price: priceValue && priceValue > 0 ? priceValue : null,
        category: "",
        category_id: data.category_id || null,
        description: data.description || null,
        image_url: imageUrl,
        controls_stock: data.controls_stock,
        current_stock: data.controls_stock ? Number(data.current_stock || 0) : null,
        low_stock_threshold: data.controls_stock ? Number(data.low_stock_threshold || 15) : null,
        is_active: true,
        created_by: user.id,
      });

      if (error) throw error;

      toast.success("Produto adicionado com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ["products"] });
      await queryClient.invalidateQueries({ queryKey: ["products-active"] });
      await queryClient.invalidateQueries({ queryKey: ["category-product-counts"] });
      form.reset();
      removeImage();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao adicionar produto");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar Produto</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <FormLabel>Foto do Produto</FormLabel>
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

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Produto</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Casquinha Pequena" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$) - Opcional</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        placeholder="Deixe vazio para produtos no peso"
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <FormControl>
                      <CategorySelect
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        placeholder="Selecione..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o produto..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="controls_stock"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Controlar Estoque</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Ativar controle de quantidade em estoque
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {controlsStock && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <FormField
                  control={form.control}
                  name="current_stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantidade Inicial</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="low_stock_threshold"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Limiar Estoque Baixo</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="15"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  removeImage();
                  onOpenChange(false);
                }}
                disabled={form.formState.isSubmitting || uploadingImage}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting || uploadingImage}>
                {(form.formState.isSubmitting || uploadingImage) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Adicionar
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
