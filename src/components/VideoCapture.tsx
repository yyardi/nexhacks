import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera } from 'lucide-react';

interface VideoCaptureProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isRecording: boolean;
  onStream?: (stream: MediaStream | null) => void;
}

export const VideoCapture = ({ videoRef, isRecording, onStream }: VideoCaptureProps) => {
  const [hasPermission, setHasPermission] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);

  const startCamera = async () => {
    try {
      console.log('🎥 Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      });

      console.log('✅ Camera access granted, stream:', stream.id);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        console.log('📹 Video element srcObject set');

        videoRef.current.onloadedmetadata = () => {
          console.log('✅ Video metadata loaded:', {
            width: videoRef.current!.videoWidth,
            height: videoRef.current!.videoHeight,
            readyState: videoRef.current!.readyState
          });
        };

        try {
          await videoRef.current.play();
          console.log('▶️ Video playing');
        } catch (playError) {
          console.error('❌ Play error:', playError);
        }
      }

      setHasPermission(true);
      onStream?.(stream);
      console.log('🎬 Camera fully initialized');
    } catch (error) {
      console.error('❌ Camera error:', error);
      onStream?.(null);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => {
        console.log('Stopping track:', track.kind);
        track.stop();
      });
      videoRef.current.srcObject = null;
      onStream?.(null);
    }
    setHasPermission(false);
    console.log('📷 Camera stopped');
  };

  useEffect(() => {
    if (isRecording && !hasPermission) {
      setShowConsentModal(true);
    } else if (!isRecording && hasPermission) {
      stopCamera();
    }
  }, [isRecording, hasPermission]);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <>
      <Dialog open={showConsentModal} onOpenChange={setShowConsentModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Camera Access Required</DialogTitle>
            <DialogDescription>
              This application uses facial analysis to detect behavioral patterns during psychiatric interviews. 
              Your video is processed locally and never stored or transmitted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConsentModal(false)}>
              Decline
            </Button>
            <Button onClick={() => {
              setShowConsentModal(false);
              startCamera();
            }}>
              <Camera className="h-4 w-4 mr-2" />
              Allow Camera
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="relative rounded-lg overflow-hidden bg-black" style={{ width: '320px', height: '240px' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-cover transform scale-x-[-1]"
          style={{ display: hasPermission ? 'block' : 'none' }}
        />
        {!hasPermission && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <Camera className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Camera access required</p>
            </div>
          </div>
        )}
        {isRecording && hasPermission && (
          <div className="absolute top-2 right-2 flex items-center gap-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-semibold">
            <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            REC
          </div>
        )}
      </div>
    </>
  );
};
