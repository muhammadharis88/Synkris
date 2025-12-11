"use client"

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

interface LeaveDialogProps {
    documentId: Id<"documents">;
    children: React.ReactNode;
};

export const LeaveDialog = ({ documentId, children }: LeaveDialogProps) => {
    const removeShare = useMutation(api.shares.removeShare);
    const { user } = useUser();
    const router = useRouter();
    const [isRemoving, setIsRemoving] = useState(false);

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {children}
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                        This will remove your access to this document. You won't be able to view or edit it anymore unless someone shares it with you again.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isRemoving}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (!user?.id) return;

                            setIsRemoving(true);
                            removeShare({ documentId, userId: user.id })
                                .then(() => {
                                    toast.success("Successfully left the document");
                                    router.refresh();
                                })
                                .catch(() => toast.error("Failed to leave document"))
                                .finally(() => setIsRemoving(false));
                        }}
                    >
                        {isRemoving ? "Leaving..." : "Leave"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
