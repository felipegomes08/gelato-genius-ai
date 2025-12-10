import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ComandaCard } from "@/components/comandas/ComandaCard";
import { OpenComandaDialog } from "@/components/comandas/OpenComandaDialog";
import { Search, Plus, ClipboardList } from "lucide-react";

export default function Comandas() {
  const [searchTerm, setSearchTerm] = useState("");
  const [openDialogOpen, setOpenDialogOpen] = useState(false);

  // Buscar comandas abertas
  const { data: comandas, isLoading } = useQuery({
    queryKey: ["comandas-abertas", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("sales")
        .select(`
          *,
          customer:customers(id, name, phone),
          items:sale_items(
            id,
            product_id,
            product_name,
            quantity,
            unit_price,
            subtotal
          )
        `)
        .eq("status", "open")
        .order("created_at", { ascending: false });

      if (searchTerm) {
        query = query.or(`notes.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Calcular total real a partir dos items
  const totalValue = comandas?.reduce((sum, c) => {
    const comandaTotal = c.items?.reduce((itemSum: number, item: any) => {
      return itemSum + (Number(item.subtotal) || 0);
    }, 0) || 0;
    return sum + comandaTotal;
  }, 0) || 0;

  return (
    <div className="max-w-md md:max-w-7xl mx-auto space-y-4 pb-20 md:pb-6 px-4 md:px-0">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-sm text-muted-foreground">Comandas Abertas</div>
          <div className="text-2xl font-bold text-primary">{comandas?.length || 0}</div>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <div className="text-sm text-muted-foreground">Valor Total</div>
          <div className="text-2xl font-bold text-accent">
            R$ {totalValue.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Busca e botão nova comanda */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Buscar comanda..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setOpenDialogOpen(true)} className="flex-shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Nova
        </Button>
      </div>

      {/* Lista de comandas */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando comandas...
        </div>
      ) : comandas && comandas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {comandas.map((comanda) => (
            <ComandaCard key={comanda.id} comanda={comanda} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">Nenhuma comanda aberta</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => setOpenDialogOpen(true)}
          >
            Abrir primeira comanda
          </Button>
        </div>
      )}

      {/* Dialog para abrir nova comanda */}
      <OpenComandaDialog
        open={openDialogOpen}
        onOpenChange={setOpenDialogOpen}
      />
    </div>
  );
}
