import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Lock a paragraph at a specific position
 */
export const lockParagraph = mutation({
    args: {
        documentId: v.id("documents"),
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

        // Check if paragraph is already locked
        const existingLock = await ctx.db
            .query("lockedParagraphs")
            .withIndex("by_document_position", (q) =>
                q.eq("documentId", args.documentId).eq("position", args.position)
            )
            .first();

        if (existingLock) {
            // If already locked by same user, unlock it
            if (existingLock.lockedBy === user.subject) {
                await ctx.db.delete(existingLock._id);
                return { locked: false, lockId: null };
            } else {
                throw new ConvexError("Paragraph is already locked by another user");
            }
        }

        // Lock the paragraph
        const lockId = await ctx.db.insert("lockedParagraphs", {
            documentId: args.documentId,
            position: args.position,
            length: args.length,
            lockedBy: user.subject,
            lockedAt: Date.now(),
        });

        return { locked: true, lockId };
    },
});

/**
 * Unlock a paragraph
 */
export const unlockParagraph = mutation({
    args: {
        documentId: v.id("documents"),
        position: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        // Find the lock
        const lock = await ctx.db
            .query("lockedParagraphs")
            .withIndex("by_document_position", (q) =>
                q.eq("documentId", args.documentId).eq("position", args.position)
            )
            .first();

        if (!lock) {
            throw new ConvexError("Paragraph is not locked");
        }

        // Only allow unlock if user locked it or is document owner
        const document = await ctx.db.get(args.documentId);
        if (!document) {
            throw new ConvexError("Document not found");
        }

        const isOwner = document.ownerId === user.subject;
        const isLocker = lock.lockedBy === user.subject;

        if (!isOwner && !isLocker) {
            throw new ConvexError("You can only unlock paragraphs you locked");
        }

        await ctx.db.delete(lock._id);
        return { success: true };
    },
});

/**
 * Get all locked paragraphs for a document
 */
export const getLockedParagraphs = query({
    args: {
        documentId: v.id("documents"),
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

        // Get all locked paragraphs
        const locks = await ctx.db
            .query("lockedParagraphs")
            .withIndex("by_document", (q) => q.eq("documentId", args.documentId))
            .collect();

        return locks;
    },
});

/**
 * Check if a paragraph at a position is locked
 */
export const isParagraphLocked = query({
    args: {
        documentId: v.id("documents"),
        position: v.number(),
    },
    handler: async (ctx, args) => {
        const lock = await ctx.db
            .query("lockedParagraphs")
            .withIndex("by_document_position", (q) =>
                q.eq("documentId", args.documentId).eq("position", args.position)
            )
            .first();

        if (!lock) {
            return { locked: false, lockedBy: null };
        }

        return { locked: true, lockedBy: lock.lockedBy };
    },
});

