// middleware.js
import { type NextRequest, NextResponse } from "next/server";

/**
 * Environment Variables Required:
 * - AGENT_SERVER_URL or NEXT_PUBLIC_API_BASE_URL: The URL of your agent server
 *   (typically http://localhost:8080)
 *
 * Example .env.local:
 * AGENT_SERVER_URL=http://localhost:8080
 */

const agentServerUrl =
  process.env.AGENT_SERVER_URL || process.env.NEXT_PUBLIC_API_BASE_URL;

// Check if environment variables are available
if (!agentServerUrl) {
  throw new Error(
    "Environment variables AGENT_SERVER_URL or NEXT_PUBLIC_API_BASE_URL are not available"
  );
}
const resolvedAgentServerUrl: string = agentServerUrl;

function validatePort(port: string): boolean {
  const portNum = parseInt(port, 10);
  return !Number.isNaN(portNum) && portNum >= 8000 && portNum <= 9000;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const url = req.nextUrl.clone();

  console.log("Middleware triggered for:", pathname);

  const proxyMatch = pathname.match(/^\/proxy\/(\d+)(\/.*)?$/);
  if (proxyMatch && req.method === "POST") {
    const portNumber = proxyMatch[1];
    const path = proxyMatch[2] || "/";
    if (!validatePort(portNumber)) {
      return NextResponse.json(
        { error: "Invalid port number. Port must be between 8000 and 9000." },
        { status: 400 }
      );
    }

    const agentUrl = new URL(resolvedAgentServerUrl);
    url.href = `http://${agentUrl.hostname}:${portNumber}${path}`;
    console.log("Rewriting proxy request from", pathname, "to", url.href);
    return NextResponse.rewrite(url);
  }

  if (pathname.startsWith(`/api/agents/`)) {
    // Proxy agents API requests to the agent server (port 8080)
    url.href = `${resolvedAgentServerUrl}${pathname.replace("/api/agents/", "/")}`;

    try {
      const body = await req.json();
      console.log("Agents request to", pathname, "with body:", body);
    } catch (e) {
      console.log("Agents request to", pathname, "(no body):", e);
    }

    console.log("Rewriting agents request from", pathname, "to", url.href);
    return NextResponse.rewrite(url);
  } else if (pathname.startsWith(`/api/token/`)) {
    // Proxy token requests to the agent server (port 8080)
    url.href = `${resolvedAgentServerUrl}${pathname.replace("/api/token/", "/token/")}`;

    try {
      const body = await req.json();
      console.log("Token request to", pathname, "with body:", body);
    } catch (e) {
      console.log("Token request to", pathname, "(no body):", e);
    }

    console.log("Rewriting token request from", pathname, "to", url.href);
    return NextResponse.rewrite(url);
  } else {
    console.log("No rewrite needed for:", pathname);
    return NextResponse.next();
  }
}

export const config = {
  matcher: ["/api/agents/:path*", "/api/token/:path*", "/proxy/:path*"],
};
