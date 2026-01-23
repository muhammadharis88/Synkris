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
    mode?: "edit" | "continue" | "expand";
    context?: string; // Surrounding content for context
}

export const AIDialog = ({ open, onClose, selectedText, onApply, mode = "edit", context }: AIDialogProps) => {
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
                    type: mode,
                    context: context,
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

    // Mode-specific quick action prompts
    const getQuickPrompts = () => {
        if (mode === "continue") {
            return [
                "Continue writing naturally",
                "Add more details",
                "Provide examples",
                "Write a conclusion",
                "Expand on this topic",
            ];
        } else if (mode === "expand") {
            return [
                "Add more details and examples",
                "Explain this in depth",
                "Provide supporting evidence",
                "Add relevant examples",
                "Elaborate further",
            ];
        } else {
            // edit mode
            return [
                "Make this more professional",
                "Simplify this",
                "Expand on this",
                "Fix grammar and spelling",
                "Make it more concise",
            ];
        }
    };

    const quickPrompts = getQuickPrompts();

    // Mode-specific titles and descriptions
    const getDialogTitle = () => {
        if (mode === "continue") return "Continue Writing";
        if (mode === "expand") return "Expand Content";
        return "Ask AI";
    };

    const getDialogDescription = () => {
        if (mode === "continue") return "AI will continue writing from where you left off";
        if (mode === "expand") return "AI will expand on the selected text with more details";
        return "Tell AI what you want to do with the selected text";
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="size-5 text-purple-600" />
                        {getDialogTitle()}
                    </DialogTitle>
                    <DialogDescription>
                        {getDialogDescription()}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Selected Text or Context (Read-only) */}
                    {(selectedText || context) && mode !== "continue" && (
                        <div>
                            <Label className="text-sm font-medium">
                                {mode === "expand" ? "Text to Expand" : "Selected Text"}
                            </Label>
                            <div className="mt-1.5 p-3 bg-muted rounded-md text-sm max-h-32 overflow-y-auto">
                                {selectedText || context}
                            </div>
                        </div>
                    )}

                    {/* Show context for continue mode */}
                    {mode === "continue" && context && (
                        <div>
                            <Label className="text-sm font-medium">Current Content</Label>
                            <div className="mt-1.5 p-3 bg-muted rounded-md text-sm max-h-32 overflow-y-auto">
                                {context}
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
