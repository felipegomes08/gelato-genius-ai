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

    const now = new Date();
    console.log(`Processing scheduled notifications at ${now.toISOString()}`);

    // 1. Process one-time scheduled notifications that are due
    const { data: scheduledNotifications, error: scheduledError } = await supabase
      .from("notifications")
      .select("*")
      .eq("is_active", true)
      .eq("is_sent", false)
      .eq("is_recurring", false)
      .lte("scheduled_at", now.toISOString());

    if (scheduledError) {
      console.error("Error fetching scheduled notifications:", scheduledError);
    } else {
      console.log(`Found ${scheduledNotifications?.length || 0} scheduled notifications to send`);
      
      for (const notification of scheduledNotifications || []) {
        await sendNotification(supabase, notification);
      }
    }

    // 2. Process recurring notifications
    const { data: recurringNotifications, error: recurringError } = await supabase
      .from("notifications")
      .select("*")
      .eq("is_active", true)
      .eq("is_recurring", true);

    if (recurringError) {
      console.error("Error fetching recurring notifications:", recurringError);
    } else {
      console.log(`Found ${recurringNotifications?.length || 0} recurring notifications to check`);
      
      for (const notification of recurringNotifications || []) {
        const shouldSend = checkRecurrenceSchedule(notification, now);
        
        if (shouldSend) {
          console.log(`Recurring notification ${notification.id} is due, sending...`);
          await sendNotification(supabase, notification);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: {
          scheduled: scheduledNotifications?.length || 0,
          recurring: recurringNotifications?.length || 0
        }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in process-scheduled-notifications:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function sendNotification(supabase: any, notification: any) {
  try {
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

    // Create user_notifications
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
      console.error(`Failed to insert user_notifications for ${notification.id}:`, insertError);
      return;
    }

    // Update notification status
    const updateData: any = {
      last_sent_at: new Date().toISOString()
    };
    
    if (!notification.is_recurring) {
      updateData.is_sent = true;
      updateData.sent_at = new Date().toISOString();
    }

    await supabase
      .from("notifications")
      .update(updateData)
      .eq("id", notification.id);

    console.log(`Successfully sent notification ${notification.id} to ${targetUserIds.length} users`);

  } catch (error) {
    console.error(`Error sending notification ${notification.id}:`, error);
  }
}

function checkRecurrenceSchedule(notification: any, now: Date): boolean {
  const { 
    recurrence_type, 
    recurrence_time, 
    recurrence_day_of_week, 
    recurrence_day_of_month,
    recurrence_end_date,
    last_sent_at
  } = notification;

  // Check if recurrence has ended
  if (recurrence_end_date && new Date(recurrence_end_date) < now) {
    return false;
  }

  // Parse recurrence time
  if (!recurrence_time) return false;
  
  const [hours, minutes] = recurrence_time.split(":").map(Number);
  const currentHour = now.getUTCHours();
  const currentMinute = now.getUTCMinutes();

  // Check if we're within the right time window (within 1 minute)
  const isRightTime = currentHour === hours && Math.abs(currentMinute - minutes) <= 1;
  if (!isRightTime) return false;

  // Check if already sent today
  if (last_sent_at) {
    const lastSent = new Date(last_sent_at);
    const lastSentDate = lastSent.toISOString().split("T")[0];
    const todayDate = now.toISOString().split("T")[0];
    
    if (lastSentDate === todayDate) {
      return false;
    }
  }

  const currentDayOfWeek = now.getUTCDay();
  const currentDayOfMonth = now.getUTCDate();

  switch (recurrence_type) {
    case "daily":
      return true;
      
    case "weekly":
      return currentDayOfWeek === recurrence_day_of_week;
      
    case "monthly":
      return currentDayOfMonth === recurrence_day_of_month;
      
    default:
      return false;
  }
}
