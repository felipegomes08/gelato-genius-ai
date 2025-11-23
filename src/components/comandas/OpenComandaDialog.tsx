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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SelectCustomerDialog } from "@/components/sales/SelectCustomerDialog";
import { toast } from "sonner";
import { Loader2, Gift, ArrowLeft } from "lucide-react";

interface OpenComandaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expire_at: string;
  is_active: boolean;
  is_used: boolean;
}

export function OpenComandaDialog({ open, onOpenChange }: OpenComandaDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState("");
  
  const queryClient = useQueryClient();

  // Buscar cupons do cliente selecionado
  const { data: customerCoupons } = useQuery({
    queryKey: ["customer-coupons", selectedCustomer?.id],
    queryFn: async () => {
      if (!selectedCustomer?.id) return [];
      
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("customer_id", selectedCustomer.id)
        .eq("is_active", true)
        .eq("is_used", false)
        .gte("expire_at", new Date().toISOString())
        .order("expire_at");

      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!selectedCustomer?.id,
  });

  const openComandaMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          status: "open",
          customer_id: selectedCustomer!.id,
          notes: notes.trim() || null,
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
      toast.success(`Comanda aberta para ${selectedCustomer?.name}!`);
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
    setStep(1);
    setSelectedCustomer(null);
    setNotes("");
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setStep(2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openComandaMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? "Nova Comanda - Selecionar Cliente" : "Nova Comanda - Identificação"}
          </DialogTitle>
        </DialogHeader>

        {/* Etapa 1: Seleção de Cliente */}
        {step === 1 && (
          <div className="space-y-4">
            <SelectCustomerDialog
              open={true}
              onOpenChange={() => {}}
              onSelectCustomer={handleSelectCustomer}
              onCreateNewCustomer={handleSelectCustomer}
              embedded={true}
              showCoupons={false}
            />
            
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  resetForm();
                  onOpenChange(false);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (selectedCustomer) {
                    setStep(2);
                  } else {
                    toast.error("Selecione um cliente");
                  }
                }}
                disabled={!selectedCustomer}
                className="flex-1"
              >
                Continuar
              </Button>
            </div>
          </div>
        )}

        {/* Etapa 2: Identificação da Comanda */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Cliente Selecionado */}
            <Card className="p-3 bg-muted/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{selectedCustomer?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedCustomer?.phone || "Sem telefone"}
                  </p>
                </div>
                <Badge variant="outline">Cliente selecionado</Badge>
              </div>
            </Card>

            {/* Preview de Cupons Disponíveis */}
            {customerCoupons && customerCoupons.length > 0 && (
              <Alert>
                <Gift className="h-4 w-4" />
                <AlertDescription>
                  Este cliente possui <strong>{customerCoupons.length} cupom(ns) disponível(is)</strong> para usar no fechamento da comanda
                </AlertDescription>
              </Alert>
            )}

            {/* Identificação da Comanda */}
            <div className="space-y-2">
              <Label htmlFor="notes">Identificação da Comanda (opcional)</Label>
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                disabled={openComandaMutation.isPending}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <Button type="submit" disabled={openComandaMutation.isPending}>
                {openComandaMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Abrir Comanda
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
