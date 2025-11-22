import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddItemsDialog } from "./AddItemsDialog";
import { CloseComandaDialog } from "./CloseComandaDialog";
import { EditComandaDialog } from "./EditComandaDialog";
import { DeleteComandaDialog } from "./DeleteComandaDialog";
import { Clock, Plus, DollarSign, ShoppingBag, Gift, Pencil, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ComandaCardProps {
  comanda: any;
}

export function ComandaCard({ comanda }: ComandaCardProps) {
  const [addItemsOpen, setAddItemsOpen] = useState(false);
  const [closeComandaOpen, setCloseComandaOpen] = useState(false);
  const [editComandaOpen, setEditComandaOpen] = useState(false);
  const [deleteComandaOpen, setDeleteComandaOpen] = useState(false);

  // Buscar cupons do cliente se houver
  const { data: customerCoupons } = useQuery({
    queryKey: ["customer-coupons-preview", comanda.customer?.id],
    queryFn: async () => {
      if (!comanda.customer?.id) return [];
      
      const { data, error } = await supabase
        .from("coupons")
        .select("id")
        .eq("customer_id", comanda.customer.id)
        .eq("is_active", true)
        .eq("is_used", false)
        .gte("expire_at", new Date().toISOString());

      if (error) throw error;
      return data;
    },
    enabled: !!comanda.customer?.id,
  });

  // Calcular total correto a partir dos items
  const itemsCount = comanda.items?.length || 0;
  const total = comanda.items?.reduce((sum: number, item: any) => {
    return sum + (Number(item.subtotal) || 0);
  }, 0) || 0;
  
  const timeOpen = formatDistanceToNow(new Date(comanda.created_at), {
    addSuffix: false,
    locale: ptBR,
  });

  // Determinar cor do alerta baseado no tempo
  const getTimeColor = () => {
    const hours = (Date.now() - new Date(comanda.created_at).getTime()) / (1000 * 60 * 60);
    if (hours >= 2) return "text-destructive";
    if (hours >= 1) return "text-yellow-600";
    return "text-muted-foreground";
  };

  return (
    <>
      <Card className="p-4 hover:shadow-lg transition-shadow">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-semibold text-lg">
                {comanda.notes || "Comanda sem nome"}
              </div>
              {comanda.customer && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="text-sm text-muted-foreground">
                    {comanda.customer.name}
                  </div>
                  {customerCoupons && customerCoupons.length > 0 && (
                    <Badge variant="secondary" className="gap-1 text-xs h-5">
                      <Gift className="h-3 w-3" />
                      {customerCoupons.length}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <Badge variant="secondary" className="bg-accent/20 text-accent-foreground">
              #{comanda.created_at.slice(0, 8)}
            </Badge>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 py-2">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <ShoppingBag className="h-3 w-3" />
              </div>
              <div className="text-sm font-medium">{itemsCount}</div>
              <div className="text-xs text-muted-foreground">
                {itemsCount === 1 ? "item" : "itens"}
              </div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" />
              </div>
              <div className="text-sm font-medium">R$ {total.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground">total</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Clock className="h-3 w-3" />
              </div>
              <div className={`text-sm font-medium ${getTimeColor()}`}>{timeOpen}</div>
              <div className="text-xs text-muted-foreground">aberta</div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setAddItemsOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
              <Button
                size="sm"
                className="flex-1"
                onClick={() => setCloseComandaOpen(true)}
              >
                Fechar
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setEditComandaOpen(true)}
              >
                <Pencil className="h-4 w-4 mr-1" />
                Editar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="flex-1"
                onClick={() => setDeleteComandaOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Dialogs */}
      <AddItemsDialog
        open={addItemsOpen}
        onOpenChange={setAddItemsOpen}
        comanda={comanda}
      />
      <CloseComandaDialog
        open={closeComandaOpen}
        onOpenChange={setCloseComandaOpen}
        comanda={comanda}
      />
      <EditComandaDialog
        open={editComandaOpen}
        onOpenChange={setEditComandaOpen}
        comanda={comanda}
      />
      <DeleteComandaDialog
        open={deleteComandaOpen}
        onOpenChange={setDeleteComandaOpen}
        comanda={comanda}
      />
    </>
  );
}
