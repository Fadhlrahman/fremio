// Cloudflare Pages Function - Direct VPS Proxy for /api/vps/frames
const VPS_API = 'http://72.61.210.203/api';

export async function onRequestGet(context) {
  console.log('[VPS Proxy] GET /frames');
  
  try {
    const response = await fetch(`${VPS_API}/frames`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.text();
    console.log('[VPS Proxy] Response status:', response.status, 'length:', data.length);
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[VPS Proxy] Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function onRequestPost(context) {
  console.log('[VPS Proxy] POST /frames');
  
  try {
    const body = await context.request.text();
    console.log('[VPS Proxy] Body length:', body.length);
    
    const response = await fetch(`${VPS_API}/frames`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    });
    
    const data = await response.text();
    console.log('[VPS Proxy] Response status:', response.status);
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[VPS Proxy] POST Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
