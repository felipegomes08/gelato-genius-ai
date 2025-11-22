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
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ManualDiscountDialog } from "@/components/sales/ManualDiscountDialog";
import { LoyaltyCouponDialog } from "@/components/sales/LoyaltyCouponDialog";
import { EditCouponMessageDialog } from "@/components/sales/EditCouponMessageDialog";
import { toast } from "sonner";
import { Banknote, Smartphone, CreditCard, Percent, Sparkles, Loader2 } from "lucide-react";

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

  const subtotal = Number(comanda.subtotal);
  
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
      const { data: items } = await supabase
        .from("sale_items")
        .select("*, product:products(*)")
        .eq("sale_id", comanda.id);

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
          description: `Venda - ${comanda.notes || "Comanda"}`,
          amount: total,
          reference_id: comanda.id,
          created_by: user.id,
        });
    },
    onSuccess: () => {
      toast.success("Comanda fechada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["comandas-abertas"] });
      
      // Gerar cupom de fidelidade se tiver cliente
      if (comanda.customer_id && total >= 50) {
        setLoyaltyCouponDialogOpen(true);
      } else {
        onOpenChange(false);
      }
    },
    onError: (error: any) => {
      console.error("Erro ao fechar comanda:", error);
      toast.error("Erro ao fechar comanda");
    },
  });

  const handleClose = () => {
    if (!paymentMethod) {
      toast.error("Selecione a forma de pagamento");
      return;
    }
    closeComandaMutation.mutate();
  };

  const createLoyaltyCouponMutation = useMutation({
    mutationFn: async (generateCoupon: boolean) => {
      if (!generateCoupon || !comanda.customer_id) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const discountValue = total >= 100 ? 15 : 10;
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + 30);

      const couponCode = Math.random().toString(36).substring(2, 8).toUpperCase();

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

      // Gerar mensagem personalizada
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        "generate-coupon-message",
        {
          body: {
            customerName: comanda.customer?.name,
            couponCode: couponCode,
            discountValue: discountValue,
          },
        }
      );

      if (functionError) throw functionError;

      return {
        phone: comanda.customer.phone,
        message: functionData.message,
      };
    },
    onSuccess: (data) => {
      if (data) {
        setPendingWhatsAppData(data);
        setEditMessageDialogOpen(true);
      }
      setLoyaltyCouponDialogOpen(false);
      onOpenChange(false);
    },
  });

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
            {coupons && coupons.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium">Cupons Disponíveis</div>
                <div className="space-y-2">
                  {coupons.map((coupon: any) => (
                    <Card
                      key={coupon.id}
                      className={`p-3 cursor-pointer transition-colors ${
                        selectedCoupon?.id === coupon.id
                          ? "border-primary bg-accent/10"
                          : "hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedCoupon(selectedCoupon?.id === coupon.id ? null : coupon)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{coupon.code}</div>
                          <div className="text-sm text-muted-foreground">
                            {coupon.discount_type === "percentage"
                              ? `${coupon.discount_value}% de desconto`
                              : `R$ ${Number(coupon.discount_value).toFixed(2)} de desconto`}
                          </div>
                        </div>
                        <Badge variant={selectedCoupon?.id === coupon.id ? "default" : "outline"}>
                          {selectedCoupon?.id === coupon.id ? "Selecionado" : "Selecionar"}
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}

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
            <Card className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal:</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Cupom:</span>
                  <span>-R$ {couponDiscount.toFixed(2)}</span>
                </div>
              )}
              {manualDiscountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Desconto Manual:</span>
                  <span>-R$ {manualDiscountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between font-bold text-lg">
                <span>TOTAL:</span>
                <span className="text-primary">R$ {total.toFixed(2)}</span>
              </div>
            </Card>

            {/* Forma de pagamento */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Forma de Pagamento *</div>
              <ToggleGroup
                type="single"
                value={paymentMethod || ""}
                onValueChange={(value) => setPaymentMethod(value as any)}
                className="grid grid-cols-2 gap-2"
              >
                <ToggleGroupItem value="cash" className="flex-col h-20">
                  <Banknote className="h-6 w-6 mb-1" />
                  <span className="text-xs">Dinheiro</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="pix" className="flex-col h-20">
                  <Smartphone className="h-6 w-6 mb-1" />
                  <span className="text-xs">PIX</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="debit" className="flex-col h-20">
                  <CreditCard className="h-6 w-6 mb-1" />
                  <span className="text-xs">Débito</span>
                </ToggleGroupItem>
                <ToggleGroupItem value="credit" className="flex-col h-20">
                  <CreditCard className="h-6 w-6 mb-1" />
                  <span className="text-xs">Crédito</span>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
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
              Confirmar Venda
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
        suggestedValue={total >= 100 ? 15 : 10}
        onConfirmWithCoupon={() => createLoyaltyCouponMutation.mutate(true)}
        onConfirmWithoutCoupon={() => {
          setLoyaltyCouponDialogOpen(false);
          onOpenChange(false);
        }}
      />

      <EditCouponMessageDialog
        open={editMessageDialogOpen}
        onOpenChange={setEditMessageDialogOpen}
        initialMessage={pendingWhatsAppData?.message || ""}
        customerPhone={pendingWhatsAppData?.phone || ""}
        onConfirm={(editedMessage) => {
          if (pendingWhatsAppData?.phone) {
            const whatsappUrl = `https://wa.me/${pendingWhatsAppData.phone.replace(/\D/g, "")}?text=${encodeURIComponent(editedMessage)}`;
            window.open(whatsappUrl, "_blank");
          }
        }}
      />
    </>
  );
}
