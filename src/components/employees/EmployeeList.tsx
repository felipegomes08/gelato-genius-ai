import { User, Settings, Shield, Edit, UserX, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { EditPermissionsDialog } from "./EditPermissionsDialog";
import { EditEmployeeDialog } from "./EditEmployeeDialog";
import { Skeleton } from "@/components/ui/skeleton";
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
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Employee {
  id: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  user_roles: Array<{ role: "master" | "employee" }>;
  user_permissions: Array<{
    can_access_sales: boolean;
    can_access_products: boolean;
    can_access_stock: boolean;
    can_access_financial: boolean;
    can_access_reports: boolean;
    can_access_settings: boolean;
  }> | null;
}

interface EmployeeListProps {
  employees?: Employee[];
  isLoading: boolean;
}

export function EmployeeList({ employees, isLoading }: EmployeeListProps) {
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeactivateDialogOpen, setIsDeactivateDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3 flex-1">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-8 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!employees || employees.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <User className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Nenhum funcionário cadastrado</p>
      </div>
    );
  }

  const handleEditPermissions = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsPermissionsDialogOpen(true);
  };

  const handleEdit = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditDialogOpen(true);
  };

  const handleDeactivateClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsDeactivateDialogOpen(true);
  };

  const handleToggleActive = async () => {
    if (!selectedEmployee) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ is_active: !selectedEmployee.is_active })
        .eq("id", selectedEmployee.id);

      if (error) throw error;

      toast.success(
        selectedEmployee.is_active
          ? "Funcionário desativado com sucesso!"
          : "Funcionário reativado com sucesso!"
      );
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      await queryClient.refetchQueries({ queryKey: ["employees"] });
      setIsDeactivateDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status do funcionário");
    }
  };

  return (
    <>
      <div className="space-y-3">
        {employees.map((employee) => {
          const isMaster = employee.user_roles?.[0]?.role === "master";
          const permissions = employee.user_permissions?.[0];

          return (
            <div
              key={employee.id}
              className={`flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors ${
                !employee.is_active ? "opacity-60" : ""
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-full ${isMaster ? "bg-primary/10" : "bg-secondary/10"}`}>
                  {isMaster ? (
                    <Shield className={`h-5 w-5 text-primary`} />
                  ) : (
                    <User className={`h-5 w-5 text-secondary`} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{employee.full_name}</p>
                    {!employee.is_active && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">
                        Inativo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {isMaster ? "Master" : "Funcionário"}
                    {employee.phone && ` • ${employee.phone}`}
                  </p>
                </div>
              </div>
              {!isMaster && (
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(employee)}
                    title="Editar"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditPermissions(employee)}
                    title="Permissões"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeactivateClick(employee)}
                    title={employee.is_active ? "Desativar" : "Reativar"}
                  >
                    {employee.is_active ? (
                      <UserX className="h-4 w-4" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedEmployee && (
        <>
          <EditPermissionsDialog
            employee={selectedEmployee}
            open={isPermissionsDialogOpen}
            onOpenChange={setIsPermissionsDialogOpen}
          />
          <EditEmployeeDialog
            employee={selectedEmployee}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
          />
          <AlertDialog open={isDeactivateDialogOpen} onOpenChange={setIsDeactivateDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {selectedEmployee.is_active ? "Desativar" : "Reativar"} Funcionário
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedEmployee.is_active
                    ? "Tem certeza que deseja desativar este funcionário? Ele não poderá mais acessar o sistema, mas todo o histórico será mantido."
                    : "Tem certeza que deseja reativar este funcionário? Ele poderá acessar o sistema novamente."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleToggleActive}>
                  Confirmar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}
