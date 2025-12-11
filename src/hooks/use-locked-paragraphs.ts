import { useEffect, useRef } from "react";
import { useQuery } from "convex/react";
import { Editor } from "@tiptap/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { toast } from "sonner";
import { useUser } from "@clerk/nextjs";

interface UseLockedParagraphsProps {
    editor: Editor | null;
    documentId: Id<"documents">;
}

/**
 * Hook to manage locked paragraphs and prevent editing
 */
export const useLockedParagraphs = ({ editor, documentId }: UseLockedParagraphsProps) => {
    const { user } = useUser();
    const lockedParagraphs = useQuery(
        api.lockedParagraphs.getLockedParagraphs,
        { documentId }
    );
    const lockedParagraphsRef = useRef(lockedParagraphs);

    // Keep ref updated
    useEffect(() => {
        lockedParagraphsRef.current = lockedParagraphs;
    }, [lockedParagraphs]);

    useEffect(() => {
        if (!editor || !lockedParagraphs) return;

        // Update the extension with latest locked paragraphs
        const extension = editor.extensionManager.extensions.find(ext => ext.name === "lockedParagraph");
        if (extension) {
            extension.options.getLockedParagraphs = () => lockedParagraphsRef.current || [];
            extension.options.currentUserId = user?.id || null;
        }

        const handleBeforeInput = (view: any, event: any) => {
            const { from, to } = editor.state.selection;
            // Use ref to get the most up-to-date locks
            const currentLocks = lockedParagraphsRef.current || [];
            for (const lock of currentLocks) {
                const lockStart = lock.position;
                const lockEnd = lock.position + lock.length;
                if (!(to <= lockStart || from >= lockEnd)) {
                    event.preventDefault();
                    event.stopPropagation();
                    toast.error("Unlock first to make changes.");
                    return false;
                }
            }
        };

        const handleUpdate = () => {
            const { from, to } = editor.state.selection;
            // Use ref to get the most up-to-date locks
            const currentLocks = lockedParagraphsRef.current || [];
            for (const lock of currentLocks) {
                const lockStart = lock.position;
                const lockEnd = lock.position + lock.length;
                if (!(to <= lockStart || from >= lockEnd)) {
                    // Non-locker cannot keep selection inside locked range
                    if (lock.lockedBy !== user?.id) {
                        try {
                            if (from < lockStart) {
                                editor.commands.setTextSelection(lockStart);
                            } else if (from >= lockEnd) {
                                editor.commands.setTextSelection(lockEnd);
                            } else {
                                editor.commands.setTextSelection(lockEnd);
                            }
                        } catch {}
                    }
                }
            }
        };

        const handleTransaction = ({ transaction }: { transaction: any }) => {
            if (transaction.steps.length === 0) return;
            // If transaction was already blocked by extension, don't show toast
            if (transaction.getMeta('prevented')) return;
            
            const { from, to } = transaction.selection;
            // Use ref to get the most up-to-date locks
            const currentLocks = lockedParagraphsRef.current || [];
            let isLocked = false;
            for (const lock of currentLocks) {
                const lockStart = lock.position;
                const lockEnd = lock.position + lock.length;
                if (!(to <= lockStart || from >= lockEnd)) {
                    isLocked = true;
                    break;
                }
            }
            // Only show toast if we actually found a lock (transaction shouldn't have passed through)
            if (isLocked) {
                toast.error("Unlock first to make changes.");
            }
        };

        const handlePaste = (view: any, event: ClipboardEvent) => {
            const { from, to } = editor.state.selection;
            // Use ref to get the most up-to-date locks
            const currentLocks = lockedParagraphsRef.current || [];
            for (const lock of currentLocks) {
                const lockStart = lock.position;
                const lockEnd = lock.position + lock.length;
                if (!(to <= lockStart || from >= lockEnd)) {
                    event.preventDefault();
                    event.stopPropagation();
                    toast.error("Unlock first to make changes.");
                    return false;
                }
            }
        };

        editor.on("beforeInput", handleBeforeInput);
        editor.on("selectionUpdate", handleUpdate);
        editor.on("transaction", (props) => {
            const { transaction } = props;
            if (transaction.steps.length > 0) {
                handleTransaction(props);
            }
        });

        return () => {
            editor.off("beforeInput", handleBeforeInput);
            editor.off("selectionUpdate", handleUpdate);
            editor.off("transaction", handleTransaction);
        };
    }, [editor, lockedParagraphs, user?.id]);

    return { lockedParagraphs };
};

