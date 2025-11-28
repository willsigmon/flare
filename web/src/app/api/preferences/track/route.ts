import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface TrackSignal {
  itemId: string;
  type: 'click' | 'save' | 'hide' | 'share' | 'timespent' | 'scroll';
  value?: number;
  platform?: string;
  category?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const signals: TrackSignal[] = body.signals;

    if (!signals || !Array.isArray(signals)) {
      return NextResponse.json({ error: 'Invalid signals' }, { status: 400 });
    }

    // Process each signal
    for (const signal of signals) {
      const updateData: Record<string, any> = {
        user_id: user.id,
        article_id: signal.itemId,
        updated_at: new Date().toISOString(),
      };

      switch (signal.type) {
        case 'click':
          updateData.is_read = true;
          break;
        case 'save':
          updateData.is_saved = true;
          break;
        case 'hide':
          updateData.is_hidden = true;
          break;
        case 'share':
          updateData.is_shared = true;
          break;
        case 'timespent':
          updateData.time_spent_sec = signal.value || 0;
          break;
        case 'scroll':
          updateData.scroll_depth = signal.value || 0;
          break;
      }

      // Upsert user_article record
      await supabase
        .from('user_articles')
        .upsert(updateData, { onConflict: 'user_id,article_id' });

      // Log activity event for explicit actions
      if (['save', 'hide', 'share'].includes(signal.type)) {
        await supabase.from('activity_events').insert({
          user_id: user.id,
          event_type: signal.type,
          article_id: signal.itemId,
        });
      }
    }

    return NextResponse.json({ success: true, processed: signals.length });
  } catch (error) {
    console.error('Track API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
