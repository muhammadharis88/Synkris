"use client";

import { useOrganization, useOrganizationList, useUser, useClerk } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { Building2, Calendar, Crown, Users, FileText, ArrowLeft, UserPlus } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FullscreenLoader } from "@/components/fullscreen-loader";
import { LeaveOrganizationDialog } from "../../../components/leave-organization-dialog";
import { DeleteOrganizationDialog } from "../../../components/delete-organization-dialog";
import { api } from "../../../../convex/_generated/api";

const OrganizationDetailsPage = () => {
    const params = useParams();
    const router = useRouter();
    const { user } = useUser();
    const orgId = params.orgId as string;

    const { userMemberships, setActive } = useOrganizationList({
        userMemberships: {
            infinite: true,
        },
    });

    const { organization, isLoaded, memberships, membership } = useOrganization({
        memberships: {
            infinite: true,
        },
    });
    const { openOrganizationProfile } = useClerk();

    const documents = useQuery(
        api.organizations.getOrganizationDocuments,
        organization ? { organizationId: organization.id } : "skip"
    );

    // Set active organization when viewing details
    useEffect(() => {
        if (setActive && orgId && (!organization || organization.id !== orgId)) {
            setActive({ organization: orgId });
        }
    }, [orgId, setActive, organization]);

    if (!isLoaded || (organization && organization.id !== orgId)) {
        return <FullscreenLoader label="Loading organization..." />;
    }

    if (!organization) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-2">Organization not found</h2>
                    <p className="text-muted-foreground mb-4">
                        This organization doesn't exist or you don't have access to it.
                    </p>
                    <Button onClick={() => router.push("/organizations")}>
                        Back to Organizations
                    </Button>
                </div>
            </div>
        );
    }

    const role = (membership?.role as string)?.toLowerCase().trim() || "";
    const isOwner = role.includes("admin") ||
        role.includes("owner") ||
        (organization as any).createdBy === user?.id;

    const createdDate = new Date(organization.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });

    return (
        <div className="min-h-screen flex flex-col bg-muted/30">
            <div className="fixed top-0 left-0 right-0 z-10 h-16 bg-white border-b p-4">
                <div className="flex items-center justify-between max-w-screen-xl mx-auto">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/organizations"
                            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2"
                        >
                            <ArrowLeft className="size-4" />
                            Organizations
                        </Link>
                    </div>
                    <div className="flex items-center gap-2">
                        {isOwner && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => openOrganizationProfile()}
                                >
                                    <UserPlus className="size-4 mr-2" />
                                    Invite Members
                                </Button>
                                <DeleteOrganizationDialog organizationId={organization.id}>
                                    <Button variant="destructive">Delete Organization</Button>
                                </DeleteOrganizationDialog>
                            </>
                        )}
                    </div>
                </div>
            </div>

            <div className="mt-16 p-8">
                <div className="max-w-screen-xl mx-auto space-y-6">
                    {/* Organization Header */}
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-start gap-6">
                                <Avatar className="size-24 rounded-lg">
                                    <AvatarImage src={organization.imageUrl} />
                                    <AvatarFallback className="rounded-lg text-2xl">
                                        {organization.name[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h1 className="text-3xl font-bold">{organization.name}</h1>
                                        {isOwner && (
                                            <Badge variant="default" className="gap-1">
                                                <Crown className="size-3" />
                                                Owner
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Calendar className="size-4" />
                                            <span>Created {createdDate}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users className="size-4" />
                                            <span>
                                                {organization.membersCount}{" "}
                                                {organization.membersCount === 1 ? "member" : "members"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Members Section */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0">
                            <CardTitle className="flex items-center gap-2">
                                <Users className="size-5" />
                                Members
                            </CardTitle>
                            {isOwner && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openOrganizationProfile()}
                                >
                                    <UserPlus className="size-4 mr-2" />
                                    Invite
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {memberships?.data?.map((membership, index) => (
                                    <div key={membership.id}>
                                        {index > 0 && <Separator className="my-3" />}
                                        <div className="flex items-center gap-3">
                                            <Avatar className="size-10">
                                                <AvatarImage src={membership.publicUserData.imageUrl} />
                                                <AvatarFallback>
                                                    {membership.publicUserData.firstName?.[0] ||
                                                        membership.publicUserData.identifier?.[0]}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex-1">
                                                <p className="font-medium">
                                                    {membership.publicUserData.firstName}{" "}
                                                    {membership.publicUserData.lastName}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {membership.publicUserData.identifier}
                                                </p>
                                            </div>
                                            <Badge variant={membership.role === "admin" || membership.role === "org:admin" ? "default" : "secondary"}>
                                                {membership.role === "admin" || membership.role === "org:admin" ? "Owner" : "Member"}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Documents Section */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="size-5" />
                                Documents
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {documents === undefined ? (
                                <p className="text-muted-foreground">Loading documents...</p>
                            ) : documents.length === 0 ? (
                                <p className="text-muted-foreground">No documents yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {documents.map((doc: any) => (
                                        <Link
                                            key={doc._id}
                                            href={`/documents/${doc._id}`}
                                            className="block p-3 rounded-lg hover:bg-muted transition"
                                        >
                                            <div className="flex items-center gap-3">
                                                <FileText className="size-4 text-muted-foreground" />
                                                <span className="font-medium">{doc.title}</span>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>



                    {/* Leave Organization Section - Only for non-owners */}
                    {!isOwner && (
                        <Card className="border-destructive/50">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h3 className="font-semibold text-lg mb-1">Leave Organization</h3>
                                        <p className="text-sm text-muted-foreground">
                                            You will lose access to all organization documents and will need to be re-invited to rejoin.
                                        </p>
                                    </div>
                                    <LeaveOrganizationDialog organizationId={organization.id}>
                                        <Button variant="destructive">Leave Organization</Button>
                                    </LeaveOrganizationDialog>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrganizationDetailsPage;
