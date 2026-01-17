import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileAudio, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AudioUploadProps {
  onTranscriptReady: (transcript: string) => void;
  isProcessing: boolean;
}

export const AudioUpload = ({ onTranscriptReady, isProcessing }: AudioUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/m4a', 'audio/mp4'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please upload an MP3, WAV, or M4A audio file.'
      });
      return;
    }

    // Check file size (max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Maximum file size is 25MB.'
      });
      return;
    }

    setFileName(file.name);
    setIsUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        
        // Send to edge function for transcription
        const { data, error } = await supabase.functions.invoke('transcribe-audio-file', {
          body: { 
            audio: base64,
            filename: file.name,
            contentType: file.type
          }
        });

        if (error) throw error;

        if (data?.transcript) {
          onTranscriptReady(data.transcript);
          toast({
            title: 'Audio Transcribed',
            description: `Successfully transcribed ${file.name}`
          });
        } else {
          throw new Error('No transcript returned');
        }
      };

      reader.onerror = () => {
        throw new Error('Failed to read file');
      };

      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error('Audio transcription error:', error);
      toast({
        variant: 'destructive',
        title: 'Transcription Failed',
        description: error.message || 'Failed to transcribe audio file'
      });
    } finally {
      setIsUploading(false);
      setFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/m4a,audio/mp4"
        className="hidden"
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading || isProcessing}
      >
        {isUploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Transcribing...
          </>
        ) : (
          <>
            <FileAudio className="h-4 w-4 mr-2" />
            Upload Audio
          </>
        )}
      </Button>
      {fileName && (
        <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
      )}
    </div>
  );
};
