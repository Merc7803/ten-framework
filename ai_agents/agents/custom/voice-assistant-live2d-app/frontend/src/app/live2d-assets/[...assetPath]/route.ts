import { createLive2DAssetResponse } from "@/lib/live2d-asset-proxy";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    assetPath: string[];
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { assetPath } = await context.params;
  return createLive2DAssetResponse(assetPath);
}
