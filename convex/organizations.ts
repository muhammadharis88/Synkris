import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getDocumentCount = query({
    args: { organizationId: v.string() },
    handler: async (ctx, { organizationId }) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        const documents = await ctx.db
            .query("documents")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
            .collect();

        return documents.length;
    },
});

export const getOrganizationDocuments = query({
    args: { organizationId: v.string() },
    handler: async (ctx, { organizationId }) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        const userOrgId = (user.organization_id ?? undefined) as string | undefined;

        // Verify user is part of this organization
        if (userOrgId !== organizationId) {
            throw new ConvexError("Unauthorized - Not a member of this organization");
        }

        const documents = await ctx.db
            .query("documents")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
            .collect();

        return documents;
    },
});

export const deleteOrganizationDocuments = mutation({
    args: { organizationId: v.string() },
    handler: async (ctx, { organizationId }) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        // Get all documents for this organization
        const documents = await ctx.db
            .query("documents")
            .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
            .collect();

        // Delete all documents
        for (const doc of documents) {
            // Delete associated shares
            const shares = await ctx.db
                .query("document_shares")
                .withIndex("by_document", (q) => q.eq("documentId", doc._id))
                .collect();

            for (const share of shares) {
                await ctx.db.delete(share._id);
            }

            // Delete associated text versions
            const textVersions = await ctx.db
                .query("textVersions")
                .withIndex("by_document", (q) => q.eq("documentId", doc._id))
                .collect();

            for (const version of textVersions) {
                await ctx.db.delete(version._id);
            }

            // Delete associated locked paragraphs
            const lockedParagraphs = await ctx.db
                .query("lockedParagraphs")
                .withIndex("by_document", (q) => q.eq("documentId", doc._id))
                .collect();

            for (const locked of lockedParagraphs) {
                await ctx.db.delete(locked._id);
            }

            // Delete associated messages
            const messages = await ctx.db
                .query("messages")
                .withIndex("by_document", (q) => q.eq("documentId", doc._id))
                .collect();

            for (const message of messages) {
                await ctx.db.delete(message._id);
            }

            // Finally delete the document
            await ctx.db.delete(doc._id);
        }

        return { deletedCount: documents.length };
    },
});
