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

    const prompt = `Gere APENAS UMA mensagem de WhatsApp para notificar ${customerName} sobre seu cupom cashback.

ATENÇÃO: Retorne SOMENTE o texto da mensagem pronta, sem introduções, sem listas, sem "Opção 1/2/3", sem "Variação 1/2/3".

Informações do cupom:
- Valor: R$${couponValue},00
- Validade: ${expiryDate}
- Valor mínimo: R$${minPurchase},00

Requisitos da mensagem:
- Tom amigável e próximo
- Incluir emojis: 🤎🎉✨🤤🩷🩵🏷️😍
- Mencionar que ganha outro cupom na próxima compra
- Máximo 400 caracteres
- Cada chamada deve gerar texto diferente, mas SEMPRE retorne só UMA mensagem

Exemplo de formato (varie o conteúdo):
"🏷️ CUPOM CASHBACK 

Amei te atender hoje! 🤎
Você garantiu R$${couponValue},00 de cashback para usar na Churrosteria! 🎉

Válido até ${expiryDate}
🩵 Use em compras a partir de R$${minPurchase},00
Use e já garante um novo cupom! 🏷️

Te vejo em breve! 😍"`;

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
