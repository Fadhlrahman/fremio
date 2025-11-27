/* Cloudflare Pages SPA redirect */
/* Handle client-side routing for React Router */

export async function onRequest(context) {
  const { request, next, env } = context;
  
  try {
    // Try to get the asset
    const response = await next();
    
    // If asset found, return it
    if (response.status !== 404) {
      return response;
    }
    
    // If 404 and not an API call or asset, serve index.html for SPA routing
    const url = new URL(request.url);
    
    // Skip for API routes, assets, etc.
    if (
      url.pathname.startsWith('/api/') ||
      url.pathname.includes('.') // Has file extension
    ) {
      return response;
    }
    
    // Serve index.html for SPA routes
    const indexUrl = new URL('/index.html', request.url);
    return fetch(indexUrl);
    
  } catch (err) {
    return new Response('Server Error', { status: 500 });
  }
}
