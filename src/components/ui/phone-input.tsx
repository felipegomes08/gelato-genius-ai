import * as React from "react";
import { Input } from "@/components/ui/input";
import { formatPhone, unformatPhone } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: string;
  onChange: (value: string) => void;
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value;
      const unformatted = unformatPhone(rawValue);
      onChange(unformatted);
    };

    return (
      <Input
        ref={ref}
        type="tel"
        inputMode="numeric"
        value={formatPhone(value)}
        onChange={handleChange}
        className={cn(className)}
        {...props}
      />
    );
  }
);

PhoneInput.displayName = "PhoneInput";

export { PhoneInput };
