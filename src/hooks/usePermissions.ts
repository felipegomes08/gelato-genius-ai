import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

interface Permissions {
  can_access_sales: boolean;
  can_access_products: boolean;
  can_access_stock: boolean;
  can_access_financial: boolean;
  can_access_reports: boolean;
  can_access_settings: boolean;
}

interface UsePermissionsReturn {
  isMaster: boolean;
  permissions: Permissions | null;
  loading: boolean;
  hasPermission: (permission: keyof Permissions) => boolean;
}

const defaultPermissions: Permissions = {
  can_access_sales: false,
  can_access_products: false,
  can_access_stock: false,
  can_access_financial: false,
  can_access_reports: false,
  can_access_settings: false,
};

export function usePermissions(): UsePermissionsReturn {
  const { user } = useAuth();
  const [isMaster, setIsMaster] = useState(false);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPermissions() {
      if (!user) {
        setIsMaster(false);
        setPermissions(null);
        setLoading(false);
        return;
      }

      try {
        // Check if user is master
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        const userIsMaster = roleData?.role === "master";
        setIsMaster(userIsMaster);

        // If master, grant all permissions
        if (userIsMaster) {
          setPermissions({
            can_access_sales: true,
            can_access_products: true,
            can_access_stock: true,
            can_access_financial: true,
            can_access_reports: true,
            can_access_settings: true,
          });
        } else {
          // Fetch specific permissions for employee
          const { data: permData } = await supabase
            .from("user_permissions")
            .select("*")
            .eq("user_id", user.id)
            .single();

          if (permData) {
            setPermissions({
              can_access_sales: permData.can_access_sales,
              can_access_products: permData.can_access_products,
              can_access_stock: permData.can_access_stock,
              can_access_financial: permData.can_access_financial,
              can_access_reports: permData.can_access_reports,
              can_access_settings: permData.can_access_settings,
            });
          } else {
            setPermissions(defaultPermissions);
          }
        }
      } catch (error) {
        console.error("Error fetching permissions:", error);
        setPermissions(defaultPermissions);
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, [user]);

  const hasPermission = (permission: keyof Permissions): boolean => {
    if (isMaster) return true;
    return permissions?.[permission] ?? false;
  };

  return {
    isMaster,
    permissions,
    loading,
    hasPermission,
  };
}
