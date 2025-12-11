import { Eye, MessageSquare, Pencil } from "lucide-react";

export enum eRoles {
    Viewer = "viewer",
    Commenter = "commenter",
    Editor = "editor",
}

interface RoleIndicatorProps {
    role: eRoles;
    isOwner?: boolean;
}

export const RoleIndicator = ({ role, isOwner }: RoleIndicatorProps) => {
    // Don't show badge if user is owner
    if (isOwner) {
        return null;
    }

    const roleConfig = {
        viewer: {
            icon: Eye,
            text: "Viewing",
            bgColor: "bg-blue-50",
            textColor: "text-blue-700",
            borderColor: "border-blue-200",
        },
        commenter: {
            icon: MessageSquare,
            text: "Can comment",
            bgColor: "bg-purple-50",
            textColor: "text-purple-700",
            borderColor: "border-purple-200",
        },
        editor: {
            icon: Pencil,
            text: "Can edit",
            bgColor: "bg-green-50",
            textColor: "text-green-700",
            borderColor: "border-green-200",
        },
    };

    const config = roleConfig[role];
    const Icon = config.icon;

    return (
        <div
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border ${config.bgColor} ${config.textColor} ${config.borderColor}`}
            title={`You have ${role} access to this document`}
        >
            <Icon className="size-3.5" />
            <span className="text-xs font-medium">{config.text}</span>
        </div>
    );
};
