import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  CalendarIcon, 
  Package, 
  ChevronDown, 
  ChevronUp,
  ShoppingBag
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  startOfDay, 
  endOfDay, 
  subDays, 
  format, 
  parseISO,
  eachDayOfInterval,
  isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type PeriodType = '7days' | '14days' | '30days' | 'custom';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface DayData {
  date: Date;
  dateLabel: string;
  fullDate: string;
  totalQuantity: number;
  totalRevenue: number;
  products: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
}

export function ProductsSoldByDayChart() {
  const [period, setPeriod] = useState<PeriodType>('7days');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());

  const getDateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case '7days':
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case '14days':
        return { start: startOfDay(subDays(now, 13)), end: endOfDay(now) };
      case '30days':
        return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
      case 'custom':
        return { 
          start: dateRange.from ? startOfDay(dateRange.from) : startOfDay(subDays(now, 6)),
          end: dateRange.to ? endOfDay(dateRange.to) : endOfDay(now)
        };
    }
  }, [period, dateRange]);

  const { data: salesData, isLoading } = useQuery({
    queryKey: ['products-by-day', period, dateRange],
    queryFn: async () => {
      const { data: sales } = await supabase
        .from('sales')
        .select('id, total, created_at')
        .gte('created_at', getDateRange.start.toISOString())
        .lte('created_at', getDateRange.end.toISOString())
        .eq('status', 'completed')
        .order('created_at', { ascending: true });

      if (!sales || sales.length === 0) return { sales: [], items: [] };

      const saleIds = sales.map(s => s.id);
      
      const { data: items } = await supabase
        .from('sale_items')
        .select('sale_id, product_name, quantity, subtotal')
        .in('sale_id', saleIds);

      return { sales, items: items || [] };
    },
    refetchInterval: 60000,
  });

  const dayByDayData = useMemo((): DayData[] => {
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

      // Agrupar produtos
      const productMap = dayItems.reduce((acc: any, item: any) => {
        if (!acc[item.product_name]) {
          acc[item.product_name] = { name: item.product_name, quantity: 0, revenue: 0 };
        }
        acc[item.product_name].quantity += item.quantity;
        acc[item.product_name].revenue += Number(item.subtotal);
        return acc;
      }, {});

      const products = Object.values(productMap)
        .sort((a: any, b: any) => b.quantity - a.quantity) as any[];

      return {
        date: day,
        dateLabel: format(day, 'dd/MM', { locale: ptBR }),
        fullDate: format(day, "EEEE, dd 'de' MMMM", { locale: ptBR }),
        totalQuantity: dayItems.reduce((sum: number, item: any) => sum + item.quantity, 0),
        totalRevenue: daySales.reduce((sum: number, sale: any) => sum + Number(sale.total), 0),
        products,
      };
    }).reverse(); // Mais recentes primeiro
  }, [salesData, getDateRange]);

  const chartData = useMemo(() => {
    return [...dayByDayData].reverse().map(day => ({
      date: day.dateLabel,
      quantidade: day.totalQuantity,
      receita: day.totalRevenue,
    }));
  }, [dayByDayData]);

  const toggleDay = (dateLabel: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dateLabel)) {
        newSet.delete(dateLabel);
      } else {
        newSet.add(dateLabel);
      }
      return newSet;
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Produtos Vendidos por Dia
            </CardTitle>
            <CardDescription>
              Veja quais produtos foram vendidos em cada dia
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-3">
          <Tabs value={period} onValueChange={(v) => setPeriod(v as PeriodType)} className="w-full md:w-auto">
            <TabsList className="grid grid-cols-4 w-full md:w-auto">
              <TabsTrigger value="7days" className="text-xs">7 dias</TabsTrigger>
              <TabsTrigger value="14days" className="text-xs">14 dias</TabsTrigger>
              <TabsTrigger value="30days" className="text-xs">30 dias</TabsTrigger>
              <TabsTrigger value="custom" className="text-xs">Período</TabsTrigger>
            </TabsList>
          </Tabs>

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
        </div>

        {/* Gráfico de barras */}
        {isLoading ? (
          <Skeleton className="h-[200px] w-full" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip 
                formatter={(value: any, name: string) => {
                  if (name === 'quantidade') return [value, 'Itens vendidos'];
                  if (name === 'receita') return [formatCurrency(value), 'Receita'];
                  return [value, name];
                }}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Bar 
                dataKey="quantidade" 
                fill="hsl(195 38% 52%)" 
                radius={[4, 4, 0, 0]}
                name="quantidade"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            Nenhuma venda no período
          </div>
        )}

        {/* Lista de dias com produtos */}
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {isLoading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : dayByDayData.length > 0 ? (
              dayByDayData.map((day) => (
                <div 
                  key={day.dateLabel} 
                  className="border rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => toggleDay(day.dateLabel)}
                    className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <ShoppingBag className="h-4 w-4 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium capitalize">{day.fullDate}</p>
                        <p className="text-xs text-muted-foreground">
                          {day.products.length} produto(s) • {day.totalQuantity} unidade(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="secondary" className="font-mono">
                        {formatCurrency(day.totalRevenue)}
                      </Badge>
                      {expandedDays.has(day.dateLabel) ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  
                  {expandedDays.has(day.dateLabel) && day.products.length > 0 && (
                    <div className="border-t bg-muted/30 p-3">
                      <div className="grid grid-cols-3 gap-2 text-xs font-medium text-muted-foreground mb-2 px-2">
                        <span>Produto</span>
                        <span className="text-center">Qtd</span>
                        <span className="text-right">Receita</span>
                      </div>
                      <div className="space-y-1">
                        {day.products.map((product, idx) => (
                          <div 
                            key={idx}
                            className="grid grid-cols-3 gap-2 text-sm p-2 rounded-md hover:bg-muted/50"
                          >
                            <span className="truncate">{product.name}</span>
                            <span className="text-center font-medium">{product.quantity}</span>
                            <span className="text-right font-mono text-xs">
                              {formatCurrency(product.revenue)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {expandedDays.has(day.dateLabel) && day.products.length === 0 && (
                    <div className="border-t bg-muted/30 p-3 text-center text-sm text-muted-foreground">
                      Nenhum produto vendido neste dia
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma venda no período selecionado
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
