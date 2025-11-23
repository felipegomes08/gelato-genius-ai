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
  id: string;           // ID do produto (para controle de estoque)
  cartItemId: string;   // ID único do item no carrinho
  name: string;
  price: number | null;
  quantity: number;
  customPrice?: number;
}

export function AddItemsDialog({ open, onOpenChange, comanda }: AddItemsDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState("");
  
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
    // Se o produto não tiver preço, SEMPRE cria um novo item separado
    if (!product.price) {
      const newItem: CartItem = {
        id: product.id,
        cartItemId: crypto.randomUUID(),
        name: product.name,
        price: null,
        quantity: 1,
        customPrice: 0,
      };
      setCart([...cart, newItem]);
      setEditingPrice(newItem.cartItemId);
      setTempPrice("");
      return;
    }

    // Para produtos com preço fixo, incrementa quantidade se já existe
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(cart.map((item) =>
        item.cartItemId === existingItem.cartItemId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        id: product.id,
        cartItemId: crypto.randomUUID(),
        name: product.name,
        price: Number(product.price),
        quantity: 1,
      }]);
    }
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart(cart.map((item) =>
      item.cartItemId === cartItemId
        ? { ...item, quantity: Math.max(1, item.quantity + delta) }
        : item
    ));
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(cart.filter((item) => item.cartItemId !== cartItemId));
    if (editingPrice === cartItemId) {
      setEditingPrice(null);
    }
  };

  const updateCustomPrice = (cartItemId: string, price: number) => {
    setCart(cart.map((item) =>
      item.cartItemId === cartItemId
        ? { ...item, customPrice: price }
        : item
    ));
    setEditingPrice(null);
  };

  const getItemPrice = (item: CartItem) => {
    return item.price !== null ? item.price : (item.customPrice || 0);
  };

  const cartTotal = cart.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);

  const addItemsMutation = useMutation({
    mutationFn: async () => {
      // Validar que todos os itens sem preço tenham preço customizado
      const invalidItems = cart.filter(item => item.price === null && !item.customPrice);
      if (invalidItems.length > 0) {
        throw new Error("Defina o preço para todos os itens");
      }

      // Adicionar itens à comanda
      const saleItems = cart.map((item) => {
        const finalPrice = getItemPrice(item);
        return {
          sale_id: comanda.id,
          product_id: item.id,
          product_name: item.name,
          unit_price: finalPrice,
          quantity: item.quantity,
          subtotal: finalPrice * item.quantity,
        };
      });

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
      // Invalidar todas as queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["comandas-abertas"] });
      queryClient.invalidateQueries({ queryKey: ["products-active"] });
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
                    {product.price ? (
                      `R$ ${Number(product.price).toFixed(2)}`
                    ) : (
                      <span className="text-muted-foreground text-xs">Preço no peso</span>
                    )}
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
                <Card key={item.cartItemId} className="p-3">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium line-clamp-2">
                        {item.name}
                      </div>
                      {item.price === null && (
                        <Badge variant="secondary" className="mt-1 text-xs">No peso</Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 -mt-1"
                      onClick={() => removeFromCart(item.cartItemId)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {/* Campo de preço customizado para produtos sem preço */}
                  {item.price === null && editingPrice === item.cartItemId ? (
                    <div className="mb-2">
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Digite o preço (R$)"
                        value={tempPrice}
                        onChange={(e) => setTempPrice(e.target.value)}
                        onBlur={() => {
                          if (tempPrice && Number(tempPrice) > 0) {
                            updateCustomPrice(item.cartItemId, Number(tempPrice));
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && tempPrice && Number(tempPrice) > 0) {
                            updateCustomPrice(item.cartItemId, Number(tempPrice));
                          }
                        }}
                        autoFocus
                        className="h-8 text-sm"
                      />
                    </div>
                  ) : item.price === null && !item.customPrice ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mb-2 w-full text-xs"
                      onClick={() => {
                        setEditingPrice(item.cartItemId);
                        setTempPrice("");
                      }}
                    >
                      ⚠️ Definir Preço
                    </Button>
                  ) : null}

                  <div className="flex items-center justify-between">
                    {/* Mostrar controles de quantidade apenas para produtos com preço fixo */}
                    {item.price !== null ? (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.cartItemId, -1)}
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="font-medium w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateQuantity(item.cartItemId, 1)}
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">1 unidade</div>
                    )}
                    <div className="text-sm font-bold">
                      {item.price === null && !item.customPrice ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        `R$ ${(getItemPrice(item) * item.quantity).toFixed(2)}`
                      )}
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
