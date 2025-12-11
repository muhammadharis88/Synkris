"use client";

import { useQuery, useMutation } from "convex/react";
import { Editor } from "@tiptap/react";
import { RotateCcw, History, Lock, Unlock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";

import { AIDialog } from "./ai-dialog";

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface EditorContextMenuProps {
    editor: Editor | null;
    documentId: Id<"documents">;
    children: React.ReactNode;
    onOpenVersionHistory?: (position: number) => void;
}

export const EditorContextMenu = ({
    editor,
    documentId,
    children,
    onOpenVersionHistory
}: EditorContextMenuProps) => {
    const { user } = useUser();
    const saveVersion = useMutation(api.textVersions.saveVersion);
    const lockParagraph = useMutation(api.lockedParagraphs.lockParagraph);
    const unlockParagraph = useMutation(api.lockedParagraphs.unlockParagraph);
    const [selectionPosition, setSelectionPosition] = useState<number>(0);
    const [hasTextSelection, setHasTextSelection] = useState(false);
    const [selectedText, setSelectedText] = useState("");
    const [showAIDialog, setShowAIDialog] = useState(false);

    // Update selection position when editor selection changes
    useEffect(() => {
        if (!editor) return;

        const updateSelection = () => {
            const { from, to } = editor.state.selection;
            setSelectionPosition(from);
            const hasSelection = from !== to;
            setHasTextSelection(hasSelection);
            if (hasSelection) {
                setSelectedText(editor.state.doc.textBetween(from, to));
            } else {
                setSelectedText("");
            }
        };

        editor.on("selectionUpdate", updateSelection);
        updateSelection();

        return () => {
            editor.off("selectionUpdate", updateSelection);
        };
    }, [editor]);

    // Find paragraph boundaries for the current selection
    const getParagraphBounds = () => {
        if (!editor) return { start: 0, end: 0 };
        const { from } = editor.state.selection;
        const $from = editor.state.doc.resolve(from);
        return {
            start: $from.start($from.depth),
            end: $from.end($from.depth),
        };
    };

    const paragraphBounds = editor ? getParagraphBounds() : { start: 0, end: 0 };

    // Check if current paragraph is locked
    const locks = useQuery(
        api.lockedParagraphs.getLockedParagraphs,
        { documentId }
    );

    // Get versions for the current paragraph position
    const versions = useQuery(
        api.textVersions.getVersionsByPosition,
        editor
            ? {
                documentId,
                position: paragraphBounds.start,
            }
            : "skip"
    );

    // Get the previous version (versions are ordered newest first, so index 1 is previous)
    const previousVersion = versions && versions.length > 1 ? versions[1] : null;

    const getActiveLock = () => {
        if (!editor || !locks) return null;
        const { from, to } = editor.state.selection;
        const start = from === to ? paragraphBounds.start : Math.min(from, to);
        const end = from === to ? paragraphBounds.end : Math.max(from, to);
        for (const lock of locks) {
            const lockStart = lock.position;
            const lockEnd = lock.position + lock.length;
            if (!(end <= lockStart || start >= lockEnd)) return lock;
        }
        return null;
    };

    const handleRevert = async () => {
        if (!editor || !previousVersion) {
            toast.error("No previous version found");
            return;
        }

        try {
            const { from, to } = editor.state.selection;
            const bounds = getParagraphBounds();

            // Use paragraph boundaries if no selection, otherwise use current selection
            const startPos = from === to ? bounds.start : from;
            const endPos = from === to ? bounds.end : to;

            // Get current content to compare
            const currentContent = editor.state.doc.textBetween(startPos, endPos);

            // If current content matches previous version, there's nothing to revert
            if (currentContent === previousVersion.content) {
                toast.info("This text is already at the previous version");
                return;
            }

            // Replace the text with the previous version's content
            editor
                .chain()
                .focus()
                .setTextSelection({ from: startPos, to: endPos })
                .deleteSelection()
                .insertContent(previousVersion.content)
                .run();

            // Save the revert as a new version
            await saveVersion({
                documentId,
                content: previousVersion.content,
                position: startPos,
                length: previousVersion.content.length,
            });

            toast.success("Text reverted to previous version");
        } catch (error) {
            console.error("Failed to revert:", error);
            toast.error("Failed to revert changes");
        }
    };

    const handleSaveVersion = async () => {
        if (!editor) return;

        const { from, to } = editor.state.selection;
        if (from === to) {
            toast.error("Please select some text to save a version");
            return;
        }

        const content = editor.state.doc.textBetween(from, to);

        try {
            await saveVersion({
                documentId,
                content,
                position: from,
                length: to - from,
            });

            toast.success("Version saved");
        } catch (error) {
            console.error("Failed to save version:", error);
            toast.error("Failed to save version");
        }
    };

    const handleLockUnlock = async () => {
        if (!editor) return;
        const { from, to } = editor.state.selection;
        const bounds = getParagraphBounds();
        const start = from === to ? bounds.start : Math.min(from, to);
        const end = from === to ? bounds.end : Math.max(from, to);
        const length = Math.max(1, end - start);
        const active = getActiveLock();

        try {
            if (active) {
                if (active.lockedBy !== user?.id) {
                    toast.error("You can only unlock text you locked");
                    return;
                }
                await unlockParagraph({ documentId, position: active.position });
                toast.success("Unlocked");
            } else {
                const result = await lockParagraph({ documentId, position: start, length });
                toast.success(result.locked ? "Locked" : "Unlocked");
            }
        } catch (error: any) {
            console.error("Failed to lock/unlock paragraph:", error);
            toast.error(error.message || "Failed to lock/unlock paragraph");
        }
    };

    const canRevert = previousVersion !== null && previousVersion !== undefined;
    const hasVersions = versions && versions.length > 0;
    const activeLock = getActiveLock();
    const isLocked = !!activeLock;
    const canLockUnlock = activeLock === null || activeLock.lockedBy === user?.id;

    const handleOpenVersionHistory = () => {
        if (onOpenVersionHistory && editor) {
            const bounds = getParagraphBounds();
            onOpenVersionHistory(bounds.start);
        }
    };

    const handleAskAI = () => {
        if (hasTextSelection) {
            setShowAIDialog(true);
        }
    };

    const handleApplyAI = (content: string) => {
        if (!editor) return;

        editor
            .chain()
            .focus()
            .deleteSelection()
            .insertContent(content)
            .run();

        toast.success("AI changes applied");
    };

    return (
        <ContextMenu>
            <ContextMenuTrigger asChild>
                {children}
            </ContextMenuTrigger>
            <ContextMenuContent>
                {canLockUnlock && (
                    <>
                        <ContextMenuItem onClick={handleLockUnlock}>
                            {isLocked ? (
                                <>
                                    <Unlock className="mr-2 h-4 w-4" />
                                    Unlock Paragraph
                                </>
                            ) : (
                                <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Lock Paragraph
                                </>
                            )}
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                    </>
                )}
                {hasTextSelection && (
                    <>
                        <ContextMenuItem onClick={handleSaveVersion}>
                            Save Version
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                    </>
                )}
                {hasVersions && (
                    <ContextMenuItem onClick={handleOpenVersionHistory}>
                        <History className="mr-2 h-4 w-4" />
                        View Version History
                    </ContextMenuItem>
                )}
                {canRevert && (
                    <>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={handleRevert}>
                            <RotateCcw className="mr-2 h-4 w-4" />
                            Revert Changes
                        </ContextMenuItem>
                    </>
                )}
                {hasTextSelection && (
                    <>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={handleAskAI}>
                            <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
                            Ask AI
                        </ContextMenuItem>
                    </>
                )}
            </ContextMenuContent>
            <AIDialog
                open={showAIDialog}
                onClose={() => setShowAIDialog(false)}
                selectedText={selectedText}
                onApply={handleApplyAI}
            />
        </ContextMenu>
    );
};

