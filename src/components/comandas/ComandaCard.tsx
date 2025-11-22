import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AddItemsDialog } from "./AddItemsDialog";
import { CloseComandaDialog } from "./CloseComandaDialog";
import { Clock, Plus, DollarSign, ShoppingBag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ComandaCardProps {
  comanda: any;
}

export function ComandaCard({ comanda }: ComandaCardProps) {
  const [addItemsOpen, setAddItemsOpen] = useState(false);
  const [closeComandaOpen, setCloseComandaOpen] = useState(false);

  const itemsCount = comanda.items?.length || 0;
  const total = Number(comanda.total) || 0;
  
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
                <div className="text-sm text-muted-foreground">
                  {comanda.customer.name}
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
          <div className="flex gap-2 pt-2 border-t">
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
    </>
  );
}
