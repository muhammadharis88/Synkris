import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Send a message to a document's chat
export const sendMessage = mutation({
    args: {
        documentId: v.id("documents"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        // Validate message content
        if (!args.content.trim()) {
            throw new ConvexError("Message cannot be empty");
        }

        if (args.content.length > 500) {
            throw new ConvexError("Message too long (max 500 characters)");
        }

        // Check if user has access to the document
        const document = await ctx.db.get(args.documentId);

        if (!document) {
            throw new ConvexError("Document not found");
        }

        // Check access: owner, organization member, or shared
        const organizationId = (user.organization_id ?? undefined) as string | undefined;
        const isOwner = document.ownerId === user.subject;
        const isOrgMember = !!(document.organizationId && document.organizationId === organizationId);

        const share = await ctx.db
            .query("document_shares")
            .withIndex("by_document_user", (q) =>
                q.eq("documentId", args.documentId).eq("userId", user.tokenIdentifier)
            )
            .first();

        const hasAccess = isOwner || isOrgMember || share !== null;

        if (!hasAccess) {
            throw new ConvexError("You don't have access to this document");
        }

        // Get user info from Clerk
        const userName = user.name || user.email || "Unknown User";
        const userAvatar = user.pictureUrl;

        // Insert the message
        const messageId = await ctx.db.insert("messages", {
            documentId: args.documentId,
            userId: user.tokenIdentifier,
            userName,
            userAvatar,
            content: args.content.trim(),
            timestamp: Date.now(),
        });

        return messageId;
    },
});

// Get all messages for a document
export const getMessages = query({
    args: {
        documentId: v.id("documents"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        // Check if user has access to the document
        const document = await ctx.db.get(args.documentId);

        if (!document) {
            throw new ConvexError("Document not found");
        }

        // Check access: owner, organization member, or shared
        const organizationId = (user.organization_id ?? undefined) as string | undefined;
        const isOwner = document.ownerId === user.subject;
        const isOrgMember = !!(document.organizationId && document.organizationId === organizationId);

        const share = await ctx.db
            .query("document_shares")
            .withIndex("by_document_user", (q) =>
                q.eq("documentId", args.documentId).eq("userId", user.tokenIdentifier)
            )
            .first();

        const hasAccess = isOwner || isOrgMember || share !== null;

        if (!hasAccess) {
            throw new ConvexError("You don't have access to this document");
        }

        // Fetch messages ordered by timestamp
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_document_timestamp", (q) => q.eq("documentId", args.documentId))
            .order("asc")
            .collect();

        return messages;
    },
});

// Delete a message (own messages only)
export const deleteMessage = mutation({
    args: {
        messageId: v.id("messages"),
    },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        const message = await ctx.db.get(args.messageId);

        if (!message) {
            throw new ConvexError("Message not found");
        }

        // Only allow deleting own messages
        if (message.userId !== user.tokenIdentifier) {
            throw new ConvexError("You can only delete your own messages");
        }

        await ctx.db.delete(args.messageId);

        return { success: true };
    },
});
