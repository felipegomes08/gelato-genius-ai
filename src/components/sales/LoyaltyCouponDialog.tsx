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
import { Gift } from "lucide-react";

interface LoyaltyCouponDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  suggestedValue: number;
  onConfirmWithCoupon: () => void;
  onConfirmWithoutCoupon: () => void;
}

export function LoyaltyCouponDialog({
  open,
  onOpenChange,
  customerName,
  suggestedValue,
  onConfirmWithCoupon,
  onConfirmWithoutCoupon,
}: LoyaltyCouponDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Cupom de Fidelidade
          </AlertDialogTitle>
          <AlertDialogDescription className="text-base space-y-3">
            <span>Deseja criar um cupom de <span className="font-bold text-primary">R$ {suggestedValue.toFixed(2)}</span> para <span className="font-semibold">{customerName}</span>?</span>
          </AlertDialogDescription>
          <div className="mt-3 p-3 bg-primary/5 rounded-lg text-sm">
            <p className="text-muted-foreground">
              O cupom será válido por 7 dias e poderá ser usado na próxima compra.
            </p>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={() => onOpenChange(false)}>
            Cancelar
          </AlertDialogCancel>
          <div className="flex gap-2 flex-1 sm:flex-initial">
            <AlertDialogCancel onClick={onConfirmWithoutCoupon} className="flex-1">
              Não, obrigado
            </AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmWithCoupon} className="flex-1">
              Sim, criar cupom!
            </AlertDialogAction>
          </div>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
