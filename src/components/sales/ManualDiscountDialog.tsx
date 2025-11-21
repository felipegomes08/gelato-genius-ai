import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Percent, DollarSign } from "lucide-react";
import { toast } from "sonner";

interface ManualDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subtotal: number;
  onApplyDiscount: (discount: { type: "percentage" | "fixed"; value: number }) => void;
}

export function ManualDiscountDialog({
  open,
  onOpenChange,
  subtotal,
  onApplyDiscount,
}: ManualDiscountDialogProps) {
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("");

  const handleApply = () => {
    const value = parseFloat(discountValue);

    if (!value || value <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    // Validar se o desconto não é maior que o subtotal
    const discountAmount = discountType === "percentage" 
      ? (subtotal * value) / 100 
      : value;

    if (discountAmount > subtotal) {
      toast.error("O desconto não pode ser maior que o subtotal");
      return;
    }

    onApplyDiscount({ type: discountType, value });
    onOpenChange(false);
    setDiscountValue("");
  };

  const previewDiscount = () => {
    const value = parseFloat(discountValue);
    if (!value) return "R$ 0,00";

    const discountAmount = discountType === "percentage" 
      ? (subtotal * value) / 100 
      : value;

    return `R$ ${discountAmount.toFixed(2)}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Desconto Manual</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Tipo de Desconto</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={discountType === "percentage" ? "default" : "outline"}
                onClick={() => setDiscountType("percentage")}
                className="flex items-center gap-2"
              >
                <Percent className="h-4 w-4" />
                Porcentagem
              </Button>
              <Button
                type="button"
                variant={discountType === "fixed" ? "default" : "outline"}
                onClick={() => setDiscountType("fixed")}
                className="flex items-center gap-2"
              >
                <DollarSign className="h-4 w-4" />
                Valor Fixo
              </Button>
            </div>
          </div>

          <div>
            <Label>Valor do Desconto</Label>
            <div className="relative">
              <Input
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === "percentage" ? "Ex: 10" : "Ex: 15.00"}
                step={discountType === "percentage" ? "1" : "0.01"}
                min="0"
                className="pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {discountType === "percentage" ? "%" : "R$"}
              </span>
            </div>
          </div>

          {discountValue && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-muted-foreground">Desconto:</span>
                <span className="text-destructive">-{previewDiscount()}</span>
              </div>
              <div className="flex justify-between font-semibold mt-2 pt-2 border-t">
                <span>Total:</span>
                <span className="text-primary">
                  R$ {(subtotal - parseFloat(previewDiscount().replace("R$ ", "").replace(",", "."))).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setDiscountValue("");
            }}
          >
            Cancelar
          </Button>
          <Button onClick={handleApply} disabled={!discountValue}>
            Aplicar Desconto
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
