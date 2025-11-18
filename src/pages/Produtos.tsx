import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Edit, Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  stock?: number;
  controlsStock: boolean;
  category: string;
}

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Casquinha Pequena",
    price: 6.0,
    stock: 45,
    controlsStock: true,
    category: "Casquinhas",
  },
  {
    id: "2",
    name: "Casquinha Média",
    price: 8.0,
    stock: 12,
    controlsStock: true,
    category: "Casquinhas",
  },
  {
    id: "3",
    name: "Casquinha Grande",
    price: 10.0,
    stock: 28,
    controlsStock: true,
    category: "Casquinhas",
  },
  {
    id: "4",
    name: "Milkshake Chocolate",
    price: 15.0,
    stock: 8,
    controlsStock: true,
    category: "Bebidas",
  },
  {
    id: "5",
    name: "Sundae Morango",
    price: 15.0,
    controlsStock: false,
    category: "Sobremesas",
  },
];

export default function Produtos() {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProducts = mockProducts.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStockStatus = (product: Product) => {
    if (!product.controlsStock) return null;
    if (!product.stock) return "out";
    if (product.stock < 15) return "low";
    return "ok";
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Produtos" />

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Search and Add */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
          <Button size="icon" className="h-12 w-12 shadow-md">
            <Plus className="h-5 w-5" />
          </Button>
        </div>

        {/* Products List */}
        <div className="space-y-3">
          {filteredProducts.map((product) => {
            const stockStatus = getStockStatus(product);
            return (
              <Card key={product.id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{product.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {product.category}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-primary">
                        R$ {product.price.toFixed(2)}
                      </span>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {product.controlsStock && (
                    <div className="flex items-center justify-between pt-3 border-t">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          Estoque: {product.stock} un.
                        </span>
                      </div>
                      {stockStatus === "low" && (
                        <Badge variant="destructive" className="text-xs">
                          Baixo
                        </Badge>
                      )}
                      {stockStatus === "out" && (
                        <Badge variant="destructive" className="text-xs">
                          Esgotado
                        </Badge>
                      )}
                      {stockStatus === "ok" && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-success/10 text-success hover:bg-success/20"
                        >
                          OK
                        </Badge>
                      )}
                    </div>
                  )}

                  {!product.controlsStock && (
                    <div className="flex items-center gap-2 pt-3 border-t">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Estoque não controlado
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
