import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 1. Criar o novo usuário no auth
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: 'felipecgomes01@hotmail.com',
      password: '123456',
      email_confirm: true,
      user_metadata: {
        full_name: 'Felipe Master'
      }
    });

    if (authError) throw authError;

    // 2. Criar perfil
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        full_name: 'Felipe Master',
        is_active: true
      });

    if (profileError) throw profileError;

    // 3. Adicionar role master
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: newUser.user.id,
        role: 'master'
      });

    if (roleError) throw roleError;

    // 4. Adicionar permissões completas
    const { error: permError } = await supabaseAdmin
      .from('user_permissions')
      .insert({
        user_id: newUser.user.id,
        can_access_sales: true,
        can_access_products: true,
        can_access_stock: true,
        can_access_financial: true,
        can_access_reports: true,
        can_access_settings: true
      });

    if (permError) throw permError;

    // 5. Buscar ID da Ana Churros
    const { data: anaProfile, error: anaError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('full_name', 'Ana Churros')
      .single();

    if (anaError) throw anaError;

    // 6. Remover role master da Ana
    const { error: deleteRoleError } = await supabaseAdmin
      .from('user_roles')
      .delete()
      .eq('user_id', anaProfile.id)
      .eq('role', 'master');

    if (deleteRoleError) throw deleteRoleError;

    // 7. Adicionar role employee para Ana
    const { error: anaRoleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: anaProfile.id,
        role: 'employee'
      });

    if (anaRoleError) throw anaRoleError;

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Felipe Master criado com sucesso e configurado como único master do sistema',
        user_id: newUser.user.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
