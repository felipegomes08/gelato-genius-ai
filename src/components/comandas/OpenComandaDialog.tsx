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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface OpenComandaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenComandaDialog({ open, onOpenChange }: OpenComandaDialogProps) {
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  
  const queryClient = useQueryClient();

  const openComandaMutation = useMutation({
    mutationFn: async () => {
      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Criar ou buscar cliente (se tiver nome)
      let customerId = null;
      if (customerName.trim()) {
        // Buscar cliente existente
        const { data: existingCustomer } = await supabase
          .from("customers")
          .select("id")
          .eq("name", customerName.trim())
          .maybeSingle();

        if (existingCustomer) {
          customerId = existingCustomer.id;
        } else {
          // Criar novo cliente
          const { data: newCustomer, error: customerError } = await supabase
            .from("customers")
            .insert({
              name: customerName.trim(),
              phone: customerPhone.trim() || null,
              created_by: user.id,
            })
            .select()
            .single();

          if (customerError) throw customerError;
          customerId = newCustomer.id;
        }
      }

      // Criar venda com status "open"
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          status: "open",
          customer_id: customerId,
          notes: notes.trim() || customerName.trim() || "Comanda",
          payment_method: "pending",
          subtotal: 0,
          discount_amount: 0,
          total: 0,
          created_by: user.id,
        })
        .select()
        .single();

      if (saleError) throw saleError;
      return sale;
    },
    onSuccess: () => {
      toast.success("Comanda aberta com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["comandas-abertas"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Erro ao abrir comanda:", error);
      toast.error("Erro ao abrir comanda");
    },
  });

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setNotes("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() && !notes.trim()) {
      toast.error("Informe pelo menos um nome ou identificação");
      return;
    }
    openComandaMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Nova Comanda</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Nome do Cliente</Label>
              <Input
                id="customer-name"
                placeholder="Ex: João Silva"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer-phone">Telefone (opcional)</Label>
              <Input
                id="customer-phone"
                placeholder="(11) 98765-4321"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Identificação da Comanda</Label>
              <Textarea
                id="notes"
                placeholder="Ex: Mesa 5, Balcão 3, Cliente da camisa azul..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Use para identificar a comanda (mesa, balcão, etc)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={openComandaMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={openComandaMutation.isPending}>
              {openComandaMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Abrir Comanda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
