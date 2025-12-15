"use client"

import { ReactNode } from "react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth, SignIn } from "@clerk/nextjs";
import { ConvexReactClient, Authenticated, Unauthenticated, AuthLoading, useMutation } from "convex/react";
import { FullscreenLoader } from "./fullscreen-loader";
import { api } from "../../convex/_generated/api";
import { useEffect } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export function ConvexClientProvider({ children }: { children: ReactNode }) {
    return (
        <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
            <ConvexProviderWithClerk
                useAuth={useAuth}
                client={convex}
            >
                <Authenticated>
                    <UserSync />
                    {children}
                </Authenticated>
                <Unauthenticated>
                    <div className="flex flex-col items-center justify-center min-h-screen">
                        <SignIn routing="hash" />
                    </div>
                </Unauthenticated>
                <AuthLoading>
                    <FullscreenLoader label="Synkris is getting ready..." />
                </AuthLoading>
            </ConvexProviderWithClerk>
        </ClerkProvider>
    )
};

const UserSync = () => {
    const store = useMutation(api.users.store);
    useEffect(() => {
        store();
    }, [store]);
    return null;
};
