import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate JWT authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { salesData, stockData, customersData, period } = await req.json();
    
    // Validate required data structures
    if (!salesData || typeof salesData !== 'object') {
      return new Response(
        JSON.stringify({ error: 'salesData é obrigatório e deve ser um objeto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!stockData || typeof stockData !== 'object') {
      return new Response(
        JSON.stringify({ error: 'stockData é obrigatório e deve ser um objeto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!customersData || typeof customersData !== 'object') {
      return new Response(
        JSON.stringify({ error: 'customersData é obrigatório e deve ser um objeto' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!period || typeof period !== 'string' || period.length > 100) {
      return new Response(
        JSON.stringify({ error: 'period é obrigatório e deve ser uma string válida' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate salesData fields
    if (typeof salesData.revenue !== 'number' || typeof salesData.itemsSold !== 'number') {
      return new Response(
        JSON.stringify({ error: 'salesData deve conter revenue e itemsSold como números' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Construir prompt com dados reais
    const prompt = `Você é um analista de negócios especializado em varejo. Analise os dados abaixo e forneça 3-4 insights práticos e acionáveis em português do Brasil.

PERÍODO ANALISADO: ${period}

DADOS DE VENDAS:
- Faturamento: R$ ${salesData.revenue.toFixed(2)}
- Produtos vendidos: ${salesData.itemsSold}
- Ticket médio: R$ ${salesData.averageTicket.toFixed(2)}
- Variação vs período anterior: ${salesData.changePercent > 0 ? '+' : ''}${salesData.changePercent.toFixed(1)}%

ESTOQUE:
- Produtos em alerta de estoque baixo: ${stockData.lowStockCount}
${stockData.criticalProducts.length > 0 ? `- Produtos críticos: ${stockData.criticalProducts.join(', ')}` : ''}

TOP PRODUTOS:
${salesData.topProducts.map((p: any) => `- ${p.name}: ${p.quantity} unidades vendidas (R$ ${p.revenue.toFixed(2)})`).join('\n')}

TOP CLIENTES:
${customersData.topCustomers.map((c: any) => `- ${c.name}: R$ ${c.total.toFixed(2)} em compras`).join('\n')}

Forneça insights sobre:
1. Tendências de vendas e oportunidades
2. Alertas de estoque e recomendações
3. Análise de produtos e clientes
4. Ações recomendadas para melhorar resultados

Seja específico, objetivo e foque em ações práticas. Cada insight deve ter no máximo 2-3 linhas.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro da API Lovable:', response.status, errorText);
      throw new Error(`Erro ao gerar insights: ${response.status}`);
    }

    const data = await response.json();
    const insights = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro em generate-insights:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
