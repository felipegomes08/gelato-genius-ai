import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, ShoppingCart, Package, AlertTriangle, Users, DollarSign, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { useState } from "react";
import { ExpiringCouponsCard } from "@/components/dashboard/ExpiringCouponsCard";

type PeriodType = 'today' | '7days' | '30days' | 'month' | 'all';

export default function Dashboard() {
  const [period, setPeriod] = useState<PeriodType>('today');

  // Calcular datas baseado no período
  const getDateRange = (periodType: PeriodType) => {
    const now = new Date();
    switch (periodType) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case '7days':
        return { start: startOfDay(subDays(now, 7)), end: endOfDay(now) };
      case '30days':
        return { start: startOfDay(subDays(now, 30)), end: endOfDay(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'all':
        return { start: new Date(2000, 0, 1), end: endOfDay(now) };
    }
  };

  const getPreviousDateRange = (periodType: PeriodType) => {
    const now = new Date();
    switch (periodType) {
      case 'today':
        return { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) };
      case '7days':
        return { start: startOfDay(subDays(now, 14)), end: endOfDay(subDays(now, 7)) };
      case '30days':
        return { start: startOfDay(subDays(now, 60)), end: endOfDay(subDays(now, 30)) };
      case 'month':
        return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case 'all':
        return { start: new Date(2000, 0, 1), end: new Date(2000, 0, 1) };
    }
  };

  const dateRange = getDateRange(period);
  const previousDateRange = getPreviousDateRange(period);

  // Query: Vendas do período atual
  const { data: currentSales, isLoading: loadingCurrentSales } = useQuery({
    queryKey: ['sales', period, 'current'],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales')
        .select('total, created_at')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
        .eq('status', 'completed');
      return data || [];
    },
    refetchInterval: 30000,
  });

  // Query: Vendas do período anterior (para comparação)
  const { data: previousSales } = useQuery({
    queryKey: ['sales', period, 'previous'],
    queryFn: async () => {
      if (period === 'all') return [];
      const { data } = await supabase
        .from('sales')
        .select('total')
        .gte('created_at', previousDateRange.start.toISOString())
        .lte('created_at', previousDateRange.end.toISOString())
        .eq('status', 'completed');
      return data || [];
    },
  });

  // Query: Itens vendidos no período
  const { data: currentItems, isLoading: loadingCurrentItems } = useQuery({
    queryKey: ['sale_items', period],
    queryFn: async () => {
      const { data: sales } = await supabase
        .from('sales')
        .select('id')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
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

  // Query: Top produtos no período
  const { data: topProducts, isLoading: loadingTopProducts } = useQuery({
    queryKey: ['top_products', period],
    queryFn: async () => {
      const { data: sales } = await supabase
        .from('sales')
        .select('id')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
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

  // Query: Top clientes no período
  const { data: topCustomers, isLoading: loadingTopCustomers } = useQuery({
    queryKey: ['top_customers', period],
    queryFn: async () => {
      const { data: sales } = await supabase
        .from('sales')
        .select('customer_id, total, customers(name)')
        .gte('created_at', dateRange.start.toISOString())
        .lte('created_at', dateRange.end.toISOString())
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
        .select('id, name, current_stock, low_stock_threshold')
        .eq('controls_stock', true)
        .eq('is_active', true)
        .or('current_stock.lte.low_stock_threshold,current_stock.is.null');
      
      return data || [];
    },
    refetchInterval: 60000,
  });

  // Cálculos
  const currentRevenue = currentSales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
  const previousRevenue = previousSales?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
  const revenueChange = period === 'all' 
    ? "0"
    : previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue * 100).toFixed(0)
      : currentRevenue > 0 ? "+100" : "0";

  const currentProductsSold = currentItems?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  const currentAverageTicket = currentSales && currentSales.length > 0
    ? currentRevenue / currentSales.length
    : 0;

  // Query: Insights da IA
  const { data: aiInsights, isLoading: loadingInsights } = useQuery({
    queryKey: ['ai-insights', period, currentRevenue, currentProductsSold],
    queryFn: async () => {
      const salesData = {
        revenue: currentRevenue,
        itemsSold: currentProductsSold,
        averageTicket: currentAverageTicket,
        changePercent: Number(revenueChange),
        topProducts: (topProducts || []).map((p: any) => ({
          name: p.name,
          quantity: p.sold,
          revenue: p.revenue
        }))
      };

      const stockData = {
        lowStockCount: stockAlerts?.length || 0,
        criticalProducts: (stockAlerts || []).slice(0, 3).map((p: any) => p.name)
      };

      const customersData = {
        topCustomers: (topCustomers || []).map((c: any) => ({
          name: c.name,
          total: c.total
        }))
      };

      const { data, error } = await supabase.functions.invoke('generate-insights', {
        body: {
          salesData,
          stockData,
          customersData,
          period: getPeriodLabel()
        }
      });

      if (error) throw error;
      return data.insights;
    },
    enabled: !loadingCurrentSales && !loadingCurrentItems && (topProducts?.length || 0) > 0,
    refetchInterval: 300000, // 5 minutos
  });

  const getPeriodLabel = () => {
    switch (period) {
      case 'today': return 'Hoje';
      case '7days': return 'Últimos 7 dias';
      case '30days': return 'Últimos 30 dias';
      case 'month': return 'Este mês';
      case 'all': return 'Todo período';
    }
  };

  const getComparisonLabel = () => {
    if (period === 'all') return '';
    switch (period) {
      case 'today': return 'vs ontem';
      case '7days': return 'vs 7 dias anteriores';
      case '30days': return 'vs 30 dias anteriores';
      case 'month': return 'vs mês anterior';
    }
  };

  const stats = [
    {
      title: `Vendas - ${getPeriodLabel()}`,
      value: loadingCurrentSales ? "..." : `R$ ${currentRevenue.toFixed(2)}`,
      change: period === 'all' ? 'Total' : `${revenueChange}% ${getComparisonLabel()}`,
      icon: ShoppingCart,
      trend: period === 'all' ? 'up' : Number(revenueChange) >= 0 ? "up" : "down",
    },
    {
      title: "Produtos Vendidos",
      value: loadingCurrentItems ? "..." : String(currentProductsSold),
      change: getPeriodLabel(),
      icon: Package,
      trend: "up",
    },
    {
      title: "Ticket Médio",
      value: loadingCurrentSales ? "..." : `R$ ${currentAverageTicket.toFixed(2)}`,
      change: currentSales?.length ? `${currentSales.length} vendas` : "0 vendas",
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
    <div className="max-w-md md:max-w-7xl mx-auto space-y-6 px-4 md:px-0">
      {/* Period Filter */}
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodType)}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="today" className="text-xs">Hoje</TabsTrigger>
              <TabsTrigger value="7days" className="text-xs">7d</TabsTrigger>
              <TabsTrigger value="30days" className="text-xs">30d</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">Mês</TabsTrigger>
              <TabsTrigger value="all" className="text-xs">Tudo</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* AI Insights - Full width */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Insights da IA
          </CardTitle>
          <CardDescription>
            Análise inteligente dos seus dados de negócio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loadingInsights ? (
            <>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </>
          ) : aiInsights ? (
            <div className="prose prose-sm max-w-none">
              <div className="whitespace-pre-line text-sm text-foreground">
                {aiInsights}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aguardando dados para gerar insights...
            </p>
          )}
        </CardContent>
      </Card>

      {/* Expiring Coupons Card */}
      <ExpiringCouponsCard />

      {/* Top Products e Top Customers side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top Products */}
        <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Produtos que Mais Venderam
          </CardTitle>
          <p className="text-xs text-muted-foreground">{getPeriodLabel()}</p>
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
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent/10 text-accent font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sold} vendidos</p>
                  </div>
                </div>
                <p className="font-semibold text-sm">R$ {product.revenue.toFixed(2)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum produto vendido no período selecionado
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
            <p className="text-xs text-muted-foreground">{getPeriodLabel()}</p>
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
                Nenhum cliente com compras no período selecionado
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
