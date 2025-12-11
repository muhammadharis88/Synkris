"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { Editor } from "@tiptap/react";
import { X, RotateCcw, Clock, User, LoaderIcon } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface VersionHistoryPanelProps {
    editor: Editor | null;
    documentId: Id<"documents">;
    position: number;
    isOpen: boolean;
    onClose: () => void;
}

interface VersionWithUser {
    _id: string;
    content: string;
    position: number;
    length: number;
    createdAt: number;
    createdBy: string;
    userName?: string;
    userAvatar?: string;
}

export const VersionHistoryPanel = ({
    editor,
    documentId,
    position,
    isOpen,
    onClose,
}: VersionHistoryPanelProps) => {
    const saveVersion = useMutation(api.textVersions.saveVersion);
    const [versionsWithUsers, setVersionsWithUsers] = useState<VersionWithUser[]>([]);
    const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);
    const [highlightedText, setHighlightedText] = useState<{ from: number; to: number } | null>(null);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [restoringVersionId, setRestoringVersionId] = useState<string | null>(null);

    // Get versions from Convex
    const versions = useQuery(
        api.textVersions.getVersionsByPosition,
        isOpen && editor
            ? {
                documentId,
                position,
            }
            : "skip"
    );

    // Fetch user info for each version
    useEffect(() => {
        if (!versions) {
            setVersionsWithUsers([]);
            setLoadingUsers(false);
            return;
        }

        if (versions.length === 0) {
            setVersionsWithUsers([]);
            setLoadingUsers(false);
            return;
        }

        setLoadingUsers(true);
        const fetchUserInfo = async () => {
            try {
                const versionsWithUserInfo = await Promise.all(
                    versions.map(async (version) => {
                        try {
                            const response = await fetch(`/api/user-info?userId=${version.createdBy}`);
                            if (response.ok) {
                                const userInfo = await response.json();
                                return {
                                    ...version,
                                    userName: userInfo.name,
                                    userAvatar: userInfo.avatar,
                                };
                            }
                            throw new Error("Failed to fetch user info");
                        } catch (error) {
                            return {
                                ...version,
                                userName: "Unknown User",
                                userAvatar: "",
                            };
                        }
                    })
                );
                setVersionsWithUsers(versionsWithUserInfo);
            } finally {
                setLoadingUsers(false);
            }
        };

        fetchUserInfo();
    }, [versions]);

    // Find paragraph bounds for highlighting
    const getParagraphBounds = () => {
        if (!editor) return { start: 0, end: 0 };
        const { from } = editor.state.selection;
        const $from = editor.state.doc.resolve(from);
        return {
            start: $from.start($from.depth),
            end: $from.end($from.depth),
        };
    };

    const handleVersionSelect = (version: VersionWithUser) => {
        if (!editor) return;

        setSelectedVersionId(version._id);
        
        // Try to find the version content in the document by searching
        // We'll use the version's stored position as a starting point
        const searchStart = version.position;
        const searchEnd = Math.min(
            editor.state.doc.content.size,
            version.position + version.length + 100 // Search a bit beyond
        );

        // Try to find matching or similar content
        const currentContent = editor.state.doc.textBetween(searchStart, searchEnd);
        
        // If we found the exact content or it's close, use those positions
        let startPos = searchStart;
        let endPos = searchStart + version.length;

        // If content doesn't match exactly, try to find it in the paragraph
        if (currentContent.trim() !== version.content.trim()) {
            const bounds = getParagraphBounds();
            startPos = bounds.start;
            endPos = bounds.end;
        }

        // Set selection to highlight the area
        try {
            editor
                .chain()
                .focus()
                .setTextSelection({ from: startPos, to: endPos })
                .run();

            setHighlightedText({ from: startPos, to: endPos });

            // Preview the version content by temporarily replacing it
            const currentText = editor.state.doc.textBetween(startPos, endPos);
            if (currentText.trim() !== version.content.trim()) {
                editor
                    .chain()
                    .setTextSelection({ from: startPos, to: endPos })
                    .deleteSelection()
                    .insertContent(version.content)
                    .setTextSelection({ from: startPos, to: startPos + version.content.length })
                    .run();
            }
        } catch (error) {
            console.error("Error selecting version:", error);
        }
    };

    const handleRestore = async (version: VersionWithUser) => {
        if (!editor) return;

        setRestoringVersionId(version._id);
        try {
            const bounds = getParagraphBounds();
            const startPos = version.position !== undefined ? version.position : bounds.start;
            const endPos = version.position !== undefined 
                ? version.position + version.length 
                : bounds.end;

            // Replace with version content
            editor
                .chain()
                .focus()
                .setTextSelection({ from: startPos, to: endPos })
                .deleteSelection()
                .insertContent(version.content)
                .run();

            // Save as new version
            await saveVersion({
                documentId,
                content: version.content,
                position: startPos,
                length: version.content.length,
            });

            toast.success("Version restored successfully");
            setHighlightedText(null);
            setSelectedVersionId(null);
            onClose();
        } catch (error) {
            console.error("Failed to restore version:", error);
            toast.error("Failed to restore version");
        } finally {
            setRestoringVersionId(null);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-[114px] bottom-0 w-96 bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-gray-600" />
                    <h2 className="text-lg font-semibold">Version History</h2>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-4">
                    {/* Loading state when fetching versions */}
                    {versions === undefined && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <LoaderIcon className="h-6 w-6 text-gray-400 animate-spin" />
                            <p className="text-sm text-gray-500">Loading version history...</p>
                        </div>
                    )}

                    {/* No versions found */}
                    {versions !== undefined && !loadingUsers && versionsWithUsers.length === 0 && versions.length === 0 && (
                        <div className="text-center text-gray-500 py-8">
                            <p>No version history found</p>
                            <p className="text-sm mt-2">Start editing to see version history</p>
                        </div>
                    )}

                    {/* Version list - show versions even while loading user info */}
                    {versions !== undefined && versions.length > 0 && (
                        (loadingUsers && versionsWithUsers.length === 0 ? versions : versionsWithUsers).map((version, index) => {
                            const isSelected = selectedVersionId === version._id;
                            const isCurrent = index === 0;
                            const date = new Date(version.createdAt);
                            const isLoadingUser = loadingUsers && !version.userName;

                            return (
                                <div
                                    key={version._id}
                                    className={cn(
                                        "border rounded-lg p-4 cursor-pointer transition-all",
                                        isSelected
                                            ? "border-blue-500 bg-blue-50"
                                            : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                    )}
                                    onClick={() => handleVersionSelect(version)}
                                >
                                    {/* Version Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {isLoadingUser ? (
                                                <div className="h-6 w-6 rounded-full bg-gray-200 animate-pulse" />
                                            ) : version.userAvatar ? (
                                                <img
                                                    src={version.userAvatar}
                                                    alt={version.userName}
                                                    className="h-6 w-6 rounded-full"
                                                />
                                            ) : (
                                                <div className="h-6 w-6 rounded-full bg-gray-300 flex items-center justify-center">
                                                    <User className="h-4 w-4 text-gray-600" />
                                                </div>
                                            )}
                                            <div>
                                                {isLoadingUser ? (
                                                    <>
                                                        <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1" />
                                                        <div className="h-3 w-32 bg-gray-200 rounded animate-pulse" />
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-sm font-medium">
                                                            {version.userName || "Unknown User"}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {format(date, "MMM dd, yyyy h:mm a")}
                                                        </p>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        {isCurrent && !isLoadingUser && (
                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                                Current
                                            </span>
                                        )}
                                    </div>

                                    <Separator className="my-2" />

                                    {/* Version Content Preview */}
                                    <div className="mb-3">
                                        <p className="text-xs text-gray-500 mb-1">Content:</p>
                                        <p className="text-sm text-gray-800 line-clamp-3">
                                            {version.content || "(Empty)"}
                                        </p>
                                    </div>

                                    {/* Restore Button */}
                                    {isSelected && (
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleRestore(version);
                                            }}
                                            className="w-full"
                                            size="sm"
                                            disabled={restoringVersionId === version._id}
                                        >
                                            {restoringVersionId === version._id ? (
                                                <>
                                                    <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
                                                    Restoring...
                                                </>
                                            ) : (
                                                <>
                                                    <RotateCcw className="mr-2 h-4 w-4" />
                                                    Restore this version
                                                </>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </ScrollArea>
        </div>
    );
};

