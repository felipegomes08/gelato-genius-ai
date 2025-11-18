import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Plus, Minus, X, User, Percent } from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

const mockProducts = [
  { id: "1", name: "Casquinha Pequena", price: 6.0 },
  { id: "2", name: "Casquinha Média", price: 8.0 },
  { id: "3", name: "Casquinha Grande", price: 10.0 },
  { id: "4", name: "Milkshake Chocolate", price: 15.0 },
  { id: "5", name: "Sundae Morango", price: 15.0 },
];

export default function Vendas() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [discount, setDiscount] = useState(0);

  const filteredProducts = mockProducts.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addToCart = (product: typeof mockProducts[0]) => {
    const existingItem = cart.find((item) => item.id === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(
      cart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const discountAmount = (subtotal * discount) / 100;
  const total = subtotal - discountAmount;

  const handleConfirmSale = () => {
    if (cart.length === 0) {
      toast.error("Adicione produtos ao carrinho");
      return;
    }
    toast.success("Venda registrada com sucesso!");
    setCart([]);
    setDiscount(0);
    setSearchTerm("");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="PDV - Vendas" />

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12"
          />
        </div>

        {/* Products Quick Add */}
        {searchTerm && (
          <Card className="p-3 space-y-2 max-h-48 overflow-y-auto">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => {
                  addToCart(product);
                  setSearchTerm("");
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
              >
                <span className="font-medium text-sm">{product.name}</span>
                <span className="font-semibold text-primary">
                  R$ {product.price.toFixed(2)}
                </span>
              </button>
            ))}
          </Card>
        )}

        {/* Cart */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Carrinho</h2>
            <span className="text-sm text-muted-foreground">
              {cart.length} {cart.length === 1 ? "item" : "itens"}
            </span>
          </div>

          {cart.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                Nenhum produto adicionado
              </p>
            </Card>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm flex-1">
                      {item.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(item.id)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.id, -1)}
                        className="h-8 w-8"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-semibold">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateQuantity(item.id, 1)}
                        className="h-8 w-8"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-semibold">
                      R$ {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {cart.length > 0 && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11">
                <User className="h-4 w-4 mr-2" />
                Cliente
              </Button>
              <Button variant="outline" className="flex-1 h-11">
                <Percent className="h-4 w-4 mr-2" />
                Desconto
              </Button>
            </div>

            {/* Total */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Desconto ({discount}%)
                    </span>
                    <span className="text-destructive">
                      -R$ {discountAmount.toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold pt-2 border-t">
                  <span>Total</span>
                  <span className="text-primary">R$ {total.toFixed(2)}</span>
                </div>
              </div>
            </Card>

            <Button
              onClick={handleConfirmSale}
              className="w-full h-14 text-lg font-semibold shadow-md"
            >
              Confirmar Venda
            </Button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
