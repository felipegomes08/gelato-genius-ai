import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

export function CreateMasterButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleCreateMaster = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Você precisa estar logado");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-master-user`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao criar usuário master');
      }

      toast.success(result.message);
      
      // Fazer logout para o usuário logar com a nova conta
      setTimeout(async () => {
        await supabase.auth.signOut();
      }, 2000);
      
    } catch (error: any) {
      console.error('Error:', error);
      toast.error(error.message || 'Erro ao criar usuário master');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleCreateMaster}
      disabled={isLoading}
      variant="destructive"
      size="sm"
    >
      {isLoading ? "Criando..." : "Criar Felipe Master"}
    </Button>
  );
}
