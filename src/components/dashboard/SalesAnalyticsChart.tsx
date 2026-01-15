import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  BarChart3, 
  LineChart as LineChartIcon, 
  CalendarIcon, 
  Filter,
  TrendingUp,
  Clock,
  Package,
  DollarSign
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  format, 
  parseISO,
  eachDayOfInterval,
  eachHourOfInterval,
  isSameDay,
  isSameHour,
  startOfHour,
  endOfHour,
  getHours
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type PeriodType = 'today' | '7days' | '30days' | 'custom';
type ViewType = 'revenue' | 'quantity' | 'products' | 'hourly';
type ChartType = 'area' | 'bar';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

const CHART_COLORS = [
  "hsl(195 38% 52%)",  // primary
  "hsl(350 100% 75%)", // accent
  "hsl(142 71% 45%)",  // success
  "hsl(20 30% 45%)",   // secondary
  "hsl(220 15% 55%)",  // muted
  "hsl(195 38% 70%)",  // primary lighter
  "hsl(350 100% 85%)", // accent lighter
  "hsl(142 71% 60%)",  // success lighter
];

export function SalesAnalyticsChart() {
  const [period, setPeriod] = useState<PeriodType>('7days');
  const [viewType, setViewType] = useState<ViewType>('revenue');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [selectedProduct, setSelectedProduct] = useState<string>('all');

  // Calcular datas baseado no período
  const getDateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'today':
        return { start: startOfDay(now), end: endOfDay(now) };
      case '7days':
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case '30days':
        return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
      case 'custom':
        return { 
          start: dateRange.from ? startOfDay(dateRange.from) : startOfDay(subDays(now, 6)),
          end: dateRange.to ? endOfDay(dateRange.to) : endOfDay(now)
        };
    }
  }, [period, dateRange]);

  // Query: Vendas com itens detalhados
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['sales-analytics', period, dateRange, selectedProduct],
    queryFn: async () => {
      let salesQuery = supabase
        .from('sales')
        .select(`
          id,
          total,
          created_at,
          payment_method,
          customer_id,
          customers(name)
        `)
        .gte('created_at', getDateRange.start.toISOString())
        .lte('created_at', getDateRange.end.toISOString())
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      const { data: sales } = await salesQuery;
      if (!sales || sales.length === 0) return { sales: [], items: [] };

      const saleIds = sales.map(s => s.id);
      
      let itemsQuery = supabase
        .from('sale_items')
        .select('sale_id, product_id, product_name, quantity, subtotal, unit_price')
        .in('sale_id', saleIds);

      if (selectedProduct !== 'all') {
        itemsQuery = itemsQuery.eq('product_id', selectedProduct);
      }

      const { data: items } = await itemsQuery;
      
      return { sales, items: items || [] };
    },
    refetchInterval: 60000,
  });

  // Query: Lista de produtos para filtro
  const { data: products } = useQuery({
    queryKey: ['products-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name')
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
  });

  // Processar dados para o gráfico de receita/quantidade por dia
  const dailyChartData = useMemo(() => {
    if (!salesData?.sales) return [];

    const days = eachDayOfInterval({ 
      start: getDateRange.start, 
      end: getDateRange.end 
    });

    return days.map(day => {
      const daySales = salesData.sales.filter((sale: any) => 
        isSameDay(parseISO(sale.created_at), day)
      );
      
      const dayItems = salesData.items.filter((item: any) => 
        daySales.some((sale: any) => sale.id === item.sale_id)
      );

      const revenue = daySales.reduce((sum: number, sale: any) => sum + Number(sale.total), 0);
      const quantity = dayItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
      const salesCount = daySales.length;

      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        fullDate: format(day, "EEEE, dd 'de' MMMM", { locale: ptBR }),
        revenue,
        quantity,
        salesCount,
      };
    });
  }, [salesData, getDateRange]);

  // Processar dados para o gráfico por hora (apenas para "Hoje")
  const hourlyChartData = useMemo(() => {
    if (!salesData?.sales || period !== 'today') return [];

    const now = new Date();
    const hours = eachHourOfInterval({ 
      start: startOfDay(now), 
      end: endOfDay(now) 
    });

    return hours.map(hour => {
      const hourSales = salesData.sales.filter((sale: any) => {
        const saleDate = parseISO(sale.created_at);
        return getHours(saleDate) === getHours(hour);
      });
      
      const hourItems = salesData.items.filter((item: any) => 
        hourSales.some((sale: any) => sale.id === item.sale_id)
      );

      const revenue = hourSales.reduce((sum: number, sale: any) => sum + Number(sale.total), 0);
      const quantity = hourItems.reduce((sum: number, item: any) => sum + item.quantity, 0);

      return {
        hour: format(hour, 'HH:mm'),
        revenue,
        quantity,
        salesCount: hourSales.length,
      };
    });
  }, [salesData, period]);

  // Processar dados para o gráfico de produtos mais vendidos
  const productChartData = useMemo(() => {
    if (!salesData?.items) return [];

    const grouped = salesData.items.reduce((acc: any, item: any) => {
      if (!acc[item.product_id]) {
        acc[item.product_id] = {
          name: item.product_name,
          quantity: 0,
          revenue: 0,
        };
      }
      acc[item.product_id].quantity += item.quantity;
      acc[item.product_id].revenue += Number(item.subtotal);
      return acc;
    }, {});

    return Object.values(grouped)
      .sort((a: any, b: any) => b.quantity - a.quantity)
      .slice(0, 8);
  }, [salesData]);

  // Estatísticas resumidas
  const summaryStats = useMemo(() => {
    if (!salesData?.sales) return { totalRevenue: 0, totalQuantity: 0, totalSales: 0, avgTicket: 0 };

    const totalRevenue = salesData.sales.reduce((sum: number, sale: any) => sum + Number(sale.total), 0);
    const totalQuantity = salesData.items.reduce((sum: number, item: any) => sum + item.quantity, 0);
    const totalSales = salesData.sales.length;
    const avgTicket = totalSales > 0 ? totalRevenue / totalSales : 0;

    return { totalRevenue, totalQuantity, totalSales, avgTicket };
  }, [salesData]);

  const chartConfig = {
    revenue: { label: "Receita", color: "hsl(195 38% 52%)" },
    quantity: { label: "Quantidade", color: "hsl(350 100% 75%)" },
    salesCount: { label: "Vendas", color: "hsl(142 71% 45%)" },
  };

  const renderMainChart = () => {
    if (isLoading) {
      return <Skeleton className="h-[300px] w-full" />;
    }

    const data = viewType === 'hourly' ? hourlyChartData : dailyChartData;
    const dataKey = viewType === 'quantity' ? 'quantity' : 'revenue';
    const xAxisKey = viewType === 'hourly' ? 'hour' : 'date';

    if (data.length === 0) {
      return (
        <div className="h-[300px] flex items-center justify-center text-muted-foreground">
          Nenhum dado para o período selecionado
        </div>
      );
    }

    return (
      <ChartContainer config={chartConfig} className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(195 38% 52%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(195 38% 52%)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorQuantity" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(350 100% 75%)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="hsl(350 100% 75%)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(value) => 
                  dataKey === 'revenue' 
                    ? `R$${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`
                    : String(value)
                }
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value, name) => {
                    if (name === 'revenue') return [`R$ ${Number(value).toFixed(2)}`, 'Receita'];
                    if (name === 'quantity') return [value, 'Quantidade'];
                    return [value, name];
                  }}
                />} 
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={dataKey === 'revenue' ? "hsl(195 38% 52%)" : "hsl(350 100% 75%)"}
                fillOpacity={1}
                fill={dataKey === 'revenue' ? "url(#colorRevenue)" : "url(#colorQuantity)"}
                strokeWidth={2}
              />
            </AreaChart>
          ) : (
            <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey={xAxisKey} 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(value) => 
                  dataKey === 'revenue' 
                    ? `R$${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`
                    : String(value)
                }
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value, name) => {
                    if (name === 'revenue') return [`R$ ${Number(value).toFixed(2)}`, 'Receita'];
                    if (name === 'quantity') return [value, 'Quantidade'];
                    return [value, name];
                  }}
                />} 
              />
              <Bar
                dataKey={dataKey}
                fill={dataKey === 'revenue' ? "hsl(195 38% 52%)" : "hsl(350 100% 75%)"}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </ChartContainer>
    );
  };

  const renderProductsChart = () => {
    if (isLoading) {
      return <Skeleton className="h-[250px] w-full" />;
    }

    if (productChartData.length === 0) {
      return (
        <div className="h-[250px] flex items-center justify-center text-muted-foreground">
          Nenhum produto vendido no período
        </div>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={250}>
        <BarChart 
          data={productChartData} 
          layout="vertical" 
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11 }} className="text-muted-foreground" />
          <YAxis 
            type="category" 
            dataKey="name" 
            tick={{ fontSize: 11 }} 
            width={100}
            className="text-muted-foreground"
          />
          <Tooltip 
            formatter={(value: any, name: string) => {
              if (name === 'quantity') return [value, 'Unidades'];
              if (name === 'revenue') return [`R$ ${Number(value).toFixed(2)}`, 'Receita'];
              return [value, name];
            }}
            contentStyle={{ 
              backgroundColor: 'hsl(var(--card))', 
              border: '1px solid hsl(var(--border))',
              borderRadius: '8px',
            }}
          />
          <Bar dataKey="quantity" fill="hsl(195 38% 52%)" radius={[0, 4, 4, 0]} name="quantity" />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Análise de Vendas
            </CardTitle>
            <CardDescription>
              Visualize e analise suas vendas com filtros avançados
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={chartType === 'area' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('area')}
              className="h-8"
            >
              <LineChartIcon className="h-4 w-4" />
            </Button>
            <Button
              variant={chartType === 'bar' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setChartType('bar')}
              className="h-8"
            >
              <BarChart3 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3">
          {/* Período */}
          <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodType)} className="w-full md:w-auto">
            <TabsList className="grid grid-cols-4 w-full md:w-auto">
              <TabsTrigger value="today" className="text-xs">Hoje</TabsTrigger>
              <TabsTrigger value="7days" className="text-xs">7 dias</TabsTrigger>
              <TabsTrigger value="30days" className="text-xs">30 dias</TabsTrigger>
              <TabsTrigger value="custom" className="text-xs">Período</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Date Picker para período customizado */}
          {period === 'custom' && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 gap-2 min-w-[200px]">
                  <CalendarIcon className="h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "dd/MM/yyyy")} - {format(dateRange.to, "dd/MM/yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "dd/MM/yyyy")
                    )
                  ) : (
                    "Selecionar datas"
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-3 border-b">
                  <p className="text-sm font-medium">Selecione o período</p>
                  <p className="text-xs text-muted-foreground">Clique na data inicial e depois na data final</p>
                </div>
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={(range) => setDateRange({ from: range?.from, to: range?.to })}
                  numberOfMonths={2}
                  locale={ptBR}
                  disabled={(date) => date > new Date()}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Filtro de Produto */}
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger className="w-full md:w-[180px] h-9">
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os produtos</SelectItem>
              {products?.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Receita Total</span>
            </div>
            <p className="text-lg font-bold">
              R$ {summaryStats.totalRevenue.toFixed(2)}
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Package className="h-4 w-4" />
              <span className="text-xs">Itens Vendidos</span>
            </div>
            <p className="text-lg font-bold">{summaryStats.totalQuantity}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Nº de Vendas</span>
            </div>
            <p className="text-lg font-bold">{summaryStats.totalSales}</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Ticket Médio</span>
            </div>
            <p className="text-lg font-bold">
              R$ {summaryStats.avgTicket.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Tabs de visualização */}
        <Tabs value={viewType} onValueChange={(v) => setViewType(v as ViewType)} className="w-full">
          <TabsList className="grid grid-cols-4 w-full md:w-auto">
            <TabsTrigger value="revenue" className="text-xs gap-1">
              <DollarSign className="h-3 w-3" />
              Receita
            </TabsTrigger>
            <TabsTrigger value="quantity" className="text-xs gap-1">
              <Package className="h-3 w-3" />
              Quantidade
            </TabsTrigger>
            <TabsTrigger value="products" className="text-xs gap-1">
              <BarChart3 className="h-3 w-3" />
              Produtos
            </TabsTrigger>
            {period === 'today' && (
              <TabsTrigger value="hourly" className="text-xs gap-1">
                <Clock className="h-3 w-3" />
                Por Hora
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        {/* Gráfico principal */}
        <div className="pt-2">
          {viewType === 'products' ? renderProductsChart() : renderMainChart()}
        </div>
      </CardContent>
    </Card>
  );
}
