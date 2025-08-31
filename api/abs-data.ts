import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract the path and query parameters
    const { path, ...queryParams } = req.query;
    
    if (!path || typeof path !== 'string') {
      console.error('Missing path parameter:', req.query);
      return res.status(400).json({ error: 'Path parameter is required' });
    }

    // Build the ABS API URL - try without /rest
    const baseUrl = 'https://api.data.abs.gov.au';
    const absUrl = new URL(`${baseUrl}/${path}`);
    
    // Add query parameters
    Object.entries(queryParams).forEach(([key, value]) => {
      if (typeof value === 'string') {
        absUrl.searchParams.append(key, value);
      }
    });

    // Get the accept header from the request or use default
    const acceptHeader = req.headers.accept || 'application/vnd.sdmx.data+json';

    console.log(`[ABS Proxy] Incoming request path: ${path}`);
    console.log(`[ABS Proxy] Query params:`, queryParams);
    console.log(`[ABS Proxy] Proxying request to: ${absUrl.toString()}`);
    console.log(`[ABS Proxy] Accept header: ${acceptHeader}`);

    // Make the request to ABS API
    const response = await fetch(absUrl.toString(), {
      headers: {
        'Accept': acceptHeader,
        'User-Agent': 'AU-Dataset-Scanner/1.0'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[ABS Proxy] ABS API error: ${response.status} ${response.statusText}`);
      console.error(`[ABS Proxy] Error response body:`, errorText);
      return res.status(response.status).json({ 
        error: `ABS API error: ${response.status} ${response.statusText}`,
        details: errorText
      });
    }

    const contentType = response.headers.get('content-type') || 'text/plain';
    const data = await response.text();

    console.log(`[ABS Proxy] Success: ${data.length} characters received`);
    console.log(`[ABS Proxy] Content-Type: ${contentType}`);

    // Set the same content type as the ABS API response
    res.setHeader('Content-Type', contentType);
    return res.status(200).send(data);

  } catch (error) {
    console.error('[ABS Proxy] Error proxying ABS API request:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Internal server error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}