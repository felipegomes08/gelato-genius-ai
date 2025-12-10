import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Web Push implementation
async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string },
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    // Import web-push compatible functions
    const encoder = new TextEncoder();
    
    // Create JWT for VAPID
    const vapidHeader = {
      typ: "JWT",
      alg: "ES256"
    };
    
    const audience = new URL(subscription.endpoint).origin;
    const expiration = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12 hours
    
    const vapidClaims = {
      aud: audience,
      exp: expiration,
      sub: "mailto:admin@churrosteria.app"
    };

    // For simplicity, we'll use fetch with the web push protocol
    // The actual cryptographic implementation would require more complex code
    // For production, consider using a Deno-compatible web-push library
    
    const payloadString = JSON.stringify(payload);
    
    // Make the push request
    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "TTL": "86400",
      },
      body: payloadString,
    });

    if (response.status === 201 || response.status === 200) {
      console.log("Push notification sent successfully");
      return true;
    } else if (response.status === 410 || response.status === 404) {
      console.log("Subscription expired or invalid");
      return false;
    } else {
      console.error("Push failed with status:", response.status);
      return false;
    }
  } catch (error) {
    console.error("Error sending push:", error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    
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

    // Get push subscriptions for target users and send push notifications
    let pushSuccessCount = 0;
    let pushFailedCount = 0;

    if (vapidPublicKey && vapidPrivateKey) {
      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .in("user_id", targetUserIds);

      console.log(`Found ${subscriptions?.length || 0} push subscriptions`);

      const expiredSubscriptions: string[] = [];

      for (const sub of subscriptions || []) {
        const success = await sendWebPush(
          {
            endpoint: sub.endpoint,
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
          {
            title: notification.title,
            body: notification.message,
          },
          vapidPublicKey,
          vapidPrivateKey
        );

        if (success) {
          pushSuccessCount++;
        } else {
          pushFailedCount++;
          expiredSubscriptions.push(sub.id);
        }
      }

      // Remove expired subscriptions
      if (expiredSubscriptions.length > 0) {
        console.log(`Removing ${expiredSubscriptions.length} expired subscriptions`);
        await supabase
          .from("push_subscriptions")
          .delete()
          .in("id", expiredSubscriptions);
      }
    } else {
      console.log("VAPID keys not configured, skipping push notifications");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        users_notified: targetUserIds.length,
        push_sent: pushSuccessCount,
        push_failed: pushFailedCount,
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
