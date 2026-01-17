import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, ComposedChart, Bar } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Eye, Activity, Heart, Wind, AlertCircle } from 'lucide-react';

interface BiometricSnapshot {
  timestamp: number;
  eyeContact?: number;
  gazeStability?: number;
  breathingRate?: number;
  blinkRate?: number;
  pulseEstimate?: number;
  headPose?: { pitch: number; yaw: number };
  emotions?: Record<string, number>;
}

interface BiometricsChartProps {
  biometrics?: BiometricSnapshot[];
  data?: BiometricSnapshot[];
  formatTime?: (timestamp: number) => string;
}

export const BiometricsChart = ({ biometrics, data, formatTime }: BiometricsChartProps) => {
  const biometricsData = biometrics || data || [];
  
  const defaultFormatTime = (timestamp: number) => {
    if (!timestamp) return '0:00';
    const baseTime = biometricsData[0]?.timestamp || timestamp;
    const elapsed = Math.floor((timestamp - baseTime) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const timeFormatter = formatTime || defaultFormatTime;

  // Process chart data
  const chartData = useMemo(() => {
    if (biometricsData.length === 0) return [];
    
    return biometricsData.map((b) => ({
      time: timeFormatter(b.timestamp),
      timestamp: b.timestamp,
      eyeContact: b.eyeContact ?? null,
      gazeStability: b.gazeStability ?? null,
      breathingRate: b.breathingRate ?? null,
      blinkRate: b.blinkRate ?? null,
      pulse: b.pulseEstimate ?? null,
      headPitch: b.headPose?.pitch ?? null,
      headYaw: b.headPose?.yaw ?? null,
    }));
  }, [biometricsData, timeFormatter]);

  // Calculate statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    
    const validData = chartData.filter(d => d.eyeContact !== null);
    
    const avg = (key: keyof typeof chartData[0]) => {
      const values = chartData.map(d => d[key]).filter((v): v is number => typeof v === 'number');
      return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    };
    
    const avgEyeContact = avg('eyeContact');
    const avgGazeStability = avg('gazeStability');
    const avgBreathingRate = avg('breathingRate');
    const avgBlinkRate = avg('blinkRate');
    const avgPulse = avg('pulse');
    
    // Clinical interpretation
    const getEyeContactInterpretation = (val: number | null) => {
      if (val === null) return { label: 'N/A', color: 'bg-muted' };
      if (val >= 70) return { label: 'Good', color: 'bg-success' };
      if (val >= 40) return { label: 'Moderate', color: 'bg-warning' };
      return { label: 'Low', color: 'bg-destructive' };
    };
    
    const getBreathingInterpretation = (val: number | null) => {
      if (val === null) return { label: 'N/A', color: 'bg-muted' };
      if (val >= 12 && val <= 20) return { label: 'Normal', color: 'bg-success' };
      if (val < 12) return { label: 'Low', color: 'bg-warning' };
      return { label: 'Elevated', color: 'bg-warning' };
    };
    
    const getBlinkInterpretation = (val: number | null) => {
      if (val === null) return { label: 'N/A', color: 'bg-muted' };
      if (val >= 10 && val <= 20) return { label: 'Normal', color: 'bg-success' };
      if (val > 20) return { label: 'Elevated', color: 'bg-warning' };
      return { label: 'Low', color: 'bg-warning' };
    };
    
    return {
      avgEyeContact,
      avgGazeStability,
      avgBreathingRate,
      avgBlinkRate,
      avgPulse,
      eyeContactInterp: getEyeContactInterpretation(avgEyeContact),
      breathingInterp: getBreathingInterpretation(avgBreathingRate),
      blinkInterp: getBlinkInterpretation(avgBlinkRate),
      totalReadings: chartData.length,
      duration: chartData.length > 0 ? timeFormatter(chartData[chartData.length - 1].timestamp) : '0:00'
    };
  }, [chartData]);

  if (biometricsData.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium text-muted-foreground">No Biometric Data</p>
          <p className="text-sm text-muted-foreground mt-1">
            Biometric readings will appear here during active recording sessions
          </p>
        </CardContent>
      </Card>
    );
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium mb-2">Time: {label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2" style={{ color: entry.color }}>
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span>{entry.name}: {entry.value?.toFixed(1) ?? 'N/A'}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-primary" />
              <span className="text-xs text-muted-foreground">Eye Contact</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {stats.avgEyeContact?.toFixed(0) ?? '--'}%
              </span>
              <Badge variant="secondary" className={`text-xs ${stats.eyeContactInterp.color} text-white`}>
                {stats.eyeContactInterp.label}
              </Badge>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-accent" />
              <span className="text-xs text-muted-foreground">Gaze Stability</span>
            </div>
            <div className="text-2xl font-bold">
              {stats.avgGazeStability?.toFixed(0) ?? '--'}%
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wind className="h-4 w-4 text-info" />
              <span className="text-xs text-muted-foreground">Breathing</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {stats.avgBreathingRate?.toFixed(0) ?? '--'}
              </span>
              <span className="text-sm text-muted-foreground">/min</span>
              <Badge variant="secondary" className={`text-xs ${stats.breathingInterp.color} text-white`}>
                {stats.breathingInterp.label}
              </Badge>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Eye className="h-4 w-4 text-warning" />
              <span className="text-xs text-muted-foreground">Blink Rate</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {stats.avgBlinkRate?.toFixed(0) ?? '--'}
              </span>
              <span className="text-sm text-muted-foreground">/min</span>
            </div>
          </Card>
          
          {stats.avgPulse && (
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-destructive" />
                <span className="text-xs text-muted-foreground">Heart Rate</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">
                  {stats.avgPulse?.toFixed(0) ?? '--'}
                </span>
                <span className="text-sm text-muted-foreground">BPM</span>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Attention & Engagement Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Attention & Engagement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="eyeContactGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(210, 100%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(210, 100%, 45%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gazeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(185, 70%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(185, 70%, 45%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickLine={false} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area 
                type="monotone" 
                dataKey="eyeContact" 
                name="Eye Contact %" 
                stroke="hsl(210, 100%, 45%)" 
                strokeWidth={2}
                fill="url(#eyeContactGradient)" 
                connectNulls
              />
              <Area 
                type="monotone" 
                dataKey="gazeStability" 
                name="Gaze Stability %" 
                stroke="hsl(185, 70%, 45%)" 
                strokeWidth={2}
                fill="url(#gazeGradient)" 
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Physiological Metrics Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Physiological Indicators
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="time" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} width={30} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line 
                type="monotone" 
                dataKey="breathingRate" 
                name="Breathing/min" 
                stroke="hsl(280, 60%, 55%)" 
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              <Line 
                type="monotone" 
                dataKey="blinkRate" 
                name="Blink/min" 
                stroke="hsl(35, 90%, 55%)" 
                strokeWidth={2}
                dot={false}
                connectNulls
              />
              {chartData.some(d => d.pulse) && (
                <Line 
                  type="monotone" 
                  dataKey="pulse" 
                  name="Heart Rate" 
                  stroke="hsl(0, 70%, 50%)" 
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Session Info */}
      {stats && (
        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>{stats.totalReadings} biometric readings captured</span>
          <span>Session duration: {stats.duration}</span>
        </div>
      )}
    </div>
  );
};
