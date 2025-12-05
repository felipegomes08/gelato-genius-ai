import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatCurrencyInput, unformatCurrency, formatNumberToBRL } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
}

const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const formatted = formatCurrencyInput(rawValue);
      onChange(formatted);
    };

    // Formata o valor inicial se for um número válido
    const displayValue = React.useMemo(() => {
      if (!value) return "";
      
      // Se já está formatado (contém vírgula), retorna como está
      if (value.includes(",")) return value;
      
      // Se é um número, formata
      const num = parseFloat(value);
      if (!isNaN(num)) {
        return formatNumberToBRL(num);
      }
      
      return value;
    }, [value]);

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        className={cn(className)}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";

export { CurrencyInput };

// Helper para obter o valor numérico de um CurrencyInput
export function getCurrencyValue(formattedValue: string): number {
  return unformatCurrency(formattedValue);
}
