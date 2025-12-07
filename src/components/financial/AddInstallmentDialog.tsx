import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, addMonths } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CurrencyInput } from "@/components/ui/currency-input";

const formSchema = z.object({
  description: z.string().trim().min(1, "Descrição é obrigatória").max(200),
  total_amount: z.string().min(1, "Valor total é obrigatório"),
  installments: z.string().min(1, "Número de parcelas é obrigatório"),
  first_due_date: z.date({ required_error: "Data de vencimento é obrigatória" }),
  category: z.string().min(1, "Categoria é obrigatória"),
});

type FormValues = z.infer<typeof formSchema>;

interface AddInstallmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  "Equipamentos",
  "Veículo",
  "Reforma",
  "Matéria-prima",
  "Outros",
];

export function AddInstallmentDialog({ open, onOpenChange }: AddInstallmentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
      total_amount: "",
      installments: "",
      category: "",
    },
  });

  const totalAmount = unformatCurrency(form.watch("total_amount") || "0");
  const installmentsCount = parseInt(form.watch("installments") || "1") || 1;
  const installmentValue = totalAmount / installmentsCount;

  const onSubmit = async (values: FormValues) => {
    try {
      setIsSubmitting(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Você precisa estar logado");
        return;
      }

      const totalValue = unformatCurrency(values.total_amount);
      const numInstallments = parseInt(values.installments);
      const installmentAmount = totalValue / numInstallments;

      // Create all installments
      const installments = [];
      for (let i = 0; i < numInstallments; i++) {
        const dueDate = addMonths(values.first_due_date, i);
        installments.push({
          transaction_type: "expense",
          description: `${values.description} (${i + 1}/${numInstallments})`,
          category: values.category,
          amount: installmentAmount,
          payment_method: "N/A",
          transaction_date: dueDate.toISOString(),
          created_by: user.id,
          recurrence_type: "installment",
          installment_current: i + 1,
          installment_total: numInstallments,
          due_date: format(dueDate, "yyyy-MM-dd"),
          is_paid: false,
        });
      }

      const { error } = await supabase.from("financial_transactions").insert(installments);

      if (error) throw error;

      toast.success(`${numInstallments} parcelas criadas com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ["financial_transactions"] });
      queryClient.invalidateQueries({ queryKey: ["bills_to_pay"] });
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating installments:", error);
      toast.error("Erro ao criar parcelas");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Despesa Parcelada</DialogTitle>
          <DialogDescription>
            Cadastre uma compra parcelada e as parcelas serão criadas automaticamente
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
                    <Input placeholder="Ex: Fogão Brastemp" {...field} maxLength={200} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="total_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor Total (R$)</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        placeholder="0,00"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="installments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parcelas</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Qtd" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={num.toString()}>
                            {num}x
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {totalAmount > 0 && installmentsCount > 0 && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <span className="text-muted-foreground">Valor de cada parcela: </span>
                <span className="font-semibold">R$ {installmentValue.toFixed(2)}</span>
              </div>
            )}

            <FormField
              control={form.control}
              name="first_due_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Vencimento da 1ª parcela</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "dd/MM/yyyy")
                          ) : (
                            <span>Selecione a data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) => date < new Date("2020-01-01")}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
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
                  "Criar Parcelas"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
