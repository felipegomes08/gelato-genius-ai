import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2, FolderTree } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CategoryTree } from "@/components/categories/CategoryTree";
import { AddCategoryDialog } from "@/components/categories/AddCategoryDialog";
import { EditCategoryDialog } from "@/components/categories/EditCategoryDialog";

export interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  is_active: boolean;
  coupon_id: string | null;
  sort_order: number;
  created_at: string;
}

export default function Categorias() {
  const [searchTerm, setSearchTerm] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .order("sort_order")
        .order("name");

      if (error) throw error;
      return data as Category[];
    },
  });

  // Count products per category
  const { data: productCounts = {} } = useQuery({
    queryKey: ["category-product-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("category_id");

      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach((p) => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  const handleAddSubcategory = (parentId: string) => {
    setSelectedParentId(parentId);
    setAddDialogOpen(true);
  };

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setEditDialogOpen(true);
  };

  const handleAddRootCategory = () => {
    setSelectedParentId(null);
    setAddDialogOpen(true);
  };

  // Build tree structure from flat list
  const buildTree = (categories: Category[], parentId: string | null = null): Category[] => {
    return categories
      .filter((c) => c.parent_id === parentId)
      .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));
  };

  const filterCategories = (categories: Category[]): Category[] => {
    if (!searchTerm) return categories;
    return categories.filter((c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const rootCategories = buildTree(filterCategories(categories));

  return (
    <div className="max-w-md md:max-w-4xl mx-auto space-y-4 px-4 md:px-0">
      {/* Header */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-12"
          />
        </div>
        <Button
          size="icon"
          className="h-12 w-12 shadow-md"
          onClick={handleAddRootCategory}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>

      {/* Categories Tree */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rootCategories.length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="py-12 text-center">
            <FolderTree className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma categoria</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "Nenhuma categoria encontrada" : "Crie sua primeira categoria para organizar os produtos"}
            </p>
            {!searchTerm && (
              <Button onClick={handleAddRootCategory}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Categoria
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <CategoryTree
              categories={categories}
              productCounts={productCounts}
              onEdit={handleEdit}
              onAddSubcategory={handleAddSubcategory}
            />
          </CardContent>
        </Card>
      )}

      <AddCategoryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        parentId={selectedParentId}
        categories={categories}
      />

      <EditCategoryDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        category={selectedCategory}
        categories={categories}
      />
    </div>
  );
}
