import { useState } from "react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Calendar } from "lucide-react";

interface Transaction {
  id: string;
  type: "entrada" | "saida";
  title: string;
  amount: number;
  category: string;
  date: string;
}

const mockTransactions: Transaction[] = [
  {
    id: "1",
    type: "entrada",
    title: "Vendas do dia",
    amount: 2450.0,
    category: "Vendas",
    date: "2024-01-15",
  },
  {
    id: "2",
    type: "saida",
    title: "Compra de ingredientes",
    amount: 680.0,
    category: "Matéria-prima",
    date: "2024-01-15",
  },
  {
    id: "3",
    type: "saida",
    title: "Conta de energia",
    amount: 320.0,
    category: "Despesas fixas",
    date: "2024-01-14",
  },
  {
    id: "4",
    type: "entrada",
    title: "Vendas do dia",
    amount: 1890.0,
    category: "Vendas",
    date: "2024-01-14",
  },
];

export default function Financeiro() {
  const [period] = useState("Hoje");

  const totalEntradas = mockTransactions
    .filter((t) => t.type === "entrada")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSaidas = mockTransactions
    .filter((t) => t.type === "saida")
    .reduce((sum, t) => sum + t.amount, 0);

  const saldo = totalEntradas - totalSaidas;

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
          <Button size="sm" className="shadow-sm">
            <Plus className="h-4 w-4 mr-2" />
            Nova Saída
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
            {mockTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${
                      transaction.type === "entrada"
                        ? "bg-success/10"
                        : "bg-destructive/10"
                    }`}
                  >
                    {transaction.type === "entrada" ? (
                      <TrendingUp className="h-4 w-4 text-success" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{transaction.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {transaction.category}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`font-semibold text-sm ${
                      transaction.type === "entrada"
                        ? "text-success"
                        : "text-destructive"
                    }`}
                  >
                    {transaction.type === "entrada" ? "+" : "-"}R${" "}
                    {transaction.amount.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(transaction.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
