import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Loader2 } from "lucide-react";

type PermissionKey = 
  | "can_access_sales"
  | "can_access_products"
  | "can_access_stock"
  | "can_access_financial"
  | "can_access_reports"
  | "can_access_settings";

interface PermissionRouteProps {
  children: React.ReactNode;
  permission?: PermissionKey;
  requireMaster?: boolean;
}

export function PermissionRoute({ 
  children, 
  permission, 
  requireMaster = false 
}: PermissionRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { isMaster, hasPermission, loading: permLoading } = usePermissions();

  if (authLoading || permLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if master access is required
  if (requireMaster && !isMaster) {
    return <Navigate to="/" replace />;
  }

  // Check specific permission
  if (permission && !hasPermission(permission)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
