import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

const formSchema = z.object({
  transaction_type: z.enum(["income", "expense"], {
    required_error: "Selecione o tipo de transação",
  }),
  description: z
    .string()
    .min(3, "Descrição deve ter no mínimo 3 caracteres")
    .max(100, "Descrição deve ter no máximo 100 caracteres"),
  category: z.string().min(1, "Selecione uma categoria"),
  amount: z
    .string()
    .min(1, "Digite o valor")
    .refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Valor deve ser maior que zero",
    }),
  transaction_date: z.string().min(1, "Selecione uma data"),
  notes: z.string().max(500, "Notas devem ter no máximo 500 caracteres").optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Transaction {
  id: string;
  transaction_type: "income" | "expense";
  description: string;
  amount: number;
  category: string;
  transaction_date: string;
  notes?: string | null;
}

interface EditTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

const CATEGORIES = [
  "Vendas",
  "Serviços",
  "Investimentos",
  "Empréstimos",
  "Fornecedores",
  "Salários",
  "Aluguel",
  "Contas",
  "Impostos",
  "Marketing",
  "Equipamentos",
  "Outros",
];

export function EditTransactionDialog({
  open,
  onOpenChange,
  transaction,
}: EditTransactionDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      transaction_type: "expense",
      description: "",
      category: "",
      amount: "",
      transaction_date: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  useEffect(() => {
    if (transaction) {
      form.reset({
        transaction_type: transaction.transaction_type,
        description: transaction.description,
        category: transaction.category,
        amount: transaction.amount.toString(),
        transaction_date: new Date(transaction.transaction_date).toISOString().split("T")[0],
        notes: transaction.notes || "",
      });
    }
  }, [transaction, form]);

  const updateMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      if (!transaction) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("financial_transactions")
        .update({
          transaction_type: values.transaction_type,
          description: values.description,
          category: values.category,
          amount: Number(values.amount),
          transaction_date: values.transaction_date,
          notes: values.notes || null,
        })
        .eq("id", transaction.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      toast.success("Transação atualizada com sucesso!");
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Erro ao atualizar transação:", error);
      toast.error("Erro ao atualizar transação. Tente novamente.");
    },
  });

  const onSubmit = (values: FormValues) => {
    updateMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Transação</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="transaction_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="income">Entrada</SelectItem>
                      <SelectItem value="expense">Saída</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Venda de produto" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="transaction_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Informações adicionais..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={updateMutation.isPending}
                className="flex-1"
              >
                {updateMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
