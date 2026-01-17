-- Add new columns to sessions table for enhanced tracking
ALTER TABLE public.sessions 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS biometrics_data JSONB,
ADD COLUMN IF NOT EXISTS emotion_summary JSONB,
ADD COLUMN IF NOT EXISTS crisis_phrases JSONB,
ADD COLUMN IF NOT EXISTS questions_answers JSONB,
ADD COLUMN IF NOT EXISTS session_status TEXT DEFAULT 'completed',
ADD COLUMN IF NOT EXISTS follow_up_session_id UUID REFERENCES public.sessions(id),
ADD COLUMN IF NOT EXISTS is_follow_up BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS audio_url TEXT;

-- Add index for follow-up queries
CREATE INDEX IF NOT EXISTS idx_sessions_patient_date ON public.sessions(patient_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_follow_up ON public.sessions(follow_up_session_id) WHERE follow_up_session_id IS NOT NULL;

-- Create storage bucket for session recordings
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('session-recordings', 'session-recordings', false, 104857600)
ON CONFLICT (id) DO NOTHING;

-- RLS policy for session recordings
CREATE POLICY "Users can upload session recordings" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'session-recordings' AND auth.role() = 'authenticated');

CREATE POLICY "Users can view session recordings" ON storage.objects
FOR SELECT USING (bucket_id = 'session-recordings' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their session recordings" ON storage.objects
FOR DELETE USING (bucket_id = 'session-recordings' AND auth.role() = 'authenticated');