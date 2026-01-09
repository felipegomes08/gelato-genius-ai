import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { unformatCurrency, formatNumberToBRL } from "@/lib/formatters";

import { SelectCustomerDialog } from "@/components/sales/SelectCustomerDialog";
import { ManualDiscountDialog } from "@/components/sales/ManualDiscountDialog";
import { LoyaltyCouponDialog } from "@/components/sales/LoyaltyCouponDialog";
import { EditCouponMessageDialog } from "@/components/sales/EditCouponMessageDialog";
import { CheckoutSummary } from "@/components/sales/CheckoutSummary";
import { PaymentMethodSelector } from "@/components/sales/PaymentMethodSelector";
import { SalesProductGrid } from "@/components/sales/SalesProductGrid";
import { Plus, Minus, X, User, Percent, Sparkles, Package } from "lucide-react";
import { toast } from "sonner";
import { generateCouponMessage } from "@/lib/couponMessages";
import { useAppSettings } from "@/hooks/useAppSettings";

interface CartItem {
  id: string;
  cartItemId: string;
  name: string;
  price: number | null;
  quantity: number;
  controls_stock: boolean;
  current_stock: number | null;
  customPrice?: number;
  image_url?: string | null;
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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [manualDiscount, setManualDiscount] = useState<ManualDiscount | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "pix" | "pix_chave" | "debit" | "credit" | "ifood" | null>(null);
  
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [loyaltyCouponDialogOpen, setLoyaltyCouponDialogOpen] = useState(false);
  const [editMessageDialogOpen, setEditMessageDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState<string>("");
  
  const [pendingWhatsAppData, setPendingWhatsAppData] = useState<{
    phone: string;
    message: string;
  } | null>(null);

  const queryClient = useQueryClient();
  const { settings, getSuggestedCouponValue, getMinPurchase } = useAppSettings();

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

  const addToCart = (product: typeof products[0]) => {
    // Para produtos no peso, sempre criar um novo item (não incrementar quantidade)
    if (product.price === null) {
      const cartItemId = `${product.id}-${Date.now()}-${Math.random()}`;
      const newItem: CartItem = { 
        id: product.id,
        cartItemId: cartItemId,
        name: product.name,
        price: product.price,
        quantity: 1,
        controls_stock: product.controls_stock,
        current_stock: product.current_stock,
        customPrice: 0,
        image_url: product.image_url,
      };
      
      setCart([...cart, newItem]);
      setEditingPriceId(cartItemId);
      setTempPrice("");
      return;
    }

    // Para produtos com preço fixo, incrementar quantidade se já existe
    const existingItem = cart.find((item) => item.id === product.id && item.price !== null);
    
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
          item.cartItemId === existingItem.cartItemId
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      const cartItemId = `${product.id}-${Date.now()}-${Math.random()}`;
      const newItem: CartItem = { 
        id: product.id,
        cartItemId: cartItemId,
        name: product.name,
        price: product.price,
        quantity: 1,
        controls_stock: product.controls_stock,
        current_stock: product.current_stock,
        image_url: product.image_url,
      };
      setCart([...cart, newItem]);
    }
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    const item = cart.find(i => i.cartItemId === cartItemId);
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
          item.cartItemId === cartItemId
            ? { ...item, quantity: Math.max(0, newQuantity) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(cart.filter((item) => item.cartItemId !== cartItemId));
    if (editingPriceId === cartItemId) {
      setEditingPriceId(null);
      setTempPrice("");
    }
  };

  const updateCustomPrice = (cartItemId: string) => {
    const priceValue = parseFloat(tempPrice);
    if (isNaN(priceValue) || priceValue <= 0) {
      toast.error("Digite um valor válido");
      return;
    }

    setCart(cart.map((item) =>
      item.cartItemId === cartItemId
        ? { ...item, customPrice: priceValue }
        : item
    ));
    setEditingPriceId(null);
    setTempPrice("");
    toast.success("Preço definido!");
  };

  const getItemPrice = (item: CartItem): number => {
    return item.price !== null ? item.price : (item.customPrice || 0);
  };

  // Cálculos
  const subtotal = cart.reduce((sum, item) => sum + getItemPrice(item) * item.quantity, 0);
  
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


  const paymentMethodLabels = {
    cash: "Dinheiro",
    pix: "PIX",
    debit: "Cartão Débito",
    credit: "Cartão Crédito",
  };

  const clearSaleState = () => {
    setCart([]);
    setSelectedCustomer(null);
    setSelectedCoupon(null);
    setManualDiscount(null);
    setPaymentMethod(null);
    setIsProcessing(false);
  };

  // Confirmar venda
  const confirmSaleMutation = useMutation({
    mutationFn: async () => {
      if (cart.length === 0) throw new Error("Carrinho vazio");
      if (!paymentMethod) throw new Error("Selecione a forma de pagamento");

      // Validar preços de produtos no peso
      const itemsWithoutPrice = cart.filter(item => item.price === null && (!item.customPrice || item.customPrice <= 0));
      if (itemsWithoutPrice.length > 0) {
        throw new Error("Defina o preço de todos os produtos no peso");
      }

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
        unit_price: getItemPrice(item),
        quantity: item.quantity,
        subtotal: getItemPrice(item) * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // 3. Atualizar estoque e criar movimentações
      // Agregar itens por product_id para evitar múltiplas atualizações
      const productQuantities = new Map<string, { quantity: number; controls_stock: boolean }>();
      
      for (const item of cart) {
        const existing = productQuantities.get(item.id);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          productQuantities.set(item.id, {
            quantity: item.quantity,
            controls_stock: item.controls_stock,
          });
        }
      }

      // Atualizar estoque para cada produto único
      for (const [productId, { quantity, controls_stock }] of productQuantities) {
        if (controls_stock) {
          // Buscar estoque atual do banco
          const { data: product, error: fetchError } = await supabase
            .from("products")
            .select("current_stock")
            .eq("id", productId)
            .single();

          if (fetchError) throw fetchError;
          if (product.current_stock === null) continue;

          const previousStock = product.current_stock;
          const newStock = previousStock - quantity;

          const { error: stockError } = await supabase
            .from("products")
            .update({ current_stock: newStock })
            .eq("id", productId);

          if (stockError) throw stockError;

          const { error: movementError } = await supabase
            .from("stock_movements")
            .insert({
              product_id: productId,
              movement_type: "sale",
              quantity: -quantity,
              previous_stock: previousStock,
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
          payment_method: paymentMethod,
          transaction_date: new Date().toISOString(),
          reference_id: sale.id,
          created_by: user.id,
        });

      if (transactionError) throw transactionError;

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products-active"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      
      // NÃO invalidar customer-coupons aqui - será feito após decisão do cupom
      
      // Gerar cupom de fidelidade se tiver cliente
      if (selectedCustomer) {
        setLoyaltyCouponDialogOpen(true);
      } else {
        // Toast quando não tem cupom e limpa tudo agora
        toast.success("Venda registrada com sucesso!");
        clearSaleState();
      }
    },
    onError: (error: Error) => {
      setIsProcessing(false);
      toast.error(error.message || "Erro ao registrar venda");
    },
  });

  const createLoyaltyCouponMutation = useMutation({
    mutationFn: async (generateCoupon: boolean) => {
      if (!generateCoupon || !selectedCustomer) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      
      const couponValue = getSuggestedCouponValue(total);
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
      
      // Gerar mensagem usando template
      if (!selectedCustomer.phone) {
        toast.warning("Cupom criado, mas cliente sem telefone cadastrado");
        return null;
      }

      const message = generateCouponMessage(
        selectedCustomer.name,
        couponValue,
        expireDate.toISOString(),
        {
          message5: settings.couponMessage5,
          message10: settings.couponMessage10,
          minPurchase5: settings.couponRules.minPurchase5,
          minPurchase10: settings.couponRules.minPurchase10,
        }
      );

      return {
        phone: selectedCustomer.phone,
        message: message,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customer-coupons"] });
      
      if (data?.phone) {
        // Tem telefone: abre dialog de editar mensagem
        setPendingWhatsAppData(data);
        setEditMessageDialogOpen(true);
        setLoyaltyCouponDialogOpen(false);
      } else {
        // Não tem telefone: apenas fecha tudo
        setLoyaltyCouponDialogOpen(false);
        toast.success("Venda registrada e cupom criado!");
        clearSaleState();
      }
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
    
    // Confirmar venda direto (o cupom será oferecido após a venda)
    confirmSaleMutation.mutate();
  };

  const handleConfirmWithCoupon = () => {
    // Verificar telefone antes de criar cupom
    if (!selectedCustomer?.phone) {
      toast.error("Cliente não possui telefone cadastrado");
      setLoyaltyCouponDialogOpen(false);
      toast.success("Venda registrada com sucesso!");
      clearSaleState();
      return;
    }
    
    createLoyaltyCouponMutation.mutate(true);
  };

  const handleConfirmWithoutCoupon = () => {
    setLoyaltyCouponDialogOpen(false);
    toast.success("Venda registrada com sucesso!");
    clearSaleState();
  };

  const handleSelectCustomer = (customer: Customer, coupon?: Coupon) => {
    setSelectedCustomer(customer);
    if (coupon) {
      setSelectedCoupon(coupon);
    }
  };

  return (
    <div className="max-w-md md:max-w-7xl mx-auto space-y-3 md:pb-0 px-4 md:px-0">
        {/* Desktop: Split view - Produtos + Carrinho lado a lado */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Produtos (2 colunas em desktop) */}
        <div className="lg:col-span-2">
          <SalesProductGrid
            products={products || []}
            onProductClick={addToCart}
            isLoading={isLoading}
          />
        </div>

        {/* Carrinho (1 coluna fixa à direita em desktop) */}
        <div className="lg:col-span-1 space-y-3">
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
                  <Card key={item.cartItemId} className="p-3">
                    <div className="flex items-start gap-3 mb-2">
                      {/* Product image */}
                      <div className="w-12 h-12 rounded-md bg-muted flex-shrink-0 overflow-hidden">
                        {item.image_url ? (
                          <img 
                            src={item.image_url} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 flex items-start justify-between">
                        <div className="flex-1 flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{item.name}</span>
                          {item.price === null && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">No peso</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.cartItemId)}
                          className="h-8 w-8 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Campo de preço manual para produtos no peso */}
                    {item.price === null && (
                      <div className="mb-2">
                        {editingPriceId === item.cartItemId ? (
                          <div className="flex gap-2">
                            <CurrencyInput
                              placeholder="Digite o preço"
                              value={tempPrice}
                              onChange={setTempPrice}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  const priceValue = unformatCurrency(tempPrice);
                                  if (priceValue > 0) {
                                    setCart(cart.map((i) =>
                                      i.cartItemId === item.cartItemId
                                        ? { ...i, customPrice: priceValue }
                                        : i
                                    ));
                                    setEditingPriceId(null);
                                    setTempPrice("");
                                  }
                                }
                              }}
                              onBlur={() => {
                                const priceValue = unformatCurrency(tempPrice);
                                if (priceValue > 0) {
                                  setCart(cart.map((i) =>
                                    i.cartItemId === item.cartItemId
                                      ? { ...i, customPrice: priceValue }
                                      : i
                                  ));
                                  setEditingPriceId(null);
                                  setTempPrice("");
                                }
                              }}
                              className="h-8"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={() => {
                                const priceValue = unformatCurrency(tempPrice);
                                if (priceValue > 0) {
                                  setCart(cart.map((i) =>
                                    i.cartItemId === item.cartItemId
                                      ? { ...i, customPrice: priceValue }
                                      : i
                                  ));
                                  setEditingPriceId(null);
                                  setTempPrice("");
                                }
                              }}
                              className="h-8"
                            >
                              OK
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingPriceId(item.cartItemId);
                              setTempPrice(item.customPrice ? formatNumberToBRL(item.customPrice) : "");
                            }}
                            className="w-full h-8 text-xs"
                          >
                            {item.customPrice && item.customPrice > 0
                              ? `R$ ${formatNumberToBRL(item.customPrice)}`
                              : "⚠️ Definir Preço"}
                          </Button>
                        )}
                      </div>
                    )}
                    
                    {/* Controles de quantidade apenas para produtos com preço fixo */}
                    {item.price !== null ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => updateQuantity(item.cartItemId, -1)}
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
                            onClick={() => updateQuantity(item.cartItemId, 1)}
                            className="h-8 w-8"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <span className="font-semibold">
                          R$ {(getItemPrice(item) * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end">
                        <span className="font-semibold">
                          {getItemPrice(item) > 0 
                            ? `R$ ${getItemPrice(item).toFixed(2)}`
                            : "R$ -"}
                        </span>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
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

            {/* Payment Method Selector */}
            <PaymentMethodSelector
              value={paymentMethod}
              onChange={setPaymentMethod}
            />

            {/* Checkout Summary */}
            <CheckoutSummary
              subtotal={subtotal}
              couponDiscount={couponDiscount}
              manualDiscountAmount={manualDiscountAmount}
            />

            <Button
              onClick={handleConfirmSale}
              disabled={!paymentMethod || isProcessing}
              className="w-full h-14 text-lg font-semibold shadow-md"
            >
              {isProcessing ? "Processando..." : "Confirmar Venda"}
            </Button>
          </div>
        )}
      </div>

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
        suggestedValue={getSuggestedCouponValue(total)}
        onConfirmWithCoupon={handleConfirmWithCoupon}
        onConfirmWithoutCoupon={handleConfirmWithoutCoupon}
      />

      <EditCouponMessageDialog
        open={editMessageDialogOpen}
        onOpenChange={(open) => {
          setEditMessageDialogOpen(open);
          
          // Se usuário cancelar, fecha tudo mesmo assim
          if (!open) {
            toast.success("Venda registrada com sucesso!");
            clearSaleState();
          }
        }}
        initialMessage={pendingWhatsAppData?.message || ""}
        customerPhone={pendingWhatsAppData?.phone || ""}
        onConfirm={(editedMessage) => {
          if (pendingWhatsAppData?.phone) {
            const whatsappUrl = `https://wa.me/55${pendingWhatsAppData.phone.replace(/\D/g, "")}?text=${encodeURIComponent(editedMessage)}`;
            window.open(whatsappUrl, "_blank");
            setPendingWhatsAppData(null);
          }
          
          // Fecha tudo e mostra toast
          setEditMessageDialogOpen(false);
          toast.success("Venda registrada com sucesso! 🎉");
          clearSaleState();
        }}
      />
    </div>
  );
}
