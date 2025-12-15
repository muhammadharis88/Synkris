import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { SiGoogledocs } from "react-icons/si";
import { Building2Icon, CircleUser } from "lucide-react";
import { useUser } from "@clerk/nextjs";

import { TableCell, TableRow } from "@/components/ui/table";

import { Badge } from "@/components/ui/badge";

import { DocumentMenu } from "./document-menu";
import { RoleBadge } from "./role-badge";
import { Doc } from "../../../convex/_generated/dataModel";

interface DocumentRowProps {
    document: Doc<"documents"> & { role?: "viewer" | "commenter" | "editor" };
};

export const DocumentRow = ({ document }: DocumentRowProps) => {
    const router = useRouter();
    const { user } = useUser();
    const isOwner = document.ownerId === user?.id;

    return (
        <TableRow
            onClick={() => router.push(`/documents/${document._id}`)}
            className="cursor-pointer"
        >
            <TableCell className="w-[50px]">
                <SiGoogledocs className="size-6 fill-blue-500" />
            </TableCell>
            <TableCell className="font-medium md:w-[45%]">
                {document.title}
            </TableCell>
            <TableCell className="text-muted-foreground hidden md:flex items-center gap-2">
                {document.role ? (
                    <div className="flex items-center gap-2">
                        <Badge
                            variant="secondary"
                            className="bg-[#007AFF]/10 text-[#312ECB] font-medium hover:bg-[#007AFF]/20 cursor-default"
                        >
                            Shared
                        </Badge>
                        <RoleBadge role={document.role} />
                    </div>
                ) : (
                    <Badge
                        variant="default"
                        className="bg-[#007AFF]/10 text-[#312ECB] font-medium hover:bg-[#007AFF]/20 cursor-default border-none shadow-none"
                    >
                        Personal
                    </Badge>
                )}
            </TableCell>
            <TableCell className="text-muted-foreground hidden md:table-cell">
                {format(new Date(document._creationTime), "MMM dd, yyyy")}
            </TableCell>
            <TableCell className="flex justify-end">
                <DocumentMenu
                    documentId={document._id}
                    title={document.title}
                    isOwner={isOwner}
                    onNewTab={() => window.open(`/documents/${document._id}`, "_blank")}
                />
            </TableCell>

        </TableRow>
    )
}