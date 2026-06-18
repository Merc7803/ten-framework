import { REMOTE_LIVE2D_MODELS_BASE_URL } from "@/lib/live2d-assets";

type RouteContext = {
  params: Promise<{
    assetPath: string[];
  }>;
};

function buildRemoteAssetUrl(assetPath: string[]) {
  const safePath = assetPath
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .map(encodeURIComponent)
    .join("/");
  return `${REMOTE_LIVE2D_MODELS_BASE_URL}/${safePath}`;
}

export async function GET(_request: Request, context: RouteContext) {
  const { assetPath } = await context.params;
  const remoteUrl = buildRemoteAssetUrl(assetPath);
  const response = await fetch(remoteUrl, {
    cache: "force-cache",
  });

  if (!response.ok) {
    return new Response(`Live2D asset not found: ${assetPath.join("/")}`, {
      status: response.status,
    });
  }

  const headers = new Headers();
  const contentType = response.headers.get("content-type");
  if (contentType) {
    headers.set("content-type", contentType);
  }
  headers.set("cache-control", "public, max-age=3600");

  return new Response(response.body, {
    status: response.status,
    headers,
  });
}
