import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus } from "lucide-react";
import { EmployeeList } from "@/components/employees/EmployeeList";
import { AddEmployeeDialog } from "@/components/employees/AddEmployeeDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Funcionarios() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("is_active", { ascending: false })
        .order("full_name");

      if (error) throw error;
      
      // Fetch roles and permissions separately for each profile
      const employeesWithDetails = await Promise.all(
        (data || []).map(async (profile) => {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", profile.id);

          const { data: permissions } = await supabase
            .from("user_permissions")
            .select("*")
            .eq("user_id", profile.id);

          return {
            ...profile,
            user_roles: roles || [],
            user_permissions: permissions || [],
          };
        })
      );

      return employeesWithDetails;
    },
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Funcionários" />
      
      <main className="max-w-md mx-auto p-4 space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Gerenciar Funcionários</CardTitle>
            <Button 
              size="sm" 
              onClick={() => setIsAddDialogOpen(true)}
              className="h-9"
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </CardHeader>
          <CardContent>
            <EmployeeList employees={employees} isLoading={isLoading} />
          </CardContent>
        </Card>
      </main>

      <AddEmployeeDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
      />

      <BottomNav />
    </div>
  );
}
