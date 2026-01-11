import { Package, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/formatters";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  category?: string;
}

interface ProductDetailModalProps {
  product: Product | null;
  open: boolean;
  onClose: () => void;
}

export function ProductDetailModal({
  product,
  open,
  onClose,
}: ProductDetailModalProps) {
  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name}</DialogTitle>
        </DialogHeader>
        
        {/* Image */}
        <div className="aspect-video bg-muted overflow-hidden relative">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-16 w-16 text-muted-foreground/50" />
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {product.category && (
            <Badge variant="secondary">{product.category}</Badge>
          )}
          
          <h2 className="text-xl font-bold">{product.name}</h2>
          
          {product.description && (
            <p className="text-muted-foreground">{product.description}</p>
          )}
          
          <div className="pt-2 border-t">
            {product.price !== null ? (
              <span className="text-2xl font-bold text-primary">
                {formatCurrency(product.price)}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <Badge variant="outline">Preço no peso</Badge>
                <span className="text-sm text-muted-foreground">
                  Consulte o valor no balcão
                </span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
