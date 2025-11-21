import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Banknote, Smartphone, CreditCard } from "lucide-react";

interface PaymentMethodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectPaymentMethod: (method: "cash" | "pix" | "debit" | "credit") => void;
}

export function PaymentMethodDialog({
  open,
  onOpenChange,
  onSelectPaymentMethod,
}: PaymentMethodDialogProps) {
  const handleSelect = (method: "cash" | "pix" | "debit" | "credit") => {
    onSelectPaymentMethod(method);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Forma de Pagamento</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2"
            onClick={() => handleSelect("cash")}
          >
            <Banknote className="h-8 w-8" />
            <span>Dinheiro</span>
          </Button>

          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2"
            onClick={() => handleSelect("pix")}
          >
            <Smartphone className="h-8 w-8" />
            <span>PIX</span>
          </Button>

          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2"
            onClick={() => handleSelect("debit")}
          >
            <CreditCard className="h-8 w-8" />
            <span>Cartão Débito</span>
          </Button>

          <Button
            variant="outline"
            className="h-24 flex flex-col gap-2"
            onClick={() => handleSelect("credit")}
          >
            <CreditCard className="h-8 w-8" />
            <span>Cartão Crédito</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
