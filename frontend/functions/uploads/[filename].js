export async function onRequest(context) {
  const { env, params } = context;
  const filename = params.filename;

  if (!filename) {
    return new Response('File name missing', { status: 400 });
  }

  try {
    // Cloudflare R2에서 이미지 조회
    const object = await env.MY_BUCKET.get(filename);

    if (!object) {
      return new Response('File Not Found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache for static images

    return new Response(object.body, {
      status: 200,
      headers
    });
  } catch (err) {
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}
