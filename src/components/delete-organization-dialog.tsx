"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import { useMutation } from "convex/react";

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
import { api } from "../../convex/_generated/api";

interface DeleteOrganizationDialogProps {
    organizationId: string;
    children: React.ReactNode;
}

export const DeleteOrganizationDialog = ({
    organizationId,
    children,
}: DeleteOrganizationDialogProps) => {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);
    const { organization } = useOrganization();
    const deleteDocuments = useMutation(api.organizations.deleteOrganizationDocuments);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            // First delete all documents from Convex
            const result = await deleteDocuments({ organizationId });

            // Then delete the organization from Clerk
            if (organization) {
                await organization.destroy();
            }

            toast.success(
                `Organization deleted successfully. ${result?.deletedCount || 0} document(s) removed.`
            );
            router.push("/organizations?refresh=true");
        } catch (error) {
            console.error("Error deleting organization:", error);
            toast.error("Failed to delete organization");
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">
                        Delete Organization?
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-2 text-sm text-muted-foreground">
                            <p className="font-semibold text-foreground">
                                This action cannot be undone. This will permanently:
                            </p>
                            <ul className="list-disc list-inside space-y-1">
                                <li>Delete the organization</li>
                                <li>Delete ALL documents in this organization</li>
                                <li>Remove all members from the organization</li>
                                <li>Delete all document shares, versions, and chat messages</li>
                            </ul>
                            <p className="text-destructive font-medium mt-3">
                                All data will be permanently lost and cannot be recovered.
                            </p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isDeleting}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDelete();
                        }}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {isDeleting ? "Deleting..." : "Delete Organization"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
