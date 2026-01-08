import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Eye, Check, FileText, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Transaction {
  id: string;
  description: string;
  amount: number;
  transaction_date: string;
  receipt_url: string | null;
  category: string;
}

export function PendingReimbursements() {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);
  const queryClient = useQueryClient();

  const { data: pendingTransactions = [], isLoading } = useQuery({
    queryKey: ["pending_reimbursements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("id, description, amount, transaction_date, receipt_url, category")
        .eq("reimbursement_status", "pending")
        .order("transaction_date", { ascending: false });

      if (error) throw error;
      return data as Transaction[];
    },
  });

  const handleViewReceipt = async (receiptPath: string) => {
    setIsLoadingReceipt(true);
    try {
      // Generate signed URL for private bucket access
      const { data, error } = await supabase.storage
        .from('receipts')
        .createSignedUrl(receiptPath, 3600); // 1 hour expiry
      
      if (error) {
        // Fallback: if it's already a full URL (old data), use it directly
        if (receiptPath.startsWith('http')) {
          setReceiptPreview(receiptPath);
        } else {
          console.error('Error generating signed URL:', error);
          toast.error('Erro ao carregar comprovante');
        }
      } else if (data?.signedUrl) {
        setReceiptPreview(data.signedUrl);
      }
    } catch (err) {
      console.error('Error loading receipt:', err);
      toast.error('Erro ao carregar comprovante');
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  const reimburseMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("financial_transactions")
        .update({
          reimbursement_status: "reimbursed",
          reimbursed_at: new Date().toISOString(),
        })
        .in("id", ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pending_reimbursements"] });
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      setSelectedIds([]);
      toast.success("Reembolso(s) marcado(s) como realizado(s)!");
    },
    onError: (error) => {
      console.error("Error reimbursing:", error);
      toast.error("Erro ao marcar reembolso");
    },
  });

  const totalPending = pendingTransactions.reduce((sum, t) => sum + Number(t.amount), 0);
  const selectedTotal = pendingTransactions
    .filter((t) => selectedIds.includes(t.id))
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === pendingTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(pendingTransactions.map((t) => t.id));
    }
  };

  const handleReimburse = (ids: string[]) => {
    reimburseMutation.mutate(ids);
  };

  const generateReport = () => {
    const reportLines = pendingTransactions.map((t) => {
      const date = format(new Date(t.transaction_date), "dd/MM", { locale: ptBR });
      return `${date} - ${t.description} - R$ ${Number(t.amount).toFixed(2)}`;
    });

    const report = `📋 REEMBOLSOS PENDENTES\n\n${reportLines.join("\n")}\n\n💰 Total: R$ ${totalPending.toFixed(2)}`;

    navigator.clipboard.writeText(report).then(() => {
      toast.success("Relatório copiado para a área de transferência!");
    });
  };

  if (isLoading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (pendingTransactions.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-8 text-center text-muted-foreground">
          <Check className="h-12 w-12 mx-auto mb-3 text-success" />
          <p>Nenhum reembolso pendente!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Reembolsos Pendentes</CardTitle>
            <Badge variant="destructive" className="text-sm">
              R$ {totalPending.toFixed(2)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {pendingTransactions.length} item(s) aguardando reembolso
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Actions */}
          <div className="flex items-center justify-between gap-2 pb-2 border-b">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedIds.length === pendingTransactions.length}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                {selectedIds.length > 0
                  ? `${selectedIds.length} selecionado(s) - R$ ${selectedTotal.toFixed(2)}`
                  : "Selecionar todos"}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={generateReport}>
              <FileText className="h-4 w-4 mr-1" />
              Copiar Relatório
            </Button>
          </div>

          {/* List */}
          {pendingTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group"
            >
              <Checkbox
                checked={selectedIds.includes(transaction.id)}
                onCheckedChange={() => toggleSelect(transaction.id)}
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">
                  {transaction.description}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs h-5">
                    {transaction.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(transaction.transaction_date), "dd/MM/yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-destructive">
                  R$ {Number(transaction.amount).toFixed(2)}
                </span>
                {transaction.receipt_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => handleViewReceipt(transaction.receipt_url!)}
                    disabled={isLoadingReceipt}
                  >
                    {isLoadingReceipt ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => handleReimburse([transaction.id])}
                  disabled={reimburseMutation.isPending}
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}

          {/* Batch reimburse button */}
          {selectedIds.length > 0 && (
            <Button
              className="w-full"
              onClick={() => handleReimburse(selectedIds)}
              disabled={reimburseMutation.isPending}
            >
              {reimburseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Marcar {selectedIds.length} como Reembolsado(s)
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Receipt preview dialog */}
      <Dialog open={!!receiptPreview} onOpenChange={() => setReceiptPreview(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Comprovante</DialogTitle>
          </DialogHeader>
          {receiptPreview && (
            <img
              src={receiptPreview}
              alt="Comprovante"
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
