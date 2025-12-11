import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const store = mutation({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Called storeUser without authentication present");
        }

        // Check if we've already stored this identity before.
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) =>
                q.eq("tokenIdentifier", identity.tokenIdentifier)
            )
            .unique();

        if (user !== null) {
            // If we've seen this identity before but the name has changed, patch the value.
            if (user.name !== identity.name || user.email !== identity.email || user.image !== identity.pictureUrl) {
                await ctx.db.patch(user._id, {
                    name: identity.name,
                    email: identity.email,
                    image: identity.pictureUrl,
                });
            }
            return user._id;
        }

        // Claim pending invites
        if (identity.email) {
            const pendingShares = await ctx.db
                .query("document_shares")
                .withIndex("by_email_userId", (q) =>
                    q.eq("email", identity.email).eq("userId", `invite:${identity.email}`)
                )
                .collect();

            for (const share of pendingShares) {
                await ctx.db.patch(share._id, { userId: identity.tokenIdentifier });
            }
        }

        // If it's a new identity, create a new `User`.
        return await ctx.db.insert("users", {
            tokenIdentifier: identity.tokenIdentifier,
            name: identity.name,
            email: identity.email,
            image: identity.pictureUrl,
        });
    },
});

export const search = query({
    args: { search: v.string() },
    handler: async (ctx, { search }) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }

        const users = await ctx.db
            .query("users")
            .withIndex("by_email", (q) => q.eq("email", search))
            .collect();

        return users;
    },
});
