import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { Editor } from "@tiptap/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { useDebounce } from "./use-debounce";

interface UseVersionTrackerProps {
    editor: Editor | null;
    documentId: Id<"documents">;
    enabled?: boolean;
}

/**
 * Hook to automatically track text changes and save versions
 * This saves a version whenever text at a specific position changes
 */
export const useVersionTracker = ({ editor, documentId, enabled = true }: UseVersionTrackerProps) => {
    const saveVersion = useMutation(api.textVersions.saveVersion);
    const lastSavedPositions = useRef<Map<number, { content: string; timestamp: number }>>(new Map());
    const lastContent = useRef<string>("");
    const debounceDelay = 2000; // Save version 2 seconds after user stops typing

    // Debounce function to save version
    const debouncedSaveVersion = useDebounce(async (position: number, content: string, length: number) => {
        const lastSaved = lastSavedPositions.current.get(position);
        const now = Date.now();

        // Only save if:
        // 1. Content actually changed, OR
        // 2. It's been more than 30 seconds since last save (periodic snapshot)
        if (lastSaved && lastSaved.content === content && (now - lastSaved.timestamp) < 30000) {
            return;
        }

        try {
            await saveVersion({
                documentId,
                content,
                position,
                length,
            });
            lastSavedPositions.current.set(position, { content, timestamp: now });
        } catch (error) {
            console.error("Failed to save version:", error);
        }
    }, debounceDelay);

    useEffect(() => {
        if (!editor || !enabled) return;

        const handleUpdate = () => {
            // Only save versions when user makes actual content changes (not just selection changes)
            const { from } = editor.state.selection;

            // Find paragraph boundaries
            const $from = editor.state.doc.resolve(from);

            // Get the paragraph node positions
            const paragraphStart = $from.start($from.depth);
            const paragraphEnd = $from.end($from.depth);

            // Use paragraph boundaries as the tracking position
            const content = editor.state.doc.textBetween(paragraphStart, paragraphEnd);

            // Only track if content has actually changed
            if (content.trim().length > 0 && content !== lastContent.current) {
                lastContent.current = content;
                // Save version for this paragraph (debounced - waits 2 seconds after typing stops)
                debouncedSaveVersion(paragraphStart, content, paragraphEnd - paragraphStart);
            }
        };

        // Track version on content updates
        // The debounce ensures we wait 2 seconds after user stops typing before saving
        editor.on("update", handleUpdate);

        return () => {
            editor.off("update", handleUpdate);
        };
    }, [editor, documentId, debouncedSaveVersion, enabled]);
};

