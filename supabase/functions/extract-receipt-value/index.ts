import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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

    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: 'Image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Processing receipt image with Lovable AI...');

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
            role: 'system',
            content: `Você é um assistente especializado em extrair informações de comprovantes de pagamento brasileiros.
Analise a imagem fornecida (cupom fiscal, comprovante de cartão, comprovante PIX) e extraia:
1. O valor total pago (número decimal, sem R$)
2. Nome do estabelecimento (se visível)
3. Data da transação (formato DD/MM/YYYY, se visível)

IMPORTANTE: 
- Retorne APENAS um JSON válido, sem markdown ou texto adicional
- Use null para campos não identificados
- O valor deve ser um número (ex: 87.30, não "87,30")
- Formato: {"valor": 123.45, "estabelecimento": "Nome", "data": "01/12/2024"}`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extraia as informações deste comprovante de pagamento:'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    console.log('AI response:', content);

    if (!content) {
      throw new Error('Empty response from AI');
    }

    // Parse the JSON response
    let extracted;
    try {
      // Remove markdown code blocks if present
      const jsonStr = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      extracted = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      // Try to extract value using regex as fallback
      const valorMatch = content.match(/(\d+[.,]\d{2})/);
      extracted = {
        valor: valorMatch ? parseFloat(valorMatch[1].replace(',', '.')) : null,
        estabelecimento: null,
        data: null
      };
    }

    console.log('Extracted data:', extracted);

    return new Response(
      JSON.stringify(extracted),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in extract-receipt-value:', error);
    const message = error instanceof Error ? error.message : 'Failed to process receipt';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
