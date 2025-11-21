import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, User, CalendarIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

interface Coupon {
  id: string;
  code: string;
  discount_type: string;
  discount_value: number;
  expire_at: string;
  is_active: boolean;
  is_used: boolean;
}

interface SelectCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCustomer: (customer: Customer, coupon?: Coupon) => void;
}

export function SelectCustomerDialog({
  open,
  onOpenChange,
  onSelectCustomer,
}: SelectCustomerDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [createCoupon, setCreateCoupon] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponType, setCouponType] = useState<"percentage" | "fixed">("fixed");
  const [couponValue, setCouponValue] = useState("");
  const [couponExpireDate, setCouponExpireDate] = useState<Date>();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [createCouponForExisting, setCreateCouponForExisting] = useState(false);
  const [existingCouponCode, setExistingCouponCode] = useState("");
  const [existingCouponType, setExistingCouponType] = useState<"percentage" | "fixed">("fixed");
  const [existingCouponValue, setExistingCouponValue] = useState("");
  const [existingCouponExpireDate, setExistingCouponExpireDate] = useState<Date>();

  const queryClient = useQueryClient();

  // Definir data de expiração padrão (7 dias) quando criar cupom (novo cliente)
  useEffect(() => {
    if (createCoupon && !couponExpireDate) {
      const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      setCouponExpireDate(defaultDate);
    }
  }, [createCoupon]);

  // Definir data de expiração padrão (7 dias) quando criar cupom (cliente existente)
  useEffect(() => {
    if (createCouponForExisting && !existingCouponExpireDate) {
      const defaultDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      setExistingCouponExpireDate(defaultDate);
    }
  }, [createCouponForExisting]);

  // Buscar clientes
  const { data: customers, isLoading: loadingCustomers } = useQuery({
    queryKey: ["customers", searchTerm],
    queryFn: async () => {
      let query = supabase.from("customers").select("*").order("name");
      
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });

  // Buscar cupons do cliente selecionado
  const { data: customerCoupons } = useQuery({
    queryKey: ["customer-coupons", selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return [];
      
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .eq("customer_id", selectedCustomerId)
        .eq("is_active", true)
        .eq("is_used", false)
        .gte("expire_at", new Date().toISOString())
        .order("expire_at");

      if (error) throw error;
      return data as Coupon[];
    },
    enabled: !!selectedCustomerId,
  });

  // Criar novo cliente
  const createCustomerMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: newCustomerName,
          phone: newCustomerPhone,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Customer;
    },
    onSuccess: async (customer) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      
      if (createCoupon && couponCode && couponValue && couponExpireDate) {
        await createCouponForCustomer(customer.id);
      } else {
        toast.success("Cliente cadastrado com sucesso!");
        onSelectCustomer(customer);
        onOpenChange(false);
        resetForm();
      }
    },
    onError: () => {
      toast.error("Erro ao cadastrar cliente");
    },
  });

  // Criar cupom
  const createCouponMutation = useMutation({
    mutationFn: async (customerId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("coupons")
        .insert({
          customer_id: customerId,
          code: couponCode,
          discount_type: couponType,
          discount_value: parseFloat(couponValue),
          expire_at: couponExpireDate!.toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Coupon;
    },
    onSuccess: (coupon, customerId) => {
      queryClient.invalidateQueries({ queryKey: ["customer-coupons", customerId] });
      toast.success("Cliente e cupom cadastrados com sucesso!");
      
      const customer = customers?.find(c => c.id === customerId);
      if (customer) {
        onSelectCustomer(customer, coupon);
      }
      
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast.error("Erro ao criar cupom");
    },
  });

  const createCouponForCustomer = async (customerId: string) => {
    await createCouponMutation.mutateAsync(customerId);
  };

  // Criar cupom para cliente existente
  const createCouponForExistingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCustomerId) throw new Error("Nenhum cliente selecionado");
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("coupons")
        .insert({
          customer_id: selectedCustomerId,
          code: existingCouponCode,
          discount_type: existingCouponType,
          discount_value: parseFloat(existingCouponValue),
          expire_at: existingCouponExpireDate!.toISOString(),
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Coupon;
    },
    onSuccess: (coupon) => {
      queryClient.invalidateQueries({ queryKey: ["customer-coupons", selectedCustomerId] });
      toast.success("Cupom criado com sucesso!");
      setCreateCouponForExisting(false);
      setExistingCouponCode("");
      setExistingCouponValue("");
      setExistingCouponExpireDate(undefined);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao criar cupom");
    },
  });

  const generateCouponCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setCouponCode(code);
  };

  const generateExistingCouponCode = () => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    setExistingCouponCode(code);
  };

  const handleSelectExistingCustomer = () => {
    const customer = customers?.find(c => c.id === selectedCustomerId);
    const coupon = customerCoupons?.find(c => c.id === selectedCouponId);
    
    if (customer) {
      onSelectCustomer(customer, coupon);
      onOpenChange(false);
      resetForm();
    }
  };

  const handleCreateCouponForExisting = () => {
    if (!existingCouponCode.trim()) {
      toast.error("Digite o código do cupom");
      return;
    }
    
    if (!existingCouponValue || parseFloat(existingCouponValue) <= 0) {
      toast.error("Digite um valor válido para o desconto");
      return;
    }

    if (existingCouponType === "percentage" && parseFloat(existingCouponValue) > 100) {
      toast.error("Desconto percentual não pode ser maior que 100%");
      return;
    }

    if (!existingCouponExpireDate) {
      toast.error("Selecione uma data de validade");
      return;
    }

    createCouponForExistingMutation.mutate();
  };

  const resetForm = () => {
    setSearchTerm("");
    setNewCustomerName("");
    setNewCustomerPhone("");
    setCreateCoupon(false);
    setCouponCode("");
    setCouponType("fixed");
    setCouponValue("");
    setCouponExpireDate(undefined);
    setSelectedCustomerId(null);
    setSelectedCouponId(null);
    setCreateCouponForExisting(false);
    setExistingCouponCode("");
    setExistingCouponType("fixed");
    setExistingCouponValue("");
    setExistingCouponExpireDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cliente e Cupom</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="existing" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="existing">Selecionar Cliente</TabsTrigger>
            <TabsTrigger value="new">Cadastrar Novo</TabsTrigger>
          </TabsList>

          {/* Aba: Selecionar Cliente Existente */}
          <TabsContent value="existing" className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {loadingCustomers ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Carregando clientes...
                </p>
              ) : customers && customers.length > 0 ? (
                customers.map((customer) => (
                  <Card
                    key={customer.id}
                    className={cn(
                      "p-3 cursor-pointer transition-colors hover:bg-muted/50",
                      selectedCustomerId === customer.id && "border-primary bg-primary/5"
                    )}
                    onClick={() => {
                      setSelectedCustomerId(customer.id);
                      setSelectedCouponId(null);
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.phone || "Sem telefone"}</p>
                      </div>
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum cliente encontrado
                </p>
              )}
            </div>

            {/* Cupons do cliente selecionado */}
            {selectedCustomerId && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Cupons Disponíveis</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCreateCouponForExisting(!createCouponForExisting)}
                  >
                    {createCouponForExisting ? "Cancelar" : "+ Novo Cupom"}
                  </Button>
                </div>

                {/* Formulário de criação de cupom para cliente existente */}
                {createCouponForExisting && (
                  <Card className="p-4 space-y-3 bg-muted/30">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Label>Código do Cupom</Label>
                        <Input
                          value={existingCouponCode}
                          onChange={(e) => setExistingCouponCode(e.target.value.toUpperCase())}
                          placeholder="DESCONTO10"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateExistingCouponCode}
                        className="mt-6"
                      >
                        Gerar
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label>Tipo</Label>
                        <div className="flex gap-2 mt-1">
                          <Button
                            type="button"
                            variant={existingCouponType === "fixed" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setExistingCouponType("fixed")}
                            className="flex-1"
                          >
                            R$
                          </Button>
                          <Button
                            type="button"
                            variant={existingCouponType === "percentage" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setExistingCouponType("percentage")}
                            className="flex-1"
                          >
                            %
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label>Valor</Label>
                        <Input
                          type="number"
                          value={existingCouponValue}
                          onChange={(e) => setExistingCouponValue(e.target.value)}
                          placeholder={existingCouponType === "percentage" ? "10" : "15.00"}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Data de Validade</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal mt-1",
                              !existingCouponExpireDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {existingCouponExpireDate
                              ? format(existingCouponExpireDate, "dd/MM/yyyy")
                              : "Selecione a data"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={existingCouponExpireDate}
                            onSelect={setExistingCouponExpireDate}
                            disabled={(date) => date < new Date()}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <Button
                      onClick={handleCreateCouponForExisting}
                      disabled={
                        !existingCouponCode ||
                        !existingCouponValue ||
                        !existingCouponExpireDate ||
                        createCouponForExistingMutation.isPending
                      }
                      className="w-full"
                      size="sm"
                    >
                      {createCouponForExistingMutation.isPending ? "Criando..." : "Criar Cupom"}
                    </Button>
                  </Card>
                )}

                {/* Lista de cupons existentes */}
                {customerCoupons && customerCoupons.length > 0 && (
                  <div className="space-y-2">
                    {customerCoupons.map((coupon) => (
                      <Card
                        key={coupon.id}
                        className={cn(
                          "p-3 cursor-pointer transition-colors hover:bg-muted/50",
                          selectedCouponId === coupon.id && "border-primary bg-primary/5"
                        )}
                        onClick={() => setSelectedCouponId(selectedCouponId === coupon.id ? null : coupon.id)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-mono font-semibold">{coupon.code}</p>
                              <Badge variant="secondary">
                                {coupon.discount_type === "percentage"
                                  ? `${coupon.discount_value}%`
                                  : `R$ ${coupon.discount_value.toFixed(2)}`}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Válido até {format(new Date(coupon.expire_at), "dd/MM/yyyy")}
                            </p>
                          </div>
                          <Sparkles className="h-5 w-5 text-primary" />
                        </div>
                      </Card>
                    ))}
                  </div>
                )}

                {!createCouponForExisting && (!customerCoupons || customerCoupons.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhum cupom disponível
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={handleSelectExistingCustomer}
              disabled={!selectedCustomerId}
              className="w-full"
            >
              {selectedCouponId ? "Selecionar com Cupom" : "Selecionar Cliente"}
            </Button>
          </TabsContent>

          {/* Aba: Cadastrar Novo Cliente */}
          <TabsContent value="new" className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label>Nome *</Label>
                <Input
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Nome completo"
                />
              </div>

              <div>
                <Label>Telefone *</Label>
                <Input
                  value={newCustomerPhone}
                  onChange={(e) => setNewCustomerPhone(e.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="createCoupon"
                  checked={createCoupon}
                  onCheckedChange={(checked) => setCreateCoupon(checked as boolean)}
                />
                <Label htmlFor="createCoupon" className="cursor-pointer">
                  Criar cupom para este cliente
                </Label>
              </div>

              {createCoupon && (
                <Card className="p-4 space-y-3 bg-muted/30">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label>Código do Cupom</Label>
                      <Input
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="DESCONTO10"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateCouponCode}
                      className="mt-6"
                    >
                      Gerar
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label>Tipo</Label>
                      <div className="flex gap-2 mt-1">
                        <Button
                          type="button"
                          variant={couponType === "fixed" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCouponType("fixed")}
                          className="flex-1"
                        >
                          R$
                        </Button>
                        <Button
                          type="button"
                          variant={couponType === "percentage" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCouponType("percentage")}
                          className="flex-1"
                        >
                          %
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Valor</Label>
                      <Input
                        type="number"
                        value={couponValue}
                        onChange={(e) => setCouponValue(e.target.value)}
                        placeholder={couponType === "percentage" ? "10" : "15.00"}
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Data de Validade</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !couponExpireDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {couponExpireDate
                            ? format(couponExpireDate, "dd/MM/yyyy")
                            : "Selecione a data"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={couponExpireDate}
                          onSelect={setCouponExpireDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </Card>
              )}
            </div>

            <Button
              onClick={() => createCustomerMutation.mutate()}
              disabled={
                !newCustomerName ||
                !newCustomerPhone ||
                (createCoupon && (!couponCode || !couponValue || !couponExpireDate)) ||
                createCustomerMutation.isPending
              }
              className="w-full"
            >
              {createCustomerMutation.isPending
                ? "Cadastrando..."
                : createCoupon
                ? "Cadastrar com Cupom"
                : "Cadastrar Cliente"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
