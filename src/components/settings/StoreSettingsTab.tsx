import { useState, useEffect, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Trash2, Link2, Copy, Check, ExternalLink, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import logoDefault from "@/assets/logo-churrosteria.png";

export function StoreSettingsTab() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useStoreSettings();
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  
  const [copied, setCopied] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    store_logo_url: "",
    menu_enabled: false,
    menu_banner_url: "",
    menu_store_name: "",
    menu_description: "",
    menu_whatsapp: "",
    menu_address: "",
    menu_opening_hours: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        store_logo_url: settings.store_logo_url || "",
        menu_enabled: settings.menu_enabled,
        menu_banner_url: settings.menu_banner_url || "",
        menu_store_name: settings.menu_store_name,
        menu_description: settings.menu_description,
        menu_whatsapp: settings.menu_whatsapp,
        menu_address: settings.menu_address,
        menu_opening_hours: settings.menu_opening_hours,
      });
    }
  }, [settings]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          { key, value: value as any, updated_at: new Date().toISOString(), updated_by: user?.id },
          { onConflict: "key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-settings"] });
      queryClient.invalidateQueries({ queryKey: ["public-store-settings"] });
    },
  });

  const handleSave = async () => {
    try {
      await Promise.all([
        updateSettingMutation.mutateAsync({ key: "store_logo_url", value: formData.store_logo_url || "" }),
        updateSettingMutation.mutateAsync({ key: "menu_enabled", value: formData.menu_enabled }),
        updateSettingMutation.mutateAsync({ key: "menu_banner_url", value: formData.menu_banner_url || "" }),
        updateSettingMutation.mutateAsync({ key: "menu_store_name", value: formData.menu_store_name || "" }),
        updateSettingMutation.mutateAsync({ key: "menu_description", value: formData.menu_description || "" }),
        updateSettingMutation.mutateAsync({ key: "menu_whatsapp", value: formData.menu_whatsapp || "" }),
        updateSettingMutation.mutateAsync({ key: "menu_address", value: formData.menu_address || "" }),
        updateSettingMutation.mutateAsync({ key: "menu_opening_hours", value: formData.menu_opening_hours || "" }),
      ]);
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    }
  };

  const uploadImage = async (file: File, type: "logo" | "banner"): Promise<string> => {
    const ext = file.name.split(".").pop();
    const fileName = `${type}-${Date.now()}.${ext}`;
    
    const { error: uploadError } = await supabase.storage
      .from("store-assets")
      .upload(fileName, file, { upsert: true });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("store-assets").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    try {
      const url = await uploadImage(file, "logo");
      setFormData((prev) => ({ ...prev, store_logo_url: url }));
      await updateSettingMutation.mutateAsync({ key: "store_logo_url", value: url });
      toast.success("Logo atualizado!");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Erro ao fazer upload do logo");
    } finally {
      setLogoUploading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBannerUploading(true);
    try {
      const url = await uploadImage(file, "banner");
      setFormData((prev) => ({ ...prev, menu_banner_url: url }));
      await updateSettingMutation.mutateAsync({ key: "menu_banner_url", value: url });
      toast.success("Banner atualizado!");
    } catch (error) {
      console.error("Error uploading banner:", error);
      toast.error("Erro ao fazer upload do banner");
    } finally {
      setBannerUploading(false);
    }
  };

  const handleRemoveLogo = async () => {
    setFormData((prev) => ({ ...prev, store_logo_url: "" }));
    await updateSettingMutation.mutateAsync({ key: "store_logo_url", value: "" });
    toast.success("Logo removido!");
  };

  const handleRemoveBanner = async () => {
    setFormData((prev) => ({ ...prev, menu_banner_url: "" }));
    await updateSettingMutation.mutateAsync({ key: "menu_banner_url", value: "" });
    toast.success("Banner removido!");
  };

  const copyLink = () => {
    const link = `${window.location.origin}/cardapio`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Link copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  const menuLink = `${window.location.origin}/cardapio`;

  if (isLoading) {
    return <div className="p-4 text-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Store Identity */}
      <Card>
        <CardHeader>
          <CardTitle>Identidade da Loja</CardTitle>
          <CardDescription>
            Configure o logo e nome que serão exibidos em todo o sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Logo da Loja</Label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl border-2 border-dashed border-border overflow-hidden bg-muted flex items-center justify-center">
                <img
                  src={formData.store_logo_url || logoDefault}
                  alt="Logo"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={logoUploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {logoUploading ? "Enviando..." : "Alterar Logo"}
                </Button>
                {formData.store_logo_url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveLogo}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Recomendado: Imagem quadrada, mínimo 200x200px
            </p>
          </div>

          {/* Store Name */}
          <div className="space-y-2">
            <Label htmlFor="store_name">Nome da Loja</Label>
            <Input
              id="store_name"
              value={formData.menu_store_name}
              onChange={(e) => setFormData((prev) => ({ ...prev, menu_store_name: e.target.value }))}
              placeholder="Nome do seu estabelecimento"
            />
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações de Contato</CardTitle>
          <CardDescription>
            Dados que serão exibidos no cardápio online
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.menu_address}
              onChange={(e) => setFormData((prev) => ({ ...prev, menu_address: e.target.value }))}
              placeholder="Rua ABC, 123 - Centro"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatsapp">WhatsApp</Label>
            <Input
              id="whatsapp"
              value={formData.menu_whatsapp}
              onChange={(e) => setFormData((prev) => ({ ...prev, menu_whatsapp: e.target.value }))}
              placeholder="(11) 99999-9999"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="opening_hours">Horário de Funcionamento</Label>
            <Textarea
              id="opening_hours"
              value={formData.menu_opening_hours}
              onChange={(e) => setFormData((prev) => ({ ...prev, menu_opening_hours: e.target.value }))}
              placeholder="Seg-Sex: 10h-22h&#10;Sáb-Dom: 14h-23h"
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Dica: Você pode atualizar isso a qualquer momento, como em feriados
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Online Menu */}
      <Card>
        <CardHeader>
          <CardTitle>Cardápio Online</CardTitle>
          <CardDescription>
            Configure seu cardápio público que pode ser compartilhado com clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Enable Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Habilitar Cardápio Online</Label>
              <p className="text-sm text-muted-foreground">
                Quando ativo, qualquer pessoa pode acessar seu cardápio
              </p>
            </div>
            <Switch
              checked={formData.menu_enabled}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, menu_enabled: checked }))}
            />
          </div>

          {/* Banner Upload */}
          <div className="space-y-2">
            <Label>Banner do Cardápio</Label>
            <div className="border-2 border-dashed border-border rounded-lg overflow-hidden">
              {formData.menu_banner_url ? (
                <div className="relative">
                  <img
                    src={formData.menu_banner_url}
                    alt="Banner"
                    className="w-full h-32 sm:h-40 object-cover"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleRemoveBanner}
                    className="absolute top-2 right-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className="h-32 sm:h-40 flex flex-col items-center justify-center cursor-pointer hover:bg-accent/50 transition-colors"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Clique para adicionar um banner
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Recomendado: 1200x400px
                  </span>
                </div>
              )}
            </div>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              onChange={handleBannerUpload}
              className="hidden"
            />
            {!formData.menu_banner_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => bannerInputRef.current?.click()}
                disabled={bannerUploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {bannerUploading ? "Enviando..." : "Fazer Upload"}
              </Button>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição / Slogan</Label>
            <Textarea
              id="description"
              value={formData.menu_description}
              onChange={(e) => setFormData((prev) => ({ ...prev, menu_description: e.target.value }))}
              placeholder="Os melhores churros da cidade!"
              rows={2}
            />
          </div>

          <Separator />

          {/* Menu Link */}
          <div className="space-y-2">
            <Label>Link do Cardápio</Label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-muted rounded-md text-sm">
                <Link2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="truncate">{menuLink}</span>
              </div>
              <Button variant="outline" size="icon" onClick={copyLink}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(menuLink, "_blank")}
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Compartilhe este link com seus clientes para que eles possam ver o cardápio
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updateSettingMutation.isPending}>
          {updateSettingMutation.isPending ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
