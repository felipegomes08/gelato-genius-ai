import { User, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { EditPermissionsDialog } from "./EditPermissionsDialog";
import { Skeleton } from "@/components/ui/skeleton";

interface Employee {
  id: string;
  full_name: string;
  phone: string | null;
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

  return (
    <>
      <div className="space-y-3">
        {employees.map((employee) => {
          const isMaster = employee.user_roles?.[0]?.role === "master";
          const permissions = employee.user_permissions?.[0];

          return (
            <div
              key={employee.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-1">
                <div className={`p-2 rounded-full ${isMaster ? "bg-primary/10" : "bg-secondary/10"}`}>
                  {isMaster ? (
                    <Shield className={`h-5 w-5 text-primary`} />
                  ) : (
                    <User className={`h-5 w-5 text-secondary`} />
                  )}
                </div>
                <div>
                  <p className="font-medium">{employee.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {isMaster ? "Master" : "Funcionário"}
                    {employee.phone && ` • ${employee.phone}`}
                  </p>
                </div>
              </div>
              {!isMaster && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditPermissions(employee)}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {selectedEmployee && (
        <EditPermissionsDialog
          employee={selectedEmployee}
          open={isPermissionsDialogOpen}
          onOpenChange={setIsPermissionsDialogOpen}
        />
      )}
    </>
  );
}
