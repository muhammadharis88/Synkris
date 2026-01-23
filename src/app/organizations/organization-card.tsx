"use client";

import { useOrganizationList } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { Building2, Users, Plus } from "lucide-react";
import Link from "next/link";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "../../../convex/_generated/api";

interface OrganizationCardProps {
    organizationId: string;
    name: string;
    imageUrl: string;
    role: string;
    memberCount: number;
}

export const OrganizationCard = ({
    organizationId,
    name,
    imageUrl,
    role,
    memberCount,
}: OrganizationCardProps) => {
    const documentCount = useQuery(api.organizations.getDocumentCount, {
        organizationId,
    });

    return (
        <Link href={`/organizations/${organizationId}`}>
            <Card className="hover:bg-accent transition cursor-pointer h-full">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <Avatar className="size-16 rounded-md">
                            <AvatarImage src={imageUrl} />
                            <AvatarFallback className="rounded-md text-lg">
                                {name[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-lg truncate">
                                    {name}
                                </h3>
                                <Badge variant={role?.toLowerCase().includes("admin") || role?.toLowerCase().includes("owner") ? "default" : "secondary"}>
                                    {role?.toLowerCase().includes("admin") || role?.toLowerCase().includes("owner") ? "Owner" : "Member"}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <Users className="size-4" />
                                    <span>{memberCount} {memberCount === 1 ? "member" : "members"}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Building2 className="size-4" />
                                    <span>
                                        {documentCount !== undefined ? documentCount : "..."} {documentCount === 1 ? "document" : "documents"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </Link>
    );
};
