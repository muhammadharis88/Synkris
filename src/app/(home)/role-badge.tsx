"use client";

import { Eye, MessageSquare, Pencil } from "lucide-react";

interface RoleBadgeProps {
    role: "viewer" | "commenter" | "editor";
}

export const RoleBadge = ({ role }: RoleBadgeProps) => {
    const roleConfig = {
        viewer: {
            icon: Eye,
            text: "Viewer",
            color: "text-blue-600",
        },
        commenter: {
            icon: MessageSquare,
            text: "Commenter",
            color: "text-purple-600",
        },
        editor: {
            icon: Pencil,
            text: "Editor",
            color: "text-green-600",
        },
    };

    const config = roleConfig[role];
    const Icon = config.icon;

    return (
        <div className="flex items-center gap-1.5 text-muted-foreground">
            <Icon className="size-3.5" />
            <span className="text-xs">{config.text}</span>
        </div>
    );
};
