import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  CalendarIcon, 
  TrendingUp,
  TrendingDown,
  Scale,
  ArrowUpCircle,
  ArrowDownCircle
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
  Legend,
  ReferenceLine,
  ComposedChart,
  Line,
} from "recharts";

type PeriodType = '7days' | '30days' | 'month' | 'custom';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export function FinancialBalanceChart() {
  const [period, setPeriod] = useState<PeriodType>('30days');
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const getDateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case '7days':
        return { start: startOfDay(subDays(now, 6)), end: endOfDay(now) };
      case '30days':
        return { start: startOfDay(subDays(now, 29)), end: endOfDay(now) };
      case 'month':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'custom':
        return { 
          start: dateRange.from ? startOfDay(dateRange.from) : startOfDay(subDays(now, 29)),
          end: dateRange.to ? endOfDay(dateRange.to) : endOfDay(now)
        };
    }
  }, [period, dateRange]);

  // Query: Transações financeiras (entradas e saídas)
  const { data: transactions, isLoading: loadingTransactions } = useQuery({
    queryKey: ['financial-balance', period, dateRange],
    queryFn: async () => {
      const { data } = await supabase
        .from('financial_transactions')
        .select('amount, transaction_type, transaction_date, category')
        .gte('transaction_date', getDateRange.start.toISOString().split('T')[0])
        .lte('transaction_date', getDateRange.end.toISOString().split('T')[0]);

      return data || [];
    },
    refetchInterval: 60000,
  });

  // Query: Vendas (receitas)
  const { data: sales, isLoading: loadingSales } = useQuery({
    queryKey: ['sales-balance', period, dateRange],
    queryFn: async () => {
      const { data } = await supabase
        .from('sales')
        .select('total, created_at')
        .gte('created_at', getDateRange.start.toISOString())
        .lte('created_at', getDateRange.end.toISOString())
        .eq('status', 'completed');

      return data || [];
    },
    refetchInterval: 60000,
  });

  const isLoading = loadingTransactions || loadingSales;

  // Processar dados por dia
  const chartData = useMemo(() => {
    if (!transactions && !sales) return [];

    const days = eachDayOfInterval({ 
      start: getDateRange.start, 
      end: getDateRange.end 
    });

    let cumulativeBalance = 0;

    return days.map(day => {
      // Vendas do dia (entrada)
      const daySales = (sales || []).filter((sale: any) => 
        isSameDay(parseISO(sale.created_at), day)
      );
      const salesIncome = daySales.reduce((sum: number, sale: any) => sum + Number(sale.total), 0);

      // Transações do dia
      const dayTransactions = (transactions || []).filter((t: any) => 
        isSameDay(parseISO(t.transaction_date), day)
      );

      // Outras entradas (excluindo vendas que já contabilizamos)
      const otherIncome = dayTransactions
        .filter((t: any) => t.transaction_type === 'income' && t.category !== 'Vendas')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      // Saídas
      const expenses = dayTransactions
        .filter((t: any) => t.transaction_type === 'expense')
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const totalIncome = salesIncome + otherIncome;
      const dailyBalance = totalIncome - expenses;
      cumulativeBalance += dailyBalance;

      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        fullDate: format(day, "EEEE, dd 'de' MMMM", { locale: ptBR }),
        entrada: totalIncome,
        saida: expenses,
        saldo: dailyBalance,
        saldoAcumulado: cumulativeBalance,
      };
    });
  }, [transactions, sales, getDateRange]);

  // Estatísticas resumidas
  const summary = useMemo(() => {
    const totalIncome = chartData.reduce((sum, day) => sum + day.entrada, 0);
    const totalExpenses = chartData.reduce((sum, day) => sum + day.saida, 0);
    const balance = totalIncome - totalExpenses;
    const profitMargin = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

    return { totalIncome, totalExpenses, balance, profitMargin };
  }, [chartData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border rounded-lg p-3 shadow-lg">
          <p className="font-medium capitalize mb-2">{data.fullDate}</p>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span>Entrada:</span>
              <span className="font-mono">{formatCurrency(data.entrada)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>Saída:</span>
              <span className="font-mono">{formatCurrency(data.saida)}</span>
            </div>
            <div className="flex items-center gap-2 pt-1 border-t">
              <div className="w-3 h-3 rounded-full bg-primary" />
              <span>Saldo do dia:</span>
              <span className={cn("font-mono font-medium", data.saldo >= 0 ? "text-green-600" : "text-red-600")}>
                {formatCurrency(data.saldo)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              Balanço Financeiro
            </CardTitle>
            <CardDescription>
              Análise de entradas vs saídas
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
              <TabsTrigger value="30days" className="text-xs">30 dias</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">Este mês</TabsTrigger>
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

        {/* Cards de resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-1">
              <ArrowUpCircle className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Entradas</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p className="font-bold text-green-600">{formatCurrency(summary.totalIncome)}</p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 mb-1">
              <ArrowDownCircle className="h-4 w-4 text-red-600" />
              <span className="text-xs text-muted-foreground">Saídas</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p className="font-bold text-red-600">{formatCurrency(summary.totalExpenses)}</p>
            )}
          </div>

          <div className={cn(
            "p-3 rounded-lg border",
            summary.balance >= 0 
              ? "bg-primary/10 border-primary/20" 
              : "bg-destructive/10 border-destructive/20"
          )}>
            <div className="flex items-center gap-2 mb-1">
              {summary.balance >= 0 ? (
                <TrendingUp className="h-4 w-4 text-primary" />
              ) : (
                <TrendingDown className="h-4 w-4 text-destructive" />
              )}
              <span className="text-xs text-muted-foreground">Saldo</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p className={cn("font-bold", summary.balance >= 0 ? "text-primary" : "text-destructive")}>
                {formatCurrency(summary.balance)}
              </p>
            )}
          </div>

          <div className="p-3 rounded-lg bg-muted border">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Margem</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <p className={cn("font-bold", summary.profitMargin >= 0 ? "text-primary" : "text-destructive")}>
                {summary.profitMargin.toFixed(1)}%
              </p>
            )}
          </div>
        </div>

        {/* Gráfico */}
        {isLoading ? (
          <Skeleton className="h-[300px] w-full" />
        ) : chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickFormatter={(value) => `R$${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                formatter={(value) => {
                  if (value === 'entrada') return 'Entradas';
                  if (value === 'saida') return 'Saídas';
                  if (value === 'saldoAcumulado') return 'Saldo Acumulado';
                  return value;
                }}
              />
              <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
              <Bar 
                dataKey="entrada" 
                fill="hsl(142 71% 45%)" 
                radius={[4, 4, 0, 0]}
                name="entrada"
              />
              <Bar 
                dataKey="saida" 
                fill="hsl(0 84% 60%)" 
                radius={[4, 4, 0, 0]}
                name="saida"
              />
              <Line
                type="monotone"
                dataKey="saldoAcumulado"
                stroke="hsl(195 38% 52%)"
                strokeWidth={2}
                dot={false}
                name="saldoAcumulado"
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            Nenhum dado financeiro no período
          </div>
        )}
      </CardContent>
    </Card>
  );
}
