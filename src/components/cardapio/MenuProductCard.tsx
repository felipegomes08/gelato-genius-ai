import { Package } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
}

interface MenuProductCardProps {
  product: Product;
  onClick: () => void;
}

export function MenuProductCard({ product, onClick }: MenuProductCardProps) {
  return (
    <Card
      className="overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
      onClick={onClick}
    >
      <div className="aspect-square bg-muted overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-muted-foreground/50" />
          </div>
        )}
      </div>
      <CardContent className="p-3">
        <h3 className="font-medium text-sm line-clamp-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        <div className="mt-2">
          {product.price !== null ? (
            <span className="font-bold text-primary">
              {formatCurrency(product.price)}
            </span>
          ) : (
            <Badge variant="secondary" className="text-xs">
              Preço no peso
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
