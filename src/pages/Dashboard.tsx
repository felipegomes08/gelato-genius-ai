import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, ShoppingCart, Package, AlertTriangle } from "lucide-react";

const stats = [
  {
    title: "Vendas Hoje",
    value: "R$ 2.450,00",
    change: "+12%",
    icon: ShoppingCart,
    trend: "up",
  },
  {
    title: "Produtos Vendidos",
    value: "87",
    change: "+8%",
    icon: Package,
    trend: "up",
  },
  {
    title: "Ticket Médio",
    value: "R$ 28,16",
    change: "+3%",
    icon: TrendingUp,
    trend: "up",
  },
  {
    title: "Alertas Estoque",
    value: "3",
    change: "Atenção",
    icon: AlertTriangle,
    trend: "warning",
  },
];

const topProducts = [
  { name: "Casquinha Média", sold: 24, revenue: "R$ 192,00" },
  { name: "Milkshake Chocolate", sold: 18, revenue: "R$ 270,00" },
  { name: "Sundae Morango", sold: 15, revenue: "R$ 225,00" },
];

export default function Dashboard() {
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
          </CardHeader>
          <CardContent className="space-y-3">
            {topProducts.map((product, index) => (
              <div key={product.name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sold} unidades</p>
                  </div>
                </div>
                <p className="font-semibold text-sm">{product.revenue}</p>
              </div>
            ))}
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
