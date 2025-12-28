"use client";

import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MessageItemProps {
    message: {
        _id: string;
        userId: string;
        userName: string;
        userAvatar?: string;
        content: string;
        timestamp: number;
    };
    isOwnMessage: boolean;
}

export const MessageItem = ({ message, isOwnMessage }: MessageItemProps) => {
    const initials = message.userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

    return (
        <div
            className={cn(
                "flex gap-2 mb-4",
                isOwnMessage ? "flex-row-reverse" : "flex-row"
            )}
        >
            {/* Avatar */}
            {!isOwnMessage && (
                <Avatar className="size-8 flex-shrink-0">
                    <AvatarImage src={message.userAvatar} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
            )}

            {/* Message Content */}
            <div className={cn("flex flex-col", isOwnMessage ? "items-end" : "items-start")}>
                {/* Name and Time */}
                {!isOwnMessage && (
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-foreground">
                            {message.userName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                        </span>
                    </div>
                )}

                {/* Message Bubble */}
                <div
                    className={cn(
                        "px-3 py-2 rounded-lg max-w-[280px] break-words",
                        isOwnMessage
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                    )}
                >
                    <p className="text-sm">{message.content}</p>
                </div>

                {/* Time for own messages */}
                {isOwnMessage && (
                    <span className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(message.timestamp, { addSuffix: true })}
                    </span>
                )}
            </div>
        </div>
    );
};
