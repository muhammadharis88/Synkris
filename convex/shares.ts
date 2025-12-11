import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { ConvexError } from "convex/values";

export const shareDocument = mutation({
    args: {
        documentId: v.id("documents"),
        email: v.string(),
        role: v.union(v.literal("viewer"), v.literal("commenter"), v.literal("editor")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Unauthorized");
        }

        const document = await ctx.db.get(args.documentId);
        if (!document) {
            throw new ConvexError("Document not found");
        }

        const isOwner = document.ownerId === identity.subject;
        if (!isOwner) {
            throw new ConvexError("Unauthorized");
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", args.email))
            .unique();

        const userId = user?.tokenIdentifier ?? `invite:${args.email}`;

        const existingShare = await ctx.db
            .query("document_shares")
            .withIndex("by_document_user", (q) =>
                q.eq("documentId", args.documentId).eq("userId", userId)
            )
            .unique();

        if (existingShare) {
            await ctx.db.patch(existingShare._id, { role: args.role });
        } else {
            await ctx.db.insert("document_shares", {
                documentId: args.documentId,
                userId,
                email: args.email,
                role: args.role,
            });
        }
    },
});

export const removeShare = mutation({
    args: {
        documentId: v.id("documents"),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("Unauthorized");
        }

        const document = await ctx.db.get(args.documentId);
        if (!document) {
            throw new ConvexError("Document not found");
        }

        const isOwner = document.ownerId === identity.subject;
        if (!isOwner) {
            throw new ConvexError("Unauthorized");
        }

        const share = await ctx.db
            .query("document_shares")
            .withIndex("by_document_user", (q) =>
                q.eq("documentId", args.documentId).eq("userId", args.userId)
            )
            .unique();

        if (share) {
            await ctx.db.delete(share._id);
        }
    },
});

export const getShares = query({
    args: { documentId: v.id("documents") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }

        const document = await ctx.db.get(args.documentId);
        if (!document) {
            return [];
        }

        // Only owner can see shares? Or maybe editors too? For now, let's say owner.
        if (document.ownerId !== identity.subject) {
            // Check if the user is a viewer/editor/commenter? 
            // Usually viewers don't see who else has access, but editors might.
            // For simplicity, let's restrict to owner for now.
            return [];
        }

        const shares = await ctx.db
            .query("document_shares")
            .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
            .collect();

        const sharesWithUserInfo = await Promise.all(shares.map(async (share) => {
            const user = await ctx.db
                .query("users")
                .withIndex("by_token", (q) => q.eq("tokenIdentifier", share.userId))
                .unique();

            return {
                ...share,
                user,
            };
        }));

        return sharesWithUserInfo;
    },
});
