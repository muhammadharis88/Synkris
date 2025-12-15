"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { toast } from "sonner";
import { Check, Loader2, Trash2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

interface ShareDialogProps {
    documentId: Id<"documents">;
    children: React.ReactNode;
}

const UserShareRow = ({
    documentId,
    share,
    onRemove,
}: {
    documentId: Id<"documents">;
    share: any;
    onRemove: (userId: string) => void;
}) => {
    const [role, setRole] = useState<"viewer" | "commenter" | "editor">(share.role);
    const [isLoading, setIsLoading] = useState(false);
    const [isPending, setIsPending] = useState(false);

    const shareDocument = useMutation(api.shares.shareDocument);

    const onRoleChange = async () => {
        setIsLoading(true);
        try {
            await shareDocument({
                documentId,
                email: share.email,
                role
            });
            toast.success("Role updated");
            setIsPending(false);
        } catch (error) {
            console.error("Failed to update role:", error);
            toast.error("Failed to update role");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-between p-2 border rounded-md">
            <div className="flex items-center gap-2">
                <Avatar className="size-8">
                    <AvatarImage src={share.user?.image} />
                    <AvatarFallback>{share.user?.name?.[0] ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                    <div className="font-medium">{share.user?.name ?? share.email}</div>
                    <div className="text-muted-foreground text-xs">
                        {share.user?.email ?? "Pending Invite"}
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Select
                    value={role}
                    onValueChange={(v: "viewer" | "commenter" | "editor") => {
                        setRole(v);
                        setIsPending(true);
                    }}
                >
                    <SelectTrigger className="w-[100px] h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="commenter">Commenter</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                    </SelectContent>
                </Select>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onRoleChange}
                    disabled={isLoading || !isPending}
                >
                    {isLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Check className={cn("size-4", isPending ? "text-primary" : "text-muted-foreground")} />
                    )}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemove(share.userId)}
                >
                    <Trash2 className="size-4 text-destructive" />
                </Button>
            </div>
        </div>
    );
};

export const ShareDialog = ({ documentId, children }: ShareDialogProps) => {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState<"viewer" | "commenter" | "editor">("viewer");
    const [isLoading, setIsLoading] = useState(false);

    const shareDocument = useMutation(api.shares.shareDocument);
    const removeShare = useMutation(api.shares.removeShare);
    const shares = useQuery(api.shares.getShares, { documentId });
    const document = useQuery(api.documents.getById, { id: documentId });
    const { user } = useUser();

    const onShare = async () => {
        setIsLoading(true);
        try {
            await shareDocument({ documentId, email, role });

            // Send email invitation
            try {
                const emailResponse = await fetch('/api/send-invite-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        recipientEmail: email,
                        recipientName: email.split('@')[0],
                        documentId,
                        documentTitle: document?.title || 'Untitled Document',
                        inviterName: user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Someone',
                        role,
                    }),
                });

                const emailResult = await emailResponse.json();

                if (!emailResponse.ok) {
                    console.error('Email sending failed:', emailResult);
                    toast.success("Document shared (email notification failed)");
                } else {
                    console.log('Email sent successfully:', emailResult);
                    toast.success("Document shared and invitation sent!");
                }
            } catch (emailError) {
                console.error('Email error:', emailError);
                toast.success("Document shared (email notification failed)");
            }

            setEmail("");
            setRole("viewer");
        } catch (error) {
            console.error('Share error:', error);
            toast.error("Failed to share document");
        } finally {
            setIsLoading(false);
        }
    };

    const onRemove = async (userId: string) => {
        try {
            await removeShare({ documentId, userId });
            toast.success("User removed");
        } catch (error) {
            toast.error("Failed to remove user");
        }
    };

    return (
        <Dialog>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Share Document</DialogTitle>
                    <DialogDescription>
                        Share this document with others to collaborate.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-2">
                            <Label>Email address</Label>
                            <Input
                                placeholder="Enter email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="w-32 space-y-2">
                            <Label>Role</Label>
                            <Select value={role} onValueChange={(v: any) => setRole(v)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="viewer">Viewer</SelectItem>
                                    <SelectItem value="commenter">Commenter</SelectItem>
                                    <SelectItem value="editor">Editor</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button onClick={onShare} disabled={isLoading}>
                            {isLoading ? <Loader2 className="size-4 animate-spin" /> : "Invite"}
                        </Button>
                    </div>
                    <div className="space-y-2">
                        <Label>People with access</Label>
                        <div className="space-y-2">
                            {shares?.map((share) => (
                                <UserShareRow
                                    key={share._id}
                                    documentId={documentId}
                                    share={share}
                                    onRemove={onRemove}
                                />
                            ))}
                            {shares?.length === 0 && (
                                <div className="text-sm text-muted-foreground text-center py-4">
                                    No one has access to this document yet.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
