import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SelectCustomerDialog } from "@/components/sales/SelectCustomerDialog";
import { toast } from "sonner";
import { Trash2, ShoppingBag, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    comanda.customer || null
  );
  const [notes, setNotes] = useState(comanda.notes || "");
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);

  const updateComandaMutation = useMutation({
    mutationFn: async () => {
      // Atualizar cliente e notas da comanda
      const { error: salesUpdateError } = await supabase
        .from("sales")
        .update({
          customer_id: selectedCustomer?.id || null,
          notes: notes.trim() || null,
        })
        .eq("id", comanda.id);

      if (salesUpdateError) throw salesUpdateError;

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
      toast.success("Comanda atualizada com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["comandas-abertas"] });
      setItemsToRemove([]);
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar comanda:", error);
      toast.error("Erro ao atualizar comanda");
    },
  });

  const toggleItem = (itemId: string) => {
    setItemsToRemove((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerSelect(false);
  };

  const handleConfirm = () => {
    if (itemsToRemove.length === comanda.items?.length) {
      toast.error("Não é possível remover todos os itens. Use a opção de excluir comanda.");
      return;
    }

    updateComandaMutation.mutate();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Comanda</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Cliente */}
            <div className="space-y-2">
              <Label>Cliente (opcional)</Label>
              
              {selectedCustomer ? (
                <Card className="p-3 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{selectedCustomer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.phone || "Sem telefone"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCustomer(null)}
                    >
                      Remover
                    </Button>
                  </div>
                </Card>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCustomerSelect(true)}
                  className="w-full"
                >
                  <User className="h-4 w-4 mr-2" />
                  Selecionar Cliente
                </Button>
              )}
            </div>

            {/* Descrição */}
            <div className="space-y-2">
              <Label htmlFor="notes">Descrição</Label>
              <Textarea
                id="notes"
                placeholder="Ex: Mesa 5, Balcão 3..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
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
            onClick={handleConfirm}
            disabled={updateComandaMutation.isPending}
          >
            {updateComandaMutation.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Dialog de Seleção de Cliente */}
    {showCustomerSelect && (
      <Dialog open={showCustomerSelect} onOpenChange={setShowCustomerSelect}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Selecionar Cliente</DialogTitle>
          </DialogHeader>
          <SelectCustomerDialog
            open={true}
            onOpenChange={() => {}}
            onSelectCustomer={handleSelectCustomer}
            onCreateNewCustomer={handleSelectCustomer}
            embedded={true}
            showCoupons={false}
          />
        </DialogContent>
      </Dialog>
    )}
    </>
  );
}
