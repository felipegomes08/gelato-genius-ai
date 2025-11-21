import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
}

interface EditCustomerDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditCustomerDialog({ customer, open, onOpenChange }: EditCustomerDialogProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone || "");
      setEmail(customer.email || "");
      setNotes(customer.notes || "");
    }
  }, [customer]);

  const updateCustomerMutation = useMutation({
    mutationFn: async () => {
      if (!customer) return;

      const { error } = await supabase
        .from("customers")
        .update({
          name,
          phone: phone || null,
          email: email || null,
          notes: notes || null,
        })
        .eq("id", customer.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Cliente atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar cliente:", error);
      toast.error(error.message || "Erro ao atualizar cliente");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCustomerMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do cliente"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-phone">Telefone</Label>
            <Input
              id="edit-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 98765-4321"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-email">E-mail</Label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="cliente@exemplo.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Observações</Label>
            <Textarea
              id="edit-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações sobre o cliente..."
              className="resize-none"
              rows={3}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={updateCustomerMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={updateCustomerMutation.isPending}>
              {updateCustomerMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
