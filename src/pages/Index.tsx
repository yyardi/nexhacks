import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Brain, Shield, Activity, FileText, ArrowRight,
  Mic, Video, Lock, CheckCircle2, Stethoscope, Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard');
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-border/40 sticky top-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/arden-icon.svg" alt="Arden" className="h-10 w-10" />
            <div className="text-2xl font-bold text-[#003D6B] dark:text-blue-400">Arden</div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/realtime')} className="hidden md:flex">
              <Sparkles className="mr-2 h-4 w-4" />
              Try Live Demo
            </Button>
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth')} className="bg-[#003D6B] hover:bg-[#002a4d]">
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-100/50 via-purple-100/50 to-pink-100/50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 opacity-50" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 text-[#003D6B] dark:text-blue-400 text-sm font-medium border border-blue-200 dark:border-blue-800">
              <Brain className="h-4 w-4" />
              Real-Time Mental Health Support
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-r from-[#003D6B] to-purple-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-purple-400">
              Your AI Mental Health Companion
            </h1>

            <p className="text-lg text-gray-700 dark:text-gray-300 max-w-2xl mx-auto">
              Fully autonomous AI companion that <strong>sees</strong>, <strong>listens</strong>, and <strong>adapts</strong> to your emotional state in real-time.
              Experience supportive conversations powered by live emotional perception.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/auth')}
                className="text-lg px-8 py-6 h-auto gap-2 bg-[#003D6B] hover:bg-[#002a4d]"
              >
                Start Session <ArrowRight className="h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/realtime')}
                className="text-lg px-8 py-6 h-auto gap-2 border-[#003D6B] text-[#003D6B] hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Sparkles className="h-5 w-5" />
                Try Live Demo
              </Button>
            </div>

            {/* Live Demo Badge */}
            <div className="pt-8">
              <Badge variant="secondary" className="text-xs px-3 py-1">
                <Activity className="h-3 w-3 mr-1 animate-pulse text-green-500" />
                Real-time emotion detection • No downloads required
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t bg-white/50 dark:bg-gray-800/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-[#003D6B] dark:text-blue-400">
            Powered by Advanced AI
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Video, title: 'Emotional Vision', desc: 'Real-time facial emotion and behavioral perception using Overshoot', color: 'blue' },
              { icon: Mic, title: 'Live Transcription', desc: 'Your words captured and understood in real-time', color: 'purple' },
              { icon: Brain, title: 'Adaptive AI', desc: 'Conversation adapts based on what it sees and hears', color: 'pink' },
              { icon: Shield, title: 'Supportive Presence', desc: 'Calm, empathetic responses without judgment', color: 'green' },
            ].map((f, i) => (
              <Card key={i} className="border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all hover:shadow-lg">
                <CardContent className="p-6 space-y-3">
                  <div className={`p-3 rounded-lg bg-gradient-to-br from-${f.color}-500/10 to-${f.color}-600/10 w-fit`}>
                    <f.icon className={`h-6 w-6 text-${f.color}-600 dark:text-${f.color}-400`} />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">{f.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-muted/30 border-t">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'Join Session', desc: 'Turn on your camera and microphone to connect with your AI companion.' },
              { step: '2', title: 'Talk Naturally', desc: 'Share your thoughts and feelings. The AI listens and adapts to your emotional state.' },
              { step: '3', title: 'Feel Supported', desc: 'Receive calm, empathetic guidance in real-time as the conversation flows naturally.' }
            ].map((item, i) => (
              <div key={i} className="text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mx-auto">
                  {item.step}
                </div>
                <h3 className="font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready for compassionate AI support?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Experience a new kind of mental health support with an AI that truly listens and adapts.
          </p>
          <Button size="lg" onClick={() => navigate('/auth')} className="gap-2">
            Get Started Free <ArrowRight className="h-5 w-5" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 dark:bg-gray-900/80 py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src="/arden-logo.png" alt="Arden" className="h-6" />
              <div className="text-xl font-bold text-[#003D6B] dark:text-blue-400">Arden</div>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} Arden
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <Lock className="h-4 w-4" />
              Private & Secure
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <CheckCircle2 className="h-4 w-4" />
              Real-Time Support
            </div>
          </div>
          <div className="flex gap-4">
            <a href="/terms" className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#003D6B] dark:hover:text-blue-400">Terms</a>
            <a href="/privacy" className="text-sm text-gray-600 dark:text-gray-400 hover:text-[#003D6B] dark:hover:text-blue-400">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}