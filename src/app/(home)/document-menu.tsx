import { ExternalLinkIcon, FilePenIcon, MoreVertical, TrashIcon, LogOutIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { RemoveDialog } from "@/components/remove-dialog";
import { RenameDialog } from "@/components/rename-dialog";
import { LeaveDialog } from "@/components/leave-dialog";
import {
    DropdownMenu,
    DropdownMenuItem,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Id } from "../../../convex/_generated/dataModel";

interface DocumentMenuProps {
    documentId: Id<"documents">;
    title: string;
    isOwner: boolean;
    onNewTab: (id: Id<"documents">) => void;
};

export const DocumentMenu = ({ documentId, title, isOwner, onNewTab }: DocumentMenuProps) => {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                    <MoreVertical className="size-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <RenameDialog documentId={documentId} initialTitle={title}>
                    <DropdownMenuItem
                        onSelect={(e) => e.preventDefault()}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <FilePenIcon className="size-4 mr-2" />
                        Rename
                    </DropdownMenuItem>
                </RenameDialog>
                {isOwner ? (
                    <RemoveDialog documentId={documentId}>
                        <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <TrashIcon className="size-4 mr-2" />
                            Remove
                        </DropdownMenuItem>
                    </RemoveDialog>
                ) : (
                    <LeaveDialog documentId={documentId}>
                        <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <LogOutIcon className="size-4 mr-2" />
                            Leave
                        </DropdownMenuItem>
                    </LeaveDialog>
                )}
                <DropdownMenuItem
                    onClick={() => onNewTab(documentId)}
                >
                    <ExternalLinkIcon className="size-4 mr-2" />
                    Open in a new tab
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}