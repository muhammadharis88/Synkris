import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Save a new version of text content
 */
export const saveVersion = mutation({
    args: {
        documentId: v.id("documents"),
        content: v.string(),
        position: v.number(),
        length: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        // Verify user has access to the document
        const document = await ctx.db.get(args.documentId);
        if (!document) {
            throw new ConvexError("Document not found");
        }

        const organizationId = (user.organization_id ?? undefined) as
            | string
            | undefined;

        const isOwner = document.ownerId === user.subject;
        const isOrganizationMember = !!(document.organizationId && document.organizationId === organizationId);

        const share = await ctx.db
            .query("document_shares")
            .withIndex("by_document_user", (q) =>
                q.eq("documentId", args.documentId).eq("userId", user.tokenIdentifier)
            )
            .unique();

        const isEditor = share?.role === "editor";

        if (!isOwner && !isOrganizationMember && !isEditor) {
            throw new ConvexError("Unauthorized");
        }

        // Save the version
        return await ctx.db.insert("textVersions", {
            documentId: args.documentId,
            content: args.content,
            position: args.position,
            length: args.length,
            createdAt: Date.now(),
            createdBy: user.subject,
        });
    },
});

/**
 * Get versions for a specific text position in a document
 */
export const getVersionsByPosition = query({
    args: {
        documentId: v.id("documents"),
        position: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        // Verify user has access to the document
        const document = await ctx.db.get(args.documentId);
        if (!document) {
            throw new ConvexError("Document not found");
        }

        const organizationId = (user.organization_id ?? undefined) as
            | string
            | undefined;

        const isOwner = document.ownerId === user.subject;
        const isOrganizationMember = !!(document.organizationId && document.organizationId === organizationId);

        const share = await ctx.db
            .query("document_shares")
            .withIndex("by_document_user", (q) =>
                q.eq("documentId", args.documentId).eq("userId", user.tokenIdentifier)
            )
            .unique();

        if (!isOwner && !isOrganizationMember && !share) {
            throw new ConvexError("Unauthorized");
        }

        // Get all versions for this position, ordered by creation time (newest first)
        const versions = await ctx.db
            .query("textVersions")
            .withIndex("by_document_position", (q) =>
                q.eq("documentId", args.documentId).eq("position", args.position)
            )
            .order("desc")
            .collect();

        return versions;
    },
});

/**
 * Get the latest version for a specific text position
 */
export const getLatestVersion = query({
    args: {
        documentId: v.id("documents"),
        position: v.number(),
    },
    handler: async (ctx, args) => {
        const versions = await ctx.db
            .query("textVersions")
            .withIndex("by_document_position", (q) =>
                q.eq("documentId", args.documentId).eq("position", args.position)
            )
            .order("desc")
            .first();

        return versions;
    },
});

