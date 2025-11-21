import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SelectCustomerDialog } from "@/components/sales/SelectCustomerDialog";
import { ManualDiscountDialog } from "@/components/sales/ManualDiscountDialog";
import { LoyaltyCouponDialog } from "@/components/sales/LoyaltyCouponDialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Search, Plus, Minus, X, User, Percent, Banknote, Smartphone, CreditCard, Sparkles, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  controls_stock: boolean;
  current_stock: number | null;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
}

interface ManualDiscount {
  type: "percentage" | "fixed";
  value: number;
}

export default function Vendas() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [manualDiscount, setManualDiscount] = useState<ManualDiscount | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "pix" | "debit" | "credit" | null>(null);
  
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [loyaltyCouponDialogOpen, setLoyaltyCouponDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const queryClient = useQueryClient();

  // Carregar produtos do banco
  const { data: products, isLoading } = useQuery({
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
  });

  const filteredProducts = products?.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const addToCart = (product: typeof products[0]) => {
    const existingItem = cart.find((item) => item.id === product.id);
    
    // Verificar estoque
    if (product.controls_stock && product.current_stock !== null) {
      const currentCartQuantity = existingItem ? existingItem.quantity : 0;
      if (currentCartQuantity >= product.current_stock) {
        toast.error("Estoque insuficiente");
        return;
      }
    }

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { 
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        controls_stock: product.controls_stock,
        current_stock: product.current_stock,
      }]);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    const newQuantity = item.quantity + delta;

    // Verificar estoque
    if (item.controls_stock && item.current_stock !== null && newQuantity > item.current_stock) {
      toast.error("Estoque insuficiente");
      return;
    }

    setCart(
      cart
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, newQuantity) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // Cálculos
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  
  const couponDiscount = selectedCoupon
    ? selectedCoupon.discount_type === "percentage"
      ? (subtotal * selectedCoupon.discount_value) / 100
      : selectedCoupon.discount_value
    : 0;

  const manualDiscountAmount = manualDiscount
    ? manualDiscount.type === "percentage"
      ? (subtotal * manualDiscount.value) / 100
      : manualDiscount.value
    : 0;

  const totalDiscount = couponDiscount + manualDiscountAmount;
  const total = Math.max(0, subtotal - totalDiscount);

  const getSuggestedCouponValue = () => {
    return total <= 30 ? 5 : 10;
  };

  const paymentMethodLabels = {
    cash: "Dinheiro",
    pix: "PIX",
    debit: "Cartão Débito",
    credit: "Cartão Crédito",
  };

  const paymentMethodIcons = {
    cash: Banknote,
    pix: Smartphone,
    debit: CreditCard,
    credit: CreditCard,
  };

  // Confirmar venda
  const confirmSaleMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Carrinho vazio");
      if (!paymentMethod) throw new Error("Selecione a forma de pagamento");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      setIsProcessing(true);

      // 1. Criar registro de venda
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          customer_id: selectedCustomer?.id || null,
          subtotal: subtotal,
          discount_amount: totalDiscount,
          coupon_id: selectedCoupon?.id || null,
          total: total,
          payment_method: paymentMethod,
          status: "completed",
          created_by: user.id,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // 2. Criar itens da venda
      const saleItems = cart.map((item) => ({
        sale_id: sale.id,
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

      // 3. Atualizar estoque e criar movimentações
      for (const item of cart) {
        if (item.controls_stock && item.current_stock !== null) {
          const newStock = item.current_stock - item.quantity;

          const { error: stockError } = await supabase
            .from("products")
            .update({ current_stock: newStock })
            .eq("id", item.id);

          if (stockError) throw stockError;

          const { error: movementError } = await supabase
            .from("stock_movements")
            .insert({
              product_id: item.id,
              movement_type: "sale",
              quantity: -item.quantity,
              previous_stock: item.current_stock,
              new_stock: newStock,
              reference_id: sale.id,
              reason: "Venda registrada",
              created_by: user.id,
            });

          if (movementError) throw movementError;
        }
      }

      // 4. Marcar cupom como usado
      if (selectedCoupon) {
        const { error: couponError } = await supabase
          .from("coupons")
          .update({
            is_used: true,
            used_at: new Date().toISOString(),
          })
          .eq("id", selectedCoupon.id);

        if (couponError) throw couponError;
      }

      // 5. Criar transação financeira
      const { error: transactionError } = await supabase
        .from("financial_transactions")
        .insert({
          transaction_type: "income",
          description: `Venda #${sale.id.slice(0, 8)}${selectedCustomer ? ` - ${selectedCustomer.name}` : ""}`,
          category: "Vendas",
          amount: total,
          transaction_date: new Date().toISOString(),
          reference_id: sale.id,
          notes: `Forma de pagamento: ${paymentMethodLabels[paymentMethod]}`,
          created_by: user.id,
        });

      if (transactionError) throw transactionError;

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-active"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      
      toast.success("Venda registrada com sucesso!");
      
      // Limpar tudo
      setCart([]);
      setSelectedCustomer(null);
      setSelectedCoupon(null);
      setManualDiscount(null);
      setPaymentMethod(null);
      setSearchTerm("");
      setIsProcessing(false);
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      toast.error(error.message || "Erro ao registrar venda");
    },
  });

  const createLoyaltyCouponMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomer) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
    const couponValue = getSuggestedCouponValue();
    const code = `FIDELIDADE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 7);
      
      const { error } = await supabase
        .from("coupons")
        .insert({
          customer_id: selectedCustomer.id,
          code: code,
          discount_type: "fixed",
          discount_value: couponValue,
          expire_at: expireDate.toISOString(),
          is_active: true,
          created_by: user.id,
        });
      
      if (error) throw error;
      
      return { code, value: couponValue };
    },
    onSuccess: (data) => {
      toast.success(`Cupom ${data?.code} de R$ ${data?.value} criado com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["customer-coupons"] });
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar cupom: " + error.message);
    },
  });

  const handleConfirmSale = () => {
    if (cart.length === 0) {
      toast.error("Adicione produtos ao carrinho");
      return;
    }
    if (!paymentMethod) {
      toast.error("Selecione a forma de pagamento");
      return;
    }
    
    // Se tem cliente, mostrar sugestão de cupom de fidelidade
    if (selectedCustomer) {
      setLoyaltyCouponDialogOpen(true);
    } else {
      // Sem cliente, confirmar direto
      confirmSaleMutation.mutate();
    }
  };

  const handleConfirmWithCoupon = async () => {
    setLoyaltyCouponDialogOpen(false);
    await createLoyaltyCouponMutation.mutateAsync();
    confirmSaleMutation.mutate();
  };

  const handleConfirmWithoutCoupon = () => {
    setLoyaltyCouponDialogOpen(false);
    confirmSaleMutation.mutate();
  };

  const handleSelectCustomer = (customer: Customer, coupon?: Coupon) => {
    setSelectedCustomer(customer);
    if (coupon) {
      setSelectedCoupon(coupon);
    }
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

        {/* Products Grid - Always Visible */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Produtos</h2>
            <span className="text-sm text-muted-foreground">
              {filteredProducts.length} disponíveis
            </span>
          </div>
          
          {isLoading ? (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">Carregando produtos...</p>
            </Card>
          ) : filteredProducts.length > 0 ? (
            <ScrollArea className="h-64">
              <div className="grid grid-cols-2 gap-2 pr-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addToCart(product)}
                    className="group relative flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-accent/50 hover:border-primary/50 transition-all text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-tight line-clamp-2">
                          {product.name}
                        </p>
                        {product.controls_stock && (
                          <Badge 
                            variant={product.current_stock && product.current_stock > 0 ? "secondary" : "destructive"}
                            className="mt-1 text-xs h-5"
                          >
                            Est: {product.current_stock || 0}
                          </Badge>
                        )}
                      </div>
                      <ShoppingCart className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <p className="font-bold text-primary">
                      R$ {product.price.toFixed(2)}
                    </p>
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">
                {searchTerm ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"}
              </p>
            </Card>
          )}
        </div>

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
              <p className="text-muted-foreground">Nenhum produto adicionado</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {cart.map((item) => (
                <Card key={item.id} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm flex-1">{item.name}</span>
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
            {/* Customer & Discount buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => setCustomerDialogOpen(true)}
              >
                <User className="h-4 w-4 mr-2" />
                {selectedCustomer ? (
                  <span className="flex items-center gap-1">
                    {selectedCustomer.name}
                    {selectedCoupon && <Sparkles className="h-3 w-3 text-primary" />}
                  </span>
                ) : (
                  "Cliente"
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 h-11"
                onClick={() => setDiscountDialogOpen(true)}
              >
                <Percent className="h-4 w-4 mr-2" />
                {manualDiscount ? `R$ ${manualDiscountAmount.toFixed(2)}` : "Desconto"}
              </Button>
            </div>

            {/* Customer/Coupon/Discount info */}
            {(selectedCustomer || selectedCoupon || manualDiscount) && (
              <Card className="p-3 space-y-2 text-sm">
                {selectedCustomer && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cliente:</span>
                    <div className="flex items-center gap-2">
                      <span>{selectedCustomer.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setSelectedCoupon(null);
                        }}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {selectedCoupon && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cupom:</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="font-mono">
                        {selectedCoupon.code}
                      </Badge>
                      <span className="text-destructive">
                        -R$ {couponDiscount.toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setSelectedCoupon(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
                {manualDiscount && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Desconto Manual:</span>
                    <div className="flex items-center gap-2">
                      <span className="text-destructive">
                        -R$ {manualDiscountAmount.toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setManualDiscount(null)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Payment Method Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Forma de Pagamento</label>
              <ToggleGroup
                type="single"
                value={paymentMethod || ""}
                onValueChange={(value) => {
                  if (value) {
                    setPaymentMethod(value as "cash" | "pix" | "debit" | "credit");
                  }
                }}
                className="grid grid-cols-2 gap-2"
              >
                <ToggleGroupItem
                  value="cash"
                  className="h-16 flex flex-col gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  <Banknote className="h-5 w-5" />
                  <span className="text-xs">Dinheiro</span>
                </ToggleGroupItem>

                <ToggleGroupItem
                  value="pix"
                  className="h-16 flex flex-col gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  <Smartphone className="h-5 w-5" />
                  <span className="text-xs">PIX</span>
                </ToggleGroupItem>

                <ToggleGroupItem
                  value="debit"
                  className="h-16 flex flex-col gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="text-xs">Débito</span>
                </ToggleGroupItem>

                <ToggleGroupItem
                  value="credit"
                  className="h-16 flex flex-col gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  <CreditCard className="h-5 w-5" />
                  <span className="text-xs">Crédito</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            {/* Total */}
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                {(couponDiscount > 0 || manualDiscountAmount > 0) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Desconto Total</span>
                    <span className="text-destructive">
                      -R$ {totalDiscount.toFixed(2)}
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
              disabled={!paymentMethod || isProcessing}
              className="w-full h-14 text-lg font-semibold shadow-md"
            >
              {isProcessing ? "Processando..." : "Confirmar Venda"}
            </Button>
          </div>
        )}
      </main>

      <BottomNav />

      {/* Dialogs */}
      <SelectCustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onSelectCustomer={handleSelectCustomer}
      />

      <ManualDiscountDialog
        open={discountDialogOpen}
        onOpenChange={setDiscountDialogOpen}
        subtotal={subtotal}
        onApplyDiscount={setManualDiscount}
      />

      <LoyaltyCouponDialog
        open={loyaltyCouponDialogOpen}
        onOpenChange={setLoyaltyCouponDialogOpen}
        customerName={selectedCustomer?.name || ""}
        suggestedValue={getSuggestedCouponValue()}
        onConfirmWithCoupon={handleConfirmWithCoupon}
        onConfirmWithoutCoupon={handleConfirmWithoutCoupon}
      />
    </div>
  );
}
