"use client";

import { useState, useRef, KeyboardEvent } from "react";
import { useMutation } from "convex/react";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

interface MessageInputProps {
    documentId: Id<"documents">;
    onMessageSent?: () => void;
}

export const MessageInput = ({ documentId, onMessageSent }: MessageInputProps) => {
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const sendMessage = useMutation(api.messages.sendMessage);

    const handleSend = async () => {
        if (!message.trim() || isLoading) return;

        setIsLoading(true);

        try {
            await sendMessage({
                documentId,
                content: message.trim(),
            });

            setMessage("");
            onMessageSent?.();

            // Reset textarea height
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        } catch (error: any) {
            console.error("Failed to send message:", error);
            toast.error(error.message || "Failed to send message");
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);

        // Auto-resize textarea
        const textarea = e.target;
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    };

    const charCount = message.length;
    const maxChars = 500;
    const isOverLimit = charCount > maxChars;

    return (
        <div className="border-t p-4 bg-background">
            <div className="flex gap-2">
                <Textarea
                    ref={textareaRef}
                    value={message}
                    onChange={handleTextareaChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                    className="min-h-[40px] max-h-[120px] resize-none"
                    disabled={isLoading}
                />
                <Button
                    onClick={handleSend}
                    disabled={!message.trim() || isLoading || isOverLimit}
                    size="icon"
                    className="flex-shrink-0"
                >
                    {isLoading ? (
                        <Loader2 className="size-4 animate-spin" />
                    ) : (
                        <Send className="size-4" />
                    )}
                </Button>
            </div>

            {/* Character count */}
            <div className="flex justify-end mt-1">
                <span className={`text-xs ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                    {charCount}/{maxChars}
                </span>
            </div>
        </div>
    );
};
