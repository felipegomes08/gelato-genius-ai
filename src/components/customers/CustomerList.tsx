import { useState } from "react";
import { Pencil, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditCustomerDialog } from "./EditCustomerDialog";
import { CustomerCoupons } from "./CustomerCoupons";
import { Skeleton } from "@/components/ui/skeleton";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

interface CustomerListProps {
  customers: Customer[] | undefined;
  isLoading: boolean;
}

export function CustomerList({ customers, isLoading }: CustomerListProps) {
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [couponsCustomer, setCouponsCustomer] = useState<Customer | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 border border-border rounded-lg">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-40" />
          </div>
        ))}
      </div>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhum cliente cadastrado
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {customers.map((customer) => (
          <div
            key={customer.id}
            className="p-4 border border-border rounded-lg hover:bg-muted/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground mb-1 truncate">
                  {customer.name}
                </h3>
                {customer.phone && (
                  <p className="text-sm text-muted-foreground mb-0.5">
                    {customer.phone}
                  </p>
                )}
                {customer.email && (
                  <p className="text-sm text-muted-foreground truncate">
                    {customer.email}
                  </p>
                )}
                {customer.notes && (
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    {customer.notes}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingCustomer(customer)}
                  className="h-8 px-2"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCouponsCustomer(customer)}
                  className="h-8 px-2"
                >
                  <Tag className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <EditCustomerDialog
        customer={editingCustomer}
        open={!!editingCustomer}
        onOpenChange={(open) => !open && setEditingCustomer(null)}
      />

      <CustomerCoupons
        customer={couponsCustomer}
        open={!!couponsCustomer}
        onOpenChange={(open) => !open && setCouponsCustomer(null)}
      />
    </>
  );
}
