import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, ShoppingCart, Package, AlertTriangle, Users, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";

export default function Dashboard() {
  // Query: Vendas de hoje
  const { data: todaySales, isLoading: loadingTodaySales } = useQuery({
    queryKey: ['sales', 'today'],
    queryFn: async () => {
      const start = startOfDay(new Date());
      const end = endOfDay(new Date());
      const { data } = await supabase
        .from('sales')
        .select('total, created_at')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('status', 'completed');
      return data || [];
    },
    refetchInterval: 30000, // Atualiza a cada 30s
  });

  // Query: Vendas de ontem (para comparação)
  const { data: yesterdaySales } = useQuery({
    queryKey: ['sales', 'yesterday'],
    queryFn: async () => {
      const start = startOfDay(subDays(new Date(), 1));
      const end = endOfDay(subDays(new Date(), 1));
      const { data } = await supabase
        .from('sales')
        .select('total')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('status', 'completed');
      return data || [];
    },
  });

  // Query: Itens vendidos hoje
  const { data: todayItems, isLoading: loadingTodayItems } = useQuery({
    queryKey: ['sale_items', 'today'],
    queryFn: async () => {
      const start = startOfDay(new Date());
      const end = endOfDay(new Date());
      const { data: sales } = await supabase
        .from('sales')
        .select('id')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('status', 'completed');
      
      if (!sales || sales.length === 0) return [];
      
      const saleIds = sales.map(s => s.id);
      const { data } = await supabase
        .from('sale_items')
        .select('quantity')
        .in('sale_id', saleIds);
      
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Query: Top produtos (últimos 30 dias)
  const { data: topProducts, isLoading: loadingTopProducts } = useQuery({
    queryKey: ['top_products'],
    queryFn: async () => {
      const start = subDays(new Date(), 30);
      const { data: sales } = await supabase
        .from('sales')
        .select('id')
        .gte('created_at', start.toISOString())
        .eq('status', 'completed');
      
      if (!sales || sales.length === 0) return [];
      
      const saleIds = sales.map(s => s.id);
      const { data: items } = await supabase
        .from('sale_items')
        .select('product_id, product_name, quantity, subtotal')
        .in('sale_id', saleIds);
      
      if (!items) return [];
      
      // Agrupar por produto
      const grouped = items.reduce((acc: any, item) => {
        if (!acc[item.product_id]) {
          acc[item.product_id] = {
            name: item.product_name,
            sold: 0,
            revenue: 0,
          };
        }
        acc[item.product_id].sold += item.quantity;
        acc[item.product_id].revenue += Number(item.subtotal);
        return acc;
      }, {});
      
      // Converter para array e ordenar
      return Object.values(grouped)
        .sort((a: any, b: any) => b.sold - a.sold)
        .slice(0, 5);
    },
    refetchInterval: 60000,
  });

  // Query: Top clientes (últimos 30 dias)
  const { data: topCustomers, isLoading: loadingTopCustomers } = useQuery({
    queryKey: ['top_customers'],
    queryFn: async () => {
      const start = subDays(new Date(), 30);
      const { data: sales } = await supabase
        .from('sales')
        .select('customer_id, total, customers(name)')
        .gte('created_at', start.toISOString())
        .eq('status', 'completed')
        .not('customer_id', 'is', null);
      
      if (!sales || sales.length === 0) return [];
      
      // Agrupar por cliente
      const grouped = sales.reduce((acc: any, sale: any) => {
        if (!sale.customer_id) return acc;
        if (!acc[sale.customer_id]) {
          acc[sale.customer_id] = {
            name: sale.customers?.name || 'Cliente sem nome',
            purchases: 0,
            total: 0,
          };
        }
        acc[sale.customer_id].purchases += 1;
        acc[sale.customer_id].total += Number(sale.total);
        return acc;
      }, {});
      
      return Object.values(grouped)
        .sort((a: any, b: any) => b.total - a.total)
        .slice(0, 5);
    },
    refetchInterval: 60000,
  });

  // Query: Alertas de estoque
  const { data: stockAlerts, isLoading: loadingStockAlerts } = useQuery({
    queryKey: ['stock_alerts'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id')
        .eq('controls_stock', true)
        .eq('is_active', true)
        .or('current_stock.lte.low_stock_threshold,current_stock.is.null');
      
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Query: Vendas do mês
  const { data: monthSales } = useQuery({
    queryKey: ['sales', 'month'],
    queryFn: async () => {
      const start = startOfMonth(new Date());
      const end = endOfMonth(new Date());
      const { data } = await supabase
        .from('sales')
        .select('total')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('status', 'completed');
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Query: Vendas do mês anterior
  const { data: lastMonthSales } = useQuery({
    queryKey: ['sales', 'last_month'],
    queryFn: async () => {
      const start = startOfMonth(subMonths(new Date(), 1));
      const end = endOfMonth(subMonths(new Date(), 1));
      const { data } = await supabase
        .from('sales')
        .select('total')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .eq('status', 'completed');
      return data || [];
    },
  });

  // Cálculos
  const todayRevenue = todaySales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
  const yesterdayRevenue = yesterdaySales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
  const revenueChange = yesterdayRevenue > 0 
    ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue * 100).toFixed(0)
    : todayRevenue > 0 ? "+100" : "0";

  const todayProductsSold = todayItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  const todayAverageTicket = todaySales && todaySales.length > 0
    ? todayRevenue / todaySales.length
    : 0;

  const monthRevenue = monthSales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
  const lastMonthRevenue = lastMonthSales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
  const monthChange = lastMonthRevenue > 0
    ? ((monthRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(0)
    : monthRevenue > 0 ? "+100" : "0";

  const stats = [
    {
      title: "Vendas Hoje",
      value: loadingTodaySales ? "..." : `R$ ${todayRevenue.toFixed(2)}`,
      change: `${revenueChange}%`,
      icon: ShoppingCart,
      trend: Number(revenueChange) >= 0 ? "up" : "down",
    },
    {
      title: "Produtos Vendidos",
      value: loadingTodayItems ? "..." : String(todayProductsSold),
      change: "Hoje",
      icon: Package,
      trend: "up",
    },
    {
      title: "Ticket Médio",
      value: loadingTodaySales ? "..." : `R$ ${todayAverageTicket.toFixed(2)}`,
      change: todaySales?.length ? `${todaySales.length} vendas` : "0 vendas",
      icon: TrendingUp,
      trend: "up",
    },
    {
      title: "Alertas Estoque",
      value: loadingStockAlerts ? "..." : String(stockAlerts?.length || 0),
      change: "Atenção",
      icon: AlertTriangle,
      trend: "warning",
    },
  ];
  return (
    <div className="min-h-screen bg-background pb-20">
      <Header title="Painel" />
      
      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-lg ${
                    stat.trend === "warning" 
                      ? "bg-destructive/10" 
                      : "bg-primary/10"
                  }`}>
                    <stat.icon className={`h-4 w-4 ${
                      stat.trend === "warning"
                        ? "text-destructive"
                        : "text-primary"
                    }`} />
                  </div>
                  <span className={`text-xs font-medium ${
                    stat.trend === "warning"
                      ? "text-destructive"
                      : "text-success"
                  }`}>
                    {stat.change}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.title}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Top Products */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Produtos Mais Vendidos</CardTitle>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingTopProducts ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : topProducts && topProducts.length > 0 ? (
              topProducts.map((product: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sold} unidades</p>
                    </div>
                  </div>
                  <p className="font-semibold text-sm">R$ {product.revenue.toFixed(2)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma venda nos últimos 30 dias
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Clientes que Mais Compraram
            </CardTitle>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingTopCustomers ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : topCustomers && topCustomers.length > 0 ? (
              topCustomers.map((customer: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{customer.name}</p>
                      <p className="text-xs text-muted-foreground">{customer.purchases} compras</p>
                    </div>
                  </div>
                  <p className="font-semibold text-sm">R$ {customer.total.toFixed(2)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum cliente com compras nos últimos 30 dias
              </p>
            )}
          </CardContent>
        </Card>

        {/* Resumo do Mês */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              Resumo do Mês
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div>
                <p className="font-medium text-sm">Vendas do Mês</p>
                <p className="text-xs text-muted-foreground">
                  {monthSales?.length || 0} transações
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">R$ {monthRevenue.toFixed(2)}</p>
                <p className={`text-xs font-medium ${Number(monthChange) >= 0 ? 'text-success' : 'text-destructive'}`}>
                  {monthChange}% vs mês anterior
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="shadow-sm bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-accent">✨</span>
              Insights da IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm">
              <span className="font-semibold">Reposição recomendada:</span> 20 unidades de Casquinha Média 
              - previsão de 28 vendas nos próximos 7 dias.
            </p>
            <p className="text-sm">
              <span className="font-semibold">Promoção sugerida:</span> 15% de desconto em Picolé de Frutas 
              no fim de semana para aumentar o giro.
            </p>
          </CardContent>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
