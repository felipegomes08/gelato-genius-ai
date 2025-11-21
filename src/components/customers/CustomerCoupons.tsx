import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, Percent, DollarSign, CheckCircle2, XCircle, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddCouponDialog } from "./AddCouponDialog";
import { EditCouponDialog } from "./EditCouponDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
  const [editingCoupon, setEditingCoupon] = useState<any>(null);
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null);
  const queryClient = useQueryClient();

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

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !isActive })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-coupons", customer?.id] });
      toast.success("Status do cupom atualizado!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar cupom");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("coupons")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-coupons", customer?.id] });
      toast.success("Cupom excluído com sucesso!");
      setDeletingCouponId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao excluir cupom");
      setDeletingCouponId(null);
    },
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
                  const isActive = coupon.is_active;
                  
                  return (
                    <div
                      key={coupon.id}
                      className={cn(
                        "p-4 border border-border rounded-lg",
                        !isActive && "opacity-50"
                      )}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-semibold text-foreground">
                            {coupon.code}
                          </span>
                          {!isActive ? (
                            <Badge variant="secondary" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Inativo
                            </Badge>
                          ) : isUsed ? (
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
                      <div className="text-sm text-muted-foreground space-y-1 mb-3">
                        <p>
                          Validade: {new Date(coupon.expire_at).toLocaleDateString("pt-BR")}
                        </p>
                        {isUsed && coupon.used_at && (
                          <p>
                            Usado em: {new Date(coupon.used_at).toLocaleDateString("pt-BR")}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {!isUsed && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingCoupon(coupon)}
                          >
                            <Pencil className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toggleActiveMutation.mutate({ id: coupon.id, isActive: coupon.is_active })}
                          disabled={toggleActiveMutation.isPending}
                        >
                          {isActive ? (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Inativar
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Ativar
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeletingCouponId(coupon.id)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Excluir
                        </Button>
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

      <EditCouponDialog
        coupon={editingCoupon}
        customerName={customer?.name || ""}
        open={!!editingCoupon}
        onOpenChange={(open) => !open && setEditingCoupon(null)}
      />

      <AlertDialog open={!!deletingCouponId} onOpenChange={(open) => !open && setDeletingCouponId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cupom</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cupom? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCouponId && deleteMutation.mutate(deletingCouponId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
