import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, ShoppingBag } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface EditComandaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comanda: any;
}

export function EditComandaDialog({
  open,
  onOpenChange,
  comanda,
}: EditComandaDialogProps) {
  const queryClient = useQueryClient();
  const [itemsToRemove, setItemsToRemove] = useState<string[]>([]);

  const removeItemsMutation = useMutation({
    mutationFn: async () => {
      if (itemsToRemove.length === 0) return;

      // Deletar os itens selecionados
      const { error } = await supabase
        .from("sale_items")
        .delete()
        .in("id", itemsToRemove);

      if (error) throw error;

      // Recalcular o total da comanda
      const { data: remainingItems, error: fetchError } = await supabase
        .from("sale_items")
        .select("subtotal")
        .eq("sale_id", comanda.id);

      if (fetchError) throw fetchError;

      const newTotal = remainingItems?.reduce(
        (sum, item) => sum + Number(item.subtotal),
        0
      ) || 0;

      // Atualizar o total na comanda
      const { error: updateError } = await supabase
        .from("sales")
        .update({ subtotal: newTotal, total: newTotal })
        .eq("id", comanda.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Itens removidos com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["comandas-abertas"] });
      setItemsToRemove([]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Erro ao remover itens:", error);
      toast.error("Erro ao remover itens da comanda");
    },
  });

  const toggleItem = (itemId: string) => {
    setItemsToRemove((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleConfirm = () => {
    if (itemsToRemove.length === 0) {
      toast.info("Selecione itens para remover");
      return;
    }

    if (itemsToRemove.length === comanda.items?.length) {
      toast.error("Não é possível remover todos os itens. Use a opção de excluir comanda.");
      return;
    }

    removeItemsMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Comanda</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ShoppingBag className="h-4 w-4" />
            <span>Selecione os itens para remover</span>
          </div>

          <ScrollArea className="max-h-[400px] pr-4">
            <div className="space-y-2">
              {comanda.items?.map((item: any) => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`w-full p-3 rounded-lg border text-left transition-colors ${
                    itemsToRemove.includes(item.id)
                      ? "border-destructive bg-destructive/10"
                      : "border-border hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.quantity}x R$ {Number(item.unit_price).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="font-semibold">
                        R$ {Number(item.subtotal).toFixed(2)}
                      </div>
                      {itemsToRemove.includes(item.id) && (
                        <Trash2 className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>

          {itemsToRemove.length > 0 && (
            <div className="p-3 rounded-lg bg-accent/20 text-sm">
              <span className="font-medium">{itemsToRemove.length}</span> {itemsToRemove.length === 1 ? "item selecionado" : "itens selecionados"} para remoção
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={removeItemsMutation.isPending || itemsToRemove.length === 0}
          >
            {removeItemsMutation.isPending ? "Removendo..." : "Remover Itens"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
