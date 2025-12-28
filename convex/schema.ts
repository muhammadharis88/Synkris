import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    documents: defineTable({
        title: v.string(),
        initialContent: v.optional(v.string()),
        ownerId: v.string(),
        roomId: v.optional(v.string()),
        organizationId: v.optional(v.string()),
        sharedWith: v.optional(v.array(v.string())),
    })
        .index("by_owner_id", ["ownerId"])
        .index("by_organization_id", ["organizationId"])
        .searchIndex("search_title", {
            searchField: "title",
            filterFields: ["ownerId", "organizationId"],
        }),
    document_shares: defineTable({
        documentId: v.id("documents"),
        userId: v.string(),
        email: v.optional(v.string()),
        role: v.union(v.literal("viewer"), v.literal("commenter"), v.literal("editor")),
    })
        .index("by_document", ["documentId"])
        .index("by_user", ["userId"])
        .index("by_document_user", ["documentId", "userId"])
        .index("by_email_userId", ["email", "userId"]),
    users: defineTable({
        tokenIdentifier: v.string(),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        image: v.optional(v.string()),
    })
        .index("by_token", ["tokenIdentifier"])
        .index("by_email", ["email"]),
    textVersions: defineTable({
        documentId: v.id("documents"),
        content: v.string(), // The text content at that version
        position: v.number(), // Start position of the text
        length: v.number(), // Length of the text
        createdAt: v.number(), // Timestamp
        createdBy: v.string(), // User ID who created this version
    })
        .index("by_document", ["documentId"])
        .index("by_document_position", ["documentId", "position"]),
    lockedParagraphs: defineTable({
        documentId: v.id("documents"),
        position: v.number(), // Start position of the paragraph
        length: v.number(), // Length of the paragraph
        lockedBy: v.string(), // User ID who locked it
        lockedAt: v.number(), // Timestamp when locked
    })
        .index("by_document", ["documentId"])
        .index("by_document_position", ["documentId", "position"]),
    messages: defineTable({
        documentId: v.id("documents"),
        userId: v.string(),
        userName: v.string(),
        userAvatar: v.optional(v.string()),
        content: v.string(),
        timestamp: v.number(),
    })
        .index("by_document", ["documentId"])
        .index("by_document_timestamp", ["documentId", "timestamp"]),
});
