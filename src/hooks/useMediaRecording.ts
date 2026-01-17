import { useState, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface RecordingData {
  audioBlob: Blob | null;
  videoBlob: Blob | null;
  audioUrl: string | null;
  videoUrl: string | null;
}

export const useMediaRecording = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingData, setRecordingData] = useState<RecordingData>({
    audioBlob: null,
    videoBlob: null,
    audioUrl: null,
    videoUrl: null
  });

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async (
    audioStream: MediaStream,
    videoStream?: MediaStream
  ) => {
    audioChunksRef.current = [];
    videoChunksRef.current = [];

    try {
      // Audio recording
      const audioRecorder = new MediaRecorder(audioStream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      audioRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current = audioRecorder;
      audioRecorder.start(1000); // Collect data every second

      // Video recording if stream provided
      if (videoStream) {
        streamRef.current = videoStream;
        const videoRecorder = new MediaRecorder(videoStream, {
          mimeType: 'video/webm;codecs=vp9'
        });

        videoRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            videoChunksRef.current.push(e.data);
          }
        };

        videoRecorderRef.current = videoRecorder;
        videoRecorder.start(1000);
      }

      setIsRecording(true);
      console.log('Media recording started');
    } catch (error) {
      console.error('Failed to start media recording:', error);
      throw error;
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<RecordingData> => {
    return new Promise((resolve) => {
      let audioBlob: Blob | null = null;
      let videoBlob: Blob | null = null;
      let resolvedCount = 0;
      const expectedCount = videoRecorderRef.current ? 2 : 1;

      const checkComplete = () => {
        resolvedCount++;
        if (resolvedCount === expectedCount) {
          const data: RecordingData = {
            audioBlob,
            videoBlob,
            audioUrl: null,
            videoUrl: null
          };
          setRecordingData(data);
          setIsRecording(false);
          resolve(data);
        }
      };

      // Stop audio
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.onstop = () => {
          audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          audioChunksRef.current = [];
          console.log('Audio recording stopped, size:', audioBlob.size);
          checkComplete();
        };
        mediaRecorderRef.current.stop();
      } else {
        checkComplete();
      }

      // Stop video
      if (videoRecorderRef.current && videoRecorderRef.current.state !== 'inactive') {
        videoRecorderRef.current.onstop = () => {
          videoBlob = new Blob(videoChunksRef.current, { type: 'video/webm' });
          videoChunksRef.current = [];
          console.log('Video recording stopped, size:', videoBlob.size);
          checkComplete();
        };
        videoRecorderRef.current.stop();
      }

      // Stop stream tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    });
  }, []);

  const uploadToStorage = useCallback(async (
    audioBlob: Blob | null,
    videoBlob: Blob | null,
    sessionId: string
  ): Promise<{ audioUrl: string | null; videoUrl: string | null }> => {
    let audioUrl: string | null = null;
    let videoUrl: string | null = null;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Upload audio
    if (audioBlob && audioBlob.size > 0) {
      const audioPath = `${user.id}/${sessionId}/audio.webm`;
      const { error: audioError } = await supabase.storage
        .from('session-recordings')
        .upload(audioPath, audioBlob, {
          contentType: 'audio/webm',
          upsert: true
        });

      if (audioError) {
        console.error('Audio upload error:', audioError);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('session-recordings')
          .getPublicUrl(audioPath);
        audioUrl = publicUrl;
        console.log('Audio uploaded:', audioUrl);
      }
    }

    // Upload video
    if (videoBlob && videoBlob.size > 0) {
      const videoPath = `${user.id}/${sessionId}/video.webm`;
      const { error: videoError } = await supabase.storage
        .from('session-recordings')
        .upload(videoPath, videoBlob, {
          contentType: 'video/webm',
          upsert: true
        });

      if (videoError) {
        console.error('Video upload error:', videoError);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('session-recordings')
          .getPublicUrl(videoPath);
        videoUrl = publicUrl;
        console.log('Video uploaded:', videoUrl);
      }
    }

    return { audioUrl, videoUrl };
  }, []);

  return {
    isRecording,
    recordingData,
    startRecording,
    stopRecording,
    uploadToStorage
  };
};
