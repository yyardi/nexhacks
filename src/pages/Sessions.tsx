import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { 
  ArrowLeft, Calendar, FileText, User, AlertTriangle, Clock, 
  Search, Filter, ChevronDown, ChevronRight, Plus, Activity,
  Heart, Brain, FolderOpen, Folder, Users
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Session {
  id: string;
  session_date: string;
  chief_complaint: string;
  clinician_name: string;
  safety_assessment: any;
  differential_diagnosis: any;
  emotion_summary: any;
  duration_seconds: number;
  is_follow_up: boolean;
  session_status: string;
  patient_id: string;
  patients: {
    id: string;
    name: string;
    date_of_birth: string;
    gender: string;
  };
}

interface GroupedSessions {
  patient: {
    id: string;
    name: string;
    date_of_birth: string;
    gender: string;
  };
  sessions: Session[];
  latestRiskLevel: string;
  lastSessionDate: string;
}

export default function Sessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'risk' | 'patient'>('date');
  const [expandedPatients, setExpandedPatients] = useState<Set<string>>(new Set());
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('sessions')
        .select(`
          id,
          session_date,
          chief_complaint,
          clinician_name,
          safety_assessment,
          differential_diagnosis,
          emotion_summary,
          duration_seconds,
          is_follow_up,
          session_status,
          patient_id,
          patients (
            id,
            name,
            date_of_birth,
            gender
          )
        `)
        .order('session_date', { ascending: false });

      if (error) throw error;

      setSessions(data || []);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error loading sessions",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  // Group sessions by patient
  const groupedSessions = useMemo(() => {
    const groups: Record<string, GroupedSessions> = {};
    
    sessions.forEach(session => {
      const patientId = session.patient_id || 'unknown';
      if (!groups[patientId]) {
        groups[patientId] = {
          patient: session.patients || { id: 'unknown', name: 'Unknown Patient', date_of_birth: '', gender: '' },
          sessions: [],
          latestRiskLevel: 'Low',
          lastSessionDate: session.session_date
        };
      }
      groups[patientId].sessions.push(session);
      
      // Track highest risk level
      const riskLevel = session.safety_assessment?.suicide_risk_level;
      if (riskLevel) {
        const riskOrder = ['Low', 'Moderate', 'High', 'Imminent'];
        const currentIdx = riskOrder.indexOf(groups[patientId].latestRiskLevel);
        const newIdx = riskOrder.indexOf(riskLevel);
        if (newIdx > currentIdx) {
          groups[patientId].latestRiskLevel = riskLevel;
        }
      }
    });
    
    return Object.values(groups);
  }, [sessions]);

  // Filter and sort
  const filteredGroups = useMemo(() => {
    let filtered = groupedSessions;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(g => 
        g.patient.name.toLowerCase().includes(query) ||
        g.sessions.some(s => 
          s.chief_complaint?.toLowerCase().includes(query) ||
          s.clinician_name?.toLowerCase().includes(query)
        )
      );
    }
    
    if (riskFilter !== 'all') {
      filtered = filtered.filter(g => 
        g.sessions.some(s => s.safety_assessment?.suicide_risk_level === riskFilter)
      );
    }
    
    if (sortBy === 'date') {
      filtered.sort((a, b) => {
        const dateA = new Date(a.sessions[0]?.session_date || 0).getTime();
        const dateB = new Date(b.sessions[0]?.session_date || 0).getTime();
        return dateB - dateA;
      });
    } else if (sortBy === 'risk') {
      const riskOrder = ['Imminent', 'High', 'Moderate', 'Low'];
      filtered.sort((a, b) => 
        riskOrder.indexOf(a.latestRiskLevel) - riskOrder.indexOf(b.latestRiskLevel)
      );
    } else if (sortBy === 'patient') {
      filtered.sort((a, b) => a.patient.name.localeCompare(b.patient.name));
    }
    
    return filtered;
  }, [groupedSessions, searchQuery, riskFilter, sortBy]);

  const togglePatient = (patientId: string) => {
    setExpandedPatients(prev => {
      const next = new Set(prev);
      if (next.has(patientId)) {
        next.delete(patientId);
      } else {
        next.add(patientId);
      }
      return next;
    });
  };

  const getRiskBadge = (level: string) => {
    const classes: Record<string, string> = {
      'Low': 'risk-badge-low',
      'Moderate': 'risk-badge-moderate',
      'High': 'risk-badge-high',
      'Imminent': 'risk-badge-imminent'
    };
    return (
      <Badge variant="outline" className={classes[level] || ''}>
        {level}
      </Badge>
    );
  };

  const getPrimaryDiagnosis = (differential: any) => {
    if (!differential) return null;
    const diagnoses = Array.isArray(differential) ? differential : [differential];
    const primary = diagnoses.sort((a: any, b: any) => (b.probability || 0) - (a.probability || 0))[0];
    return primary?.diagnosis || null;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading sessions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="text-xl font-bold text-primary">Arden</div>
            <div className="border-l pl-4 hidden sm:block">
              <h1 className="text-lg font-semibold">Patient Records</h1>
              <p className="text-xs text-muted-foreground">Session Management</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Dashboard
            </Button>
            <Button size="sm" onClick={() => navigate('/dashboard')}>
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Patient Directory */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Patients ({groupedSessions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Search */}
                <div className="px-4 pb-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                </div>

                {/* Filters */}
                <div className="px-4 pb-3 flex gap-2">
                  <Select value={riskFilter} onValueChange={setRiskFilter}>
                    <SelectTrigger className="h-8 text-xs">
                      <Filter className="h-3 w-3 mr-1" />
                      <SelectValue placeholder="Risk" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Risks</SelectItem>
                      <SelectItem value="Imminent">Imminent</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Moderate">Moderate</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="date">Recent</SelectItem>
                      <SelectItem value="risk">Risk</SelectItem>
                      <SelectItem value="patient">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Patient List - Folder Style */}
                <div className="max-h-[60vh] overflow-y-auto">
                  {filteredGroups.map((group) => (
                    <div key={group.patient.id} className="border-t">
                      <div
                        className={`folder-tree-item px-4 py-3 ${selectedPatientId === group.patient.id ? 'active' : ''}`}
                        onClick={() => {
                          togglePatient(group.patient.id);
                          setSelectedPatientId(group.patient.id);
                        }}
                      >
                        {expandedPatients.has(group.patient.id) ? (
                          <FolderOpen className="h-4 w-4 text-primary flex-shrink-0" />
                        ) : (
                          <Folder className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{group.patient.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.sessions.length} session{group.sessions.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          {group.latestRiskLevel !== 'Low' && (
                            <div className={`w-2 h-2 rounded-full ${
                              group.latestRiskLevel === 'Imminent' ? 'bg-destructive animate-pulse' :
                              group.latestRiskLevel === 'High' ? 'bg-destructive' :
                              'bg-warning'
                            }`} />
                          )}
                          {expandedPatients.has(group.patient.id) ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Session List under Patient */}
                      {expandedPatients.has(group.patient.id) && (
                        <div className="folder-tree-indent">
                          {group.sessions.map((session) => (
                            <div
                              key={session.id}
                              className="folder-tree-item px-4 py-2"
                              onClick={() => navigate(`/session/${session.id}`)}
                            >
                              <FileText className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs truncate">
                                  {session.session_date 
                                    ? format(new Date(session.session_date), 'MMM d, yyyy')
                                    : 'No date'}
                                </p>
                                {session.chief_complaint && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {session.chief_complaint}
                                  </p>
                                )}
                              </div>
                              {session.is_follow_up && (
                                <Badge variant="outline" className="text-[10px] h-4">F/U</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {filteredGroups.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No patients found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {selectedPatientId ? (
              // Selected Patient Detail View
              (() => {
                const selectedGroup = filteredGroups.find(g => g.patient.id === selectedPatientId);
                if (!selectedGroup) return null;

                return (
                  <div className="space-y-6">
                    {/* Patient Header */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-full bg-primary/10">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                            <div>
                              <CardTitle className="text-2xl">{selectedGroup.patient.name}</CardTitle>
                              <CardDescription className="flex items-center gap-2 mt-1">
                                {selectedGroup.patient.gender && <span>{selectedGroup.patient.gender}</span>}
                                {selectedGroup.patient.date_of_birth && (
                                  <span>• DOB: {format(new Date(selectedGroup.patient.date_of_birth), 'PP')}</span>
                                )}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getRiskBadge(selectedGroup.latestRiskLevel)}
                            <Button onClick={() => navigate('/dashboard')}>
                              <Plus className="h-4 w-4 mr-2" />
                              New Session
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-4">
                          <div className="stat-card">
                            <span className="stat-value">{selectedGroup.sessions.length}</span>
                            <span className="stat-label">Total Sessions</span>
                          </div>
                          <div className="stat-card">
                            <span className="stat-value">
                              {selectedGroup.sessions.filter(s => s.is_follow_up).length}
                            </span>
                            <span className="stat-label">Follow-ups</span>
                          </div>
                          <div className="stat-card">
                            <span className="stat-value">
                              {selectedGroup.lastSessionDate 
                                ? formatDistanceToNow(new Date(selectedGroup.lastSessionDate), { addSuffix: true })
                                : 'N/A'}
                            </span>
                            <span className="stat-label">Last Visit</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Sessions Timeline */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Session History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {selectedGroup.sessions.map((session, index) => (
                            <div 
                              key={session.id}
                              className="p-4 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                              onClick={() => navigate(`/session/${session.id}`)}
                            >
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex gap-4">
                                  <div className="flex flex-col items-center">
                                    <div className={`w-3 h-3 rounded-full ${
                                      session.safety_assessment?.suicide_risk_level === 'Imminent' ? 'bg-destructive' :
                                      session.safety_assessment?.suicide_risk_level === 'High' ? 'bg-destructive' :
                                      session.safety_assessment?.suicide_risk_level === 'Moderate' ? 'bg-warning' :
                                      'bg-success'
                                    }`} />
                                    {index < selectedGroup.sessions.length - 1 && (
                                      <div className="w-0.5 flex-1 bg-border mt-2" />
                                    )}
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-medium">
                                        {session.session_date 
                                          ? format(new Date(session.session_date), 'EEEE, MMMM d, yyyy')
                                          : 'No date'}
                                      </span>
                                      {session.is_follow_up && (
                                        <Badge variant="outline" className="text-xs">Follow-up</Badge>
                                      )}
                                      {session.session_status && (
                                        <Badge variant="secondary" className="text-xs">{session.session_status}</Badge>
                                      )}
                                    </div>
                                    
                                    {session.chief_complaint && (
                                      <p className="text-sm text-muted-foreground">
                                        <span className="font-medium">Chief Complaint:</span> {session.chief_complaint}
                                      </p>
                                    )}
                                    
                                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                      {session.clinician_name && (
                                        <span>Dr. {session.clinician_name}</span>
                                      )}
                                      {session.duration_seconds > 0 && (
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {formatDuration(session.duration_seconds)}
                                        </span>
                                      )}
                                    </div>

                                    {/* Diagnosis & Emotion */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {getPrimaryDiagnosis(session.differential_diagnosis) && (
                                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                                          <Brain className="h-3 w-3" />
                                          {getPrimaryDiagnosis(session.differential_diagnosis)}
                                        </Badge>
                                      )}
                                      {session.emotion_summary && Object.keys(session.emotion_summary).length > 0 && (
                                        <Badge variant="outline" className="text-xs flex items-center gap-1 capitalize">
                                          <Heart className="h-3 w-3" />
                                          {Object.entries(session.emotion_summary)
                                            .sort((a: any, b: any) => b[1] - a[1])[0]?.[0]}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex flex-col items-end gap-2">
                                  {session.safety_assessment?.suicide_risk_level && (
                                    getRiskBadge(session.safety_assessment.suicide_risk_level)
                                  )}
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()
            ) : (
              // No patient selected - Overview
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <FolderOpen className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-lg font-medium mb-2">Select a patient to view sessions</p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Choose a patient from the directory on the left to see their session history
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="stat-card">
                      <span className="stat-value">{groupedSessions.length}</span>
                      <span className="stat-label">Patients</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-value">{sessions.length}</span>
                      <span className="stat-label">Total Sessions</span>
                    </div>
                    <div className="stat-card">
                      <span className="stat-value">
                        {groupedSessions.filter(g => g.latestRiskLevel === 'High' || g.latestRiskLevel === 'Imminent').length}
                      </span>
                      <span className="stat-label">High Risk</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}