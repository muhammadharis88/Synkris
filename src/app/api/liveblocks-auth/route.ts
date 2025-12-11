import { Liveblocks } from "@liveblocks/node";
import { ConvexHttpClient } from "convex/browser";
import { auth, currentUser } from "@clerk/nextjs/server";

import { api } from "../../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
const liveblocks = new Liveblocks({
    secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(req: Request) {
    try {
        const { sessionClaims } = await auth();
        if (!sessionClaims) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            });
        }

        const user = await currentUser();
        if (!user) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            });
        }

        // Robustly extract room id from body or query params
        let room: string | undefined;
        try {
            const contentType = req.headers.get("content-type") || "";
            if (contentType.includes("application/json")) {
                const json = await req.json().catch(() => ({} as any));
                room = json?.room || json?.roomId || json?.id;
            } else {
                // Fallback: try to parse as text or URL-encoded
                const raw = await req.text();
                try {
                    const parsed = raw ? JSON.parse(raw) : {};
                    room = parsed?.room || parsed?.roomId || parsed?.id;
                } catch {
                    const params = new URLSearchParams(raw);
                    room = params.get("room") || params.get("roomId") || params.get("id") || undefined;
                }
            }
        } catch {
            // ignore, try URL params next
        }
        if (!room) {
            // try query string as last resort
            const url = new URL(req.url);
            room = url.searchParams.get("room") || url.searchParams.get("roomId") || url.searchParams.get("id") || undefined;
        }

        if (!room) {
            return new Response(JSON.stringify({ error: "Missing room id" }), {
                status: 400,
                headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            });
        }

        // Verify the user can access the document mapped to this room
        const { getToken } = await auth();
        const token = await getToken({ template: "convex" });

        if (token) {
            convex.setAuth(token);
        }

        const authInfo = await convex.query(api.documents.getAuthInfo, { id: room as any });

        if (!authInfo) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
            });
        }

        // Prepare Liveblocks session
        const name = user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Anonymous";
        const nameToNumber = name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const hue = Math.abs(nameToNumber) % 360;
        const color = `hsl(${hue}, 80%, 60%)`;

        const session = liveblocks.prepareSession(user.id, {
            userInfo: { name, avatar: user.imageUrl, color },
        });

        const isReadOnly = authInfo.role === "viewer";
        session.allow(room, isReadOnly ? session.READ_ACCESS : session.FULL_ACCESS);
        const { body, status } = await session.authorize();

        return new Response(body, {
            status,
            headers: {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
            },
        });
    } catch (error: any) {
        console.error("/api/liveblocks-auth error", error);
        return new Response(JSON.stringify({ error: "Internal Server Error" }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
    }
};
