import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
        return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    try {
        const clerk = await clerkClient();
        const user = await clerk.users.getUser(userId);
        
        return NextResponse.json({
            id: user.id,
            name: user.fullName ?? user.primaryEmailAddress?.emailAddress ?? "Anonymous",
            avatar: user.imageUrl ?? "",
        });
    } catch (error) {
        console.error("Error fetching user info:", error);
        return NextResponse.json({
            id: userId,
            name: "Unknown User",
            avatar: "",
        });
    }
}

