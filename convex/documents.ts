import { ConvexError, v } from "convex/values";
import { paginationOptsValidator } from "convex/server";

import { mutation, query } from "./_generated/server";

export const getByIds = query({
    args: { ids: v.array(v.id("documents")) },
    handler: async (ctx, { ids }) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        const organizationId = (user.organization_id ?? undefined) as
            | string
            | undefined;

        const documents = [];

        for (const id of ids) {
            const document = await ctx.db.get(id);

            if (!document) {
                documents.push({ id, name: "[Removed]" });
                continue;
            }

            // Check permissions
            const isOwner = document.ownerId === user.subject;
            const isOrganizationMember = !!(document.organizationId && document.organizationId === organizationId);

            // Check if shared
            const share = await ctx.db
                .query("document_shares")
                .withIndex("by_document_user", (q) =>
                    q.eq("documentId", id).eq("userId", user.tokenIdentifier)
                )
                .unique();

            if (isOwner || isOrganizationMember || share) {
                documents.push({ id: document._id, name: document.title });
            } else {
                documents.push({ id, name: "[Removed]" });
            }
        }

        return documents;
    },
});

export const create = mutation({
    args: { title: v.optional(v.string()), initialContent: v.optional(v.string()) },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        const organizationId = (user.organization_id ?? undefined) as
            | string
            | undefined;

        return await ctx.db.insert("documents", {
            title: args.title ?? "Untitled Document",
            ownerId: user.subject,
            organizationId,
            initialContent: args.initialContent,
        });
    },
});

export const get = query({
    args: { paginationOpts: paginationOptsValidator, search: v.optional(v.string()) },
    handler: async (ctx, { search, paginationOpts }) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        const organizationId = (user.organization_id ?? undefined) as
            | string
            | undefined;

        // Search within organization
        if (search && organizationId) {
            return await ctx.db
                .query("documents")
                .withSearchIndex("search_title", (q) =>
                    q.search("title", search).eq("organizationId", organizationId)
                )
                .paginate(paginationOpts)
        }

        // Personal Search
        if (search) {
            return await ctx.db
                .query("documents")
                .withSearchIndex("search_title", (q) =>
                    q.search("title", search).eq("ownerId", user.subject)
                )
                .paginate(paginationOpts)
        }

        // All docs inside organization
        if (organizationId) {
            return await ctx.db
                .query("documents")
                .withIndex("by_organization_id", (q) => q.eq("organizationId", organizationId))
                .paginate(paginationOpts);
        }

        // All personal docs
        const personalDocs = await ctx.db
            .query("documents")
            .withIndex("by_owner_id", (q) => q.eq("ownerId", user.subject))
            .paginate(paginationOpts);

        // Shared docs
        // We can't easily paginate mixed sources, so for now let's just return personal docs
        // and maybe add a separate query for shared docs or handle it differently.
        // But the requirement implies we might want to see them.
        // For now, let's stick to personal docs here and create a separate query for shared docs if needed,
        // or just rely on the "Shared with me" page which will use a different query.

        return personalDocs;
    },
});

export const removeById = mutation({
    args: { id: v.id("documents") },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        const organizationId = (user.organization_id ?? undefined) as
            | string
            | undefined;

        const document = await ctx.db.get(args.id);

        if (!document) {
            throw new ConvexError("Document not found");
        }

        const isOwner = document.ownerId === user.subject;
        const isOrganizationMember = !!(document.organizationId && document.organizationId === organizationId);

        if (!isOwner && !isOrganizationMember) {
            throw new ConvexError("Unauthorized");
        }

        return await ctx.db.delete(args.id);
    },
});

export const updateById = mutation({
    args: { id: v.id("documents"), title: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        const organizationId = (user.organization_id ?? undefined) as
            | string
            | undefined;

        const document = await ctx.db.get(args.id);

        if (!document) {
            throw new ConvexError("Document not found");
        }

        const isOwner = document.ownerId === user.subject;
        const isOrganizationMember = !!(document.organizationId && document.organizationId === organizationId);

        const share = await ctx.db
            .query("document_shares")
            .withIndex("by_document_user", (q) =>
                q.eq("documentId", args.id).eq("userId", user.tokenIdentifier)
            )
            .unique();

        const isEditor = share?.role === "editor";

        if (!isOwner && !isOrganizationMember && !isEditor) {
            throw new ConvexError("Unauthorized");
        }

        return await ctx.db.patch(args.id, { title: args.title });
    },
});

export const updateContent = mutation({
    args: { id: v.id("documents"), initialContent: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        const organizationId = (user.organization_id ?? undefined) as | string | undefined;
        const document = await ctx.db.get(args.id);
        if (!document) {
            throw new ConvexError("Document not found");
        }

        const isOwner = document.ownerId === user.subject;
        const isOrganizationMember = !!(document.organizationId && document.organizationId === organizationId);
        const share = await ctx.db
            .query("document_shares")
            .withIndex("by_document_user", (q) =>
                q.eq("documentId", args.id).eq("userId", user.tokenIdentifier)
            )
            .unique();

        const isEditor = share?.role === "editor";

        if (!isOwner && !isOrganizationMember && !isEditor) {
            throw new ConvexError("Unauthorized");
        }

        return await ctx.db.patch(args.id, { initialContent: args.initialContent });
    },
});

export const getById = query({
    args: { id: v.id("documents") },
    handler: async (ctx, { id }) => {
        const document = await ctx.db.get(id);

        if (!document) {
            throw new ConvexError("Document not found");
        }

        const user = await ctx.auth.getUserIdentity();

        if (user) {
            const organizationId = (user.organization_id ?? undefined) as
                | string
                | undefined;

            const isOwner = document.ownerId === user.subject;
            const isOrganizationMember = !!(document.organizationId && document.organizationId === organizationId);

            const share = await ctx.db
                .query("document_shares")
                .withIndex("by_document_user", (q) =>
                    q.eq("documentId", id).eq("userId", user.tokenIdentifier)
                )
                .unique();

            if (!isOwner && !isOrganizationMember && !share) {
                throw new ConvexError("Unauthorized");
            }
        } else {
            // Public access? For now, require auth.
            throw new ConvexError("Unauthorized");
        }

        return document;
    },
});

export const getShared = query({
    args: { paginationOpts: paginationOptsValidator },
    handler: async (ctx, { paginationOpts }) => {
        const user = await ctx.auth.getUserIdentity();

        if (!user) {
            throw new ConvexError("Unauthorized");
        }

        const shares = await ctx.db
            .query("document_shares")
            .withIndex("by_user", (q) => q.eq("userId", user.tokenIdentifier))
            .paginate(paginationOpts);

        const documentsWithRole = await Promise.all(shares.page.map(async (share) => {
            const document = await ctx.db.get(share.documentId);
            if (!document) {
                return null;
            }
            // Include role information with the document
            return {
                ...document,
                role: share.role,
            };
        }));

        return {
            ...shares,
            page: documentsWithRole.filter((doc) => doc !== null),
        };
    },
});

export const getAuthInfo = query({
    args: { id: v.id("documents") },
    handler: async (ctx, { id }) => {
        const user = await ctx.auth.getUserIdentity();
        if (!user) return null;

        const document = await ctx.db.get(id);
        if (!document) return null;

        const organizationId = (user.organization_id ?? undefined) as string | undefined;
        const isOwner = document.ownerId === user.subject;
        const isOrganizationMember = !!(document.organizationId && document.organizationId === organizationId);

        if (isOwner || isOrganizationMember) {
            return { role: "editor" };
        }

        const share = await ctx.db
            .query("document_shares")
            .withIndex("by_document_user", (q) =>
                q.eq("documentId", id).eq("userId", user.tokenIdentifier)
            )
            .unique();

        if (share) {
            return { role: share.role };
        }

        return null;
    }
});
