"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";

interface Message {
    _id: string;
    userId: string;
    userName: string;
    timestamp: number;
    content: string;
}

interface UseChatNotificationsReturn {
    unreadCount: number;
    markAsRead: () => void;
    lastReadTimestamp: number;
}

export const useChatNotifications = (
    documentId: Id<"documents">,
    messages: Message[] | undefined,
    isOpen: boolean
): UseChatNotificationsReturn => {
    const currentUser = useQuery(api.auth.getCurrentUser);
    const [lastReadTimestamp, setLastReadTimestamp] = useState<number>(Date.now());
    const [unreadCount, setUnreadCount] = useState(0);

    // Storage key for last read timestamp
    const storageKey = `chat-last-read-${documentId}`;

    // Load last read timestamp from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
            setLastReadTimestamp(parseInt(stored));
        }
    }, [storageKey]);

    // Calculate unread count
    useEffect(() => {
        if (!messages || !currentUser) {
            setUnreadCount(0);
            return;
        }

        // Count messages newer than lastReadTimestamp that aren't from current user
        const unread = messages.filter(
            (msg) => msg.timestamp > lastReadTimestamp && msg.userId !== currentUser.tokenIdentifier
        ).length;

        setUnreadCount(unread);
    }, [messages, lastReadTimestamp, currentUser]);

    // Mark all as read when chat is opened
    useEffect(() => {
        if (isOpen && messages && messages.length > 0) {
            const latestTimestamp = Math.max(...messages.map((m) => m.timestamp));
            setLastReadTimestamp(latestTimestamp);
            localStorage.setItem(storageKey, latestTimestamp.toString());
            setUnreadCount(0);
        }
    }, [isOpen, messages, storageKey]);

    // Mark as read function (called when user views chat)
    const markAsRead = () => {
        if (!messages || messages.length === 0) return;

        const latestTimestamp = Math.max(...messages.map((m) => m.timestamp));
        setLastReadTimestamp(latestTimestamp);
        localStorage.setItem(storageKey, latestTimestamp.toString());
        setUnreadCount(0);
    };

    return {
        unreadCount,
        markAsRead,
        lastReadTimestamp,
    };
};
