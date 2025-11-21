import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expire_at: string;
  is_used: boolean;
}

interface EditCouponDialogProps {
  coupon: Coupon | null;
  customerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCouponDialog({ coupon, customerName, open, onOpenChange }: EditCouponDialogProps) {
  const [code, setCode] = useState(coupon?.code || "");
  const [discountType, setDiscountType] = useState(coupon?.discount_type || "percentage");
  const [discountValue, setDiscountValue] = useState(coupon?.discount_value.toString() || "");
  const [expireDate, setExpireDate] = useState<Date | undefined>(
    coupon ? new Date(coupon.expire_at) : undefined
  );

  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!coupon || !expireDate) return;

      const { error } = await supabase
        .from("coupons")
        .update({
          code: code.toUpperCase(),
          discount_type: discountType,
          discount_value: parseFloat(discountValue),
          expire_at: expireDate.toISOString(),
        })
        .eq("id", coupon.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-coupons"] });
      toast.success("Cupom atualizado com sucesso!");
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar cupom");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!code.trim()) {
      toast.error("Digite o código do cupom");
      return;
    }

    if (!discountValue || parseFloat(discountValue) <= 0) {
      toast.error("Digite um valor de desconto válido");
      return;
    }

    if (discountType === "percentage" && parseFloat(discountValue) > 100) {
      toast.error("Desconto percentual não pode ser maior que 100%");
      return;
    }

    if (!expireDate) {
      toast.error("Selecione a data de validade");
      return;
    }

    updateMutation.mutate();
  };

  // Resetar form quando o cupom mudar
  useState(() => {
    if (coupon) {
      setCode(coupon.code);
      setDiscountType(coupon.discount_type);
      setDiscountValue(coupon.discount_value.toString());
      setExpireDate(new Date(coupon.expire_at));
    }
  });

  if (!coupon) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Cupom - {customerName}</DialogTitle>
        </DialogHeader>

        {coupon.is_used ? (
          <div className="py-4 text-center text-muted-foreground">
            Cupons já utilizados não podem ser editados
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Código do Cupom</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: DESCONTO10"
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Desconto</Label>
              <RadioGroup value={discountType} onValueChange={setDiscountType}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fixed" id="edit-fixed" />
                  <Label htmlFor="edit-fixed" className="font-normal">Valor Fixo (R$)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="percentage" id="edit-percentage" />
                  <Label htmlFor="edit-percentage" className="font-normal">Porcentagem (%)</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="value">
                {discountType === "percentage" ? "Desconto (%)" : "Valor (R$)"}
              </Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                max={discountType === "percentage" ? "100" : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percentage" ? "Ex: 10" : "Ex: 50.00"}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Validade</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expireDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expireDate ? format(expireDate, "dd/MM/yyyy") : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expireDate}
                    onSelect={setExpireDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1"
              >
                {updateMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
