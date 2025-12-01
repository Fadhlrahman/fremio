// Cloudflare Pages Function to update frame with ImageKit URL
// Endpoint: PUT /api/frames-imagekit/[id]

const VPS_API = 'https://fremio-api-proxy.array111103.workers.dev/api';

export async function onRequestPut(context) {
  try {
    const { id } = context.params;
    const body = await context.request.json();
    
    console.log('Updating frame:', id);
    
    // If there's a new image_url from ImageKit
    if (body.image_url && body.image_url.includes('imagekit.io')) {
      console.log('New ImageKit URL:', body.image_url);
      
      // Download image from ImageKit and convert to base64
      const imageResponse = await fetch(body.image_url);
      
      if (!imageResponse.ok) {
        return new Response(JSON.stringify({ error: 'Failed to download image from ImageKit' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      
      // Convert to base64
      const imageBuffer = await imageResponse.arrayBuffer();
      const uint8Array = new Uint8Array(imageBuffer);
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        binaryString += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binaryString);
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      const dataUrl = `data:${contentType};base64,${base64}`;
      
      console.log('Image converted to base64, size:', Math.round(base64.length / 1024), 'KB');
      
      // Prepare payload with base64 image
      const vpsPayload = {
        name: body.name,
        description: body.description || '',
        category: body.category || 'Fremio Series',
        max_captures: body.max_captures || 4,
        slots: body.slots || [],
        image: dataUrl,
        // Include layout for decorative elements (upload, text, shape)
        layout: body.layout || null,
        canvas_background: body.canvas_background || '#f7f1ed',
      };
      
      // Send to VPS update endpoint with base64
      const response = await fetch(`${VPS_API}/frames/${id}/base64`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vpsPayload),
      });
      
      // If /frames/:id/base64 doesn't exist, try regular update
      if (response.status === 404) {
        console.log('VPS /frames/:id/base64 not found, trying regular update...');
        
        const regularResponse = await fetch(`${VPS_API}/frames/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...body,
            image_url: body.image_url,
            thumbnail_url: body.image_url,
          }),
        });
        
        const result = await regularResponse.json();
        return new Response(JSON.stringify(result), {
          status: regularResponse.status,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }
      
      let result = await response.json();
      
      // Override URLs with ImageKit
      if (result.id || result.success) {
        result.image_url = body.image_url;
        result.thumbnail_url = body.image_url;
        
        // Update frame URL in VPS
        try {
          await fetch(`${VPS_API}/frames/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_url: body.image_url,
              thumbnail_url: body.image_url,
            }),
          });
        } catch (e) {
          console.error('Failed to update URL:', e);
        }
      }
      
      return new Response(JSON.stringify(result), {
        status: response.status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    
    // No new image, just forward to VPS
    const response = await fetch(`${VPS_API}/frames/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const result = await response.json();
    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
    
  } catch (error) {
    console.error('Frame update error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'PUT, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
