import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, TrendingUp, TrendingDown, Loader2, Edit2, Trash2, ChevronDown, Filter, X, CreditCard, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { startOfMonth, endOfMonth } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AddTransactionDialog } from "@/components/financial/AddTransactionDialog";
import { EditTransactionDialog } from "@/components/financial/EditTransactionDialog";
import { QuickExpenseCard } from "@/components/financial/QuickExpenseCard";
import { PendingReimbursements } from "@/components/financial/PendingReimbursements";
import { BillsToPay } from "@/components/financial/BillsToPay";
import { AddInstallmentDialog } from "@/components/financial/AddInstallmentDialog";
import { AddRecurringDialog } from "@/components/financial/AddRecurringDialog";
import { DateRangePicker } from "@/components/financial/DateRangePicker";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { DateRange } from "react-day-picker";

interface Transaction {
  id: string;
  transaction_type: "income" | "expense";
  description: string;
  amount: number;
  category: string;
  payment_method: string;
  transaction_date: string;
  reimbursement_status?: string | null;
  payment_source?: string | null;
}

export default function Financeiro() {
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [installmentDialogOpen, setInstallmentDialogOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  
  // Filtros avançados
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  
  const queryClient = useQueryClient();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["financial_transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("*")
        .eq("is_paid", true)
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
  });

  const getFilteredTransactions = () => {
    if (!dateRange.from || !dateRange.to) return transactions;

    const startDateString = dateRange.from.toISOString().split("T")[0];
    const endDateString = dateRange.to.toISOString().split("T")[0];

    return transactions.filter((t) => {
      const transactionDateString = new Date(t.transaction_date).toISOString().split("T")[0];
      const dateMatch = transactionDateString >= startDateString && transactionDateString <= endDateString;
      const typeMatch = filterType === "all" || t.transaction_type === filterType;
      const categoryMatch = filterCategory === "all" || t.category === filterCategory;
      const paymentMatch = filterPaymentMethod === "all" || t.payment_method === filterPaymentMethod;
      
      return dateMatch && typeMatch && categoryMatch && paymentMatch;
    });
  };

  const uniqueCategories = Array.from(new Set(transactions.map(t => t.category))).sort();
  const uniquePaymentMethods = Array.from(new Set(transactions.map(t => t.payment_method))).sort();

  const getPaymentMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      cash: "Dinheiro",
      pix: "PIX",
      debit: "Débito",
      credit: "Crédito",
      "N/A": "N/A",
    };
    return labels[method] || method;
  };

  const clearFilters = () => {
    setFilterType("all");
    setFilterCategory("all");
    setFilterPaymentMethod("all");
  };

  const hasActiveFilters = filterType !== "all" || filterCategory !== "all" || filterPaymentMethod !== "all";

  const filteredTransactions = getFilteredTransactions();

  const totalEntradas = filteredTransactions
    .filter((t) => t.transaction_type === "income")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalSaidas = filteredTransactions
    .filter((t) => t.transaction_type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const saldo = totalEntradas - totalSaidas;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("financial_transactions")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      toast.success("Transação excluída com sucesso!");
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);
    },
    onError: (error) => {
      console.error("Erro ao excluir transação:", error);
      toast.error("Erro ao excluir transação. Tente novamente.");
    },
  });

  const handleEdit = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (transactionToDelete) {
      deleteMutation.mutate(transactionToDelete);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md md:max-w-7xl mx-auto flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-md md:max-w-7xl mx-auto space-y-4 px-4 md:px-0">
      {/* Quick Expense Card */}
      <QuickExpenseCard />

      {/* Tabs */}
      <Tabs defaultValue="movimentacoes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
          <TabsTrigger value="reembolsos">Reembolsos</TabsTrigger>
          <TabsTrigger value="a-pagar">A Pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="movimentacoes" className="space-y-4 mt-4">
          {/* Period Filter and Actions */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <DateRangePicker 
                dateRange={dateRange} 
                onDateRangeChange={setDateRange} 
              />
              
              <Button 
                variant={showFilters ? "default" : "outline"} 
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
                {hasActiveFilters && <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center" variant="destructive">!</Badge>}
              </Button>
              
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-1" />
                  Limpar
                </Button>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nova
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Transação Simples
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setInstallmentDialogOpen(true)}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Despesa Parcelada
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setRecurringDialogOpen(true)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Despesa Recorrente
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tipo</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between">
                          {filterType === "all" ? "Todos" : filterType === "income" ? "Entrada" : "Saída"}
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        <DropdownMenuItem onClick={() => setFilterType("all")}>Todos</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterType("income")}>Entrada</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setFilterType("expense")}>Saída</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Categoria</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between">
                          {filterCategory === "all" ? "Todas" : filterCategory}
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full max-h-[300px] overflow-y-auto">
                        <DropdownMenuItem onClick={() => setFilterCategory("all")}>Todas</DropdownMenuItem>
                        {uniqueCategories.map((category) => (
                          <DropdownMenuItem key={category} onClick={() => setFilterCategory(category)}>
                            {category}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Pagamento</label>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full justify-between">
                          {filterPaymentMethod === "all" ? "Todos" : getPaymentMethodLabel(filterPaymentMethod)}
                          <ChevronDown className="h-4 w-4 ml-2" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="w-full">
                        <DropdownMenuItem onClick={() => setFilterPaymentMethod("all")}>Todos</DropdownMenuItem>
                        {uniquePaymentMethods.map((method) => (
                          <DropdownMenuItem key={method} onClick={() => setFilterPaymentMethod(method)}>
                            {getPaymentMethodLabel(method)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="shadow-sm bg-gradient-to-br from-success/10 to-success/5 border-success/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Entradas</p>
                    <p className="text-2xl font-bold text-success">R$ {totalEntradas.toFixed(2)}</p>
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
                    <p className="text-2xl font-bold text-destructive">R$ {totalSaidas.toFixed(2)}</p>
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
                    <p className="text-2xl font-bold text-primary">R$ {saldo.toFixed(2)}</p>
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
              {filteredTransactions.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma movimentação registrada para este período
                </p>
              ) : (
                filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 group"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`p-2 rounded-lg ${
                          transaction.transaction_type === "income"
                            ? "bg-success/10"
                            : "bg-destructive/10"
                        }`}
                      >
                        {transaction.transaction_type === "income" ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{transaction.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground">{transaction.category}</p>
                          <Badge variant="outline" className="text-xs h-5">
                            {getPaymentMethodLabel(transaction.payment_method)}
                          </Badge>
                          {transaction.reimbursement_status === "reimbursed" && (
                            <Badge variant="secondary" className="text-xs h-5">Reembolsado</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p
                          className={`font-semibold text-sm ${
                            transaction.transaction_type === "income"
                              ? "text-success"
                              : "text-destructive"
                          }`}
                        >
                          {transaction.transaction_type === "income" ? "+" : "-"}R${" "}
                          {Number(transaction.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const iso = new Date(transaction.transaction_date).toISOString().split("T")[0];
                            const [year, month, day] = iso.split("-");
                            return `${day}/${month}/${year}`;
                          })()}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEdit(transaction)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteClick(transaction.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reembolsos" className="mt-4">
          <PendingReimbursements />
        </TabsContent>

        <TabsContent value="a-pagar" className="mt-4">
          <BillsToPay />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddTransactionDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <AddInstallmentDialog open={installmentDialogOpen} onOpenChange={setInstallmentDialogOpen} />
      <AddRecurringDialog open={recurringDialogOpen} onOpenChange={setRecurringDialogOpen} />
      
      {selectedTransaction && (
        <EditTransactionDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          transaction={selectedTransaction}
        />
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
