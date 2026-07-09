import { supabase } from "@/lib/supabase";

type NotificationInput = {
  body?: string;
  podcastId: string | null;
  targetUrl?: string;
  title: string;
  type: string;
};

export async function createNotification({
  body,
  podcastId,
  targetUrl,
  title,
  type,
}: NotificationInput) {
  if (!podcastId) {
    return;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    console.error("Kunde inte skapa notis:", userError);
    return;
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      actor_id: userData.user.id,
      body: body || null,
      podcast_id: podcastId,
      target_url: targetUrl || null,
      title,
      type,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Kunde inte skapa notis:", error);
    return;
  }

  if (!data?.id) {
    return;
  }

  const { error: readError } = await supabase
    .from("notification_reads")
    .upsert({
      notification_id: data.id,
      user_id: userData.user.id,
    });

  if (readError) {
    console.error("Kunde inte markera egen notis som läst:", readError);
  }
}
