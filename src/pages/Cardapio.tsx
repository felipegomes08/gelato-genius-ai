import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, MessageCircle, AlertCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePublicStoreSettings } from "@/hooks/useStoreSettings";
import { MenuHeader } from "@/components/cardapio/MenuHeader";
import { MenuCategoryNav } from "@/components/cardapio/MenuCategoryNav";
import { MenuProductCard } from "@/components/cardapio/MenuProductCard";
import { ProductDetailModal } from "@/components/cardapio/ProductDetailModal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  category_id: string | null;
  category: string;
}

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

export default function Cardapio() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data: settings, isLoading: settingsLoading } = usePublicStoreSettings();

  // Fetch active products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ["public-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, description, price, image_url, category_id, category")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as Product[];
    },
  });

  // Fetch active categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["public-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("id, name, parent_id, sort_order")
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data as Category[];
    },
  });

  // Filter products based on search and category
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        !selectedCategory || product.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  // Group products by category
  const productsByCategory = useMemo(() => {
    if (selectedCategory) {
      return [{ categoryName: null, products: filteredProducts }];
    }

    const grouped = new Map<string, { categoryName: string; products: Product[] }>();
    
    // First, add products with categories
    filteredProducts.forEach((product) => {
      const categoryName = product.category || "Outros";
      if (!grouped.has(categoryName)) {
        grouped.set(categoryName, { categoryName, products: [] });
      }
      grouped.get(categoryName)!.products.push(product);
    });

    return Array.from(grouped.values());
  }, [filteredProducts, selectedCategory]);

  const isLoading = settingsLoading || productsLoading || categoriesLoading;

  // Handle WhatsApp floating button
  const handleWhatsApp = () => {
    if (settings?.menu_whatsapp) {
      const cleanNumber = settings.menu_whatsapp.replace(/\D/g, "");
      window.open(`https://wa.me/55${cleanNumber}`, "_blank");
    }
  };

  // Show disabled message if menu is not enabled
  if (!settingsLoading && !settings?.menu_enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Alert className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cardápio indisponível</AlertTitle>
          <AlertDescription>
            O cardápio online está temporariamente desativado. Por favor, entre em
            contato com o estabelecimento para mais informações.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header with Banner */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 sm:h-56 w-full" />
          <div className="px-4 -mt-12 flex gap-4">
            <Skeleton className="w-24 h-24 rounded-2xl" />
            <div className="flex-1 space-y-2 pt-14">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
        </div>
      ) : (
        <MenuHeader
          bannerUrl={settings?.menu_banner_url || null}
          logoUrl={settings?.store_logo_url || null}
          storeName={settings?.menu_store_name || "Churrosteria"}
          description={settings?.menu_description || ""}
          address={settings?.menu_address || ""}
          openingHours={settings?.menu_opening_hours || ""}
          whatsapp={settings?.menu_whatsapp || ""}
        />
      )}

      {/* Search */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Category Navigation */}
      <div className="sticky top-[61px] z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-2">
        <div className="max-w-2xl mx-auto">
          {categoriesLoading ? (
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-9 w-20 rounded-full" />
              ))}
            </div>
          ) : (
            <MenuCategoryNav
              categories={categories}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          )}
        </div>
      </div>

      {/* Clear Filter Badge - Fixed position when category is selected */}
      {selectedCategory && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40">
          <Badge
            variant="secondary"
            className="cursor-pointer py-2 px-4 text-sm shadow-lg border bg-card hover:bg-accent gap-2 flex items-center"
            onClick={() => setSelectedCategory(null)}
          >
            <X className="h-4 w-4" />
            Limpar filtro
          </Badge>
        </div>
      )}

      {/* Products */}
      <main className="px-4 py-6 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="aspect-square w-full rounded-lg" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery
                ? "Nenhum produto encontrado para esta busca."
                : "Nenhum produto disponível no momento."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {productsByCategory.map((group, index) => (
              <section key={group.categoryName || index}>
                {group.categoryName && !selectedCategory && (
                  <h2 className="text-lg font-semibold mb-4 text-foreground">
                    {group.categoryName}
                  </h2>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {group.products.map((product) => (
                    <MenuProductCard
                      key={product.id}
                      product={product}
                      onClick={() => setSelectedProduct(product)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Floating WhatsApp Button */}
      {settings?.menu_whatsapp && (
        <Button
          onClick={handleWhatsApp}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-green-600 hover:bg-green-700 z-50"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Product Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        open={!!selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
