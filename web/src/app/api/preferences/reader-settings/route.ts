import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ settings: null });
    }

    const { data, error } = await supabase
      .from('user_reader_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching reader settings:', error);
      return NextResponse.json({ settings: null });
    }

    if (!data) {
      return NextResponse.json({ settings: null });
    }

    return NextResponse.json({
      settings: {
        fontFamily: data.font_family,
        fontSize: data.font_size,
        lineHeight: data.line_height,
        maxWidth: data.max_width,
        theme: data.theme,
        backgroundColor: data.background_color,
        textColor: data.text_color,
      },
    });
  } catch (error) {
    console.error('Reader settings GET error:', error);
    return NextResponse.json({ settings: null });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ error: 'Settings required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('user_reader_settings')
      .upsert({
        user_id: user.id,
        font_family: settings.fontFamily,
        font_size: settings.fontSize,
        line_height: settings.lineHeight,
        max_width: settings.maxWidth,
        theme: settings.theme,
        background_color: settings.backgroundColor,
        text_color: settings.textColor,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error saving reader settings:', error);
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reader settings POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
