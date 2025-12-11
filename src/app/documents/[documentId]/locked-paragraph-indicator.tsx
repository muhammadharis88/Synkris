"use client";

import { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { getUserInfo } from "./actions";

interface LockedParagraph {
    _id: string;
    documentId: string;
    position: number;
    length: number;
    lockedBy: string;
    lockedAt: number;
}

interface LockedParagraphIndicatorProps {
    editor: Editor | null;
    lockedParagraphs: LockedParagraph[];
}

export const LockedParagraphIndicator = ({
    editor,
    lockedParagraphs,
}: LockedParagraphIndicatorProps) => {
    // Decorations and click popup are handled by the TipTap extension now.
    // Keep this component as a no-op to avoid DOM injection into the editor content.
    return null;
};

