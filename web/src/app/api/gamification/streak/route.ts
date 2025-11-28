import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ streak: null });
    }

    const { data, error } = await supabase
      .from('user_streaks')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching streak:', error);
      return NextResponse.json({ streak: null });
    }

    if (!data) {
      return NextResponse.json({
        streak: {
          currentStreak: 0,
          longestStreak: 0,
          lastActivityDate: null,
          streakType: 'daily_vote',
        },
      });
    }

    return NextResponse.json({
      streak: {
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
        lastActivityDate: data.last_activity_date,
        streakType: data.streak_type,
      },
    });
  } catch (error) {
    console.error('Streak API error:', error);
    return NextResponse.json({ streak: null });
  }
}
