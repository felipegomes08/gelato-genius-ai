import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";

interface DeleteComandaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  comanda: any;
}

export function DeleteComandaDialog({
  open,
  onOpenChange,
  comanda,
}: DeleteComandaDialogProps) {
  const queryClient = useQueryClient();

  const deleteComandaMutation = useMutation({
    mutationFn: async () => {
      // Deletar os itens da comanda primeiro
      const { error: itemsError } = await supabase
        .from("sale_items")
        .delete()
        .eq("sale_id", comanda.id);

      if (itemsError) throw itemsError;

      // Deletar a comanda
      const { error: saleError } = await supabase
        .from("sales")
        .delete()
        .eq("id", comanda.id);

      if (saleError) throw saleError;
    },
    onSuccess: () => {
      toast.success("Comanda excluída com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["comandas-abertas"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Erro ao excluir comanda:", error);
      toast.error("Erro ao excluir comanda");
    },
  });

  const total = comanda.items?.reduce((sum: number, item: any) => {
    return sum + (Number(item.subtotal) || 0);
  }, 0) || 0;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir comanda?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <div>
              Esta ação não pode ser desfeita. Todos os dados desta comanda serão
              permanentemente removidos.
            </div>
            <div className="p-3 rounded-lg bg-muted mt-3">
              <div className="font-medium">{comanda.notes || "Comanda sem nome"}</div>
              {comanda.customer && (
                <div className="text-sm text-muted-foreground mt-1">
                  Cliente: {comanda.customer.name}
                </div>
              )}
              <div className="text-sm text-muted-foreground mt-1">
                {comanda.items?.length || 0} {comanda.items?.length === 1 ? "item" : "itens"} • R$ {total.toFixed(2)}
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteComandaMutation.mutate()}
            disabled={deleteComandaMutation.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteComandaMutation.isPending ? "Excluindo..." : "Excluir"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
