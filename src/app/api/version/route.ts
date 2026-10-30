/** The version this deployment is serving. Open windows compare it with their own. */
export function GET() {
  return Response.json(
    { version: process.env.APP_VERSION },
    { headers: { "Cache-Control": "no-store" } },
  );
}
