import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Category } from "@/pages/Categorias";

interface EditCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  categories: Category[];
}

export function EditCategoryDialog({
  open,
  onOpenChange,
  category,
  categories,
}: EditCategoryDialogProps) {
  const [name, setName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedCouponId, setSelectedCouponId] = useState<string>("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (category) {
      setName(category.name);
      setIsActive(category.is_active);
      setSelectedCouponId(category.coupon_id || "");
    }
  }, [category]);

  // Fetch active coupons
  const { data: coupons = [] } = useQuery({
    queryKey: ["available-category-coupons"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("is_active", true)
        .eq("is_used", false)
        .gt("expire_at", new Date().toISOString());

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!category) return;

      const { error } = await supabase
        .from("categories")
        .update({
          name: name.trim(),
          is_active: isActive,
          coupon_id: selectedCouponId || null,
        })
        .eq("id", category.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria atualizada!");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Erro ao atualizar: " + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!category) return;

      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", category.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Categoria excluída!");
      setDeleteDialogOpen(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error("Erro ao excluir: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Digite o nome da categoria");
      return;
    }
    updateMutation.mutate();
  };

  const hasChildren = categories.some((c) => c.parent_id === category?.id);

  if (!category) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Categoria</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome</Label>
              <Input
                id="edit-name"
                placeholder="Nome da categoria"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="edit-active">Categoria Ativa</Label>
              <Switch
                id="edit-active"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-coupon">Cupom de Desconto</Label>
              <Select value={selectedCouponId} onValueChange={setSelectedCouponId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cupom" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhum</SelectItem>
                  {coupons.map((coupon) => (
                    <SelectItem key={coupon.id} value={coupon.id}>
                      {coupon.code} -{" "}
                      {coupon.discount_type === "percentage"
                        ? `${coupon.discount_value}%`
                        : `R$ ${coupon.discount_value.toFixed(2)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={updateMutation.isPending || deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
              <div className="flex-1" />
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir categoria?</AlertDialogTitle>
            <AlertDialogDescription>
              {hasChildren
                ? "Esta categoria possui subcategorias. Ao excluí-la, todas as subcategorias também serão removidas."
                : "Esta ação não pode ser desfeita. A categoria será permanentemente removida."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
