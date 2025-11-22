import { Card } from "@/components/ui/card";

interface CheckoutSummaryProps {
  subtotal: number;
  couponDiscount?: number;
  manualDiscountAmount?: number;
}

export function CheckoutSummary({ 
  subtotal, 
  couponDiscount = 0, 
  manualDiscountAmount = 0 
}: CheckoutSummaryProps) {
  const totalDiscount = couponDiscount + manualDiscountAmount;
  const total = Math.max(0, subtotal - totalDiscount);

  return (
    <Card className="p-4 bg-primary/5 border-primary/20">
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal</span>
          <span>R$ {subtotal.toFixed(2)}</span>
        </div>
        
        {couponDiscount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Desconto Cupom</span>
            <span>-R$ {couponDiscount.toFixed(2)}</span>
          </div>
        )}
        
        {manualDiscountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Desconto Manual</span>
            <span>-R$ {manualDiscountAmount.toFixed(2)}</span>
          </div>
        )}
        
        {totalDiscount > 0 && (
          <div className="flex justify-between text-sm font-medium border-t pt-2">
            <span className="text-muted-foreground">Desconto Total</span>
            <span className="text-destructive">
              -R$ {totalDiscount.toFixed(2)}
            </span>
          </div>
        )}
        
        <div className="flex justify-between text-xl font-bold pt-2 border-t">
          <span>TOTAL</span>
          <span className="text-primary">R$ {total.toFixed(2)}</span>
        </div>
      </div>
    </Card>
  );
}
