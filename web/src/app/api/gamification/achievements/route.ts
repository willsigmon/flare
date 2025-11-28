import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ achievements: [] });
    }

    const { data, error } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id)
      .order('achieved_at', { ascending: false });

    if (error) {
      console.error('Error fetching achievements:', error);
      return NextResponse.json({ achievements: [] });
    }

    const achievements = data?.map(a => ({
      id: a.id,
      type: a.achievement_type,
      achievedAt: a.achieved_at,
      metadata: a.metadata,
    })) || [];

    return NextResponse.json({ achievements });
  } catch (error) {
    console.error('Achievements API error:', error);
    return NextResponse.json({ achievements: [] });
  }
}
