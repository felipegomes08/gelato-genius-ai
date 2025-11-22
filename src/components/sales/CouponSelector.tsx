import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
}

interface CouponSelectorProps {
  coupons: Coupon[];
  selectedCoupon: Coupon | null;
  onSelectCoupon: (coupon: Coupon | null) => void;
}

export function CouponSelector({ coupons, selectedCoupon, onSelectCoupon }: CouponSelectorProps) {
  if (!coupons || coupons.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">Cupons Disponíveis</div>
      <div className="space-y-2">
        {coupons.map((coupon) => (
          <Card
            key={coupon.id}
            className={`p-3 cursor-pointer transition-colors ${
              selectedCoupon?.id === coupon.id
                ? "border-primary bg-accent/10"
                : "hover:border-primary/50"
            }`}
            onClick={() => onSelectCoupon(selectedCoupon?.id === coupon.id ? null : coupon)}
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
  );
}
