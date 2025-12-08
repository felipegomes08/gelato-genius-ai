import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CreateNotificationDialog } from "@/components/notifications/CreateNotificationDialog";
import { Bell, Plus, Clock, Repeat, Send, Trash2, Users, Loader2 } from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Notification {
  id: string;
  title: string;
  message: string;
  created_at: string;
  scheduled_at: string | null;
  is_sent: boolean;
  sent_at: string | null;
  is_recurring: boolean;
  recurrence_type: string | null;
  target_type: string;
  target_user_ids: string[] | null;
  is_active: boolean;
}

export default function Notificacoes() {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Notification[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notificação excluída");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      setDeleteId(null);
    },
    onError: () => {
      toast.error("Erro ao excluir notificação");
    },
  });

  const sendNowMutation = useMutation({
    mutationFn: async (notification: Notification) => {
      // Get all users or specific ones
      let targetUserIds: string[] = [];
      
      if (notification.target_type === "all") {
        const { data: users } = await supabase
          .from("profiles")
          .select("id")
          .eq("is_active", true);
        targetUserIds = users?.map(u => u.id) || [];
      } else {
        targetUserIds = notification.target_user_ids || [];
      }

      // Create user_notifications
      const userNotifications = targetUserIds.map(userId => ({
        user_id: userId,
        notification_id: notification.id,
        title: notification.title,
        message: notification.message,
      }));

      const { error: insertError } = await supabase
        .from("user_notifications")
        .insert(userNotifications);

      if (insertError) throw insertError;

      // Mark notification as sent
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_sent: true, sent_at: new Date().toISOString() })
        .eq("id", notification.id);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Notificação enviada!");
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: () => {
      toast.error("Erro ao enviar notificação");
    },
  });

  const sentNotifications = notifications.filter(n => n.is_sent && !n.is_recurring);
  const scheduledNotifications = notifications.filter(n => !n.is_sent && n.scheduled_at && !n.is_recurring);
  const recurringNotifications = notifications.filter(n => n.is_recurring && n.is_active);

  const renderNotificationCard = (notification: Notification) => (
    <Card key={notification.id} className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold truncate">{notification.title}</h4>
            <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
              {notification.message}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="outline" className="text-xs">
                <Users className="h-3 w-3 mr-1" />
                {notification.target_type === "all" ? "Todos" : `${notification.target_user_ids?.length || 0} usuários`}
              </Badge>
              
              {notification.is_recurring && (
                <Badge variant="secondary" className="text-xs">
                  <Repeat className="h-3 w-3 mr-1" />
                  {notification.recurrence_type === "daily" && "Diário"}
                  {notification.recurrence_type === "weekly" && "Semanal"}
                  {notification.recurrence_type === "monthly" && "Mensal"}
                </Badge>
              )}

              {notification.scheduled_at && !notification.is_sent && (
                <Badge variant="secondary" className="text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  {format(new Date(notification.scheduled_at), "dd/MM/yyyy HH:mm")}
                </Badge>
              )}

              {notification.sent_at && (
                <span className="text-xs text-muted-foreground">
                  Enviado {formatDistanceToNow(new Date(notification.sent_at), { addSuffix: true, locale: ptBR })}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            {!notification.is_sent && notification.scheduled_at && isPast(new Date(notification.scheduled_at)) && (
              <Button
                size="sm"
                variant="default"
                onClick={() => sendNowMutation.mutate(notification)}
                disabled={sendNowMutation.isPending}
              >
                {sendNowMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-1" />
                    Enviar
                  </>
                )}
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={() => setDeleteId(notification.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-6 pb-24 md:pb-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Bell className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Notificações</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie e envie notificações para os usuários
            </p>
          </div>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Criar
        </Button>
      </div>

      <Tabs defaultValue="sent" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="sent" className="gap-2">
            <Send className="h-4 w-4" />
            Enviadas
            {sentNotifications.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {sentNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="scheduled" className="gap-2">
            <Clock className="h-4 w-4" />
            Agendadas
            {scheduledNotifications.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {scheduledNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recurring" className="gap-2">
            <Repeat className="h-4 w-4" />
            Recorrentes
            {recurringNotifications.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {recurringNotifications.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sent">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sentNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Send className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhuma notificação enviada</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-300px)]">
              {sentNotifications.map(renderNotificationCard)}
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="scheduled">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : scheduledNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhuma notificação agendada</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-300px)]">
              {scheduledNotifications.map(renderNotificationCard)}
            </ScrollArea>
          )}
        </TabsContent>

        <TabsContent value="recurring">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : recurringNotifications.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Repeat className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Nenhuma notificação recorrente</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[calc(100vh-300px)]">
              {recurringNotifications.map(renderNotificationCard)}
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>

      <CreateNotificationDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir notificação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A notificação será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
