import { create } from "zustand";
import { type Editor } from "@tiptap/react";

interface EditorState {
    editor: Editor | null;
    setEditor: (editor: Editor | null) => void;
    versionHistoryOpen: boolean;
    versionHistoryPosition: number;
    openVersionHistory: (position: number) => void;
    closeVersionHistory: () => void;
};

export const useEditorStore = create<EditorState>((set) => ({
    editor: null,
    setEditor: (editor) => set({ editor }),
    versionHistoryOpen: false,
    versionHistoryPosition: 0,
    openVersionHistory: (position) => set({ versionHistoryOpen: true, versionHistoryPosition: position }),
    closeVersionHistory: () => set({ versionHistoryOpen: false }),
}));
