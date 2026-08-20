/**
 * Cloudflare Pages Function — Audio Stream Proxy
 * Path: /functions/api/stream.js -> accessible at /api/stream?url=...
 *
 * Takes the encrypted media URL, generates the auth token from Cloudflare's IP,
 * and streams the audio back to the client. This bypasses JioSaavn's IP lock.
 */

export async function onRequest(context) {
  const { request } = context;
  const reqUrl = new URL(request.url);
  const encryptedUrl = reqUrl.searchParams.get('url');

  if (!encryptedUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    // 1. Generate Auth Token
    const authUrl = `https://www.jiosaavn.com/api.php?__call=song.generateAuthToken&url=${encodeURIComponent(encryptedUrl)}&bitrate=320&api_version=4&_format=json&ctx=web6dot0`;
    const authRes = await fetch(authUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    const authData = await authRes.json();

    if (authData.status !== 'success' || !authData.auth_url) {
      return new Response('Failed to generate auth token', { status: 500 });
    }

    // 2. Fetch the actual audio stream from the generated CDN link
    const audioStream = await fetch(authData.auth_url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        // Pass Range header for seeking support
        ...(request.headers.has('Range') && { 'Range': request.headers.get('Range') }),
      },
    });

    // 3. Return the stream to the client
    const headers = new Headers(audioStream.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    
    return new Response(audioStream.body, {
      status: audioStream.status,
      statusText: audioStream.statusText,
      headers,
    });
  } catch (err) {
    return new Response('Stream proxy failed: ' + err.message, { status: 502 });
  }
}
