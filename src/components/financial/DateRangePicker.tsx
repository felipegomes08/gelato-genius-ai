import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CalendarIcon } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

const shortcuts = [
  { label: "Hoje", getValue: () => ({ from: new Date(), to: new Date() }) },
  { label: "Esta Semana", getValue: () => ({ from: startOfWeek(new Date(), { weekStartsOn: 0 }), to: endOfWeek(new Date(), { weekStartsOn: 0 }) }) },
  { label: "Este Mês", getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Mês Passado", getValue: () => ({ from: startOfMonth(subMonths(new Date(), 1)), to: endOfMonth(subMonths(new Date(), 1)) }) },
  { label: "Este Ano", getValue: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [tempRange, setTempRange] = useState<DateRange>(dateRange);

  const handleShortcut = (getValue: () => { from: Date; to: Date }) => {
    const range = getValue();
    setTempRange(range);
    onDateRangeChange(range);
    setOpen(false);
  };

  const handleApply = () => {
    if (tempRange.from && tempRange.to) {
      onDateRangeChange(tempRange);
    }
    setOpen(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTempRange(dateRange);
    }
    setOpen(isOpen);
  };

  const formatDateRange = () => {
    if (!dateRange.from || !dateRange.to) return "Selecionar período";
    
    if (isMobile) {
      return `${format(dateRange.from, "dd MMM", { locale: ptBR })} - ${format(dateRange.to, "dd MMM", { locale: ptBR })}`;
    }
    return `${format(dateRange.from, "dd 'de' MMMM", { locale: ptBR })} - ${format(dateRange.to, "dd 'de' MMMM", { locale: ptBR })}`;
  };

  const triggerButton = (
    <Button variant="outline" size="sm" className="justify-start">
      <CalendarIcon className="h-4 w-4 mr-2" />
      <span className="truncate">{formatDateRange()}</span>
    </Button>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetTrigger asChild>
          {triggerButton}
        </SheetTrigger>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-2xl">
          <SheetHeader className="mb-4">
            <SheetTitle>Selecionar Período</SheetTitle>
          </SheetHeader>
          
          <div className="flex flex-wrap gap-2 mb-4">
            {shortcuts.map((shortcut) => (
              <Button
                key={shortcut.label}
                variant="outline"
                size="sm"
                onClick={() => handleShortcut(shortcut.getValue)}
                className="rounded-full"
              >
                {shortcut.label}
              </Button>
            ))}
          </div>

          <div className="flex justify-center mb-4">
            <Calendar
              mode="range"
              selected={tempRange}
              onSelect={(range) => setTempRange(range || { from: undefined, to: undefined })}
              numberOfMonths={1}
              locale={ptBR}
              className={cn("p-3 pointer-events-auto")}
            />
          </div>

          <Button 
            onClick={handleApply} 
            className="w-full" 
            size="lg"
            disabled={!tempRange.from || !tempRange.to}
          >
            Aplicar
          </Button>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r p-3 space-y-1">
            {shortcuts.map((shortcut) => (
              <Button
                key={shortcut.label}
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                onClick={() => handleShortcut(shortcut.getValue)}
              >
                {shortcut.label}
              </Button>
            ))}
          </div>
          <div className="p-3">
            <Calendar
              mode="range"
              selected={tempRange}
              onSelect={(range) => setTempRange(range || { from: undefined, to: undefined })}
              numberOfMonths={2}
              locale={ptBR}
              className={cn("pointer-events-auto")}
            />
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button 
                size="sm" 
                onClick={handleApply}
                disabled={!tempRange.from || !tempRange.to}
              >
                Aplicar
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
