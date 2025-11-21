import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Percent, DollarSign, CheckCircle2, XCircle } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddCouponDialog } from "./AddCouponDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Customer {
  id: string;
  name: string;
}

interface CustomerCouponsProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomerCoupons({ customer, open, onOpenChange }: CustomerCouponsProps) {
  const [isAddCouponOpen, setIsAddCouponOpen] = useState(false);

  const { data: coupons, isLoading } = useQuery({
    queryKey: ["customer-coupons", customer?.id],
    queryFn: async () => {
      if (!customer) return [];

      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("customer_id", customer.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!customer && open,
  });

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Cupons de {customer?.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Button
              size="sm"
              onClick={() => setIsAddCouponOpen(true)}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Cupom
            </Button>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : !coupons || coupons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cupom criado para este cliente
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {coupons.map((coupon) => {
                  const isExpired = new Date(coupon.expire_at) < new Date();
                  const isUsed = coupon.is_used;
                  
                  return (
                    <div
                      key={coupon.id}
                      className="p-4 border border-border rounded-lg"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-foreground">
                            {coupon.code}
                          </span>
                          {isUsed ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Usado
                            </Badge>
                          ) : isExpired ? (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Expirado
                            </Badge>
                          ) : (
                            <Badge variant="default" className="gap-1">
                              Ativo
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-primary font-semibold">
                          {coupon.discount_type === "percentage" ? (
                            <>
                              <Percent className="h-4 w-4" />
                              <span>{coupon.discount_value}%</span>
                            </>
                          ) : (
                            <>
                              <DollarSign className="h-4 w-4" />
                              <span>R$ {Number(coupon.discount_value).toFixed(2)}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>
                          Validade: {new Date(coupon.expire_at).toLocaleDateString("pt-BR")}
                        </p>
                        {isUsed && coupon.used_at && (
                          <p>
                            Usado em: {new Date(coupon.used_at).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AddCouponDialog
        customerId={customer?.id || ""}
        customerName={customer?.name || ""}
        open={isAddCouponOpen}
        onOpenChange={setIsAddCouponOpen}
      />
    </>
  );
}
