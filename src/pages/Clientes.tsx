import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Plus } from "lucide-react";
import { CustomerList } from "@/components/customers/CustomerList";
import { AddCustomerDialog } from "@/components/customers/AddCustomerDialog";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Clientes() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("name");

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <AppLayout title="Clientes">
      <div className="max-w-md md:max-w-7xl mx-auto space-y-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Gerenciar Clientes</CardTitle>
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
            <CustomerList customers={customers} isLoading={isLoading} />
          </CardContent>
        </Card>

      <AddCustomerDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
      />
      </div>
    </AppLayout>
  );
}
