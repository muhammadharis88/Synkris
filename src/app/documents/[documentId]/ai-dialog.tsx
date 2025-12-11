"use client";

import { useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface AIDialogProps {
    open: boolean;
    onClose: () => void;
    selectedText?: string;
    onApply: (content: string) => void;
}

export const AIDialog = ({ open, onClose, selectedText, onApply }: AIDialogProps) => {
    const [prompt, setPrompt] = useState("");
    const [aiResponse, setAiResponse] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error("Please enter a prompt");
            return;
        }

        setIsLoading(true);
        setAiResponse("");

        try {
            const response = await fetch("/api/ai-assistant", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    prompt: prompt.trim(),
                    selectedText: selectedText,
                    type: "edit",
                }),
            });

            const data = await response.json();

            if (!data.success) {
                toast.error(data.error || "Failed to generate content");
                return;
            }

            setAiResponse(data.content);
        } catch (error) {
            console.error("AI Error:", error);
            toast.error("Failed to connect to AI service");
        } finally {
            setIsLoading(false);
        }
    };

    const handleApply = () => {
        if (aiResponse) {
            onApply(aiResponse);
            handleClose();
        }
    };

    const handleClose = () => {
        setPrompt("");
        setAiResponse("");
        setIsLoading(false);
        onClose();
    };

    // Quick action prompts
    const quickPrompts = [
        "Make this more professional",
        "Simplify this",
        "Expand on this",
        "Fix grammar and spelling",
        "Make it more concise",
    ];

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="size-5 text-purple-600" />
                        Ask AI
                    </DialogTitle>
                    <DialogDescription>
                        Tell AI what you want to do with the selected text
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Selected Text (Read-only) */}
                    {selectedText && (
                        <div>
                            <Label className="text-sm font-medium">Selected Text</Label>
                            <div className="mt-1.5 p-3 bg-muted rounded-md text-sm max-h-32 overflow-y-auto">
                                {selectedText}
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div>
                        <Label className="text-sm font-medium mb-2 block">Quick Actions</Label>
                        <div className="flex flex-wrap gap-2">
                            {quickPrompts.map((quickPrompt) => (
                                <Button
                                    key={quickPrompt}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPrompt(quickPrompt)}
                                    disabled={isLoading}
                                >
                                    {quickPrompt}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Prompt Input */}
                    <div>
                        <Label htmlFor="prompt">What would you like to do?</Label>
                        <Textarea
                            id="prompt"
                            placeholder="E.g., Make this more formal, Rephrase this, Translate to Spanish..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={isLoading}
                            className="mt-1.5 min-h-[80px]"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                    handleGenerate();
                                }
                            }}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Press Ctrl+Enter to generate
                        </p>
                    </div>

                    {/* Generate Button */}
                    <Button
                        onClick={handleGenerate}
                        disabled={isLoading || !prompt.trim()}
                        className="w-full"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="size-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles className="size-4 mr-2" />
                                Generate
                            </>
                        )}
                    </Button>

                    {/* AI Response */}
                    {aiResponse && (
                        <div>
                            <Label className="text-sm font-medium">AI Response</Label>
                            <div className="mt-1.5 p-3 bg-green-50 border border-green-200 rounded-md text-sm max-h-64 overflow-y-auto">
                                {aiResponse}
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleApply}
                        disabled={!aiResponse || isLoading}
                        className="bg-green-600 hover:bg-green-700"
                    >
                        Apply Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
