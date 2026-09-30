export default async function middleware(request: Request) {
  const url = new URL(request.url);
  
  // Don't intercept Vercel's internal paths (analytics, static assets, etc.)
  if (url.pathname.startsWith('/_vercel') || 
      url.pathname.startsWith('/_next') ||
      url.pathname.startsWith('/favicon.ico')) {
    return new Response(null, { status: 404 });
  }
  
  // Construct the proxied URL
  const proxyUrl = `https://mirutatunja-front.danimorenocr.workers.dev${url.pathname}${url.search}`;
  
  // Fetch the content from the proxied server
  const response = await fetch(proxyUrl, {
    method: request.method,
    headers: request.headers,
    body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
  });

  // Get the content type
  const contentType = response.headers.get('content-type') || '';
  
  // Only inject analytics for HTML responses
  if (contentType.includes('text/html')) {
    const html = await response.text();
    
    // Inject Vercel Analytics script before closing </head> tag
    const analyticsScript = `
    <script>
      window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
    </script>
    <script defer src="/_vercel/insights/script.js"></script>`;
    
    const modifiedHtml = html.replace('</head>', `${analyticsScript}\n</head>`);
    
    // Create new response headers from the original
    const newHeaders = new Headers(response.headers);
    
    return new Response(modifiedHtml, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }
  
  // For non-HTML responses, pass through as-is
  return response;
}

export const config = {
  runtime: 'nodejs',
  matcher: ['/((?!_vercel|_next|favicon.ico).*)'],
};
