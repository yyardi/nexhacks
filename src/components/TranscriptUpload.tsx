import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TranscriptUploadProps {
  onUpload: (transcript: string) => Promise<void>;
  isProcessing: boolean;
}

export const TranscriptUpload = ({ onUpload, isProcessing }: TranscriptUploadProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [transcriptText, setTranscriptText] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const validTypes = ['text/plain', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    
    if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
      const text = await file.text();
      setTranscriptText(text);
    } else {
      toast({
        variant: "destructive",
        title: "Unsupported File Type",
        description: "Please upload a .txt file or paste your transcript directly.",
      });
    }
  };

  const handleSubmit = async () => {
    if (!transcriptText.trim()) {
      toast({
        variant: "destructive",
        title: "No Transcript",
        description: "Please paste or upload a transcript first.",
      });
      return;
    }

    setIsUploading(true);
    try {
      await onUpload(transcriptText);
      setIsOpen(false);
      setTranscriptText('');
      toast({
        title: "Transcript Uploaded",
        description: "Analysis is now running on your transcript.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Upload Failed",
        description: "Failed to process transcript. Please try again.",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="gap-2">
          <Upload className="h-5 w-5" />
          Upload Transcript
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Existing Transcript
          </DialogTitle>
          <DialogDescription>
            Paste or upload a transcript from a previous session. The AI will analyze it 
            the same way it analyzes live recordings.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".txt"
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isProcessing}
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload .txt File
            </Button>
          </div>

          <Textarea
            placeholder="Or paste your transcript here...

Example format:
Patient: I've been feeling really down lately, can't seem to get out of bed.
Clinician: How long have you been experiencing these symptoms?
Patient: About three weeks now. It started after I lost my job..."
            value={transcriptText}
            onChange={(e) => setTranscriptText(e.target.value)}
            className="min-h-[300px] font-mono text-sm"
            disabled={isUploading || isProcessing}
          />

          <div className="text-sm text-muted-foreground">
            <p><strong>Tip:</strong> Include speaker labels (Patient:, Clinician:, etc.) for better analysis.</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isUploading || isProcessing || !transcriptText.trim()}>
            {isUploading || isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <FileText className="h-4 w-4 mr-2" />
                Analyze Transcript
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
