// Cloudflare Pages Function - Direct VPS Proxy for /api/vps/frames/[id]
const VPS_API = 'http://72.61.210.203/api';

export async function onRequestGet(context) {
  const { id } = context.params;
  console.log('[VPS Proxy] GET /frames/' + id);
  
  try {
    const response = await fetch(`${VPS_API}/frames/${id}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function onRequestPut(context) {
  const { id } = context.params;
  console.log('[VPS Proxy] PUT /frames/' + id);
  
  try {
    const body = await context.request.text();
    
    const response = await fetch(`${VPS_API}/frames/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    });
    
    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}

export async function onRequestDelete(context) {
  const { id } = context.params;
  console.log('[VPS Proxy] DELETE /frames/' + id);
  
  try {
    const response = await fetch(`${VPS_API}/frames/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.text();
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
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
