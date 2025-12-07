import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, AlertTriangle, Clock, Loader2, CalendarDays } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, isAfter, isBefore, addDays, startOfDay, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CurrencyInput } from "@/components/ui/currency-input";
import { unformatCurrency } from "@/lib/formatters";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Bill {
  id: string;
  description: string;
  amount: number;
  due_date: string;
  recurrence_type: string | null;
  installment_current: number | null;
  installment_total: number | null;
  is_paid: boolean;
  category: string;
}

export function BillsToPay() {
  const [payDialogOpen, setPayDialogOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const queryClient = useQueryClient();

  const { data: bills = [], isLoading } = useQuery({
    queryKey: ["bills_to_pay"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("id, description, amount, due_date, recurrence_type, installment_current, installment_total, is_paid, category")
        .eq("is_paid", false)
        .eq("transaction_type", "expense")
        .not("due_date", "is", null)
        .order("due_date", { ascending: true });

      if (error) throw error;
      return data as Bill[];
    },
  });

  const payMutation = useMutation({
    mutationFn: async ({ id, amount, bill }: { id: string; amount: number; bill: Bill }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Mark as paid
      const { error } = await supabase
        .from("financial_transactions")
        .update({
          is_paid: true,
          amount: amount,
          transaction_date: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) throw error;

      // If it's a recurring expense, create next month's entry
      if (bill.recurrence_type === "fixed" || bill.recurrence_type === "variable") {
        const nextDueDate = addMonths(new Date(bill.due_date), 1);
        
        await supabase.from("financial_transactions").insert({
          transaction_type: "expense",
          description: bill.description,
          category: bill.category,
          amount: bill.recurrence_type === "fixed" ? bill.amount : 0,
          payment_method: "N/A",
          transaction_date: nextDueDate.toISOString(),
          created_by: user.id,
          recurrence_type: bill.recurrence_type,
          due_date: format(nextDueDate, "yyyy-MM-dd"),
          is_paid: false,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills_to_pay"] });
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      toast.success("Conta paga com sucesso!");
      setPayDialogOpen(false);
      setSelectedBill(null);
      setPayAmount("");
    },
    onError: (error) => {
      console.error("Error paying bill:", error);
      toast.error("Erro ao marcar como pago");
    },
  });

  const today = startOfDay(new Date());
  const weekFromNow = addDays(today, 7);

  const overdueBills = bills.filter((b) => isBefore(new Date(b.due_date), today));
  const thisWeekBills = bills.filter(
    (b) =>
      !isBefore(new Date(b.due_date), today) &&
      !isAfter(new Date(b.due_date), weekFromNow)
  );
  const upcomingBills = bills.filter((b) => isAfter(new Date(b.due_date), weekFromNow));

  const handlePay = (bill: Bill) => {
    setSelectedBill(bill);
    setPayAmount(bill.amount > 0 ? bill.amount.toFixed(2).replace(".", ",") : "");
    setPayDialogOpen(true);
  };

  const confirmPay = () => {
    if (!selectedBill) return;
    
    const amount = unformatCurrency(payAmount);
    if (amount <= 0) {
      toast.error("Informe o valor pago");
      return;
    }

    payMutation.mutate({ id: selectedBill.id, amount, bill: selectedBill });
  };

  const getBillBadge = (bill: Bill) => {
    if (bill.recurrence_type === "installment") {
      return (
        <Badge variant="outline" className="text-xs">
          {bill.installment_current}/{bill.installment_total}
        </Badge>
      );
    }
    if (bill.recurrence_type === "fixed") {
      return <Badge variant="secondary" className="text-xs">Fixo</Badge>;
    }
    if (bill.recurrence_type === "variable") {
      return <Badge variant="outline" className="text-xs">Variável</Badge>;
    }
    return null;
  };

  const renderBillItem = (bill: Bill, isOverdue: boolean = false) => (
    <div
      key={bill.id}
      className={`flex items-center justify-between p-3 rounded-lg ${
        isOverdue ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50"
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {isOverdue && <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />}
          <p className="font-medium text-sm truncate">{bill.description}</p>
          {getBillBadge(bill)}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <Badge variant="outline" className="text-xs h-5">
            {bill.category}
          </Badge>
          <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
            {isOverdue ? "Venceu " : "Vence "}
            {format(new Date(bill.due_date), "dd/MM", { locale: ptBR })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm">
          {bill.amount > 0 ? `R$ ${bill.amount.toFixed(2)}` : "A definir"}
        </span>
        <Button
          variant={isOverdue ? "destructive" : "outline"}
          size="sm"
          className="h-8"
          onClick={() => handlePay(bill)}
        >
          <Check className="h-4 w-4 mr-1" />
          Pagar
        </Button>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (bills.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-8 text-center text-muted-foreground">
          <CalendarDays className="h-12 w-12 mx-auto mb-3 text-success" />
          <p>Nenhuma conta pendente!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {/* Overdue */}
        {overdueBills.length > 0 && (
          <Card className="shadow-sm border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Vencidas ({overdueBills.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overdueBills.map((bill) => renderBillItem(bill, true))}
            </CardContent>
          </Card>
        )}

        {/* This week */}
        {thisWeekBills.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-5 w-5 text-warning" />
                Esta Semana ({thisWeekBills.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {thisWeekBills.map((bill) => renderBillItem(bill))}
            </CardContent>
          </Card>
        )}

        {/* Upcoming */}
        {upcomingBills.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                Próximas ({upcomingBills.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {upcomingBills.map((bill) => renderBillItem(bill))}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Pay dialog */}
      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
          </DialogHeader>
          {selectedBill && (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{selectedBill.description}</p>
                <p className="text-sm text-muted-foreground">
                  Vencimento: {format(new Date(selectedBill.due_date), "dd/MM/yyyy")}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Valor pago (R$)</Label>
                <CurrencyInput
                  placeholder="0,00"
                  value={payAmount}
                  onChange={setPayAmount}
                  autoFocus
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmPay} disabled={payMutation.isPending}>
              {payMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Confirmar Pagamento"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
