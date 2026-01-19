import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Save, MessageSquare, Settings2, Store } from "lucide-react";
import { useAppSettings, CouponRules } from "@/hooks/useAppSettings";
import { toast } from "sonner";
import { CurrencyInput, getCurrencyValue } from "@/components/ui/currency-input";
import { formatNumberToBRL } from "@/lib/formatters";
import { StoreSettingsTab } from "@/components/settings/StoreSettingsTab";
export default function Configuracoes() {
  const {
    settings,
    updateSetting,
    isUpdating
  } = useAppSettings();
  const [message5, setMessage5] = useState("");
  const [message10, setMessage10] = useState("");
  const [rules, setRules] = useState<CouponRules>({
    threshold: 50,
    lowValue: 5,
    highValue: 10,
    minPurchase5: 30,
    minPurchase10: 50
  });

  // String states for currency inputs
  const [thresholdStr, setThresholdStr] = useState("");
  const [lowValueStr, setLowValueStr] = useState("");
  const [highValueStr, setHighValueStr] = useState("");
  const [minPurchase5Str, setMinPurchase5Str] = useState("");
  const [minPurchase10Str, setMinPurchase10Str] = useState("");
  useEffect(() => {
    if (settings) {
      setMessage5(settings.couponMessage5);
      setMessage10(settings.couponMessage10);
      setRules(settings.couponRules);
      setThresholdStr(formatNumberToBRL(settings.couponRules.threshold));
      setLowValueStr(formatNumberToBRL(settings.couponRules.lowValue));
      setHighValueStr(formatNumberToBRL(settings.couponRules.highValue));
      setMinPurchase5Str(formatNumberToBRL(settings.couponRules.minPurchase5));
      setMinPurchase10Str(formatNumberToBRL(settings.couponRules.minPurchase10));
    }
  }, [settings]);
  const handleSaveMessages = async () => {
    try {
      await updateSetting({
        key: "coupon_message_5",
        value: message5
      });
      await updateSetting({
        key: "coupon_message_10",
        value: message10
      });
      toast.success("Mensagens salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar mensagens");
    }
  };
  const handleSaveRules = async () => {
    try {
      const updatedRules: CouponRules = {
        threshold: getCurrencyValue(thresholdStr),
        lowValue: getCurrencyValue(lowValueStr),
        highValue: getCurrencyValue(highValueStr),
        minPurchase5: getCurrencyValue(minPurchase5Str),
        minPurchase10: getCurrencyValue(minPurchase10Str)
      };
      await updateSetting({
        key: "coupon_rules",
        value: updatedRules
      });
      toast.success("Regras salvas com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar regras");
    }
  };
  const placeholders = [{
    tag: "{nome}",
    description: "Nome do cliente"
  }, {
    tag: "{valor}",
    description: "Valor do cupom"
  }, {
    tag: "{validade}",
    description: "Data de validade"
  }, {
    tag: "{minimo}",
    description: "Valor mínimo de compra"
  }];
  return <div className="flex flex-col min-h-screen bg-background">
      

      <main className="flex-1 p-4 sm:p-6 space-y-6 pb-24">
        <Tabs defaultValue="store" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="store" className="flex items-center gap-2">
              <Store className="h-4 w-4" />
              <span className="hidden sm:inline">Loja e Cardápio</span>
              <span className="sm:hidden">Loja</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">Mensagens</span>
              <span className="sm:hidden">Msgs</span>
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Regras
            </TabsTrigger>
          </TabsList>

          <TabsContent value="store" className="mt-6">
            <StoreSettingsTab />
          </TabsContent>

          <TabsContent value="messages" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Placeholders Disponíveis</CardTitle>
                <CardDescription>
                  Use estes placeholders nas mensagens para inserir dados dinâmicos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {placeholders.map(p => <Badge key={p.tag} variant="secondary" className="text-sm">
                      <code className="font-mono">{p.tag}</code>
                      <span className="ml-2 text-muted-foreground">→ {p.description}</span>
                    </Badge>)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mensagem do Cupom de R$5</CardTitle>
                <CardDescription>
                  Mensagem enviada quando o cliente recebe um cupom de R$5
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea value={message5} onChange={e => setMessage5(e.target.value)} rows={12} className="font-mono text-sm" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mensagem do Cupom de R$10</CardTitle>
                <CardDescription>
                  Mensagem enviada quando o cliente recebe um cupom de R$10
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea value={message10} onChange={e => setMessage10(e.target.value)} rows={12} className="font-mono text-sm" />
              </CardContent>
            </Card>

            <Button onClick={handleSaveMessages} disabled={isUpdating} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Salvar Mensagens
            </Button>
          </TabsContent>

          <TabsContent value="rules" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Regras de Geração de Cupons</CardTitle>
                <CardDescription>
                  Configure os valores e limites para geração automática de cupons de fidelidade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Limite para cupom maior</Label>
                    <CurrencyInput value={thresholdStr} onChange={setThresholdStr} />
                    <p className="text-xs text-muted-foreground">
                      Vendas acima deste valor geram cupom maior
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Valor do cupom menor</Label>
                    <CurrencyInput value={lowValueStr} onChange={setLowValueStr} />
                    <p className="text-xs text-muted-foreground">
                      Para vendas até o limite
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Valor do cupom maior</Label>
                    <CurrencyInput value={highValueStr} onChange={setHighValueStr} />
                    <p className="text-xs text-muted-foreground">
                      Para vendas acima do limite
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Compra mínima para cupom menor</Label>
                    <CurrencyInput value={minPurchase5Str} onChange={setMinPurchase5Str} />
                  </div>

                  <div className="space-y-2">
                    <Label>Compra mínima para cupom maior</Label>
                    <CurrencyInput value={minPurchase10Str} onChange={setMinPurchase10Str} />
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Preview da regra:</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vendas até R${thresholdStr || "0,00"} geram cupom de R${lowValueStr || "0,00"}.{" "}
                    Vendas acima geram cupom de R${highValueStr || "0,00"}.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleSaveRules} disabled={isUpdating} className="w-full">
              <Save className="h-4 w-4 mr-2" />
              Salvar Regras
            </Button>
          </TabsContent>
        </Tabs>
      </main>
    </div>;
}