import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { useToast } from '@/hooks/use-toast';
import { SessionReport } from '@/components/SessionReport';
import { SessionInsightsPanel } from '@/components/SessionInsightsPanel';
import { CrisisHighlighter } from '@/components/CrisisHighlighter';
import { BiometricsChart } from '@/components/BiometricsChart';
import { EmotionTimelineStrips } from '@/components/EmotionTimelineStrips';
import { 
  ArrowLeft, Calendar, FileText, User, AlertTriangle, Shield, Brain, 
  Pill, Play, Pause, Volume2, Video, Clock, ChevronRight, Edit,
  Plus, Activity, Heart
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface SessionData {
  id: string;
  session_date: string;
  chief_complaint: string;
  clinician_name: string;
  safety_assessment: any;
  differential_diagnosis: any;
  full_transcript: string;
  speech_metrics: any;
  biometrics_data: any;
  emotion_summary: any;
  crisis_phrases: any;
  questions_answers: any;
  duration_seconds: number;
  audio_url: string;
  video_url: string;
  session_status: string;
  is_follow_up: boolean;
  follow_up_session_id: string;
  session_notes: any;
  critical_questions: string[];
  assessment_tools_recommended: string[];
  patient_id: string;
  patients: {
    id: string;
    name: string;
    date_of_birth: string;
    gender: string;
    medical_record_number: string;
  };
}

interface RelatedSession {
  id: string;
  session_date: string;
  chief_complaint: string;
  is_follow_up: boolean;
}

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [relatedSessions, setRelatedSessions] = useState<RelatedSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [syncedBiometricIndex, setSyncedBiometricIndex] = useState<number | null>(null);

  const [audioPlaybackUrl, setAudioPlaybackUrl] = useState<string | null>(null);
  const [videoPlaybackUrl, setVideoPlaybackUrl] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (id) fetchSession();
  }, [id]);

  const fetchSession = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('sessions')
        .select(`
          *,
          patients (
            id,
            name,
            date_of_birth,
            gender,
            medical_record_number
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setSession(data);

      // Resolve private storage paths to signed URLs for playback
      const resolveMediaUrl = async (maybePath: string | null | undefined) => {
        if (!maybePath) return null;
        if (maybePath.startsWith('http://') || maybePath.startsWith('https://')) return maybePath;
        const { data: signed, error: signErr } = await supabase.storage
          .from('session-recordings')
          .createSignedUrl(maybePath, 60 * 60); // 1 hour
        if (signErr) {
          console.error('Signed URL error:', signErr);
          return null;
        }
        return signed.signedUrl;
      };

      const [aUrl, vUrl] = await Promise.all([
        resolveMediaUrl(data.audio_url),
        resolveMediaUrl(data.video_url),
      ]);
      setAudioPlaybackUrl(aUrl);
      setVideoPlaybackUrl(vUrl);

      // Fetch related sessions for the same patient
      if (data.patient_id) {
        const { data: related } = await supabase
          .from('sessions')
          .select('id, session_date, chief_complaint, is_follow_up')
          .eq('patient_id', data.patient_id)
          .neq('id', id)
          .order('session_date', { ascending: false })
          .limit(10);
        
        setRelatedSessions(related || []);
      }

      // Set duration if available
      if (data.duration_seconds) {
        setDuration(data.duration_seconds);
      }

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading session",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Sync biometrics with media playback time
  useEffect(() => {
    if (!session?.biometrics_data || currentTime === 0) {
      setSyncedBiometricIndex(null);
      return;
    }

    const biometricsArray = Array.isArray(session.biometrics_data) 
      ? session.biometrics_data 
      : session.biometrics_data?.snapshots || [];

    if (biometricsArray.length === 0) return;

    // Find the biometric snapshot closest to current playback time
    const sessionStartTime = biometricsArray[0]?.timestamp || 0;
    const currentMs = currentTime * 1000;
    
    let closestIndex = 0;
    let closestDiff = Infinity;
    
    biometricsArray.forEach((b: any, i: number) => {
      const elapsed = (b.timestamp - sessionStartTime);
      const diff = Math.abs(elapsed - currentMs);
      if (diff < closestDiff) {
        closestDiff = diff;
        closestIndex = i;
      }
    });

    setSyncedBiometricIndex(closestIndex);
  }, [currentTime, session?.biometrics_data]);

  const handlePlayPause = () => {
    const media = videoRef.current || audioRef.current;
    if (media) {
      if (isPlaying) {
        media.pause();
      } else {
        media.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (value: number[]) => {
    const time = (value[0] / 100) * duration;
    setCurrentTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const handleTimeUpdate = () => {
    const media = videoRef.current || audioRef.current;
    if (media) {
      setCurrentTime(media.currentTime);
    }
  };

  const formatDuration = (seconds: number) => {
    if (!isFinite(seconds) || isNaN(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRiskBadge = (assessment: any) => {
    if (!assessment?.suicide_risk_level) return null;
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      'Low': 'secondary',
      'Moderate': 'default',
      'High': 'destructive',
      'Imminent': 'destructive'
    };
    return (
      <Badge variant={variants[assessment.suicide_risk_level] || 'default'} className="text-sm">
        {assessment.suicide_risk_level} Risk
      </Badge>
    );
  };

  const startFollowUp = () => {
    // Navigate to dashboard with patient pre-selected for follow-up
    navigate(`/dashboard?followUp=${session?.id}&patientId=${session?.patient_id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Session not found</h2>
          <Button onClick={() => navigate('/sessions')}>Back to Sessions</Button>
        </Card>
      </div>
    );
  }

  // Parse biometrics data for charts
  const biometricsArray = Array.isArray(session.biometrics_data) 
    ? session.biometrics_data 
    : session.biometrics_data?.snapshots || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/10 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Sessions
            </Button>
            <div className="border-l pl-4">
              <h1 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                {session.patients?.name || 'Unknown Patient'}
              </h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {session.session_date 
                  ? format(new Date(session.session_date), 'PPP p')
                  : 'No date'}
                {session.is_follow_up && (
                  <Badge variant="outline" className="ml-2 text-xs">Follow-up</Badge>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getRiskBadge(session.safety_assessment)}
            <Button variant="outline" size="sm" onClick={startFollowUp}>
              <Plus className="h-4 w-4 mr-1" />
              Follow-up Session
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Patient Info Card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-xl">{session.patients?.name}</CardTitle>
                <CardDescription className="mt-1">
                  {session.patients?.medical_record_number && `MRN: ${session.patients.medical_record_number} • `}
                  {session.patients?.gender && `${session.patients.gender} • `}
                  {session.patients?.date_of_birth && `DOB: ${format(new Date(session.patients.date_of_birth), 'PP')}`}
                </CardDescription>
              </div>
              {session.duration_seconds && (
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-lg font-semibold">{formatDuration(session.duration_seconds)}</p>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {session.chief_complaint && (
                <div>
                  <p className="text-xs text-muted-foreground">Chief Complaint</p>
                  <p className="text-sm font-medium">{session.chief_complaint}</p>
                </div>
              )}
              {session.clinician_name && (
                <div>
                  <p className="text-xs text-muted-foreground">Clinician</p>
                  <p className="text-sm font-medium">{session.clinician_name}</p>
                </div>
              )}
              {session.session_status && (
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant="secondary">{session.session_status}</Badge>
                </div>
              )}
              {session.session_date && (
                <div>
                  <p className="text-xs text-muted-foreground">Time Since Session</p>
                  <p className="text-sm font-medium">
                    {formatDistanceToNow(new Date(session.session_date), { addSuffix: true })}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Media Player with Synced Biometrics */}
        {(videoPlaybackUrl || audioPlaybackUrl) && (
          <Card>
            <CardContent className="p-4">
              <div className="grid md:grid-cols-3 gap-4">
                {/* Video/Audio Player */}
                <div className="md:col-span-2 space-y-4">
                  {videoPlaybackUrl && (
                    <video
                      ref={videoRef}
                      src={videoPlaybackUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={(e) => {
                        const dur = e.currentTarget.duration;
                        if (isFinite(dur) && !isNaN(dur)) {
                          setDuration(dur);
                        }
                      }}
                      className="w-full max-h-96 rounded-lg bg-black"
                      controls={false}
                      preload="metadata"
                    />
                  )}
                  {!videoPlaybackUrl && audioPlaybackUrl && (
                    <div className="flex items-center justify-center h-32 bg-muted/30 rounded-lg">
                      <Volume2 className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  {!videoPlaybackUrl && audioPlaybackUrl && (
                    <audio
                      ref={audioRef}
                      src={audioPlaybackUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={(e) => {
                        const dur = e.currentTarget.duration;
                        if (isFinite(dur) && !isNaN(dur)) {
                          setDuration(dur);
                        }
                      }}
                      className="hidden"
                      preload="metadata"
                    />
                  )}
                  
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="sm" onClick={handlePlayPause}>
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <span className="text-sm text-muted-foreground w-16">
                      {formatDuration(currentTime)}
                    </span>
                    <Slider
                      value={[duration > 0 ? (currentTime / duration) * 100 : 0]}
                      onValueChange={handleSeek}
                      max={100}
                      step={0.1}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground w-16 text-right">
                      {formatDuration(duration)}
                    </span>
                  </div>
                </div>

                {/* Synced Biometrics Panel */}
                {biometricsArray.length > 0 && syncedBiometricIndex !== null && (
                  <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                    <h4 className="font-medium text-sm flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Live Biometrics at {formatDuration(currentTime)}
                    </h4>
                    
                    {(() => {
                      const b = biometricsArray[syncedBiometricIndex];
                      if (!b) return null;
                      
                      return (
                        <div className="space-y-2 text-sm">
                          {/* Eye Contact */}
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Eye Contact</span>
                              <span>{b.eyeContact?.toFixed(0) || 0}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary transition-all" 
                                style={{ width: `${b.eyeContact || 0}%` }}
                              />
                            </div>
                          </div>
                          
                          {/* Pulse */}
                          {b.pulseEstimate && (
                            <div className="flex items-center gap-2">
                              <Heart className="h-4 w-4 text-destructive" />
                              <span className="font-medium">{b.pulseEstimate} BPM</span>
                            </div>
                          )}
                          
                          {/* Dominant Emotion */}
                          {b.dominantEmotion && (
                            <div>
                              <span className="text-xs text-muted-foreground">Dominant Emotion</span>
                              <p className="font-medium capitalize">{b.dominantEmotion}</p>
                            </div>
                          )}
                          
                          {/* Gaze Stability */}
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span>Gaze Stability</span>
                              <span>{b.gazeStability?.toFixed(0) || 0}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-success transition-all" 
                                style={{ width: `${b.gazeStability || 0}%` }}
                              />
                            </div>
                          </div>
                          
                          {/* Blink Rate */}
                          {b.blinkRate !== undefined && (
                            <div className="flex justify-between text-xs">
                              <span>Blink Rate</span>
                              <span>{b.blinkRate?.toFixed(1) || 0}/min</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content Tabs */}
        <Tabs defaultValue="summary" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="summary"><FileText className="h-4 w-4 mr-1" />Summary</TabsTrigger>
            <TabsTrigger value="transcript"><FileText className="h-4 w-4 mr-1" />Transcript</TabsTrigger>
            <TabsTrigger value="analysis"><Brain className="h-4 w-4 mr-1" />Analysis</TabsTrigger>
            <TabsTrigger value="biometrics"><Activity className="h-4 w-4 mr-1" />Biometrics</TabsTrigger>
            <TabsTrigger value="report"><FileText className="h-4 w-4 mr-1" />Report</TabsTrigger>
          </TabsList>

          <TabsContent value="summary">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Safety Assessment */}
              {session.safety_assessment && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Shield className="h-5 w-5" />
                      Safety Assessment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className={`p-4 rounded-lg border-2 ${
                      session.safety_assessment.suicide_risk_level === 'High' || 
                      session.safety_assessment.suicide_risk_level === 'Imminent'
                        ? 'border-destructive bg-destructive/5'
                        : session.safety_assessment.suicide_risk_level === 'Moderate'
                        ? 'border-warning bg-warning/5'
                        : 'border-success bg-success/5'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-semibold">{session.safety_assessment.suicide_risk_level} Risk</span>
                      </div>
                      {session.safety_assessment.recommended_action && (
                        <p className="text-sm">{session.safety_assessment.recommended_action}</p>
                      )}
                    </div>

                    {session.safety_assessment.risk_factors?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-destructive">Risk Factors</h4>
                        <ul className="space-y-1">
                          {session.safety_assessment.risk_factors.map((f: string, i: number) => (
                            <li key={i} className="text-sm">• {f}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {session.safety_assessment.protective_factors?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-sm mb-2 text-success">Protective Factors</h4>
                        <ul className="space-y-1">
                          {session.safety_assessment.protective_factors.map((f: string, i: number) => (
                            <li key={i} className="text-sm">• {f}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Differential Diagnosis */}
              {session.differential_diagnosis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Brain className="h-5 w-5" />
                      Differential Diagnosis
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(Array.isArray(session.differential_diagnosis) 
                      ? session.differential_diagnosis 
                      : [session.differential_diagnosis]
                    ).slice(0, 3).map((dx: any, i: number) => (
                      <div key={i} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold">{dx.diagnosis}</h4>
                            <p className="text-xs text-muted-foreground">{dx.dsm5_code}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-xl font-bold text-primary">
                              {(dx.probability * 100).toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Emotion Summary */}
              {session.emotion_summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Heart className="h-5 w-5" />
                      Emotional Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(session.emotion_summary).map(([emotion, value]: [string, any]) => (
                        <div key={emotion} className="flex items-center gap-2">
                          <span className="text-sm capitalize w-24">{emotion}</span>
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${(value as number) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground w-12 text-right">
                            {((value as number) * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Related Sessions */}
              {relatedSessions.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Clock className="h-5 w-5" />
                      Related Sessions
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {relatedSessions.map((rs) => (
                        <div 
                          key={rs.id}
                          className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/session/${rs.id}`)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">
                                {rs.session_date ? format(new Date(rs.session_date), 'PP') : 'No date'}
                              </p>
                              {rs.chief_complaint && (
                                <p className="text-xs text-muted-foreground">{rs.chief_complaint}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              {rs.is_follow_up && (
                                <Badge variant="outline" className="text-xs">Follow-up</Badge>
                              )}
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="transcript">
            <Card>
              <CardHeader>
                <CardTitle>Session Transcript</CardTitle>
                <CardDescription>
                  Full transcript with crisis phrases highlighted
                </CardDescription>
              </CardHeader>
              <CardContent>
                {session.full_transcript ? (
                  <CrisisHighlighter 
                    text={session.full_transcript}
                  />
                ) : (
                  <p className="text-muted-foreground text-center py-8">No transcript available</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <div className="space-y-6">
              {/* Differential Diagnosis Detail */}
              {session.differential_diagnosis && (
                <Card>
                  <CardHeader>
                    <CardTitle>Differential Diagnosis</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(Array.isArray(session.differential_diagnosis) 
                      ? session.differential_diagnosis 
                      : [session.differential_diagnosis]
                    ).map((dx: any, i: number) => (
                      <div key={i} className="p-4 border rounded-lg space-y-3">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-semibold text-lg">{dx.diagnosis}</h4>
                            <p className="text-sm text-muted-foreground">{dx.dsm5_code}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">
                              {(dx.probability * 100).toFixed(0)}%
                            </div>
                            {dx.severity && (
                              <p className="text-xs text-muted-foreground">{dx.severity}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="grid md:grid-cols-2 gap-4 pt-3 border-t">
                          {dx.supporting_criteria?.length > 0 && (
                            <div>
                              <h5 className="font-medium text-sm mb-2 text-success">Supporting Criteria</h5>
                              <ul className="space-y-1">
                                {dx.supporting_criteria.map((c: string, j: number) => (
                                  <li key={j} className="text-sm">✓ {c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {dx.missing_criteria?.length > 0 && (
                            <div>
                              <h5 className="font-medium text-sm mb-2 text-muted-foreground">Missing Criteria</h5>
                              <ul className="space-y-1">
                                {dx.missing_criteria.map((c: string, j: number) => (
                                  <li key={j} className="text-sm">○ {c}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        
                        {dx.severity_rationale && (
                          <p className="text-sm text-muted-foreground pt-2 border-t">
                            {dx.severity_rationale}
                          </p>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Treatment Plan */}
              {session.session_notes && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Pill className="h-5 w-5" />
                      Treatment Plan
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {session.session_notes.immediate_interventions?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Immediate Interventions</h4>
                        <ul className="space-y-1">
                          {session.session_notes.immediate_interventions.map((i: string, idx: number) => (
                            <li key={idx} className="text-sm p-2 bg-muted/30 rounded">• {i}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {session.session_notes.medication_recommendations?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Medications</h4>
                        {session.session_notes.medication_recommendations.map((m: any, idx: number) => (
                          <div key={idx} className="p-3 border rounded-lg mb-2">
                            <div className="flex justify-between">
                              <span className="font-medium">{m.medication}</span>
                              <span className="text-primary">{m.dose}</span>
                            </div>
                            <p className="text-sm text-muted-foreground">{m.rationale}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {session.session_notes.psychotherapy?.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Psychotherapy</h4>
                        <ul className="space-y-1">
                          {session.session_notes.psychotherapy.map((t: string, idx: number) => (
                            <li key={idx} className="text-sm p-2 bg-muted/30 rounded">• {t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Q&A */}
              {session.questions_answers && Object.keys(session.questions_answers).length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Clinical Q&A</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(session.questions_answers).map(([question, answer]: [string, any], i) => (
                        <div key={i} className="p-3 border rounded-lg">
                          <p className="font-medium text-sm">{question}</p>
                          <p className="text-sm text-muted-foreground mt-1">{String(answer)}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="biometrics">
            <div className="space-y-6">
              {/* Emotion Timeline Strips */}
              {biometricsArray.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Emotion Over Time</CardTitle>
                    <CardDescription>
                      Each bar shows when that emotion was dominant during the session
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <EmotionTimelineStrips
                      biometrics={biometricsArray}
                      sessionStartTime={biometricsArray[0]?.timestamp || 0}
                      duration={session.duration_seconds || 0}
                      formatTime={formatDuration}
                    />
                  </CardContent>
                </Card>
              )}
              
              <Card>
                <CardHeader>
                  <CardTitle>Biometrics Data</CardTitle>
                  <CardDescription>
                    Facial analysis and physiological measurements during the session
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {biometricsArray.length > 0 ? (
                    <BiometricsChart data={biometricsArray} />
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      No biometric data recorded for this session
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="report">
            <SessionInsightsPanel
              sessionData={{
                transcript: session.full_transcript || '',
                biometrics: biometricsArray,
                questionsAnswers: session.questions_answers || {},
                differential: Array.isArray(session.differential_diagnosis) 
                  ? session.differential_diagnosis 
                  : [session.differential_diagnosis].filter(Boolean),
                safetyAssessment: session.safety_assessment,
                emotionSummary: session.emotion_summary || {},
                duration: session.duration_seconds || 0,
                patientName: session.patients?.name,
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
