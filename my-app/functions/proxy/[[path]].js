// Cloudflare Pages Function to proxy images from VPS
// This handles binary data correctly

export async function onRequest(context) {
  const { params } = context;
  const path = params.path.join('/');
  
  // Target VPS URL
  const targetUrl = `http://72.61.210.203/${path}`;
  
  try {
    // Fetch from VPS
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      return new Response('Not Found', { status: 404 });
    }
    
    // Get the binary data as ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();
    
    // Get content type
    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // Return with proper headers
    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=86400', // Cache for 1 day
      },
    });
  } catch (error) {
    console.error('Proxy error:', error);
    return new Response('Proxy Error: ' + error.message, { status: 500 });
  }
}
