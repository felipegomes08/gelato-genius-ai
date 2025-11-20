import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Calendar, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddTransactionDialog } from "@/components/financial/AddTransactionDialog";

interface Transaction {
  id: string;
  transaction_type: "entrada" | "saida";
  description: string;
  amount: number;
  category: string;
  transaction_date: string;
}

export default function Financeiro() {
  const [period] = useState("Hoje");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["financial_transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
  });

  const totalEntradas = transactions
    .filter((t) => t.transaction_type === "entrada")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalSaidas = transactions
    .filter((t) => t.transaction_type === "saida")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const saldo = totalEntradas - totalSaidas;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header title="Financeiro" />
        <main className="max-w-md mx-auto p-4 flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Financeiro" />

      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Period Filter */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm">
            <Calendar className="h-4 w-4 mr-2" />
            {period}
          </Button>
          <Button size="sm" className="shadow-sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Transação
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-3">
          <Card className="shadow-sm bg-gradient-to-br from-success/10 to-success/5 border-success/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Entradas
                  </p>
                  <p className="text-2xl font-bold text-success">
                    R$ {totalEntradas.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-success/20 rounded-full">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Saídas</p>
                  <p className="text-2xl font-bold text-destructive">
                    R$ {totalSaidas.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-destructive/20 rounded-full">
                  <TrendingDown className="h-6 w-6 text-destructive" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Saldo</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {saldo.toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Transactions List */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Movimentações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transactions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma movimentação registrada
              </p>
            ) : (
              transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        transaction.transaction_type === "entrada"
                          ? "bg-success/10"
                          : "bg-destructive/10"
                      }`}
                    >
                      {transaction.transaction_type === "entrada" ? (
                        <TrendingUp className="h-4 w-4 text-success" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{transaction.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {transaction.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold text-sm ${
                        transaction.transaction_type === "entrada"
                          ? "text-success"
                          : "text-destructive"
                      }`}
                    >
                      {transaction.transaction_type === "entrada" ? "+" : "-"}R${" "}
                      {Number(transaction.amount).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(transaction.transaction_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNav />

      <AddTransactionDialog 
        open={addDialogOpen} 
        onOpenChange={setAddDialogOpen}
      />
    </div>
  );
}
