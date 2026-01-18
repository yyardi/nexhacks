/**
 * Arden Real-Time AI Mental Health Companion
 * Milestone 1, 2, 3.5: Overshoot Vision + Temporal Memory + Gemini Sentiment
 */

import { useState, useEffect, useCallback } from 'react';
import { useOvershotVision } from '@/hooks/useOvershotVision';
import { analyzeTranscriptSentiment } from '@/utils/geminiSentimentAnalysis';
import { VisualObservation } from '@/types/overshoot';
import { TextSentimentObservation } from '@/types/sentiment';
import { getMemorySize } from '@/utils/temporalEmotionMemory';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Video, VideoOff, Brain, Activity, MessageSquare, AlertCircle, Smile, Meh, Frown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const OVERSHOOT_API_KEY = import.meta.env.VITE_OVERSHOOT_API_KEY || '';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export default function RealtimeCompanion() {
  const { toast } = useToast();

  // Visual observation state
  const [novelObservations, setNovelObservations] = useState<VisualObservation[]>([]);
  const [allObservations, setAllObservations] = useState<VisualObservation[]>([]);
  const [memorySize, setMemorySize] = useState(0);

  // Sentiment analysis state
  const [transcriptInput, setTranscriptInput] = useState('');
  const [sentimentHistory, setSentimentHistory] = useState<TextSentimentObservation[]>([]);
  const [isAnalyzingSentiment, setIsAnalyzingSentiment] = useState(false);

  // Overshoot vision hook
  const {
    isActive,
    currentObservation,
    latency,
    error,
    startVision,
    stopVision,
    resetSession,
  } = useOvershotVision({
    apiKey: OVERSHOOT_API_KEY,
    onNovelObservation: (obs) => {
      setNovelObservations((prev) => [obs, ...prev].slice(0, 20));

      // Show toast for distress signals
      if (obs.distress_signal) {
        toast({
          title: 'Distress Signal Detected',
          description: obs.distress_signal,
          variant: 'destructive',
        });
      }
    },
    onRawObservation: (obs) => {
      setAllObservations((prev) => [obs, ...prev].slice(0, 50));
    },
  });

  // Update memory size periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setMemorySize(getMemorySize());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle sentiment analysis
  const handleAnalyzeSentiment = useCallback(async () => {
    if (!transcriptInput.trim()) return;

    setIsAnalyzingSentiment(true);
    try {
      const result = await analyzeTranscriptSentiment(transcriptInput, GEMINI_API_KEY);
      setSentimentHistory((prev) => [result, ...prev].slice(0, 10));
      setTranscriptInput('');

      toast({
        title: 'Sentiment Analyzed',
        description: `${result.sentiment.toUpperCase()}: ${result.emotional_tone || 'No specific tone'}`,
      });
    } catch (err) {
      toast({
        title: 'Analysis Failed',
        description: 'Could not analyze sentiment',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzingSentiment(false);
    }
  }, [transcriptInput, toast]);

  // Get emotion badge color
  const getEmotionColor = (emotion: string | null): string => {
    if (!emotion) return 'bg-gray-500';
    const lower = emotion.toLowerCase();
    if (lower.includes('happy') || lower.includes('joy') || lower.includes('calm')) return 'bg-green-500';
    if (lower.includes('sad') || lower.includes('distress') || lower.includes('crying')) return 'bg-red-500';
    if (lower.includes('anxious') || lower.includes('worried') || lower.includes('nervous')) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  // Get sentiment icon
  const getSentimentIcon = (sentiment: string) => {
    if (sentiment === 'positive') return <Smile className="h-4 w-4" />;
    if (sentiment === 'negative') return <Frown className="h-4 w-4" />;
    return <Meh className="h-4 w-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/arden-icon.svg" alt="Arden" className="h-10 w-10" />
            <div>
              <h1 className="text-2xl font-bold text-[#003D6B]">Arden</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">Real-Time AI Companion</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Active' : 'Inactive'}
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column: Visual Observation */}
          <div className="space-y-6">
            {/* Video Feed & Controls */}
            <Card className="border-2 border-primary/20 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5" />
                  Visual Emotion Observer
                </CardTitle>
                <CardDescription>
                  Milestone 1: Real-time facial and behavioral emotion detection
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Camera Feed Placeholder */}
                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden relative">
                  {isActive ? (
                    <div id="overshoot-video-container" className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-white">
                        <Video className="h-16 w-16 mx-auto mb-2 animate-pulse" />
                        <p className="text-sm">Camera feed active</p>
                        <p className="text-xs text-gray-400 mt-1">Analyzing emotional cues...</p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="text-center text-gray-400">
                        <VideoOff className="h-16 w-16 mx-auto mb-2" />
                        <p className="text-sm">Camera inactive</p>
                      </div>
                    </div>
                  )}

                  {/* Current Emotion Overlay */}
                  {currentObservation?.emotion && (
                    <div className="absolute bottom-4 left-4">
                      <Badge className={`${getEmotionColor(currentObservation.emotion)} text-white text-lg px-4 py-2`}>
                        {currentObservation.emotion}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex gap-2">
                  {!isActive ? (
                    <Button onClick={startVision} className="flex-1" size="lg">
                      <Video className="mr-2 h-4 w-4" />
                      Start Observation
                    </Button>
                  ) : (
                    <>
                      <Button onClick={stopVision} variant="destructive" className="flex-1" size="lg">
                        <VideoOff className="mr-2 h-4 w-4" />
                        Stop
                      </Button>
                      <Button onClick={resetSession} variant="outline" size="lg">
                        Reset Session
                      </Button>
                    </>
                  )}
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-800 dark:text-red-200 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      {error}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Current Observation Details */}
            {currentObservation && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Current Visual Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Emotion</p>
                      <p className="text-sm font-semibold">{currentObservation.emotion || 'None'}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Behavior</p>
                      <p className="text-sm font-semibold">{currentObservation.behavior || 'None'}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Engagement</p>
                      <p className="text-sm font-semibold">{currentObservation.engagement || 'None'}</p>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Distress Signal</p>
                      <p className="text-sm font-semibold">{currentObservation.distress_signal || 'None'}</p>
                    </div>
                  </div>

                  {latency && (
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Performance</p>
                      <div className="flex justify-between text-xs">
                        <span>Inference: <strong>{latency.inference_ms}ms</strong></span>
                        <span>Total: <strong>{latency.total_ms}ms</strong></span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Temporal Memory Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Temporal Memory (Milestone 2)
                </CardTitle>
                <CardDescription>
                  Prevents duplicate emotional reactions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{novelObservations.length}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Novel States</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-600">{allObservations.length}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Total Observations</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{memorySize}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">In Memory</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Sentiment Analysis & History */}
          <div className="space-y-6">
            {/* Sentiment Analysis */}
            <Card className="border-2 border-purple-200 dark:border-purple-800 shadow-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Text Sentiment Analysis
                </CardTitle>
                <CardDescription>
                  Milestone 3.5: Gemini-powered transcript sentiment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Enter transcript text to analyze sentiment..."
                  value={transcriptInput}
                  onChange={(e) => setTranscriptInput(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
                <Button
                  onClick={handleAnalyzeSentiment}
                  disabled={!transcriptInput.trim() || isAnalyzingSentiment}
                  className="w-full"
                  size="lg"
                >
                  {isAnalyzingSentiment ? 'Analyzing...' : 'Analyze Sentiment'}
                </Button>
              </CardContent>
            </Card>

            {/* Sentiment History */}
            {sentimentHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Sentiment History</CardTitle>
                  <CardDescription>Recent sentiment analyses</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {sentimentHistory.map((sentiment, idx) => (
                      <div
                        key={idx}
                        className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant={
                              sentiment.sentiment === 'positive'
                                ? 'default'
                                : sentiment.sentiment === 'negative'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="flex items-center gap-1"
                          >
                            {getSentimentIcon(sentiment.sentiment)}
                            {sentiment.sentiment}
                          </Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(sentiment.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        {sentiment.emotional_tone && (
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            Tone: <strong>{sentiment.emotional_tone}</strong>
                          </p>
                        )}
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600 dark:text-gray-400">Confidence</span>
                            <span className="font-semibold">{(sentiment.confidence * 100).toFixed(0)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all"
                              style={{ width: `${sentiment.confidence * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Novel Observations History */}
            {novelObservations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Novel Emotional States</CardTitle>
                  <CardDescription>Significant emotional changes detected</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {novelObservations.map((obs, idx) => (
                      <div
                        key={idx}
                        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800"
                      >
                        <div className="flex items-center justify-between mb-2">
                          {obs.emotion && (
                            <Badge className={`${getEmotionColor(obs.emotion)} text-white`}>
                              {obs.emotion}
                            </Badge>
                          )}
                          <span className="text-xs text-gray-500">
                            {new Date(obs.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-xs space-y-1 text-gray-700 dark:text-gray-300">
                          {obs.behavior && <p>Behavior: {obs.behavior}</p>}
                          {obs.engagement && <p>Engagement: {obs.engagement}</p>}
                          {obs.distress_signal && (
                            <p className="text-red-600 dark:text-red-400 font-semibold">
                              ⚠️ Distress: {obs.distress_signal}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
