import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customerName, couponValue, expiryDate } = await req.json();
    
    if (!customerName || !couponValue || !expiryDate) {
      throw new Error("Dados incompletos");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const minPurchase = couponValue === 5 ? 30 : 50;

    const prompt = `Crie uma mensagem de WhatsApp calorosa e empolgante para notificar um cliente que ganhou um cupom cashback.

Informações:
- Valor do cupom: R$${couponValue},00
- Validade: ${expiryDate}
- Valor mínimo de compra: R$${minPurchase},00
- Nome do cliente: ${customerName}

Requisitos:
- Tom amigável e próximo
- Usar emojis relevantes (🤎🎉✨🤤🩷🩵🏷️😍)
- Mencionar que pode garantir outro cupom na próxima compra
- Máximo 500 caracteres
- Incluir todas as informações importantes
- Criar variações naturais a cada chamada

Exemplo de referência (mas crie VARIAÇÕES diferentes):
"🏷️ | CUPOM CASHBACK | 

Amei te atender hoje! 🤎
Uhuu! Você garantiu R$5,00 de cashback para usar na Churrosteria! 🎉
Use na sua próxima compra dentro de 7 dias.
Corre pra aproveitar e experimentar uma delícia nova! 🤤✨ Qualquer dúvida é só chamar! 🤩🩷

Validade: ${expiryDate}
🩵Ele pode ser utilizado em compras a partir de R$30,00.
Use e já garante um novo cupom 🏷️ Te vejo em breve! 😍"`;

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
    const generatedMessage = data.choices?.[0]?.message?.content;

    if (!generatedMessage) {
      throw new Error("Mensagem não gerada pela IA");
    }

    console.log("Mensagem gerada com sucesso:", generatedMessage);

    return new Response(JSON.stringify({ message: generatedMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
