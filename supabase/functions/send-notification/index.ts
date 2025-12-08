import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { notification_id } = await req.json();

    if (!notification_id) {
      return new Response(
        JSON.stringify({ error: "notification_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the notification
    const { data: notification, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", notification_id)
      .single();

    if (fetchError || !notification) {
      console.error("Failed to fetch notification:", fetchError);
      return new Response(
        JSON.stringify({ error: "Notification not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get target users
    let targetUserIds: string[] = [];
    
    if (notification.target_type === "all") {
      const { data: users } = await supabase
        .from("profiles")
        .select("id")
        .eq("is_active", true);
      targetUserIds = users?.map((u: any) => u.id) || [];
    } else {
      targetUserIds = notification.target_user_ids || [];
    }

    console.log(`Sending notification to ${targetUserIds.length} users`);

    // Create user_notifications for each target
    const userNotifications = targetUserIds.map((userId: string) => ({
      user_id: userId,
      notification_id: notification.id,
      title: notification.title,
      message: notification.message,
    }));

    const { error: insertError } = await supabase
      .from("user_notifications")
      .insert(userNotifications);

    if (insertError) {
      console.error("Failed to insert user_notifications:", insertError);
      throw insertError;
    }

    // Update notification as sent
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ 
        is_sent: true, 
        sent_at: new Date().toISOString(),
        last_sent_at: new Date().toISOString() 
      })
      .eq("id", notification_id);

    if (updateError) {
      console.error("Failed to update notification:", updateError);
      throw updateError;
    }

    // Get push subscriptions for target users
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("*")
      .in("user_id", targetUserIds);

    // Send push notifications (simplified - in production you'd use web-push library)
    console.log(`Found ${subscriptions?.length || 0} push subscriptions to notify`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        users_notified: targetUserIds.length,
        push_subscriptions: subscriptions?.length || 0
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in send-notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
