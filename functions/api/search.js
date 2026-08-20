/**
 * Cloudflare Pages Function — Native Song Search & Direct Streaming
 * Path: /functions/api/search.js -> accessible at /api/search?query=...
 *
 * Directly connects to JioSaavn to search tracks and generate
 * direct CDN playback URLs (320kbps). No 3rd party APIs required!
 */

export async function onRequest(context) {
  const { request } = context;

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  const reqUrl = new URL(request.url);
  const query = reqUrl.searchParams.get('query') || '';

  if (!query.trim()) {
    return new Response(JSON.stringify({ success: true, data: { results: [] } }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    // 1. Search JioSaavn
    const searchUrl = `https://www.jiosaavn.com/api.php?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=12&p=1&q=${encodeURIComponent(query)}`;
    const searchRes = await fetch(searchUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    const searchData = await searchRes.json();
    const rawResults = searchData.results || [];

    // 2. Resolve media URLs concurrently
    const results = await Promise.all(
      rawResults.map(async (song) => {
        const encryptedUrl = song.more_info?.encrypted_media_url;
        let downloadUrl = '';

        if (encryptedUrl) {
          try {
            const authUrl = `https://www.jiosaavn.com/api.php?__call=song.generateAuthToken&url=${encodeURIComponent(encryptedUrl)}&bitrate=320&api_version=4&_format=json&ctx=web6dot0`;
            const authRes = await fetch(authUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            });
            const authData = await authRes.json();
            if (authData.status === 'success' && authData.auth_url) {
              downloadUrl = authData.auth_url;
            }
          } catch {
            // fallback if auth token generation fails
          }
        }

        // High-res album artwork
        let image = song.image || '';
        if (image.includes('150x150')) {
          image = image.replace('150x150', '500x500');
        }

        // Artist name formatting
        const primaryArtists = song.more_info?.artistMap?.primary_artists?.map((a) => a.name).join(', ') || '';
        const artists = primaryArtists || song.more_info?.music || song.subtitle?.split('-')[0]?.trim() || 'Unknown';

        // Title cleaning (decode HTML entities if any)
        const name = (song.title || '')
          .replace(/&quot;/g, '"')
          .replace(/&amp;/g, '&')
          .replace(/&#039;/g, "'")
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>');

        return {
          id: song.id,
          name,
          artist: artists,
          image,
          downloadUrl,
          duration: Number(song.more_info?.duration || 0),
        };
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          results: results.filter((r) => r.downloadUrl),
        },
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=120',
        },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err), data: { results: [] } }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
}
