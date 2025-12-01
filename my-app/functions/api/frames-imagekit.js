// Cloudflare Pages Function to create frame with ImageKit URL
// Endpoint: POST /api/frames-imagekit
// This creates frame in VPS, then forcefully updates the image_url to ImageKit

const VPS_API = 'https://fremio-api-proxy.array111103.workers.dev/api';

export async function onRequestPost(context) {
  try {
    const body = await context.request.json();
    
    console.log('Creating frame with ImageKit URL:', body.image_url);
    
    if (!body.image_url) {
      return new Response(JSON.stringify({ error: 'image_url is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    
    // Keep the original ImageKit URL
    const imagekitUrl = body.image_url;
    
    // Download image from ImageKit to create base64 for VPS
    console.log('Downloading image from:', imagekitUrl);
    const imageResponse = await fetch(imagekitUrl);
    
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
    
    // Prepare payload for VPS - include imagekit URL so VPS can store it
    const vpsPayload = {
      name: body.name,
      description: body.description || '',
      category: body.category || 'Fremio Series',
      max_captures: body.max_captures || 4,
      slots: body.slots || [],
      image: dataUrl,
      // Try to pass ImageKit URL - VPS might use it
      image_url: imagekitUrl,
      external_image_url: imagekitUrl,
      // Include layout for decorative elements (upload, text, shape)
      layout: body.layout || null,
      canvas_background: body.canvas_background || '#f7f1ed',
    };
    
    // Send to VPS base64 endpoint
    console.log('Sending to VPS...');
    const response = await fetch(`${VPS_API}/frames/base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(vpsPayload),
    });
    
    // Check if response is JSON
    const responseText = await response.text();
    console.log('VPS response status:', response.status);
    console.log('VPS response text:', responseText.substring(0, 500));
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseError) {
      console.error('VPS returned non-JSON response:', responseText.substring(0, 200));
      return new Response(JSON.stringify({ 
        error: 'VPS returned invalid response', 
        details: responseText.substring(0, 200),
        status: response.status 
      }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    
    console.log('VPS response parsed:', JSON.stringify(result));
    
    // VPS created the frame but used its own storage
    // We need to return the correct ImageKit URL to frontend
    if (result.id) {
      // Override response with ImageKit URLs
      const finalResult = {
        ...result,
        image_url: imagekitUrl,
        thumbnail_url: imagekitUrl,
        imagePath: imagekitUrl,
        thumbnailUrl: imagekitUrl,
      };
      
      console.log('Returning frame with ImageKit URL:', imagekitUrl);
      
      return new Response(JSON.stringify(finalResult), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    
    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
    
  } catch (error) {
    console.error('Frame creation error:', error);
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
