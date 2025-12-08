import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, Send, Calendar, Users } from "lucide-react";
import { format } from "date-fns";

interface CreateNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateNotificationDialog({ open, onOpenChange }: CreateNotificationDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [sendType, setSendType] = useState<"now" | "scheduled">("now");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [recurrenceDayOfWeek, setRecurrenceDayOfWeek] = useState("1");
  const [recurrenceDayOfMonth, setRecurrenceDayOfMonth] = useState("1");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  // Fetch all users for selection
  const { data: users = [] } = useQuery({
    queryKey: ["all-users-for-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;
      return data;
    },
  });

  const createNotificationMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!title.trim() || !message.trim()) {
        throw new Error("Título e mensagem são obrigatórios");
      }
      if (targetType === "specific" && selectedUsers.length === 0) {
        throw new Error("Selecione pelo menos um usuário");
      }

      let scheduledAt: string | null = null;
      if (sendType === "scheduled" && scheduledDate && scheduledTime) {
        scheduledAt = `${scheduledDate}T${scheduledTime}:00`;
      }

      // Create notification record
      const { data: notification, error: notifError } = await supabase
        .from("notifications")
        .insert({
          title: title.trim(),
          message: message.trim(),
          created_by: user.id,
          target_type: targetType,
          target_user_ids: targetType === "specific" ? selectedUsers : null,
          scheduled_at: scheduledAt,
          is_recurring: isRecurring,
          recurrence_type: isRecurring ? recurrenceType : null,
          recurrence_day_of_week: isRecurring && recurrenceType === "weekly" ? parseInt(recurrenceDayOfWeek) : null,
          recurrence_day_of_month: isRecurring && recurrenceType === "monthly" ? parseInt(recurrenceDayOfMonth) : null,
          recurrence_time: sendType === "scheduled" && scheduledTime ? scheduledTime : null,
          recurrence_end_date: isRecurring && recurrenceEndDate ? recurrenceEndDate : null,
          is_sent: sendType === "now",
          sent_at: sendType === "now" ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (notifError) throw notifError;

      // If sending now, create user_notifications for all targets
      if (sendType === "now") {
        const targetUserIds = targetType === "all" 
          ? users.map(u => u.id) 
          : selectedUsers;

        const userNotifications = targetUserIds.map(userId => ({
          user_id: userId,
          notification_id: notification.id,
          title: title.trim(),
          message: message.trim(),
        }));

        const { error: insertError } = await supabase
          .from("user_notifications")
          .insert(userNotifications);

        if (insertError) throw insertError;
      }

      return notification;
    },
    onSuccess: () => {
      toast.success(sendType === "now" ? "Notificação enviada!" : "Notificação agendada!");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error creating notification:", error);
      toast.error(error.message || "Erro ao criar notificação");
    },
  });

  const resetForm = () => {
    setTitle("");
    setMessage("");
    setTargetType("all");
    setSelectedUsers([]);
    setSendType("now");
    setScheduledDate("");
    setScheduledTime("");
    setIsRecurring(false);
    setRecurrenceType("weekly");
    setRecurrenceDayOfWeek("1");
    setRecurrenceDayOfMonth("1");
    setRecurrenceEndDate("");
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const weekDays = [
    { value: "0", label: "Domingo" },
    { value: "1", label: "Segunda" },
    { value: "2", label: "Terça" },
    { value: "3", label: "Quarta" },
    { value: "4", label: "Quinta" },
    { value: "5", label: "Sexta" },
    { value: "6", label: "Sábado" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Criar Notificação
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Aviso importante"
              maxLength={100}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escreva a mensagem da notificação..."
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Target */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Enviar para
            </Label>
            <RadioGroup value={targetType} onValueChange={(v) => setTargetType(v as "all" | "specific")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-normal cursor-pointer">Todos os usuários</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="specific" id="specific" />
                <Label htmlFor="specific" className="font-normal cursor-pointer">Usuários específicos</Label>
              </div>
            </RadioGroup>

            {targetType === "specific" && (
              <ScrollArea className="h-32 border rounded-lg p-3">
                <div className="space-y-2">
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={u.id}
                        checked={selectedUsers.includes(u.id)}
                        onCheckedChange={() => toggleUser(u.id)}
                      />
                      <Label htmlFor={u.id} className="font-normal cursor-pointer">
                        {u.full_name}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* When */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Quando enviar
            </Label>
            <RadioGroup value={sendType} onValueChange={(v) => setSendType(v as "now" | "scheduled")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="now" id="now" />
                <Label htmlFor="now" className="font-normal cursor-pointer">Agora</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="scheduled" id="scheduled" />
                <Label htmlFor="scheduled" className="font-normal cursor-pointer">Agendar</Label>
              </div>
            </RadioGroup>

            {sendType === "scheduled" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="date">Data</Label>
                  <Input
                    id="date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={format(new Date(), "yyyy-MM-dd")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Hora</Label>
                  <Input
                    id="time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Recurrence */}
          {sendType === "scheduled" && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="recurring"
                  checked={isRecurring}
                  onCheckedChange={(checked) => setIsRecurring(!!checked)}
                />
                <Label htmlFor="recurring" className="font-normal cursor-pointer">
                  Repetir
                </Label>
              </div>

              {isRecurring && (
                <div className="space-y-3 pl-6">
                  <div className="space-y-2">
                    <Label>Frequência</Label>
                    <Select value={recurrenceType} onValueChange={(v) => setRecurrenceType(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Diário</SelectItem>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="monthly">Mensal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {recurrenceType === "weekly" && (
                    <div className="space-y-2">
                      <Label>Dia da semana</Label>
                      <Select value={recurrenceDayOfWeek} onValueChange={setRecurrenceDayOfWeek}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {weekDays.map((day) => (
                            <SelectItem key={day.value} value={day.value}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {recurrenceType === "monthly" && (
                    <div className="space-y-2">
                      <Label>Dia do mês</Label>
                      <Select value={recurrenceDayOfMonth} onValueChange={setRecurrenceDayOfMonth}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 28 }, (_, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              Dia {i + 1}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="endDate">Repetir até (opcional)</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      min={scheduledDate || format(new Date(), "yyyy-MM-dd")}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
              disabled={createNotificationMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={() => createNotificationMutation.mutate()}
              disabled={createNotificationMutation.isPending || !title.trim() || !message.trim()}
            >
              {createNotificationMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Send className="h-4 w-4 mr-2" />
              {sendType === "now" ? "Enviar" : "Agendar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
