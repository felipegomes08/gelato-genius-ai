import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Clock, MessageCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditCouponMessageDialog } from "@/components/sales/EditCouponMessageDialog";

interface ExpiringCoupon {
  id: string;
  code: string;
  discount_value: number;
  discount_type: string;
  expire_at: string;
  customer: {
    id: string;
    name: string;
    phone: string | null;
  };
}

export function ExpiringCouponsCard() {
  const [selectedCoupon, setSelectedCoupon] = useState<ExpiringCoupon | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: expiringCoupons, isLoading } = useQuery({
    queryKey: ['expiring-coupons'],
    queryFn: async () => {
      const now = new Date();
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
      threeDaysFromNow.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from('coupons')
        .select(`
          id,
          code,
          discount_value,
          discount_type,
          expire_at,
          customers!inner (
            id,
            name,
            phone
          )
        `)
        .eq('is_active', true)
        .eq('is_used', false)
        .gte('expire_at', now.toISOString())
        .lte('expire_at', threeDaysFromNow.toISOString())
        .order('expire_at', { ascending: true });

      if (error) throw error;

      return (data || []).map((coupon: any) => ({
        id: coupon.id,
        code: coupon.code,
        discount_value: coupon.discount_value,
        discount_type: coupon.discount_type,
        expire_at: coupon.expire_at,
        customer: {
          id: coupon.customers.id,
          name: coupon.customers.name,
          phone: coupon.customers.phone,
        },
      })) as ExpiringCoupon[];
    },
    refetchInterval: 60000,
  });

  const getDaysUntilExpiry = (expireAt: string) => {
    const now = new Date();
    const expiryDate = new Date(expireAt);
    const days = differenceInDays(expiryDate, now);
    return days;
  };

  const getDaysLabel = (days: number) => {
    if (days === 0) return "Expira hoje!";
    if (days === 1) return "Expira amanhã";
    return `Expira em ${days} dias`;
  };

  const getDaysBadgeVariant = (days: number): "destructive" | "secondary" | "outline" => {
    if (days === 0) return "destructive";
    if (days === 1) return "destructive";
    return "secondary";
  };

  const generateExpiryMessage = (coupon: ExpiringCoupon) => {
    const days = getDaysUntilExpiry(coupon.expire_at);
    const valueText = coupon.discount_type === 'percentage' 
      ? `${coupon.discount_value}%` 
      : `R$${coupon.discount_value.toFixed(2)}`;
    
    let daysText = "";
    if (days === 0) {
      daysText = "hoje";
    } else if (days === 1) {
      daysText = "amanhã";
    } else {
      daysText = `em ${days} dias`;
    }

    return `Olá ${coupon.customer.name}! Seu cupom de ${valueText} expira ${daysText}. Venha aproveitar esse desconto e já garantir seu próximo cupom!`;
  };

  const handleNotifyClick = (coupon: ExpiringCoupon) => {
    setSelectedCoupon(coupon);
    setDialogOpen(true);
  };

  const handleSendMessage = (message: string) => {
    if (!selectedCoupon?.customer.phone) return;

    const phone = selectedCoupon.customer.phone.replace(/\D/g, '');
    const formattedPhone = phone.startsWith('55') ? phone : `55${phone}`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
    setDialogOpen(false);
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-destructive" />
            Cupons Próximos de Expirar
          </CardTitle>
          <p className="text-xs text-muted-foreground">Cupons que expiram nos próximos 3 dias</p>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : expiringCoupons && expiringCoupons.length > 0 ? (
            expiringCoupons.map((coupon) => {
              const days = getDaysUntilExpiry(coupon.expire_at);
              return (
                <div 
                  key={coupon.id} 
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{coupon.customer.name}</p>
                      <Badge variant={getDaysBadgeVariant(days)} className="text-xs">
                        {getDaysLabel(days)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-muted-foreground">
                        {coupon.discount_type === 'percentage' 
                          ? `${coupon.discount_value}% de desconto` 
                          : `R$ ${coupon.discount_value.toFixed(2)} de desconto`}
                      </p>
                      <span className="text-xs text-muted-foreground">•</span>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(coupon.expire_at), "dd/MM", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="ml-2 gap-1.5 shrink-0"
                    onClick={() => handleNotifyClick(coupon)}
                    disabled={!coupon.customer.phone}
                    title={coupon.customer.phone ? "Notificar via WhatsApp" : "Cliente sem telefone"}
                  >
                    <MessageCircle className="h-4 w-4 text-green-600" />
                    <span className="hidden sm:inline">Notificar</span>
                  </Button>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum cupom próximo de expirar
            </p>
          )}
        </CardContent>
      </Card>

      {selectedCoupon && (
        <EditCouponMessageDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          initialMessage={generateExpiryMessage(selectedCoupon)}
          customerPhone={selectedCoupon.customer.phone || "Sem telefone"}
          onConfirm={handleSendMessage}
        />
      )}
    </>
  );
}
