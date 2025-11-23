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
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState("");
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  
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

      // Validação: precisa ter cliente OU descrição
      if (!selectedCustomer && !notes.trim()) {
        throw new Error("Informe um cliente ou uma descrição para a comanda");
      }

      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          status: "open",
          customer_id: selectedCustomer?.id || null,
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
      const successMsg = selectedCustomer 
        ? `Comanda aberta para ${selectedCustomer.name}!`
        : `Comanda aberta: ${notes}`;
      toast.success(successMsg);
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
    setSelectedCustomer(null);
    setNotes("");
    setShowCustomerSelect(false);
  };

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerSelect(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação
    if (!selectedCustomer && !notes.trim()) {
      toast.error("Informe um cliente ou uma descrição para a comanda");
      return;
    }
    
    openComandaMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Comanda</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cliente (Opcional) */}
          <div className="space-y-3">
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
                Selecionar Cliente
              </Button>
            )}

            {/* Preview de Cupons Disponíveis */}
            {selectedCustomer && customerCoupons && customerCoupons.length > 0 && (
              <Alert>
                <Gift className="h-4 w-4" />
                <AlertDescription>
                  Este cliente possui <strong>{customerCoupons.length} cupom(ns) disponível(is)</strong> para usar no fechamento
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Descrição/Identificação */}
          <div className="space-y-2">
            <Label htmlFor="notes">
              Descrição da Comanda {!selectedCustomer && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="notes"
              placeholder="Ex: Mesa 5, Balcão 3, Cliente da camisa azul..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              required={!selectedCustomer}
            />
            <p className="text-xs text-muted-foreground">
              {selectedCustomer 
                ? "Identificação adicional para a comanda (opcional)"
                : "Obrigatório quando não há cliente selecionado"}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
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
      </DialogContent>
    </Dialog>
  );
}
