"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PlagiarismDialogProps {
    open: boolean;
    onClose: () => void;
    text: string;
}

interface SourceDetail {
    source: string;
    title: string;
    description: string;
}

export const PlagiarismDialog = ({ open, onClose, text }: PlagiarismDialogProps) => {
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<{
        score: number;
        analysis: string;
        details: SourceDetail[];
        isUnique?: boolean;
        totalMatches?: number;
    } | null>(null);

    const handleCheck = async () => {
        setIsLoading(true);
        setResult(null);

        try {
            const response = await fetch("/api/plagiarism-check", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ text }),
            });

            const data = await response.json();

            if (!data.success) {
                toast.error(data.error || "Failed to check plagiarism");
                return;
            }

            setResult({
                score: data.score,
                analysis: data.analysis,
                details: data.details || [],
                isUnique: data.isUnique,
                totalMatches: data.totalMatches
            });
        } catch (error) {
            console.error("Plagiarism Check Error:", error);
            toast.error("Failed to connect to plagiarism service");
        } finally {
            setIsLoading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score < 10) return "text-green-600";
        if (score < 30) return "text-yellow-600";
        return "text-red-600";
    };

    const getScoreLabel = (score: number) => {
        if (score < 10) return "Safe";
        if (score < 30) return "Warning";
        return "High Risk";
    };

    const handleClose = () => {
        setResult(null);
        onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShieldCheck className="size-5 text-blue-600" />
                        Plagiarism Checker
                    </DialogTitle>
                </DialogHeader>

                <div className="py-4 overflow-y-auto max-h-[calc(85vh-140px)]">
                    {!result && !isLoading && (
                        <div className="text-center space-y-4">
                            <ShieldCheck className="size-16 mx-auto text-muted-foreground/50" />
                            <div>
                                <h3 className="font-medium text-lg">Ready to scan</h3>
                                <p className="text-sm text-muted-foreground">
                                    Analyze your document for potential plagiarism against online sources.
                                </p>
                            </div>
                            <Button onClick={handleCheck} className="w-full">
                                Start Scan
                            </Button>
                        </div>
                    )}

                    {isLoading && (
                        <div className="text-center py-8 space-y-4">
                            <Loader2 className="size-10 mx-auto animate-spin text-blue-600" />
                            <p className="text-sm text-muted-foreground">Scanning document...</p>
                        </div>
                    )}

                    {result && (
                        <div className="space-y-6">
                            <div className="text-center">
                                <span className={`text-4xl font-bold ${getScoreColor(result.score)}`}>
                                    {result.score}%
                                </span>
                                <p className="text-sm font-medium text-muted-foreground mt-1">
                                    Similarity Score ({getScoreLabel(result.score)})
                                </p>
                            </div>

                            <Progress value={result.score} className="h-2" />

                            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                                <h4 className="font-medium text-sm flex items-center gap-2">
                                    {result.isUnique ? (
                                        <CheckCircle className="size-4 text-green-500" />
                                    ) : (
                                        <AlertTriangle className="size-4 text-yellow-500" />
                                    )}
                                    Analysis
                                </h4>
                                <p className="text-sm text-muted-foreground break-words">
                                    {result.analysis}
                                </p>
                            </div>

                            {result.details && result.details.length > 0 && (
                                <div className="space-y-2">
                                    <h4 className="font-medium text-sm">Matched Sources ({result.totalMatches || result.details.length})</h4>
                                    <div className="h-[180px] rounded-md border overflow-hidden">
                                        <ScrollArea className="h-full p-4">
                                            <div className="space-y-3 pr-4">
                                                {result.details.map((detail: SourceDetail, i: number) => (
                                                    <div key={i} className="border-b pb-3 last:border-b-0">
                                                        <div className="space-y-2">
                                                            <h5 className="font-medium text-sm break-words overflow-hidden">
                                                                {detail.title}
                                                            </h5>
                                                            {detail.description && (
                                                                <p className="text-xs text-muted-foreground line-clamp-2 break-words overflow-hidden">
                                                                    {detail.description}
                                                                </p>
                                                            )}
                                                            <a
                                                                href={detail.source}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="text-xs text-blue-600 hover:underline block truncate overflow-hidden"
                                                                title={detail.source}
                                                            >
                                                                {detail.source}
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </ScrollArea>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={handleClose}>
                        Close
                    </Button>
                    {result && (
                        <Button onClick={handleCheck} variant="outline">
                            Scan Again
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
