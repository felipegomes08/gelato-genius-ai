import { useState, useEffect } from "react";
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
import { Card } from "@/components/ui/card";
import { CheckoutSummary } from "@/components/sales/CheckoutSummary";
import { PaymentMethodSelector } from "@/components/sales/PaymentMethodSelector";
import { CouponSelector } from "@/components/sales/CouponSelector";
import { ManualDiscountDialog } from "@/components/sales/ManualDiscountDialog";
import { LoyaltyCouponDialog } from "@/components/sales/LoyaltyCouponDialog";
import { EditCouponMessageDialog } from "@/components/sales/EditCouponMessageDialog";
import { SelectCustomerDialog } from "@/components/sales/SelectCustomerDialog";
import { generateCouponMessage } from "@/lib/couponMessages";
import { toast } from "sonner";
import { Percent, Loader2, User } from "lucide-react";
import { useAppSettings } from "@/hooks/useAppSettings";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface CloseComandaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comanda: any;
}

interface ManualDiscount {
  type: "percentage" | "fixed";
  value: number;
}

export function CloseComandaDialog({ open, onOpenChange, comanda }: CloseComandaDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "pix" | "debit" | "credit" | "ifood" | null>(null);
  const [manualDiscount, setManualDiscount] = useState<ManualDiscount | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(comanda.customer || null);
  
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [loyaltyCouponDialogOpen, setLoyaltyCouponDialogOpen] = useState(false);
  const [editMessageDialogOpen, setEditMessageDialogOpen] = useState(false);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [pendingWhatsAppData, setPendingWhatsAppData] = useState<any>(null);

  const queryClient = useQueryClient();
  const { settings, getSuggestedCouponValue, getMinPurchase } = useAppSettings();

  // Buscar cupons ativos do cliente
  const { data: coupons } = useQuery({
    queryKey: ["customer-coupons", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return [];
      
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("customer_id", selectedCustomer.id)
        .eq("is_active", true)
        .eq("is_used", false)
        .gte("expire_at", new Date().toISOString());

      if (error) throw error;
      return data;
    },
    enabled: open && !!selectedCustomer?.id,
  });

  // Resetar seleções ao abrir
  useEffect(() => {
    if (open) {
      setPaymentMethod(null);
      setManualDiscount(null);
      setSelectedCoupon(null);
      setSelectedCustomer(comanda.customer || null);
    }
  }, [open, comanda.customer]);

  // Calcular subtotal correto a partir dos items
  const subtotal = comanda.items?.reduce((sum: number, item: any) => {
    return sum + (Number(item.subtotal) || 0);
  }, 0) || 0;
  
  // Calcular desconto do cupom
  const couponDiscount = selectedCoupon
    ? selectedCoupon.discount_type === "percentage"
      ? (subtotal * Number(selectedCoupon.discount_value)) / 100
      : Number(selectedCoupon.discount_value)
    : 0;

  // Calcular desconto manual
  const manualDiscountAmount = manualDiscount
    ? manualDiscount.type === "percentage"
      ? (subtotal * manualDiscount.value) / 100
      : manualDiscount.value
    : 0;

  const totalDiscount = couponDiscount + manualDiscountAmount;
  const total = Math.max(0, subtotal - totalDiscount);


  const closeComandaMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Validar estoque antes de fechar
      const { data: items } = await supabase
        .from("sale_items")
        .select("*, product:products(*)")
        .eq("sale_id", comanda.id);

      if (items) {
        for (const item of items) {
          if (item.product?.controls_stock) {
            const availableStock = item.product.current_stock || 0;
            if (availableStock < item.quantity) {
              throw new Error(`Estoque insuficiente para ${item.product_name}`);
            }
          }
        }
      }

      // 1. Atualizar status da venda e valores finais
      const { error: updateError } = await supabase
        .from("sales")
        .update({
          status: "completed",
          payment_method: paymentMethod!,
          customer_id: selectedCustomer?.id || null,
          subtotal: subtotal,
          discount_amount: totalDiscount,
          total: total,
          coupon_id: selectedCoupon?.id || null,
        })
        .eq("id", comanda.id);

      if (updateError) throw updateError;

      // 2. Descontar estoque e criar movimentações
      if (items) {
        for (const item of items) {
          if (item.product?.controls_stock) {
            const newStock = (item.product.current_stock || 0) - item.quantity;
            
            await supabase
              .from("products")
              .update({ current_stock: newStock })
              .eq("id", item.product_id);

            await supabase
              .from("stock_movements")
              .insert({
                product_id: item.product_id,
                movement_type: "sale",
                quantity: item.quantity,
                previous_stock: item.product.current_stock || 0,
                new_stock: newStock,
                reference_id: comanda.id,
                reason: "Fechamento de comanda",
                created_by: user.id,
              });
          }
        }
      }

      // 3. Marcar cupom como usado
      if (selectedCoupon) {
        await supabase
          .from("coupons")
          .update({
            is_used: true,
            used_at: new Date().toISOString(),
          })
          .eq("id", selectedCoupon.id);
      }

      // 4. Criar transação financeira
      await supabase
        .from("financial_transactions")
        .insert({
          transaction_type: "income",
          category: "Vendas",
          description: `Comanda - ${comanda.notes || "Sem nome"}${selectedCustomer ? ` - ${selectedCustomer.name}` : ""}`,
          amount: total,
          payment_method: paymentMethod,
          reference_id: comanda.id,
          created_by: user.id,
        });
    },
    onSuccess: () => {
      // Invalidar apenas queries que não causam re-render do componente pai
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["products-active"] });
      
      // NÃO invalidar "comandas-abertas" aqui - será feito após decisão do cupom
      
      // Gerar cupom de fidelidade se tiver cliente
      if (selectedCustomer?.id) {
        setLoyaltyCouponDialogOpen(true);
      } else {
        // Toast quando não tem cupom e invalida comandas-abertas agora
        toast.success("Comanda fechada com sucesso!");
        onOpenChange(false);
        queryClient.invalidateQueries({ queryKey: ["comandas-abertas"] });
      }
    },
    onError: (error: any) => {
      console.error("Erro ao fechar comanda:", error);
      toast.error(error.message || "Erro ao fechar comanda");
    },
  });

  const handleClose = () => {
    if (!paymentMethod) {
      toast.error("Selecione a forma de pagamento");
      return;
    }
    
    if (subtotal === 0) {
      toast.error("Comanda sem itens");
      return;
    }

    closeComandaMutation.mutate();
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerSelect(false);
  };

  const createLoyaltyCouponMutation = useMutation({
    mutationFn: async (generateCoupon: boolean) => {
      if (!generateCoupon || !selectedCustomer?.id) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const discountValue = getSuggestedCouponValue(total);
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + 7);

      const couponCode = `FIDELIDADE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      const { data: newCoupon, error: couponError } = await supabase
        .from("coupons")
        .insert({
          customer_id: selectedCustomer.id,
          code: couponCode,
          discount_type: "fixed",
          discount_value: discountValue,
          expire_at: expireDate.toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (couponError) throw couponError;

      // Gerar mensagem usando template
      if (!selectedCustomer?.phone) {
        toast.warning("Cupom criado, mas cliente sem telefone cadastrado");
        return null;
      }

      const message = generateCouponMessage(
        selectedCustomer.name,
        discountValue,
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
        onOpenChange(false);
        toast.success("Comanda fechada e cupom criado! (cliente sem telefone)");
        queryClient.invalidateQueries({ queryKey: ["comandas-abertas"] });
      }
    },
    onError: (error: any) => {
      console.error("Erro ao criar cupom:", error);
      toast.error("Erro ao criar cupom de fidelidade");
    },
  });

  const handleConfirmWithCoupon = () => {
    // Verificar telefone antes de criar cupom
    if (!selectedCustomer?.phone) {
      toast.error("Cliente não possui telefone cadastrado");
      setLoyaltyCouponDialogOpen(false);
      onOpenChange(false);
      toast.success("Comanda fechada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["comandas-abertas"] });
      return;
    }
    
    createLoyaltyCouponMutation.mutate(true);
  };

  const handleConfirmWithoutCoupon = () => {
    setLoyaltyCouponDialogOpen(false);
    onOpenChange(false);
    
    // Mostra toast final
    toast.success("Comanda fechada com sucesso!");
    
    // Invalida queries
    queryClient.invalidateQueries({ queryKey: ["comandas-abertas"] });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fechar Comanda</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Info da comanda */}
            <Card className="p-3 bg-muted/50">
              <div className="font-semibold">{comanda.notes || "Comanda"}</div>
              <div className="text-sm text-muted-foreground">
                {comanda.items?.length || 0} itens
              </div>
            </Card>

            {/* Cliente */}
            <div className="space-y-2">
              {selectedCustomer ? (
                <Card className="p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedCustomer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.phone || "Sem telefone"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      Remover
                    </Button>
                  </div>
                </Card>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCustomerSelect(true)}
                  className="w-full"
                >
                  <User className="h-4 w-4 mr-2" />
                  Adicionar Cliente
                </Button>
              )}
            </div>

            {/* Lista de itens consumidos */}
            {comanda.items && comanda.items.length > 0 && (
              <Card className="p-3">
                <div className="text-sm font-medium mb-2">Itens Consumidos:</div>
                <div className="space-y-1.5">
                  {comanda.items.map((item: any) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.quantity}x {item.product_name}
                      </span>
                      <span className="font-medium">
                        R$ {Number(item.subtotal).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Cupons disponíveis */}
            <CouponSelector
              coupons={coupons || []}
              selectedCoupon={selectedCoupon}
              onSelectCoupon={setSelectedCoupon}
            />

            {/* Desconto manual */}
            <div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setDiscountDialogOpen(true)}
              >
                <Percent className="h-4 w-4 mr-2" />
                {manualDiscount
                  ? `Desconto: ${
                      manualDiscount.type === "percentage"
                        ? `${manualDiscount.value}%`
                        : `R$ ${manualDiscount.value.toFixed(2)}`
                    }`
                  : "Adicionar Desconto Manual"}
              </Button>
            </div>

            {/* Resumo financeiro */}
            <CheckoutSummary
              subtotal={subtotal}
              couponDiscount={couponDiscount}
              manualDiscountAmount={manualDiscountAmount}
            />

            {/* Forma de pagamento */}
            <PaymentMethodSelector
              value={paymentMethod}
              onChange={setPaymentMethod}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={closeComandaMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleClose}
              disabled={!paymentMethod || closeComandaMutation.isPending}
            >
              {closeComandaMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Confirmar Fechamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialogs auxiliares */}
      <ManualDiscountDialog
        open={discountDialogOpen}
        onOpenChange={setDiscountDialogOpen}
        subtotal={subtotal}
        onApplyDiscount={(discount) => {
          setManualDiscount(discount);
          setDiscountDialogOpen(false);
        }}
      />

      <LoyaltyCouponDialog
        open={loyaltyCouponDialogOpen}
        onOpenChange={setLoyaltyCouponDialogOpen}
        customerName={selectedCustomer?.name || "Cliente"}
        suggestedValue={getSuggestedCouponValue(total)}
        onConfirmWithCoupon={handleConfirmWithCoupon}
        onConfirmWithoutCoupon={handleConfirmWithoutCoupon}
      />

      {/* Dialog de Seleção de Cliente */}
      {showCustomerSelect && (
        <Dialog open={showCustomerSelect} onOpenChange={setShowCustomerSelect}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Selecionar Cliente</DialogTitle>
            </DialogHeader>
            <SelectCustomerDialog
              open={true}
              onOpenChange={() => {}}
              onSelectCustomer={handleSelectCustomer}
              onCreateNewCustomer={handleSelectCustomer}
              embedded={true}
              showCoupons={false}
            />
          </DialogContent>
        </Dialog>
      )}

      <EditCouponMessageDialog
        open={editMessageDialogOpen}
        onOpenChange={(open) => {
          setEditMessageDialogOpen(open);
          
          // Se usuário cancelar, fecha tudo mesmo assim
          if (!open) {
            onOpenChange(false);
            toast.success("Comanda fechada com sucesso!");
            queryClient.invalidateQueries({ queryKey: ["comandas-abertas"] });
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
          onOpenChange(false);
          toast.success("Comanda fechada com sucesso! 🎉");
          queryClient.invalidateQueries({ queryKey: ["comandas-abertas"] });
        }}
      />
    </>
  );
}
