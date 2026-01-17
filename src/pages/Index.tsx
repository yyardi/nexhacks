import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, Shield, Activity, FileText, ArrowRight, 
  Mic, Video, Lock, CheckCircle2, Stethoscope
} from 'lucide-react';
import charcotLogo from '@/assets/charcot-logo.png';
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
          <img src={charcotLogo} alt="Charcot" className="h-10 w-auto" />
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
              <Stethoscope className="h-4 w-4" />
              For Psychiatrists
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              AI-Assisted Psychiatric Interviews
            </h1>
            
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Real-time transcription, automated assessments, and clinical decision support. 
              Streamline your psychiatric evaluations with intelligent guidance.
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
              { icon: Mic, title: 'Live Transcription', desc: 'Real-time speech-to-text with speaker detection' },
              { icon: Brain, title: 'AI Analysis', desc: 'Automatic differential diagnosis and safety assessment' },
              { icon: FileText, title: 'Auto Q&A', desc: 'PHQ-9, GAD-7, C-SSRS questions with auto-fill' },
              { icon: Video, title: 'Biometrics', desc: 'Eye tracking, pulse estimation from video' },
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
              { step: '1', title: 'Start Recording', desc: 'One click to begin audio, video, and biometric capture.' },
              { step: '2', title: 'AI Guides Interview', desc: 'Get real-time question suggestions and auto-filled assessments.' },
              { step: '3', title: 'Export Report', desc: 'Generate SOAP notes with diagnosis, safety assessment, and treatment plan.' }
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
          <h2 className="text-3xl font-bold mb-4">Ready to streamline your practice?</h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join psychiatrists using Charcot to enhance clinical accuracy and save documentation time.
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
            <img src={charcotLogo} alt="Charcot" className="h-8 w-auto" />
            <span className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Charcot
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              HIPAA Compliant
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" />
              DSM-5 Aligned
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