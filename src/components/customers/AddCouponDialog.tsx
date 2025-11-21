import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface AddCouponDialogProps {
  customerId: string;
  customerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddCouponDialog({ customerId, customerName, open, onOpenChange }: AddCouponDialogProps) {
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");
  const [expireDate, setExpireDate] = useState<Date | undefined>(undefined);
  const queryClient = useQueryClient();

  const generateCode = () => {
    const randomCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    setCode(randomCode);
  };

  const addCouponMutation = useMutation({
    mutationFn: async () => {
      if (!expireDate) {
        throw new Error("Selecione uma data de validade");
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from("coupons")
        .insert({
          customer_id: customerId,
          code: code.toUpperCase(),
          discount_type: discountType,
          discount_value: Number(discountValue),
          expire_at: expireDate.toISOString(),
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Cupom criado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["customer-coupons", customerId] });
      onOpenChange(false);
      setCode("");
      setDiscountValue("");
      setExpireDate(undefined);
    },
    onError: (error: any) => {
      console.error("Erro ao criar cupom:", error);
      toast.error(error.message || "Erro ao criar cupom");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!code.trim()) {
      toast.error("Digite um código para o cupom");
      return;
    }
    
    if (!discountValue || Number(discountValue) <= 0) {
      toast.error("Digite um valor válido para o desconto");
      return;
    }

    if (discountType === "percentage" && Number(discountValue) > 100) {
      toast.error("Desconto percentual não pode ser maior que 100%");
      return;
    }

    if (!expireDate) {
      toast.error("Selecione uma data de validade");
      return;
    }

    addCouponMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Cupom para {customerName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código do Cupom</Label>
            <div className="flex gap-2">
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: DESCONTO10"
                required
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={generateCode}
              >
                Gerar
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            <Label>Tipo de Desconto</Label>
            <RadioGroup
              value={discountType}
              onValueChange={(value) => setDiscountType(value as "percentage" | "fixed")}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="percentage" id="percentage" />
                <Label htmlFor="percentage" className="cursor-pointer font-normal">
                  Porcentagem (%)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="fixed" id="fixed" />
                <Label htmlFor="fixed" className="cursor-pointer font-normal">
                  Valor Fixo (R$)
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="discount">
              {discountType === "percentage" ? "Desconto (%)" : "Desconto (R$)"}
            </Label>
            <Input
              id="discount"
              type="number"
              step={discountType === "fixed" ? "0.01" : "1"}
              min="0"
              max={discountType === "percentage" ? "100" : undefined}
              value={discountValue}
              onChange={(e) => setDiscountValue(e.target.value)}
              placeholder={discountType === "percentage" ? "Ex: 10" : "Ex: 50.00"}
              required
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
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={addCouponMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={addCouponMutation.isPending}>
              {addCouponMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Criar Cupom
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
