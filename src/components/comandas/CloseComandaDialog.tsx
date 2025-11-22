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
import { toast } from "sonner";
import { Percent, Loader2 } from "lucide-react";

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
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "pix" | "debit" | "credit" | null>(null);
  const [manualDiscount, setManualDiscount] = useState<ManualDiscount | null>(null);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);
  
  const [discountDialogOpen, setDiscountDialogOpen] = useState(false);
  const [loyaltyCouponDialogOpen, setLoyaltyCouponDialogOpen] = useState(false);
  const [editMessageDialogOpen, setEditMessageDialogOpen] = useState(false);
  const [pendingWhatsAppData, setPendingWhatsAppData] = useState<any>(null);

  const queryClient = useQueryClient();

  // Buscar cupons ativos do cliente
  const { data: coupons } = useQuery({
    queryKey: ["customer-coupons", comanda.customer_id],
    queryFn: async () => {
      if (!comanda.customer_id) return [];
      
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("customer_id", comanda.customer_id)
        .eq("is_active", true)
        .eq("is_used", false)
        .gte("expire_at", new Date().toISOString());

      if (error) throw error;
      return data;
    },
    enabled: open && !!comanda.customer_id,
  });

  // Resetar seleções ao abrir
  useEffect(() => {
    if (open) {
      setPaymentMethod(null);
      setManualDiscount(null);
      setSelectedCoupon(null);
    }
  }, [open]);

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

  const getSuggestedCouponValue = () => {
    return total >= 100 ? 15 : 10;
  };

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
          description: `Comanda - ${comanda.notes || "Sem nome"}${comanda.customer ? ` - ${comanda.customer.name}` : ""}`,
          amount: total,
          reference_id: comanda.id,
          created_by: user.id,
        });
    },
    onSuccess: () => {
      toast.success("Comanda fechada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["comandas-abertas"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["products-active"] });
      
      // Gerar cupom de fidelidade se tiver cliente e valor mínimo
      if (comanda.customer_id && total >= 50) {
        setLoyaltyCouponDialogOpen(true);
      } else {
        onOpenChange(false);
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

  const createLoyaltyCouponMutation = useMutation({
    mutationFn: async (generateCoupon: boolean) => {
      if (!generateCoupon || !comanda.customer_id) return null;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const discountValue = getSuggestedCouponValue();
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + 30);

      const couponCode = `FIDELIDADE-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

      const { data: newCoupon, error: couponError } = await supabase
        .from("coupons")
        .insert({
          customer_id: comanda.customer_id,
          code: couponCode,
          discount_type: "percentage",
          discount_value: discountValue,
          expire_at: expireDate.toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (couponError) throw couponError;

      // Gerar mensagem personalizada com IA
      try {
        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          "generate-coupon-message",
          {
            body: {
              customerName: comanda.customer?.name,
              couponValue: discountValue,
              expiryDate: expireDate.toLocaleDateString('pt-BR'),
            },
          }
        );

        if (functionError) throw functionError;

        return {
          phone: comanda.customer.phone,
          message: functionData.message,
        };
      } catch (error) {
        console.error("Erro ao gerar mensagem IA:", error);
        // Retornar mensagem padrão se falhar
        return {
          phone: comanda.customer.phone,
          message: `Olá ${comanda.customer?.name}! 🎉\n\nParabéns! Você ganhou um cupom de ${discountValue}% de desconto!\n\nCódigo: ${couponCode}\nVálido até: ${expireDate.toLocaleDateString('pt-BR')}\n\nVolte sempre! 😊`,
        };
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customer-coupons"] });
      
      if (data?.phone) {
        setPendingWhatsAppData(data);
        setEditMessageDialogOpen(true);
      }
      
      setLoyaltyCouponDialogOpen(false);
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Erro ao criar cupom:", error);
      toast.error("Erro ao criar cupom de fidelidade");
    },
  });

  const handleConfirmWithCoupon = () => {
    createLoyaltyCouponMutation.mutate(true);
  };

  const handleConfirmWithoutCoupon = () => {
    setLoyaltyCouponDialogOpen(false);
    onOpenChange(false);
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
              {comanda.customer && (
                <div className="text-sm text-muted-foreground">
                  Cliente: {comanda.customer.name}
                </div>
              )}
              <div className="text-sm text-muted-foreground">
                {comanda.items?.length || 0} itens
              </div>
            </Card>

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
        customerName={comanda.customer?.name || "Cliente"}
        suggestedValue={getSuggestedCouponValue()}
        onConfirmWithCoupon={handleConfirmWithCoupon}
        onConfirmWithoutCoupon={handleConfirmWithoutCoupon}
      />

      <EditCouponMessageDialog
        open={editMessageDialogOpen}
        onOpenChange={setEditMessageDialogOpen}
        initialMessage={pendingWhatsAppData?.message || ""}
        customerPhone={pendingWhatsAppData?.phone || ""}
        onConfirm={(editedMessage) => {
          if (pendingWhatsAppData?.phone) {
            const whatsappUrl = `https://wa.me/55${pendingWhatsAppData.phone.replace(/\D/g, "")}?text=${encodeURIComponent(editedMessage)}`;
            window.open(whatsappUrl, "_blank");
            setPendingWhatsAppData(null);
          }
        }}
      />
    </>
  );
}
