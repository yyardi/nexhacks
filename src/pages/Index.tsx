import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, Shield, Activity, FileText, ArrowRight, 
  Mic, Video, Lock, CheckCircle2, Stethoscope
} from 'lucide-react';
// Logo will be added later
import { supabase } from '@/integrations/supabase/client';

export default function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/dashboard');
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 sticky top-0 z-50 bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">Arden</div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              Sign In
            </Button>
            <Button onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Brain className="h-4 w-4" />
              Real-Time Mental Health Support
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Your AI Mental Health Companion
            </h1>

            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Fully autonomous AI companion that sees, listens, and adapts to your emotional state in real-time.
              Experience supportive conversations powered by live emotional perception.
            </p>

            <div className="pt-4">
              <Button 
                size="lg" 
                onClick={() => navigate('/auth')} 
                className="text-lg px-8 py-6 h-auto gap-2"
              >
                Start Session <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 border-t">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Video, title: 'Emotional Vision', desc: 'Real-time facial emotion and behavioral perception' },
              { icon: Mic, title: 'Live Transcription', desc: 'Your words captured and understood in real-time' },
              { icon: Brain, title: 'Adaptive AI', desc: 'Conversation adapts based on what it sees and hears' },
              { icon: Shield, title: 'Supportive Presence', desc: 'Calm, empathetic responses without judgment' },
            ].map((f, i) => (
              <Card key={i} className="border">
                <CardContent className="p-6 space-y-3">
                  <div className="p-3 rounded-lg bg-primary/10 w-fit">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
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
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="text-xl font-bold text-primary">Arden</div>
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Arden
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              Private & Secure
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              Real-Time Support
            </div>
          </div>
          <div className="flex gap-4">
            <a href="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</a>
            <a href="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</a>
          </div>
        </div>
      </footer>
    </div>
  );
}