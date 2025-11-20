import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

interface AddEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddEmployeeDialog({ open, onOpenChange }: AddEmployeeDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const queryClient = useQueryClient();

  const addEmployeeMutation = useMutation({
    mutationFn: async () => {
      // 1. Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: phone || null,
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Erro ao criar usuário");

      // 2. Create employee role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: authData.user.id,
          role: "employee",
        });

      if (roleError) throw roleError;

      // 3. Create default permissions (all false)
      const { error: permError } = await supabase
        .from("user_permissions")
        .insert({
          user_id: authData.user.id,
          can_access_sales: false,
          can_access_products: false,
          can_access_stock: false,
          can_access_financial: false,
          can_access_reports: false,
          can_access_settings: false,
        });

      if (permError) throw permError;

      return authData.user;
    },
    onSuccess: async () => {
      toast.success("Funcionário cadastrado com sucesso!");
      await queryClient.invalidateQueries({ queryKey: ["employees"] });
      await queryClient.refetchQueries({ queryKey: ["employees"] });
      onOpenChange(false);
      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
    },
    onError: (error: any) => {
      console.error("Erro ao cadastrar funcionário:", error);
      toast.error(error.message || "Erro ao cadastrar funcionário");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addEmployeeMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Funcionário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="João da Silva"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="joao@exemplo.com"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone (opcional)</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 98765-4321"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha Inicial</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={addEmployeeMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={addEmployeeMutation.isPending}>
              {addEmployeeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Cadastrar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
