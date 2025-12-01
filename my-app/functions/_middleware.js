/* Cloudflare Pages SPA redirect */
/* Handle client-side routing for React Router */

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  
  // IMPORTANT: Let API routes pass through to their handlers WITHOUT modification
  if (url.pathname.startsWith('/api/')) {
    console.log('[Middleware] API route, passing through:', url.pathname);
    return next();
  }
  
  // Let VPS proxy routes pass through
  if (url.pathname.startsWith('/vps/')) {
    console.log('[Middleware] VPS route, passing through:', url.pathname);
    return next();
  }
  
  // Let proxy routes pass through
  if (url.pathname.startsWith('/proxy/')) {
    console.log('[Middleware] Proxy route, passing through:', url.pathname);
    return next();
  }
  
  try {
    // Try to get the asset
    const response = await next();
    
    // If asset found, return it
    if (response.status !== 404) {
      return response;
    }
    
    // If has file extension, return 404
    if (url.pathname.includes('.')) {
      return response;
    }
    
    // Serve index.html for SPA routes
    const indexUrl = new URL('/index.html', request.url);
    return fetch(indexUrl);
    
  } catch (err) {
    return new Response('Server Error', { status: 500 });
  }
}
