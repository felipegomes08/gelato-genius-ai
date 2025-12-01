import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Task } from "@/hooks/useTasks";

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<Task> & { id: string }) => void;
  task: Task | null;
  profiles: { id: string; full_name: string }[];
  isLoading?: boolean;
}

const dayOptions = [
  { value: "0", label: "Domingo" },
  { value: "1", label: "Segunda-feira" },
  { value: "2", label: "Terça-feira" },
  { value: "3", label: "Quarta-feira" },
  { value: "4", label: "Quinta-feira" },
  { value: "5", label: "Sexta-feira" },
  { value: "6", label: "Sábado" },
];

export function EditTaskDialog({
  open,
  onOpenChange,
  onSubmit,
  task,
  profiles,
  isLoading,
}: EditTaskDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [dueDate, setDueDate] = useState<Date>();
  const [recurrenceType, setRecurrenceType] = useState("weekly");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [weekParity, setWeekParity] = useState("odd");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || "");
      setAssignedTo(task.assigned_to);
      setIsRecurring(task.is_recurring);
      setDueDate(task.due_date ? parseISO(task.due_date) : undefined);
      setRecurrenceType(task.recurrence_type || "weekly");
      setDayOfWeek(String(task.recurrence_day_of_week ?? 1));
      setDayOfMonth(String(task.recurrence_day_of_month ?? 1));
      setWeekParity(task.recurrence_week_parity || "odd");
      setStartDate(task.recurrence_start_date ? parseISO(task.recurrence_start_date) : new Date());
      setEndDate(task.recurrence_end_date ? parseISO(task.recurrence_end_date) : undefined);
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !title.trim() || !assignedTo) return;

    const data: Partial<Task> & { id: string } = {
      id: task.id,
      title: title.trim(),
      description: description.trim() || null,
      assigned_to: assignedTo,
      is_recurring: isRecurring,
    };

    if (isRecurring) {
      data.recurrence_type = recurrenceType;
      data.recurrence_start_date = format(startDate, 'yyyy-MM-dd');
      data.recurrence_end_date = endDate ? format(endDate, 'yyyy-MM-dd') : null;
      data.due_date = null;

      if (recurrenceType === 'weekly' || recurrenceType === 'biweekly') {
        data.recurrence_day_of_week = parseInt(dayOfWeek);
      } else {
        data.recurrence_day_of_week = null;
      }
      if (recurrenceType === 'biweekly') {
        data.recurrence_week_parity = weekParity;
      } else {
        data.recurrence_week_parity = null;
      }
      if (recurrenceType === 'monthly_date') {
        data.recurrence_day_of_month = parseInt(dayOfMonth);
      } else {
        data.recurrence_day_of_month = null;
      }
    } else {
      data.due_date = dueDate ? format(dueDate, 'yyyy-MM-dd') : null;
      data.recurrence_type = null;
      data.recurrence_day_of_week = null;
      data.recurrence_day_of_month = null;
      data.recurrence_week_parity = null;
      data.recurrence_start_date = null;
      data.recurrence_end_date = null;
    }

    onSubmit(data);
    onOpenChange(false);
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Tarefa</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-title">Título *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-description">Descrição</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Funcionário *</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o funcionário" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Frequência</Label>
            <RadioGroup
              value={isRecurring ? "recurring" : "single"}
              onValueChange={(v) => setIsRecurring(v === "recurring")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="edit-single" />
                <Label htmlFor="edit-single" className="font-normal">Data única</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="recurring" id="edit-recurring" />
                <Label htmlFor="edit-recurring" className="font-normal">Repetir</Label>
              </div>
            </RadioGroup>
          </div>

          {!isRecurring ? (
            <div className="space-y-2">
              <Label>Data</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP", { locale: ptBR }) : "Selecione a data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Tipo de repetição</Label>
                <Select value={recurrenceType} onValueChange={setRecurrenceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Toda semana</SelectItem>
                    <SelectItem value="biweekly">Semana sim, semana não</SelectItem>
                    <SelectItem value="monthly_date">Todo mês (dia fixo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(recurrenceType === 'weekly' || recurrenceType === 'biweekly') && (
                <div className="space-y-2">
                  <Label>Dia da semana</Label>
                  <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayOptions.map((day) => (
                        <SelectItem key={day.value} value={day.value}>
                          {day.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {recurrenceType === 'biweekly' && (
                <div className="space-y-2">
                  <Label>Começa em semana</Label>
                  <Select value={weekParity} onValueChange={setWeekParity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="odd">Ímpar</SelectItem>
                      <SelectItem value="even">Par</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {recurrenceType === 'monthly_date' && (
                <div className="space-y-2">
                  <Label>Dia do mês</Label>
                  <Select value={dayOfMonth} onValueChange={setDayOfMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 31 }, (_, i) => (
                        <SelectItem key={i + 1} value={String(i + 1)}>
                          Dia {i + 1}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(startDate, "dd/MM/yy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={(d) => d && setStartDate(d)}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>Fim (opcional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yy") : "—"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !title.trim() || !assignedTo}>
              Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}