// Cloudflare Pages Function - VPS Static File Upload Proxy
// Handles multipart form uploads to VPS disk storage
const VPS_API = 'http://72.61.210.203/api/static';

export async function onRequestGet(context) {
  console.log('[VPS Static Proxy] GET /static/frames');
  
  try {
    const response = await fetch(`${VPS_API}/frames`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    const data = await response.text();
    console.log('[VPS Static Proxy] Response status:', response.status);
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[VPS Static Proxy] Error:', error.message);
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
  console.log('[VPS Static Proxy] POST /static/frames (multipart upload)');
  
  try {
    const contentType = context.request.headers.get('Content-Type') || '';
    
    // Handle multipart form data (file upload)
    if (contentType.includes('multipart/form-data')) {
      console.log('[VPS Static Proxy] Processing multipart upload...');
      
      // Forward the request body directly to VPS
      const body = await context.request.arrayBuffer();
      
      const response = await fetch(`${VPS_API}/frames`, {
        method: 'POST',
        headers: {
          'Content-Type': contentType,
        },
        body: body,
      });
      
      const data = await response.text();
      console.log('[VPS Static Proxy] Response status:', response.status);
      
      return new Response(data, {
        status: response.status,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    // Handle JSON (base64 upload)
    console.log('[VPS Static Proxy] Processing JSON upload...');
    const body = await context.request.text();
    
    const response = await fetch(`${VPS_API}/frames/upload-base64`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body,
    });
    
    const data = await response.text();
    console.log('[VPS Static Proxy] Response status:', response.status);
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[VPS Static Proxy] Error:', error.message);
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
  console.log('[VPS Static Proxy] DELETE request');
  
  try {
    // Extract filename from URL path
    const url = new URL(context.request.url);
    const pathParts = url.pathname.split('/');
    const filename = pathParts[pathParts.length - 1];
    
    if (!filename) {
      return new Response(JSON.stringify({ error: 'Filename required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
    
    const response = await fetch(`${VPS_API}/frames/${filename}`, {
      method: 'DELETE',
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
    console.error('[VPS Static Proxy] Delete Error:', error.message);
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
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}
