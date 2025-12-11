import { query } from "./_generated/server";

// Get current user's token identifier for client-side comparisons
export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            return null;
        }

        return {
            tokenIdentifier: identity.tokenIdentifier,
            name: identity.name,
            email: identity.email,
        };
    },
});
