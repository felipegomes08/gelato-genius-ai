import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ShoppingCart, Package, BarChart3, DollarSign, FileText, Settings, CalendarCheck } from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
  user_permissions: Array<{
    can_access_sales: boolean;
    can_access_products: boolean;
    can_access_stock: boolean;
    can_access_financial: boolean;
    can_access_reports: boolean;
    can_access_settings: boolean;
    can_access_tasks: boolean;
  }> | null;
}

interface EditPermissionsDialogProps {
  employee: Employee;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const permissions = [
  { key: "can_access_sales", label: "Vendas", icon: ShoppingCart },
  { key: "can_access_products", label: "Produtos", icon: Package },
  { key: "can_access_stock", label: "Estoque", icon: BarChart3 },
  { key: "can_access_financial", label: "Financeiro", icon: DollarSign },
  { key: "can_access_reports", label: "Relatórios", icon: FileText },
  { key: "can_access_settings", label: "Configurações", icon: Settings },
  { key: "can_access_tasks", label: "Tarefas", icon: CalendarCheck },
] as const;

export function EditPermissionsDialog({ employee, open, onOpenChange }: EditPermissionsDialogProps) {
  const [permissionStates, setPermissionStates] = useState<Record<string, boolean>>({});
  const queryClient = useQueryClient();

  useEffect(() => {
    const defaultPermissions = {
      can_access_sales: false,
      can_access_products: false,
      can_access_stock: false,
      can_access_financial: false,
      can_access_reports: false,
      can_access_settings: false,
      can_access_tasks: false,
    };

    if (employee.user_permissions?.[0]) {
      const currentPermissions = employee.user_permissions[0];
      setPermissionStates({
        can_access_sales: currentPermissions.can_access_sales ?? false,
        can_access_products: currentPermissions.can_access_products ?? false,
        can_access_stock: currentPermissions.can_access_stock ?? false,
        can_access_financial: currentPermissions.can_access_financial ?? false,
        can_access_reports: currentPermissions.can_access_reports ?? false,
        can_access_settings: currentPermissions.can_access_settings ?? false,
        can_access_tasks: currentPermissions.can_access_tasks ?? false,
      });
    } else {
      setPermissionStates(defaultPermissions);
    }
  }, [employee]);

  const updatePermissionsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("user_permissions")
        .upsert({
          user_id: employee.id,
          can_access_sales: permissionStates.can_access_sales || false,
          can_access_products: permissionStates.can_access_products || false,
          can_access_stock: permissionStates.can_access_stock || false,
          can_access_financial: permissionStates.can_access_financial || false,
          can_access_reports: permissionStates.can_access_reports || false,
          can_access_settings: permissionStates.can_access_settings || false,
          can_access_tasks: permissionStates.can_access_tasks || false,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Permissões atualizadas com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      await queryClient.refetchQueries({ queryKey: ["employees"] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Erro ao atualizar permissões:", error);
      toast.error("Erro ao atualizar permissões");
    },
  });

  const handleToggle = (key: string, value: boolean) => {
    setPermissionStates((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePermissionsMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Permissões - {employee.full_name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {permissions.map(({ key, label, icon: Icon }) => (
              <div key={key} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <Label htmlFor={key} className="cursor-pointer font-medium">
                    {label}
                  </Label>
                </div>
                <Switch
                  id={key}
                  checked={permissionStates[key] || false}
                  onCheckedChange={(checked) => handleToggle(key, checked)}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={updatePermissionsMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={updatePermissionsMutation.isPending}>
              {updatePermissionsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
