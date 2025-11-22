import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, Plus, Minus, X, ShoppingCart, Loader2 } from "lucide-react";

interface AddItemsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comanda: any;
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export function AddItemsDialog({ open, onOpenChange, comanda }: AddItemsDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const queryClient = useQueryClient();

  // Buscar produtos ativos
  const { data: products } = useQuery({
    queryKey: ["products-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const addToCart = (product: any) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(cart.map((item) =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        quantity: 1,
      }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(cart.map((item) =>
      item.id === id
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const addItemsMutation = useMutation({
    mutationFn: async () => {
      // Adicionar itens à comanda
      const saleItems = cart.map((item) => ({
        sale_id: comanda.id,
        product_id: item.id,
        product_name: item.name,
        unit_price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Atualizar total da venda
      const newTotal = Number(comanda.total) + cartTotal;
      const newSubtotal = Number(comanda.subtotal) + cartTotal;

      const { error: updateError } = await supabase
        .from("sales")
        .update({
          total: newTotal,
          subtotal: newSubtotal,
        })
        .eq("id", comanda.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Itens adicionados à comanda!");
      queryClient.invalidateQueries({ queryKey: ["comandas-abertas"] });
      setCart([]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Erro ao adicionar itens:", error);
      toast.error("Erro ao adicionar itens");
    },
  });

  const handleSubmit = () => {
    if (cart.length === 0) {
      toast.error("Adicione pelo menos um item");
      return;
    }
    addItemsMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Itens - {comanda.notes || "Comanda"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid md:grid-cols-[1fr_300px] gap-4 overflow-hidden">
          {/* Produtos */}
          <div className="space-y-3 overflow-y-auto pr-2">
            <div className="relative sticky top-0 bg-background z-10 pb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => addToCart(product)}
                >
                  <div className="font-medium text-sm line-clamp-2 mb-2">
                    {product.name}
                  </div>
                  <div className="text-primary font-bold">
                    R$ {Number(product.price).toFixed(2)}
                  </div>
                  {product.controls_stock && (
                    <Badge variant="outline" className="mt-2 text-xs">
                      Estoque: {product.current_stock}
                    </Badge>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Carrinho */}
          <div className="border-l pl-4 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="h-5 w-5" />
              <h3 className="font-semibold">Itens ({cart.length})</h3>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto">
              {cart.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 text-sm font-medium line-clamp-2">
                      {item.name}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 -mt-1"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="font-medium w-8 text-center">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-sm font-bold">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {cart.length > 0 && (
              <div className="pt-3 border-t mt-3">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold">Total:</span>
                  <span className="text-xl font-bold text-primary">
                    R$ {cartTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={addItemsMutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={cart.length === 0 || addItemsMutation.isPending}
          >
            {addItemsMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Adicionar à Comanda
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
