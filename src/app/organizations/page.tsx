"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useOrganizationList, useClerk } from "@clerk/nextjs";
import { Plus } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FullscreenLoader } from "@/components/fullscreen-loader";
import { OrganizationCard } from "./organization-card";

const OrganizationsPage = () => {
    const searchParams = useSearchParams();
    const router = useRouter();
    const refresh = searchParams.get("refresh");

    useEffect(() => {
        if (refresh === "true") {
            // Trigger a physical reload to ensure all state is cleared
            window.location.href = "/organizations";
        }
    }, [refresh]);

    const { userMemberships, isLoaded } = useOrganizationList({
        userMemberships: {
            infinite: true,
        },
    });
    const { openCreateOrganization } = useClerk();

    if (!isLoaded) {
        return <FullscreenLoader label="Loading organizations..." />;
    }

    const organizations = userMemberships?.data || [];

    return (
        <div className="min-h-screen flex flex-col">
            <div className="fixed top-0 left-0 right-0 z-10 h-16 bg-white border-b p-4">
                <div className="flex items-center justify-between max-w-screen-xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                            ← Back to Home
                        </Link>
                        <h1 className="text-xl font-semibold">Organizations</h1>
                    </div>
                    <Button onClick={() => openCreateOrganization()}>
                        <Plus className="size-4 mr-2" />
                        Create Organization
                    </Button>
                </div>
            </div>
            <div className="mt-16 p-8">
                <div className="max-w-screen-xl mx-auto">
                    {organizations.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="size-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <Plus className="size-8 text-muted-foreground" />
                            </div>
                            <h2 className="text-xl font-semibold mb-2">No organizations yet</h2>
                            <p className="text-muted-foreground mb-6">
                                Create an organization to collaborate with your team
                            </p>
                            <Button onClick={() => openCreateOrganization()}>
                                <Plus className="size-4 mr-2" />
                                Create Your First Organization
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {organizations.map((membership) => (
                                <OrganizationCard
                                    key={membership.organization.id}
                                    organizationId={membership.organization.id}
                                    name={membership.organization.name}
                                    imageUrl={membership.organization.imageUrl}
                                    role={membership.role}
                                    memberCount={membership.organization.membersCount || 0}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrganizationsPage;
