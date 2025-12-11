"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { X, MessageSquare, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { MessageItem } from "./message-item";
import { MessageInput } from "./message-input";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
    documentId: Id<"documents">;
    isOpen: boolean;
    onClose: () => void;
    onOpenChat?: () => void; // Callback to open chat from notification
}

export const ChatPanel = ({ documentId, isOpen, onClose, onOpenChat }: ChatPanelProps) => {
    const { user } = useUser();
    const currentUser = useQuery(api.auth.getCurrentUser); // Get tokenIdentifier from Convex
    const messages = useQuery(api.messages.getMessages, { documentId });
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [prevMessageCount, setPrevMessageCount] = useState(0);
    const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

    // Auto-scroll to bottom when new messages arrive or chat opens
    useEffect(() => {
        if (messages && messages.length > 0) {
            // Use a small timeout to ensure DOM is ready, especially when opening
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }
    }, [messages, isOpen]);

    // Request notification permission on first mount
    useEffect(() => {
        if (!hasRequestedPermission && "Notification" in window) {
            if (Notification.permission === "default") {
                Notification.requestPermission();
            }
            setHasRequestedPermission(true);
        }
    }, [hasRequestedPermission]);

    // Show notification for new messages
    useEffect(() => {
        if (!messages || messages.length === 0) return;

        // Initialize previous count on first load
        if (prevMessageCount === 0) {
            setPrevMessageCount(messages.length);
            return;
        }

        // Check if there's a new message
        if (messages.length > prevMessageCount) {
            const latestMessage = messages[messages.length - 1];

            // Only notify if message is from someone else
            // Compare using the tokenIdentifier from Convex auth
            if (currentUser && latestMessage.userId !== currentUser.tokenIdentifier) {
                // Toast notification with click to open chat
                const handleToastClick = () => {
                    if (onOpenChat) {
                        onOpenChat();
                    }
                    // Scroll to latest message
                    setTimeout(() => {
                        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                    }, 300);
                };

                toast(
                    <div onClick={handleToastClick} className="cursor-pointer">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="size-4" />
                            <span className="font-medium">{latestMessage.userName}</span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {latestMessage.content}
                        </p>
                    </div>,
                    {
                        duration: 5000,
                        className: "cursor-pointer hover:bg-accent",
                    }
                );

                // Browser notification
                if ("Notification" in window && Notification.permission === "granted" && !isOpen) {
                    const notification = new Notification("New message in chat", {
                        body: `${latestMessage.userName}: ${latestMessage.content}`,
                        icon: latestMessage.userAvatar || "/logo.svg",
                        tag: `chat-${documentId}`,
                    });

                    notification.onclick = () => {
                        window.focus();
                        if (onOpenChat) {
                            onOpenChat();
                        }
                        notification.close();
                    };
                }
            }

            setPrevMessageCount(messages.length);
        }
    }, [messages, prevMessageCount, currentUser, documentId, isOpen, onOpenChat]);

    if (!isOpen) return null;

    const isLoading = messages === undefined;

    return (
        <>
            {/* Backdrop for mobile */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity",
                    isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Chat Panel */}
            <div
                className={cn(
                    "fixed right-0 top-0 h-full bg-background border-l shadow-lg z-50 flex flex-col",
                    "transition-transform duration-300 ease-in-out",
                    "w-full md:w-[380px]",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
            >
                {/* Header */}
                <div className="p-4 border-b flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <MessageSquare className="size-5 text-primary" />
                        <h2 className="font-semibold">Chat</h2>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="size-8"
                    >
                        <X className="size-4" />
                    </Button>
                </div>

                {/* Messages Area */}
                <ScrollArea className="flex-1 p-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-muted-foreground">
                                <MessageSquare className="size-8 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Loading messages...</p>
                            </div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center text-muted-foreground max-w-[200px]">
                                <MessageSquare className="size-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm font-medium mb-1">No messages yet</p>
                                <p className="text-xs">Start a conversation with your collaborators</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            {messages.map((message) => (
                                <MessageItem
                                    key={message._id}
                                    message={message}
                                    isOwnMessage={currentUser ? message.userId === currentUser.tokenIdentifier : false}
                                />
                            ))}
                            {/* Scroll anchor */}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </ScrollArea>

                <Separator />

                {/* Message Input */}
                <MessageInput
                    documentId={documentId}
                    onMessageSent={() => {
                        // Auto-scroll after sending
                        setTimeout(() => {
                            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
                        }, 100);
                    }}
                />
            </div>
        </>
    );
};
