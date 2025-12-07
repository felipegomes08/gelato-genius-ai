import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { unformatCurrency } from "@/lib/formatters";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { CurrencyInput } from "@/components/ui/currency-input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const formSchema = z.object({
  description: z.string().trim().min(1, "Descrição é obrigatória").max(200),
  is_fixed: z.boolean(),
  amount: z.string().optional(),
  due_day: z.string().min(1, "Dia de vencimento é obrigatório"),
  category: z.string().min(1, "Categoria é obrigatória"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  "Aluguel",
  "Água",
  "Energia",
  "Internet",
  "Telefone",
  "Salários",
  "Contador",
  "Outros",
];

export function AddRecurringDialog({ open, onOpenChange }: AddRecurringDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      is_fixed: true,
      amount: "",
      due_day: "",
      category: "",
    },
  });

  const isFixed = form.watch("is_fixed");

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado");
        return;
      }

      const amountValue = values.is_fixed && values.amount 
        ? unformatCurrency(values.amount) 
        : null;

      if (values.is_fixed && (!amountValue || amountValue <= 0)) {
        toast.error("Informe o valor para despesas fixas");
        return;
      }

      // Calculate next due date
      const today = new Date();
      const dueDay = parseInt(values.due_day);
      let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay);
      
      // If due date has passed this month, set for next month
      if (dueDate < today) {
        dueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
      }

      const { error } = await supabase.from("financial_transactions").insert({
        transaction_type: "expense",
        description: values.description,
        category: values.category,
        amount: amountValue || 0,
        payment_method: "N/A",
        transaction_date: dueDate.toISOString(),
        created_by: user.id,
        recurrence_type: values.is_fixed ? "fixed" : "variable",
        due_date: dueDate.toISOString().split("T")[0],
        is_paid: false,
      });

      if (error) throw error;

      toast.success("Despesa recorrente criada!");
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bills_to_pay"] });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating recurring expense:", error);
      toast.error("Erro ao criar despesa recorrente");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Despesa Recorrente</DialogTitle>
          <DialogDescription>
            Cadastre despesas fixas (aluguel) ou variáveis (água, luz)
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Aluguel, Conta de Luz" {...field} maxLength={200} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_fixed"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Tipo de despesa</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      {field.value ? "Valor fixo todo mês" : "Valor varia (preencher na hora)"}
                    </p>
                  </div>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Label className={!field.value ? "font-semibold" : "text-muted-foreground"}>
                        Variável
                      </Label>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <Label className={field.value ? "font-semibold" : "text-muted-foreground"}>
                        Fixo
                      </Label>
                    </div>
                  </FormControl>
                </FormItem>
              )}
            />

            {isFixed && (
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor (R$)</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        placeholder="0,00"
                        value={field.value || ""}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="due_day"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vencimento todo dia</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Dia do mês" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          Dia {day}
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
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
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

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Recorrência"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
