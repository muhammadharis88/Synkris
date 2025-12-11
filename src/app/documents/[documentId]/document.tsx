"use client"

import { useState } from "react";
import { Preloaded, usePreloadedQuery } from "convex/react";

import { Room } from "./room";
import { Editor } from "./editor";
import { Navbar } from "./navbar";
import { Toolbar } from "./toolbar";
import { VersionHistoryPanel } from "./version-history-panel";
import { api } from "../../../../convex/_generated/api";
import { useEditorStore } from "@/store/use-editor-store";
import { cn } from "@/lib/utils";

interface DocumentProps {
    preloadedDocument: Preloaded<typeof api.documents.getById>;
};

export const Document = ({ preloadedDocument }: DocumentProps) => {
    const document = usePreloadedQuery(preloadedDocument);
    const { editor, versionHistoryOpen, versionHistoryPosition, openVersionHistory, closeVersionHistory } = useEditorStore();

    return ( 
        <Room>
            <div className="min-h-screen bg-[#FAFBFD]">
                <div className="flex flex-col px-4 pt-2 gap-y-2 fixed top-0 left-0 right-0 z-10 bg-[#FAFBFD] print:hidden">
                    <Navbar data={document} />
                    <Toolbar />
                </div>
                <div 
                    className={cn(
                        "pt-[114px] print:pt-0 transition-all duration-300",
                        versionHistoryOpen && "pr-96"
                    )}
                >
                    <Editor 
                        initialContent={document.initialContent} 
                        documentId={document._id}
                        onOpenVersionHistory={openVersionHistory}
                    />
                </div>
                <VersionHistoryPanel
                    editor={editor}
                    documentId={document._id}
                    position={versionHistoryPosition}
                    isOpen={versionHistoryOpen}
                    onClose={closeVersionHistory}
                />
            </div>
        </Room>
     );
}
