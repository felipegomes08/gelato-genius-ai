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

    const { customerName, couponValue, expiryDate } = await req.json();
    
    // Validate required fields
    if (!customerName || !couponValue || !expiryDate) {
      return new Response(
        JSON.stringify({ error: "Dados incompletos: customerName, couponValue e expiryDate são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate customerName
    if (typeof customerName !== 'string' || customerName.length < 1 || customerName.length > 100) {
      return new Response(
        JSON.stringify({ error: "Nome do cliente deve ter entre 1 e 100 caracteres" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate couponValue (must be a positive number)
    if (typeof couponValue !== 'number' || couponValue <= 0 || couponValue > 10000) {
      return new Response(
        JSON.stringify({ error: "Valor do cupom inválido" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate expiryDate format (basic date string validation)
    if (typeof expiryDate !== 'string' || expiryDate.length < 5 || expiryDate.length > 20) {
      return new Response(
        JSON.stringify({ error: "Formato de data de expiração inválido" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const minPurchase = couponValue === 5 ? 30 : 50;

    const prompt = `Gere APENAS UMA mensagem de WhatsApp para notificar ${customerName} sobre seu cupom cashback.

ATENÇÃO: Retorne SOMENTE o texto da mensagem pronta, sem introduções, sem listas, sem "Opção 1/2/3", sem "Variação 1/2/3".

Informações do cupom:
- Valor: R$${couponValue},00
- Validade: ${expiryDate}
- Valor mínimo: R$${minPurchase},00

Requisitos da mensagem:
- Tom amigável e próximo
- NÃO usar emojis, apenas texto limpo
- Mencionar que ganha outro cupom na próxima compra
- Máximo 400 caracteres
- Cada chamada deve gerar texto diferente, mas SEMPRE retorne só UMA mensagem

Exemplo de formato (varie o conteúdo):
"CUPOM CASHBACK

Amei te atender hoje!
Você garantiu R$${couponValue},00 de cashback para usar na Churrosteria!

Válido até ${expiryDate}
Use em compras a partir de R$${minPurchase},00
Use e já garante um novo cupom!

Te vejo em breve!"`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Lovable AI error:", response.status, errorText);
      throw new Error("Erro ao gerar mensagem com IA");
    }

    const data = await response.json();
    let generatedMessage = data.choices?.[0]?.message?.content;

    if (!generatedMessage) {
      throw new Error("Mensagem não gerada pela IA");
    }

    // Guardar original para fallback
    const originalMessage = generatedMessage;

    // Limpar introduções e cabeçalhos
    generatedMessage = generatedMessage
      .replace(/^.*?(Aqui estão|Seguem|Veja|Confira).*?:/gim, '') // Remove headers
      .replace(/\*\*Opção \d+:\*\*/gi, '') // Remove **Opção X:**
      .replace(/Opção \d+:/gi, '') // Remove Opção X:
      .replace(/\*\*Variação \d+:\*\*/gi, '') // Remove **Variação X:**
      .replace(/Variação \d+:/gi, '') // Remove Variação X:
      .trim();

    // Se houver múltiplas opções, pegar só a primeira
    const opcao2Index = generatedMessage.search(/(\*\*)?Opção [2-9]:/i);
    if (opcao2Index > -1) {
      generatedMessage = generatedMessage.substring(0, opcao2Index).trim();
    }

    // Se ficou vazio após limpeza, usar original
    if (!generatedMessage) {
      generatedMessage = originalMessage.trim();
    }

    console.log("Mensagem gerada com sucesso:", generatedMessage);

    return new Response(JSON.stringify({ message: generatedMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch (error) {
    console.error('Error in generate-coupon-message:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
