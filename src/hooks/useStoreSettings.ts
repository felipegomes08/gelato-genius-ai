import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreSettings {
  store_logo_url: string | null;
  menu_enabled: boolean;
  menu_banner_url: string | null;
  menu_store_name: string;
  menu_description: string;
  menu_whatsapp: string;
  menu_address: string;
  menu_opening_hours: string;
}

const defaultStoreSettings: StoreSettings = {
  store_logo_url: null,
  menu_enabled: false,
  menu_banner_url: null,
  menu_store_name: "Churrosteria",
  menu_description: "Os melhores churros da cidade!",
  menu_whatsapp: "",
  menu_address: "",
  menu_opening_hours: "",
};

// Hook for PUBLIC access (no auth required) - for the menu page
export function usePublicStoreSettings() {
  return useQuery({
    queryKey: ["public-store-settings"],
    queryFn: async (): Promise<StoreSettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .or("key.like.store_%,key.like.menu_%");

      if (error) {
        console.error("Error fetching store settings:", error);
        return defaultStoreSettings;
      }

      const settingsMap = data?.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {} as Record<string, unknown>) || {};

      return {
        store_logo_url: (settingsMap["store_logo_url"] as string) || null,
        menu_enabled: (settingsMap["menu_enabled"] as boolean) ?? false,
        menu_banner_url: (settingsMap["menu_banner_url"] as string) || null,
        menu_store_name: (settingsMap["menu_store_name"] as string) || defaultStoreSettings.menu_store_name,
        menu_description: (settingsMap["menu_description"] as string) || defaultStoreSettings.menu_description,
        menu_whatsapp: (settingsMap["menu_whatsapp"] as string) || "",
        menu_address: (settingsMap["menu_address"] as string) || "",
        menu_opening_hours: (settingsMap["menu_opening_hours"] as string) || "",
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

// Hook for AUTHENTICATED access - for admin pages (uses existing logo as fallback)
export function useStoreSettings() {
  return useQuery({
    queryKey: ["store-settings"],
    queryFn: async (): Promise<StoreSettings> => {
      const { data, error } = await supabase
        .from("app_settings")
        .select("key, value")
        .or("key.like.store_%,key.like.menu_%");

      if (error) {
        console.error("Error fetching store settings:", error);
        return defaultStoreSettings;
      }

      const settingsMap = data?.reduce((acc, item) => {
        acc[item.key] = item.value;
        return acc;
      }, {} as Record<string, unknown>) || {};

      return {
        store_logo_url: (settingsMap["store_logo_url"] as string) || null,
        menu_enabled: (settingsMap["menu_enabled"] as boolean) ?? false,
        menu_banner_url: (settingsMap["menu_banner_url"] as string) || null,
        menu_store_name: (settingsMap["menu_store_name"] as string) || defaultStoreSettings.menu_store_name,
        menu_description: (settingsMap["menu_description"] as string) || defaultStoreSettings.menu_description,
        menu_whatsapp: (settingsMap["menu_whatsapp"] as string) || "",
        menu_address: (settingsMap["menu_address"] as string) || "",
        menu_opening_hours: (settingsMap["menu_opening_hours"] as string) || "",
      };
    },
    staleTime: 1000 * 60 * 5,
  });
}
