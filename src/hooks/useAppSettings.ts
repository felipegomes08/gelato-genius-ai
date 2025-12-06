import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface CouponRules {
  threshold: number;
  lowValue: number;
  highValue: number;
  minPurchase5: number;
  minPurchase10: number;
}

export interface AppSettings {
  couponMessage5: string;
  couponMessage10: string;
  couponRules: CouponRules;
}

const defaultSettings: AppSettings = {
  couponMessage5: `| CUPOM CASHBACK | 

Olá {nome}! Amei te atender hoje!
Uhuu! Você garantiu R${'{valor}'} de cashback para usar na Churrosteria! 
Use na sua próxima compra dentro de 7 dias.
Corre pra aproveitar e experimentar uma delícia nova!  Qualquer dúvida é só chamar! 
Validade: {validade}
Ele pode ser utilizado em compras a partir de R${'{minimo}'}.
Use e já garante um novo cupom. Te vejo em breve!`,
  couponMessage10: `| CUPOM CASHBACK | 

Olá {nome}! Amei te atender hoje!
Uhuu! Você garantiu R${'{valor}'} de cashback para usar na Churrosteria!
Use na sua próxima compra dentro de 7 dias.
Corre pra aproveitar e experimentar uma delícia nova! Qualquer dúvida é só chamar! 
Validade: {validade}
Ele pode ser utilizado em compras a partir de R${'{minimo}'}.
Use e já garanta um novo cupom. Te vejo em breve!`,
  couponRules: {
    threshold: 50,
    lowValue: 5,
    highValue: 10,
    minPurchase5: 30,
    minPurchase10: 50,
  },
};

export function useAppSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["app-settings"],
    queryFn: async (): Promise<AppSettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value");

      if (error) {
        console.error("Error fetching settings:", error);
        return defaultSettings;
      }

      const settingsMap = data?.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {} as Record<string, unknown>) || {};

      return {
        couponMessage5: (settingsMap["coupon_message_5"] as string) || defaultSettings.couponMessage5,
        couponMessage10: (settingsMap["coupon_message_10"] as string) || defaultSettings.couponMessage10,
        couponRules: (settingsMap["coupon_rules"] as CouponRules) || defaultSettings.couponRules,
      };
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

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
      queryClient.invalidateQueries({ queryKey: ["app-settings"] });
    },
  });

  const getSuggestedCouponValue = (total: number): number => {
    const rules = settings?.couponRules || defaultSettings.couponRules;
    return total > rules.threshold ? rules.highValue : rules.lowValue;
  };

  const getMinPurchase = (couponValue: number): number => {
    const rules = settings?.couponRules || defaultSettings.couponRules;
    return couponValue === rules.highValue ? rules.minPurchase10 : rules.minPurchase5;
  };

  return {
    settings: settings || defaultSettings,
    isLoading,
    updateSetting: updateSettingMutation.mutate,
    isUpdating: updateSettingMutation.isPending,
    getSuggestedCouponValue,
    getMinPurchase,
  };
}
