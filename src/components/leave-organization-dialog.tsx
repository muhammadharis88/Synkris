"use client";

import { toast } from "sonner";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

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

interface LeaveOrganizationDialogProps {
    organizationId: string;
    children: React.ReactNode;
}

export const LeaveOrganizationDialog = ({
    organizationId,
    children,
}: LeaveOrganizationDialogProps) => {
    const router = useRouter();
    const [isLeaving, setIsLeaving] = useState(false);
    const { user } = useUser();

    const handleLeave = async () => {
        if (!user) return;

        setIsLeaving(true);
        try {
            await user.leaveOrganization(organizationId);
            toast.success("Successfully left the organization");
            router.push("/organizations?refresh=true");
        } catch (error) {
            console.error("Error leaving organization:", error);
            toast.error("Failed to leave organization");
        } finally {
            setIsLeaving(false);
        }
    };

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                <AlertDialogHeader>
                    <AlertDialogTitle>Leave Organization?</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="text-sm text-muted-foreground">
                            Are you sure you want to leave this organization? You will lose access to
                            all organization documents and will need to be re-invited to rejoin.
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={(e) => e.stopPropagation()}>
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        disabled={isLeaving}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleLeave();
                        }}
                    >
                        {isLeaving ? "Leaving..." : "Leave Organization"}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};
