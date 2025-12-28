"use client";

import Link from "next/link";
import Image from "next/image"
import { toast } from "sonner";
import { BsFilePdf } from "react-icons/bs";
import { useRouter } from "next/navigation";
import { UserMenu } from "@/components/user-menu";
import {
    BoldIcon,
    FileIcon,
    FileJsonIcon,
    FilePenIcon,
    FilePlusIcon,
    FileText,
    GlobeIcon,
    ItalicIcon,
    PrinterIcon,
    Redo2Icon,
    RemoveFormattingIcon,
    StrikethroughIcon,
    TextIcon,
    TrashIcon,
    UnderlineIcon,
    Undo2Icon,
    Lock,
    Unlock,
    Clock,
    Sparkles,
    Lightbulb,
    MessageSquare
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";

import { Button } from "@/components/ui/button";
import { RenameDialog } from "@/components/rename-dialog";
import { RemoveDialog } from "@/components/remove-dialog";
import {
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarSeparator,
    MenubarShortcut,
    MenubarSub,
    MenubarSubContent,
    MenubarSubTrigger,
    MenubarTrigger,
} from "@/components/ui/menubar";
import { useEditorStore } from "@/store/use-editor-store";
import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";

import { Inbox } from "./inbox";
import { Avatars } from "./avatars";
import { DocumentInput } from "./document-input";
import { ShareDialog } from "@/components/share-dialog";
import { eRoles, RoleIndicator } from "./role-indicator";
import { AIDocumentGenerator } from "./ai-document-generator";
import { ChatPanel } from "./chat-panel";
import { useChatNotifications } from "./use-chat-notifications";
import { Badge } from "@/components/ui/badge";
import { api } from "../../../../convex/_generated/api";
import { Doc } from "../../../../convex/_generated/dataModel";

interface NavbarProps {
    data: Doc<"documents">;
}

export const Navbar = ({ data }: NavbarProps) => {
    const router = useRouter();
    const { editor, openVersionHistory } = useEditorStore();
    const { user } = useUser();
    const mutation = useMutation(api.documents.create);
    const lockParagraph = useMutation(api.lockedParagraphs.lockParagraph);
    const unlockParagraph = useMutation(api.lockedParagraphs.unlockParagraph);

    // Track current paragraph position based on editor selection
    const [paragraphStart, setParagraphStart] = useState<number>(0);
    const [paragraphEnd, setParagraphEnd] = useState<number>(0);
    const [selectionFrom, setSelectionFrom] = useState<number>(0);
    const [selectionTo, setSelectionTo] = useState<number>(0);
    const [showAIGenerator, setShowAIGenerator] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);

    // Get chat messages for unread count
    const messages = useQuery(api.messages.getMessages, { documentId: data._id });
    const { unreadCount } = useChatNotifications(data._id, messages, chatOpen);

    useEffect(() => {
        if (!editor) return;

        const updateSelection = () => {
            const { from, to } = editor.state.selection;
            const $from = editor.state.doc.resolve(from);
            const start = $from.start($from.depth);
            const end = $from.end($from.depth);
            setParagraphStart(start);
            setParagraphEnd(end);
            setSelectionFrom(from);
            setSelectionTo(to);
        };

        editor.on("selectionUpdate", updateSelection);
        updateSelection();

        return () => {
            editor.off("selectionUpdate", updateSelection);
        };
    }, [editor]);

    // Fetch all locks and compute overlap with current selection/paragraph
    const locks = useQuery(api.lockedParagraphs.getLockedParagraphs, { documentId: data._id });

    // Fetch auth info to get user's role
    const authInfo = useQuery(api.documents.getAuthInfo, { id: data._id });
    const isOwner = data.ownerId === user?.id;

    const activeLock = useMemo(() => {
        if (!locks) return null;
        const from = selectionFrom;
        const to = selectionTo;
        const rangeFrom = from === to ? paragraphStart : Math.min(from, to);
        const rangeTo = from === to ? paragraphEnd : Math.max(from, to);
        for (const lock of locks) {
            const lockStart = lock.position;
            const lockEnd = lock.position + lock.length;
            if (!(rangeTo <= lockStart || rangeFrom >= lockEnd)) {
                return lock;
            }
        }
        return null;
    }, [locks, selectionFrom, selectionTo, paragraphStart, paragraphEnd]);

    const isLocked = !!activeLock;

    const onNewDocument = () => {
        mutation({
            title: "Untitled document",
            initialContent: ""
        })
            .catch(() => toast.error("Something went wrong"))
            .then((id) => {
                toast.success("Document created");
                router.push(`/documents/${id}`);
            });
    }

    const insertTable = ({ rows, cols }: { rows: number, cols: number }) => {
        editor
            ?.chain()
            .focus()
            .insertTable({ rows, cols, withHeaderRow: false })
            .run()
    };

    const onDownload = (blob: Blob, filename: string) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
    };

    const onSaveJSON = () => {
        if (!editor) return;

        const content = editor.getJSON();
        const blob = new Blob([JSON.stringify(content)], {
            type: "application/json",
        });
        onDownload(blob, `${data.title}.json`)
    };

    const onSaveHTML = () => {
        if (!editor) return;

        const content = editor.getHTML();
        const blob = new Blob([content], {
            type: "text/html",
        });
        onDownload(blob, `${data.title}.html`)
    };

    const onSaveText = () => {
        if (!editor) return;

        const content = editor.getText();
        const blob = new Blob([content], {
            type: "text/plain",
        });
        onDownload(blob, `${data.title}.txt`)
    };

    const handleOpenVersionHistory = () => {
        if (!editor) return;
        openVersionHistory(paragraphStart);
    };

    const handleLockUnlock = async () => {
        if (!editor) return;
        const from = selectionFrom;
        const to = selectionTo;
        const start = from === to ? paragraphStart : Math.min(from, to);
        const end = from === to ? paragraphEnd : Math.max(from, to);
        const length = Math.max(1, end - start);
        try {
            if (activeLock) {
                if (activeLock.lockedBy !== user?.id) {
                    toast.error("You can only unlock text you locked");
                    return;
                }
                await unlockParagraph({ documentId: data._id, position: activeLock.position });
                toast.success("Unlocked");
            } else {
                const result = await lockParagraph({ documentId: data._id, position: start, length });
                toast.success(result.locked ? "Locked" : "Unlocked");
            }
        } catch (e: any) {
            toast.error(e?.message || "Failed to toggle lock");
        }
    };

    const handleInsertAIDocument = (content: string) => {
        editor
            ?.chain()
            .focus()
            .clearContent()
            .insertContent(content)
            .run();
        toast.success("AI-generated document inserted");
    };

    return (
        <nav className="flex items-center justify-between">
            <div className="flex gap-2 items-center">
                <Link href="/">
                    <Image src="/logo.svg" alt="Logo" width={36} height={36} />
                </Link>
                <div className="flex flex-col">
                    <DocumentInput title={data.title} id={data._id} />
                    <div className="flex items-center gap-2">
                        {/* Show role indicator for shared documents */}
                        {authInfo?.role && (
                            <RoleIndicator role={authInfo.role as eRoles} isOwner={isOwner} />
                        )}
                        <Menubar className="border-none bg-transparent shadow-none h-auto p-0">
                            <MenubarMenu>
                                <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                                    File
                                </MenubarTrigger>
                                <MenubarContent className="print:hidden">
                                    <MenubarSub>
                                        <MenubarSubTrigger>
                                            <FileIcon className="size-4 mr-2" />
                                            Save
                                        </MenubarSubTrigger>
                                        <MenubarSubContent>
                                            <MenubarItem onClick={onSaveJSON}>
                                                <FileJsonIcon className="size-4 mr-2" />
                                                JSON
                                            </MenubarItem>
                                            <MenubarItem onClick={() => window.print()}>
                                                <BsFilePdf className="size-4 mr-2" />
                                                PDF
                                            </MenubarItem>
                                            <MenubarItem onClick={onSaveHTML}>
                                                <GlobeIcon className="size-4 mr-2" />
                                                HTML
                                            </MenubarItem>
                                            <MenubarItem onClick={onSaveText}>
                                                <FileText className="size-4 mr-2" />
                                                Text
                                            </MenubarItem>
                                        </MenubarSubContent>
                                    </MenubarSub>
                                    <MenubarItem onClick={onNewDocument}>
                                        <FilePlusIcon className="size-4 mr-2" />
                                        New Document
                                    </MenubarItem>
                                    <MenubarSeparator />
                                    <RenameDialog documentId={data._id} initialTitle={data.title}>
                                        <MenubarItem
                                            onClick={(e) => e.stopPropagation()}
                                            onSelect={(e) => e.preventDefault()}
                                        >
                                            <FilePenIcon className="size-4 mr-2" />
                                            Rename
                                        </MenubarItem>
                                    </RenameDialog>
                                    <RemoveDialog documentId={data._id}>
                                        <MenubarItem
                                            onClick={(e) => e.stopPropagation()}
                                            onSelect={(e) => e.preventDefault()}
                                        >
                                            <TrashIcon className="size-4 mr-2" />
                                            Remove
                                        </MenubarItem>
                                    </RemoveDialog>
                                    <MenubarSeparator />
                                    <MenubarItem onClick={() => window.print()}>
                                        <PrinterIcon className="size-4 mr-2" />
                                        Print <MenubarShortcut>Ctrl P</MenubarShortcut>
                                    </MenubarItem>
                                </MenubarContent>
                            </MenubarMenu>
                            <MenubarMenu>
                                <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                                    Edit
                                </MenubarTrigger>
                                <MenubarContent>
                                    <MenubarItem onClick={() => editor?.chain().focus().undo().run()}>
                                        <Undo2Icon className="size-4 mr-2" />
                                        Undo <MenubarShortcut>Ctrl Z</MenubarShortcut>
                                    </MenubarItem>
                                    <MenubarItem onClick={() => editor?.chain().focus().redo().run()}>
                                        <Redo2Icon className="size-4 mr-2" />
                                        Redo <MenubarShortcut>Ctrl Y</MenubarShortcut>
                                    </MenubarItem>
                                </MenubarContent>
                            </MenubarMenu>
                            <MenubarMenu>
                                <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                                    Insert
                                </MenubarTrigger>
                                <MenubarContent>
                                    <MenubarSub>
                                        <MenubarSubTrigger>Table</MenubarSubTrigger>
                                        <MenubarSubContent>
                                            <MenubarItem onClick={() => insertTable({ rows: 1, cols: 1 })}>
                                                1 x 1
                                            </MenubarItem>
                                            <MenubarItem onClick={() => insertTable({ rows: 2, cols: 2 })}>
                                                2 x 2
                                            </MenubarItem>
                                            <MenubarItem onClick={() => insertTable({ rows: 3, cols: 3 })}>
                                                3 x 3
                                            </MenubarItem>
                                            <MenubarItem onClick={() => insertTable({ rows: 4, cols: 4 })}>
                                                4 x 4
                                            </MenubarItem>
                                        </MenubarSubContent>
                                    </MenubarSub>
                                </MenubarContent>
                            </MenubarMenu>
                            <MenubarMenu>
                                <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                                    Format
                                </MenubarTrigger>
                                <MenubarContent>
                                    <MenubarSub>
                                        <MenubarSubTrigger>
                                            <TextIcon className="size-4 mr-2" />
                                            Text
                                        </MenubarSubTrigger>
                                        <MenubarSubContent>
                                            <MenubarItem onClick={() => editor?.chain().focus().toggleBold().run()}>
                                                <BoldIcon className="size-4 mr-2" />
                                                Bold <MenubarShortcut>Ctrl B</MenubarShortcut>
                                            </MenubarItem>
                                            <MenubarItem onClick={() => editor?.chain().focus().toggleItalic().run()}>
                                                <ItalicIcon className="size-4 mr-2" />
                                                Italic <MenubarShortcut>Ctrl I</MenubarShortcut>
                                            </MenubarItem>
                                            <MenubarItem onClick={() => editor?.chain().focus().toggleUnderline().run()}>
                                                <UnderlineIcon className="size-4 mr-2" />
                                                Underline <MenubarShortcut>Ctrl U</MenubarShortcut>
                                            </MenubarItem>
                                            <MenubarItem onClick={() => editor?.chain().focus().toggleStrike().run()}>
                                                <StrikethroughIcon className="size-4 mr-2" />
                                                Strikethrough&nbsp;&nbsp; <MenubarShortcut>Ctrl S</MenubarShortcut>
                                            </MenubarItem>
                                        </MenubarSubContent>
                                    </MenubarSub>
                                    <MenubarItem onClick={() => editor?.chain().focus().unsetAllMarks().run()}>
                                        <RemoveFormattingIcon className="size-4 mr-2" />
                                        Clear Formatting
                                    </MenubarItem>
                                </MenubarContent>
                            </MenubarMenu>
                            <MenubarMenu>
                                <MenubarTrigger className="text-sm font-normal py-0.5 px-[7px] rounded-sm hover:bg-muted h-auto">
                                    AI Assistant
                                </MenubarTrigger>
                                <MenubarContent>
                                    <MenubarItem onClick={() => setShowAIGenerator(true)}>
                                        <Sparkles className="size-4 mr-2 text-purple-600" />
                                        Generate Document
                                    </MenubarItem>
                                    <MenubarItem onClick={() => toast.info("Select text and right-click to use Ask AI")}>
                                        <Lightbulb className="size-4 mr-2 text-yellow-600" />
                                        AI Help
                                    </MenubarItem>
                                </MenubarContent>
                            </MenubarMenu>
                        </Menubar>
                    </div>
                </div>
            </div>
            <div className="flex gap-3 items-center pl-6">
                {/* Lock/Unlock button */}
                <button
                    type="button"
                    onClick={handleLockUnlock}
                    title={isLocked ? "Unlock paragraph" : "Lock paragraph"}
                    className="p-1.5 rounded hover:bg-muted transition"
                >
                    {isLocked ? <Unlock className="size-5" /> : <Lock className="size-5" />}
                </button>
                {/* Version history button */}
                <button
                    type="button"
                    onClick={handleOpenVersionHistory}
                    title="Open version history"
                    className="p-1.5 rounded hover:bg-muted transition"
                >
                    <Clock className="size-5" />
                </button>
                {/* Chat button */}
                <button
                    type="button"
                    onClick={() => setChatOpen(!chatOpen)}
                    title="Chat"
                    className="p-1.5 rounded hover:bg-muted transition"
                >
                    <MessageSquare className="size-5" />
                </button>
                <ShareDialog documentId={data._id}>
                    <Button className="h-9 px-4 py-2 text-sm font-medium transition">
                        Share
                    </Button>
                </ShareDialog>
                <Avatars />
                <Inbox />
                <UserMenu />
            </div>
            <AIDocumentGenerator
                open={showAIGenerator}
                onClose={() => setShowAIGenerator(false)}
                onInsert={handleInsertAIDocument}
            />
            <ChatPanel
                documentId={data._id}
                isOpen={chatOpen}
                onClose={() => setChatOpen(false)}
                onOpenChat={() => setChatOpen(true)}
            />
        </nav>
    );
};
