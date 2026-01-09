import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Banknote, Smartphone, CreditCard, Bike, Key } from "lucide-react";

export type PaymentMethod = "cash" | "pix" | "pix_chave" | "debit" | "credit" | "ifood";

interface PaymentMethodSelectorProps {
  value: PaymentMethod | null;
  onChange: (value: PaymentMethod | null) => void;
}

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Forma de Pagamento *</label>
      <ToggleGroup
        type="single"
        value={value || ""}
        onValueChange={(v) => onChange(v as any)}
        className="grid grid-cols-3 gap-2"
      >
        <ToggleGroupItem
          value="cash"
          className="h-16 flex flex-col gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Banknote className="h-5 w-5" />
          <span className="text-xs">Dinheiro</span>
        </ToggleGroupItem>

        <ToggleGroupItem
          value="pix"
          className="h-16 flex flex-col gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Smartphone className="h-5 w-5" />
          <span className="text-xs">PIX</span>
        </ToggleGroupItem>

        <ToggleGroupItem
          value="pix_chave"
          className="h-16 flex flex-col gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Key className="h-5 w-5" />
          <span className="text-xs">PIX Chave</span>
        </ToggleGroupItem>

        <ToggleGroupItem
          value="debit"
          className="h-16 flex flex-col gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <CreditCard className="h-5 w-5" />
          <span className="text-xs">Débito</span>
        </ToggleGroupItem>

        <ToggleGroupItem
          value="credit"
          className="h-16 flex flex-col gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <CreditCard className="h-5 w-5" />
          <span className="text-xs">Crédito</span>
        </ToggleGroupItem>

        <ToggleGroupItem
          value="ifood"
          className="h-16 flex flex-col gap-1 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Bike className="h-5 w-5" />
          <span className="text-xs">IFood</span>
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}
