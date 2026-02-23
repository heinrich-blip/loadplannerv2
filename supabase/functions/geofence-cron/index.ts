import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req: Request) => {
  try {
    // Trigger the geofence monitor
    const monitorUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/geofence-monitor`;
    
    const response = await fetch(monitorUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();

    return new Response(
      JSON.stringify({ 
        success: true, 
        triggered: true,
        result 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Cron error:', error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});